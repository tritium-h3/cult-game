/**
 * Cult Game WebSocket Server
 * Runs on port 5174, handles all game logic and LLM interactions.
 *
 * Protocol:
 *   Client → Server: { type, payload? }
 *   Server → Client: { type, payload? }
 */

import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  completeWeek,
  enactCityActions,
  serializeActionMap,
  deserializeActionMap,
  prototypeActionsForCity,
} from '../src/game/actions';
import { getCityById, CITIES } from '../src/game/world';
import {
  CARD_SPREADS,
  generateInitialGameState,
  generateCultName,
  getNarrative,
  getGameState,
} from '../src/game/reading';
import { generateFollowers } from '../src/game/followers';
import type { GameState, Action, Outcome, Follower, Card, ActionMap } from '../src/game/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, 'game-state.json');
const PORT = 5174;
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'torment-nexus.local';

// ── Types ──────────────────────────────────────────────────────────────────

/** A stripped-down Action safe to send to the frontend (no function-bearing Outcomes) */
interface ClientAction {
  id: string;
  title: string;
  description: string;
  type?: string;
}

/** GameState variant safe to send over the wire */
type ClientGameState = Omit<GameState, 'map'> & {
  map?: Record<string, ClientAction[]>;
};

/** Outgoing week-results payload */
interface ClientWeekResults {
  results: Record<string, { outcomeId: string; description: string }>;
  updatedState: ClientGameState;
  assignments: Record<string, string>;
  items: ClientAction[];
  cityId: string;
}

// ── Persisted server state ─────────────────────────────────────────────────

interface PersistedState {
  gameStateWithoutMap: Omit<GameState, 'map'>;
  actionMapJson: string;
}

/** Full runtime state (with live Action/Outcome objects) */
let liveState: GameState | null = null;

/** Pending week results waiting for ACCEPT_WEEK_RESULTS */
let pendingWeekResults: {
  results: Record<string, Outcome>;
  updatedState: GameState;
  assignments: Record<string, string>;
  items: Action[];
  cityId: string;
} | null = null;

function loadPersistedState(): void {
  if (!fs.existsSync(STATE_FILE)) return;
  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf-8');
    const persisted: PersistedState = JSON.parse(raw);
    const map: ActionMap = deserializeActionMap(persisted.actionMapJson);
    liveState = { ...persisted.gameStateWithoutMap, map };
    console.log('[state] Loaded from', STATE_FILE);
  } catch (e) {
    console.error('[state] Failed to load persisted state:', e);
  }
}

