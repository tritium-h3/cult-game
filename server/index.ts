/**
 * Cult Game WebSocket Server
 * Port 5274 — owns all game logic, LLM interactions, and per-game state.
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
  getAvailableActionsForCity,
} from '../src/game/actions';
import { getCityById, CITIES } from '../src/game/world';
import { generateWorldState } from '../src/game/worldGen';
import { generateCorrespondenceParams } from '../src/game/magic/correspondence';
import type { MagicWorldState } from '../src/game/magic/types';
import {
  generateInitialGameState,
  generateCultName,
  getNarrative,
  getGameState,
} from '../src/game/reading';
import type { GameState, WorldState, Action, Outcome, Card, HookType, Verb } from '../src/game/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = path.join(__dirname, 'games');
const PORT = 5274;
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

/** What gets written to disk for each game (both are plain JSON-serialisable) */
interface PendingWeekResults {
  results: Record<string, Outcome>;
  updatedState: GameState;
  assignments: Record<string, string>;
  items: Action[];
  cityId: string;
}

interface GameEntry {
  world: WorldState;
  state: GameState;
  pending: PendingWeekResults | null;
}

// ── Game store ─────────────────────────────────────────────────────────────

const games = new Map<string, GameEntry>();

function gameDir(gameId: string): string {
  return path.join(GAMES_DIR, gameId);
}

function loadAllGames(): void {
  const entries = fs.readdirSync(GAMES_DIR, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory());
  for (const dir of dirs) {
    const gameId = dir.name;
    const worldPath = path.join(GAMES_DIR, gameId, 'world.json');
    const gamePath  = path.join(GAMES_DIR, gameId, 'game.json');
    try {
      if (!fs.existsSync(worldPath) || !fs.existsSync(gamePath)) {
        console.log(`[state] Skipping incomplete game directory ${gameId}`);
        continue;
      }
      const world = JSON.parse(fs.readFileSync(worldPath, 'utf-8')) as WorldState;
      const state = JSON.parse(fs.readFileSync(gamePath,  'utf-8')) as GameState;
      games.set(gameId, { world, state, pending: null });
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
    const dir = gameDir(gameId);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'world.json'), JSON.stringify(entry.world, null, 2));
    fs.writeFileSync(path.join(dir, 'game.json'),  JSON.stringify(entry.state, null, 2));
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

function toClientGameState(state: GameState, world: WorldState): ClientGameState {
  const clientMap: Record<string, ClientAction[]> = {};
  for (const cityId of world.cities) {
    const cityActions = getAvailableActionsForCity(cityId, world, state);
      clientMap[cityId] = cityActions.map(a => ({
      id: a.id,
      title: a.title,
      description: a.description,
      types: a.types,
    }));
  }
  return { ...state, map: clientMap };
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
    send(ws, { type: 'STATE', payload: { gameId, state: toClientGameState(entry.state, entry.world) } });
  }
}

// Which hook type to use for initial discovery, based on the gateway (discovery) card
const GATEWAY_TO_HOOK_TYPE: Record<string, HookType> = {
  'inheritance': 'text',
  'accident':    'site',
  'bargain':     'person',
  'dream':       'gathering',
  'theft':       'institution',
};

