/**
 * Cult Game WebSocket Server
 * Port 5174 — owns all game logic, LLM interactions, and per-game state.
 *
 * Each game has a UUID. The frontend stores its gameId in localStorage and
 * includes it in every message that requires game context.
 *
 * Protocol:
 *   Client → Server: { type, payload? }
 *   Server → Client: { type, payload? }
 */

import { WebSocketServer, WebSocket } from 'ws';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

import {
  completeWeek,
  enactCityActions,
  serializeActionMap,
  deserializeActionMap,
  prototypeActionsForCity,
} from '../src/game/actions';
import { getCityById, CITIES } from '../src/game/world';
import {
  generateInitialGameState,
  generateCultName,
  getNarrative,
  getGameState,
} from '../src/game/reading';
import type { GameState, Action, Outcome, Card, ActionMap } from '../src/game/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = path.join(__dirname, 'games');
const PORT = 5174;
const OLLAMA_HOST = process.env.OLLAMA_HOST ?? 'torment-nexus.local';

// Ensure games directory exists on startup
if (!fs.existsSync(GAMES_DIR)) {
  fs.mkdirSync(GAMES_DIR, { recursive: true });
}

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
  gameId: string;
  results: Record<string, { outcomeId: string; description: string }>;
  updatedState: ClientGameState;
  assignments: Record<string, string>;
  items: ClientAction[];
  cityId: string;
}

// ── Persistence types ──────────────────────────────────────────────────────

interface PersistedState {
  gameStateWithoutMap: Omit<GameState, 'map'>;
  actionMapJson: string;
}

interface PendingWeekResults {
  results: Record<string, Outcome>;
  updatedState: GameState;
  assignments: Record<string, string>;
  items: Action[];
  cityId: string;
}

interface GameEntry {
  state: GameState;
  pending: PendingWeekResults | null;
}

// ── Game store ─────────────────────────────────────────────────────────────

const games = new Map<string, GameEntry>();

function gameFilePath(gameId: string): string {
  return path.join(GAMES_DIR, `${gameId}.json`);
}

function loadAllGames(): void {
  const files = fs.readdirSync(GAMES_DIR).filter(f => f.endsWith('.json'));
  for (const file of files) {
    const gameId = path.basename(file, '.json');
    try {
      const raw = fs.readFileSync(path.join(GAMES_DIR, file), 'utf-8');
      const persisted: PersistedState = JSON.parse(raw);
      const map: ActionMap = deserializeActionMap(persisted.actionMapJson);
      games.set(gameId, { state: { ...persisted.gameStateWithoutMap, map }, pending: null });
      console.log(`[state] Loaded game ${gameId}`);
    } catch (e) {
      console.error(`[state] Failed to load game ${gameId}:`, e);
    }
  }
  console.log(`[state] Loaded ${games.size} game(s)`);
}