function persistState(): void {
  if (!liveState) return;
  try {
    const { map, ...gameStateWithoutMap } = liveState;
    const actionMapJson = map ? serializeActionMap(map) : '{}';
    const persisted: PersistedState = { gameStateWithoutMap, actionMapJson };
    fs.writeFileSync(STATE_FILE, JSON.stringify(persisted, null, 2));
    console.log('[state] Saved to', STATE_FILE);
  } catch (e) {
    console.error('[state] Failed to persist state:', e);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function send(ws: WebSocket, message: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function toClientGameState(state: GameState): ClientGameState {
  const clientMap: Record<string, ClientAction[]> | undefined = state.map
    ? Object.fromEntries(
        Object.entries(state.map).map(([cityId, actions]) => [
          cityId,
          actions.map(a => ({ id: a.id, title: a.title, description: a.description, type: a.type })),
        ])
      )
    : undefined;
  const { map: _map, ...rest } = state;
  return { ...rest, map: clientMap };
}

// ── Message handlers ───────────────────────────────────────────────────────

function handleGetState(ws: WebSocket): void {
  if (!liveState) {
    send(ws, { type: 'NO_STATE' });
  } else {
    send(ws, { type: 'STATE', payload: toClientGameState(liveState) });
  }
}

async function handleInitReading(
  ws: WebSocket,
  payload: { selectedCards: Card[]; cultName: string; leaderName: string; cityId?: string }
): Promise<void> {
  const { selectedCards, cultName, leaderName, cityId } = payload;

  console.log('[reading] Starting INIT_READING for:', cultName, '/', leaderName);

  // Build game state template (pure logic, no LLM)
  const gameStateTemplate = await generateInitialGameState(selectedCards, cultName, leaderName, cityId);
  gameStateTemplate.cultName = cultName;
  gameStateTemplate.leader.name = leaderName;

  console.log('[reading] Game state template generated');

  // Stream narrative to client
  let narrativeText = '';
  const addToNarrative = (chunk: string) => {
    narrativeText += chunk;
    send(ws, { type: 'NARRATIVE_CHUNK', payload: chunk });
  };

  const fullNarrative = await getNarrative(selectedCards, gameStateTemplate, addToNarrative, OLLAMA_HOST);
  send(ws, { type: 'NARRATIVE_COMPLETE' });
  console.log('[reading] Narrative streaming complete');

  // Extract game state from narrative
  const extractedState = await getGameState(fullNarrative ?? '', gameStateTemplate, OLLAMA_HOST);
  if (!extractedState) {
    send(ws, { type: 'ERROR', payload: { message: 'Failed to extract game state from narrative.' } });
    return;
  }

  // Preserve user-provided names
  extractedState.cultName = cultName;
  extractedState.leader.name = leaderName;

  // Initialize action map for starting city
  const startCity = getCityById(extractedState.hqLocation) ?? CITIES[0];
  extractedState.map = { [startCity.id]: prototypeActionsForCity(startCity) };

  liveState = extractedState;
  pendingWeekResults = null;
  persistState();

  send(ws, { type: 'READING_DONE', payload: toClientGameState(liveState) });
  console.log('[reading] Done, state saved');
}

async function handleGenerateCultName(
  ws: WebSocket,
  payload: { mysteryId: string; horizonId: string }
): Promise<void> {
  const name = generateCultName(payload.mysteryId, payload.horizonId);
  send(ws, { type: 'CULT_NAME', payload: name });
}

function handleCompleteWeek(
  ws: WebSocket,
  payload: { assignments: Record<string, string>; cityId: string }
): void {
  if (!liveState) {
    send(ws, { type: 'ERROR', payload: { message: 'No active game state.' } });
    return;
  }

  const { assignments, cityId } = payload;
  const items = liveState.map?.[cityId] ?? [];

  console.log('[week] Completing week', liveState.week, 'with', Object.keys(assignments).length, 'assignments');

  const { results, updatedState } = completeWeek(assignments, items, liveState);

  // Build client-safe results (serialize outcome descriptions now, before potential state mutation)
  const clientResults: Record<string, { outcomeId: string; description: string }> = {};
  for (const [slotKey, outcome] of Object.entries(results)) {
    const followerId = slotKey.split(':')[0];
    const follower = liveState.followers.find(f => f.id === followerId);
    clientResults[slotKey] = {
      outcomeId: outcome.id,
      description: follower ? outcome.getDescription(follower) : outcome.id,
    };
  }

  // Store pending results for ACCEPT_WEEK_RESULTS
  pendingWeekResults = { results, updatedState, assignments, items, cityId };

  const clientPayload: ClientWeekResults = {
    results: clientResults,
    updatedState: toClientGameState(updatedState),
    assignments,
    items: items.map(a => ({ id: a.id, title: a.title, description: a.description, type: a.type })),
    cityId,
  };

  send(ws, { type: 'WEEK_RESULTS', payload: clientPayload });
}

function handleAcceptWeekResults(ws: WebSocket): void {
  if (!pendingWeekResults) {
    send(ws, { type: 'ERROR', payload: { message: 'No pending week results.' } });
    return;
  }

  const { results, updatedState, assignments, cityId } = pendingWeekResults;

  // Enact outcomes (mutates updatedState)
  enactCityActions(assignments, results, updatedState);

  // Sync action map (enacting may have added new actions)
  liveState = updatedState;

  // Ensure start city map exists after enactment
  if (liveState.map) {
    const city = getCityById(cityId);
    if (city && (!liveState.map[city.id] || liveState.map[city.id].length === 0)) {
      liveState.map[city.id] = prototypeActionsForCity(city);
    }
  }

  pendingWeekResults = null;
  persistState();

  console.log('[week] Results enacted, new week:', liveState.week);
  send(ws, { type: 'STATE', payload: toClientGameState(liveState) });
}

function handleLoadSample(ws: WebSocket): void {
  const hqLocation = 'new-orleans';
  const startCity = getCityById(hqLocation) ?? CITIES[0];

  const sampleState: GameState = {
    cultName: 'The Obsidian Circle',
    leader: {
      name: 'Alaric Thorne',
      background: 'Former archaeologist turned mystic after discovering an ancient artifact',
      archetype: 'hermit',
      traits: 'Charismatic, obsessive, scholarly',
      skills: ['research', 'occult-knowledge'],
    },
    discovery: {
      type: 'inheritance',
      artifact: {
        name: 'The Obsidian Mirror',
        description: 'A polished black stone mirror that reflects more than just light',
      },
      details: 'Found in a forgotten temple in the mountains, radiating otherworldly energy',
    },
    mystery: {
      type: 'eye',
      knownRituals: ['Ritual of Awakening', 'Circle of Protection'],
      paradigm: 'The world is a thin veil over deeper, stranger realities',
    },
    goal: {
      type: 'key',
      description: 'Unlock the secrets of the Obsidian Mirror and transcend mortal limitations',
    },
    followers: [
      {
        id: 'follower-1',
        name: 'Elena Voss',
        background: 'Disillusioned philosophy professor',
        location: hqLocation,
        traits: ['intellectual', 'curious'],
        skills: ['research', 'analysis'],
        slots: 1,
      },
      {
        id: 'follower-2',
        name: 'Marcus Chen',
        background: 'Former tech entrepreneur seeking meaning',
        location: hqLocation,
        traits: ['wealthy', 'ambitious'],
        skills: ['networking', 'wealth'],
        slots: 1,
      },
      {
        id: 'follower-3',
        name: 'Sofia Ramirez',
        background: 'Artist drawn to the occult',
        location: hqLocation,
        traits: ['creative', 'sensitive'],
        skills: ['artistic', 'occult-knowledge'],
        slots: 1,
      },
    ],
    hqLocation,
    week: 1,
    map: { [startCity.id]: prototypeActionsForCity(startCity) },
  };

  liveState = sampleState;
  pendingWeekResults = null;
  persistState();

  console.log('[sample] Sample state loaded');
  send(ws, { type: 'STATE', payload: toClientGameState(liveState) });
}

function handleReset(ws: WebSocket): void {
  liveState = null;
  pendingWeekResults = null;
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
    console.log('[reset] State file deleted');
  }
  send(ws, { type: 'RESET_OK' });
}

// ── Server bootstrap ───────────────────────────────────────────────────────

loadPersistedState();

const wss = new WebSocketServer({ port: PORT });
console.log(`[server] WebSocket server listening on ws://0.0.0.0:${PORT}`);

wss.on('connection', (ws, req) => {
  const clientAddr = req.socket.remoteAddress;
  console.log('[ws] Client connected from', clientAddr);

  ws.on('message', async (raw) => {
    let message: { type: string; payload?: any };
    try {
      message = JSON.parse(raw.toString());
    } catch {
      send(ws, { type: 'ERROR', payload: { message: 'Invalid JSON' } });
      return;
    }

    console.log('[ws] ←', message.type);

    try {
      switch (message.type) {
        case 'GET_STATE':
          handleGetState(ws);
          break;
        case 'INIT_READING':
          await handleInitReading(ws, message.payload);
          break;
        case 'GENERATE_CULT_NAME':
          await handleGenerateCultName(ws, message.payload);
          break;
        case 'COMPLETE_WEEK':
          handleCompleteWeek(ws, message.payload);
          break;
        case 'ACCEPT_WEEK_RESULTS':
          handleAcceptWeekResults(ws);
          break;
        case 'LOAD_SAMPLE':
          handleLoadSample(ws);
          break;
        case 'RESET':
          handleReset(ws);
          break;
        default:
          send(ws, { type: 'ERROR', payload: { message: `Unknown message type: ${message.type}` } });
      }
    } catch (e) {
      console.error('[ws] Handler error:', e);
      send(ws, { type: 'ERROR', payload: { message: String(e) } });
    }
  });

  ws.on('close', () => {
    console.log('[ws] Client disconnected from', clientAddr);
  });

  ws.on('error', (err) => {
    console.error('[ws] Error:', err);
  });
});