async function handleInitReading(
  ws: WebSocket,
  payload: { selectedCards: Card[]; cultName: string; leaderName: string; cityId?: string }
): Promise<void> {
  const { selectedCards, cultName, leaderName, cityId } = payload;
  const gameId = randomUUID();

  console.log(`[reading] New game ${gameId}: INIT_READING for ${cultName} / ${leaderName}`);

  // ── Step 1: Procedural mechanical generation ───────────────────────────
  const gameState = await generateInitialGameState(selectedCards, cultName, leaderName, cityId);
  gameState.cultName = cultName;
  gameState.leader.name = leaderName;

  // ── Step 2: World generation ───────────────────────────────────────────
  const worldState = generateWorldState(gameState.hqLocation);

  // ── Step 3: Seed one non-starter discovery based on gateway card ────────
  const gatewayId = selectedCards[1]?.id ?? 'inheritance';
  const initialType = GATEWAY_TO_HOOK_TYPE[gatewayId] ?? 'text';
  const hqItems = worldState.items[gameState.hqLocation] ?? [];

  const initialDiscovered: string[] = [];
  // Find the first hidden (non-starter) item matching the gateway type
  const matchingItem = hqItems.find(item => !item.starterHook && item.types.includes(initialType));
  if (matchingItem) initialDiscovered.push(matchingItem.id);

  if (initialDiscovered.length > 0) {
    gameState.discoveredItems[gameState.hqLocation] = initialDiscovered;
    console.log(`[reading] Pre-discovered items: ${initialDiscovered.join(', ')}`);
  }

  // ── Step 4: LLM narrative (flavor only — mechanics are already complete) ─
  let narrativeText = '';
  const addToNarrative = (chunk: string) => {
    narrativeText += chunk;
    send(ws, { type: 'NARRATIVE_CHUNK', payload: chunk });
  };

  const fullNarrative = await getNarrative(selectedCards, gameState, addToNarrative, OLLAMA_HOST);
  send(ws, { type: 'NARRATIVE_COMPLETE' });
  console.log(`[reading] Narrative complete for game ${gameId}`);

  // ── Step 5: LLM fills in flavor text fields only ───────────────────────
  const flavorState = await getGameState(fullNarrative ?? '', gameState, OLLAMA_HOST);
  if (flavorState) {
    // Cherry-pick only flavor/narrative text — never mechanical fields
    gameState.leader.background = flavorState.leader.background || gameState.leader.background;
    gameState.leader.traits     = flavorState.leader.traits     || gameState.leader.traits;
    gameState.discovery.artifact.description = flavorState.discovery?.artifact?.description || gameState.discovery.artifact.description;
    gameState.discovery.details              = flavorState.discovery?.details              || gameState.discovery.details;
    gameState.mystery.knownRituals           = flavorState.mystery?.knownRituals           || gameState.mystery.knownRituals;
    gameState.mystery.paradigm               = flavorState.mystery?.paradigm               || gameState.mystery.paradigm;
    gameState.goal.description               = flavorState.goal?.description               || gameState.goal.description;
    for (let i = 0; i < gameState.followers.length; i++) {
      if (flavorState.followers?.[i]?.background) {
        gameState.followers[i].background = flavorState.followers[i].background;
      }
    }
    console.log(`[reading] Flavor fields applied for game ${gameId}`);
  } else {
    console.warn(`[reading] LLM flavor extraction failed for game ${gameId} — using procedural defaults`);
  }

  // ── Step 6: Persist ───────────────────────────────────────────────────
  games.set(gameId, { world: worldState, state: gameState, pending: null });
  persistGame(gameId);

  send(ws, { type: 'READING_DONE', payload: { gameId, state: toClientGameState(gameState, worldState) } });
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

  const items = getAvailableActionsForCity(cityId, entry.world, entry.state);
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
    updatedState: toClientGameState(updatedState, entry.world),
    assignments,
    items: items.map(a => ({ id: a.id, title: a.title, description: a.description, types: a.types })),
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

  persistGame(gameId);
  console.log(`[week] Game ${gameId}: results enacted, now week ${entry.state.week}`);
  send(ws, { type: 'STATE', payload: { gameId, state: toClientGameState(entry.state, entry.world) } });
}

function handleLoadSample(ws: WebSocket): void {
  const gameId = randomUUID();
  const hqLocation = 'new-orleans';

  const sampleState: GameState = {
    cultName: 'The Obsidian Circle',
    leader: {
      name: 'Alaric Thorne',
      background: 'Former archaeologist turned mystic after discovering an ancient artifact',
      archetype: 'hermit',
      traits: 'Charismatic, obsessive, scholarly',
      verbs: ['Study', 'Explore'] as Verb[],
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
        verbs: ['Study', 'Talk'] as Verb[],
      },
      {
        id: 'follower-2',
        name: 'Marcus Chen',
        background: 'Former tech entrepreneur seeking meaning',
        location: hqLocation,
        traits: ['wealthy', 'ambitious'],
        verbs: ['Work', 'Talk'] as Verb[],
      },
      {
        id: 'follower-3',
        name: 'Sofia Ramirez',
        background: 'Artist drawn to the occult',
        location: hqLocation,
        traits: ['creative', 'sensitive'],
        verbs: ['Perform', 'Explore'] as Verb[],
      },
    ],
    hqLocation,
    week: 1,
    discoveredItems: {},
  };

  // Generate world and seed starting discoveries for sample game
  const worldState = generateWorldState(hqLocation);
  const hqItems = worldState.items[hqLocation] ?? [];
  // Pre-discover first book and first patron so there are hook cards immediately
  // Pre-discover the first hidden text and first hidden person hook
  const startingDiscovered = [
    hqItems.find(i => !i.starterHook && i.types.includes('text'))?.id,
    hqItems.find(i => !i.starterHook && i.types.includes('person'))?.id,
  ].filter(Boolean) as string[];
  if (startingDiscovered.length > 0) {
    sampleState.discoveredItems[hqLocation] = startingDiscovered;
  }

  games.set(gameId, { world: worldState, state: sampleState, pending: null });
  persistGame(gameId);

  console.log(`[sample] Sample game ${gameId} loaded`);
  send(ws, { type: 'STATE', payload: { gameId, state: toClientGameState(sampleState, worldState) } });
}

function handleInitMagicProto(ws: WebSocket): void {
  // Pick a random city and generate items + correspondence params.
  // Ephemeral — nothing is persisted; the client owns this state for the session.
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];
  const worldState = generateWorldState(city.id, 1);
  const items = worldState.items[city.id] ?? [];

  const params = generateCorrespondenceParams(items);
  const magic: MagicWorldState = { grammar: 'correspondence', params };

  console.log(`[magic] Generated correspondence world for city "${city.name}" (${items.length} items)`);
  send(ws, { type: 'MAGIC_PROTO_STATE', payload: { cityName: city.name, items, magic } });
}

function handleReset(ws: WebSocket, gameId: string | undefined): void {
  if (gameId) {
    games.delete(gameId);
    const dir = gameDir(gameId);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true });
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
        case 'INIT_MAGIC_PROTO':
          handleInitMagicProto(ws);
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