function persistGame(gameId: string): void {
  const entry = games.get(gameId);
  if (!entry) return;
  try {
    const { map, ...gameStateWithoutMap } = entry.state;
    const actionMapJson = map ? serializeActionMap(map) : '{}';
    fs.writeFileSync(gameFilePath(gameId), JSON.stringify({ gameStateWithoutMap, actionMapJson }, null, 2));
    console.log(`[state] Saved game ${gameId}`);
  } catch (e) {
    console.error(`[state] Failed to persist game ${gameId}:`, e);
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

function handleGetState(ws: WebSocket, gameId: string | undefined): void {
  if (!gameId) {
    send(ws, { type: 'NO_STATE' });
    return;
  }
  const entry = games.get(gameId);
  if (!entry) {
    send(ws, { type: 'NO_STATE' });
  } else {
    send(ws, { type: 'STATE', payload: { gameId, state: toClientGameState(entry.state) } });
  }
}

async function handleInitReading(
  ws: WebSocket,
  payload: { selectedCards: Card[]; cultName: string; leaderName: string; cityId?: string }
): Promise<void> {
  const { selectedCards, cultName, leaderName, cityId } = payload;
  const gameId = randomUUID();

  console.log(`[reading] New game ${gameId}: INIT_READING for ${cultName} / ${leaderName}`);

  const gameStateTemplate = await generateInitialGameState(selectedCards, cultName, leaderName, cityId);
  gameStateTemplate.cultName = cultName;
  gameStateTemplate.leader.name = leaderName;

  let narrativeText = '';
  const addToNarrative = (chunk: string) => {
    narrativeText += chunk;
    send(ws, { type: 'NARRATIVE_CHUNK', payload: chunk });
  };

  const fullNarrative = await getNarrative(selectedCards, gameStateTemplate, addToNarrative, OLLAMA_HOST);
  send(ws, { type: 'NARRATIVE_COMPLETE' });
  console.log(`[reading] Narrative complete for game ${gameId}`);

  const extractedState = await getGameState(fullNarrative ?? '', gameStateTemplate, OLLAMA_HOST);
  if (!extractedState) {
    send(ws, { type: 'ERROR', payload: { message: 'Failed to extract game state from narrative.' } });
    return;
  }

  extractedState.cultName = cultName;
  extractedState.leader.name = leaderName;

  const startCity = getCityById(extractedState.hqLocation) ?? CITIES[0];
  extractedState.map = { [startCity.id]: prototypeActionsForCity(startCity) };

  games.set(gameId, { state: extractedState, pending: null });
  persistGame(gameId);

  send(ws, { type: 'READING_DONE', payload: { gameId, state: toClientGameState(extractedState) } });
  console.log(`[reading] Game ${gameId} saved`);
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
  payload: { gameId: string; assignments: Record<string, string>; cityId: string }
): void {
  const { gameId, assignments, cityId } = payload;
  const entry = games.get(gameId);
  if (!entry) {
    send(ws, { type: 'ERROR', payload: { message: `Game not found: ${gameId}` } });
    return;
  }

  const items = entry.state.map?.[cityId] ?? [];
  console.log(`[week] Game ${gameId}: completing week ${entry.state.week} with ${Object.keys(assignments).length} assignments`);

  const { results, updatedState } = completeWeek(assignments, items, entry.state);

  const clientResults: Record<string, { outcomeId: string; description: string }> = {};
  for (const [slotKey, outcome] of Object.entries(results)) {
    const followerId = slotKey.split(':')[0];
    const follower = entry.state.followers.find(f => f.id === followerId);
    clientResults[slotKey] = {
      outcomeId: outcome.id,
      description: follower ? outcome.getDescription(follower) : outcome.id,
    };
  }

  entry.pending = { results, updatedState, assignments, items, cityId };

  const clientPayload: ClientWeekResults = {
    gameId,
    results: clientResults,
    updatedState: toClientGameState(updatedState),
    assignments,
    items: items.map(a => ({ id: a.id, title: a.title, description: a.description, type: a.type })),
    cityId,
  };

  send(ws, { type: 'WEEK_RESULTS', payload: clientPayload });
}

function handleAcceptWeekResults(ws: WebSocket, gameId: string | undefined): void {
  if (!gameId) {
    send(ws, { type: 'ERROR', payload: { message: 'gameId required for ACCEPT_WEEK_RESULTS' } });
    return;
  }
  const entry = games.get(gameId);
  if (!entry || !entry.pending) {
    send(ws, { type: 'ERROR', payload: { message: `No pending week results for game: ${gameId}` } });
    return;
  }

  const { results, updatedState, assignments, cityId } = entry.pending;

  enactCityActions(assignments, results, updatedState);

  entry.state = updatedState;
  entry.pending = null;

  if (entry.state.map) {
    const city = getCityById(cityId);
    if (city && (!entry.state.map[city.id] || entry.state.map[city.id].length === 0)) {
      entry.state.map[city.id] = prototypeActionsForCity(city);
    }
  }

  persistGame(gameId);
  console.log(`[week] Game ${gameId}: results enacted, now week ${entry.state.week}`);
  send(ws, { type: 'STATE', payload: { gameId, state: toClientGameState(entry.state) } });
}

function handleLoadSample(ws: WebSocket): void {
  const gameId = randomUUID();
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

  games.set(gameId, { state: sampleState, pending: null });
  persistGame(gameId);

  console.log(`[sample] Sample game ${gameId} loaded`);
  send(ws, { type: 'STATE', payload: { gameId, state: toClientGameState(sampleState) } });
}

function handleReset(ws: WebSocket, gameId: string | undefined): void {
  if (gameId) {
    games.delete(gameId);
    const fp = gameFilePath(gameId);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log(`[reset] Game ${gameId} deleted`);
    }
  }
  send(ws, { type: 'RESET_OK' });
}

// ── Server bootstrap ───────────────────────────────────────────────────────

loadAllGames();

const wss = new WebSocketServer({ port: PORT });
console.log(`[server] WebSocket server listening on ws://0.0.0.0:${PORT}`);
console.log(`[server] Games directory: ${GAMES_DIR}`);

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

    console.log('[ws] ←', message.type, message.payload?.gameId ? `(game ${message.payload.gameId.slice(0, 8)}…)` : '');

    try {
      switch (message.type) {
        case 'GET_STATE':
          handleGetState(ws, message.payload?.gameId);
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
          handleAcceptWeekResults(ws, message.payload?.gameId);
          break;
        case 'LOAD_SAMPLE':
          handleLoadSample(ws);
          break;
        case 'RESET':
          handleReset(ws, message.payload?.gameId);
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
