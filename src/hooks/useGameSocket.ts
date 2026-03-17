/**
 * useGameSocket — React hook providing a shared WebSocket connection to the
 * game server (port 5174).
 *
 * Usage:
 *   const { send, subscribe, isConnected } = useGameSocket();
 *   const unsub = subscribe('STATE', (payload) => { ... });
 *   send({ type: 'GET_STATE' });
 *
 * The hook reconnects automatically with a 2-second delay.
 */

import { useEffect, useRef, useCallback } from 'react';

type MessageHandler = (payload: any) => void;

// ── Singleton connection state ─────────────────────────────────────────────
// Shared across all hook instances within the same page.

let socket: WebSocket | null = null;
const listeners = new Map<string, Set<MessageHandler>>();
const connectionListeners = new Set<(connected: boolean) => void>();
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let _isConnected = false;

function getServerUrl(): string {
  const host = window.location.hostname;
  return `ws://${host}:5174`;
}

function notifyConnectionState(connected: boolean): void {
  _isConnected = connected;
  connectionListeners.forEach(cb => cb(connected));
}

function dispatch(type: string, payload: any): void {
  const handlers = listeners.get(type);
  if (handlers) {
    handlers.forEach(h => h(payload));
  }
}

function connect(): void {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  const url = getServerUrl();
  console.log('[ws] Connecting to', url);
  socket = new WebSocket(url);

  socket.onopen = () => {
    console.log('[ws] Connected');
    notifyConnectionState(true);
    // Flush any messages that were sent before the socket was ready
    if (pendingMessages.length > 0) {
      console.log('[ws] Flushing', pendingMessages.length, 'queued message(s)');
      pendingMessages.forEach(msg => socket!.send(JSON.stringify(msg)));
      pendingMessages = [];
    }
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[ws] →', message.type);
      dispatch(message.type, message.payload);
    } catch (e) {
      console.error('[ws] Failed to parse message:', e);
    }
  };

  socket.onclose = () => {
    console.log('[ws] Disconnected, reconnecting in 2s...');
    notifyConnectionState(false);
    socket = null;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    reconnectTimer = setTimeout(connect, 2000);
  };

  socket.onerror = (err) => {
    console.error('[ws] Error:', err);
    // onclose will fire after onerror, triggering reconnect
  };
}

// Start connecting immediately when this module is imported
let pendingMessages: { type: string; payload?: any }[] = [];

if (typeof window !== 'undefined') {
  connect();
}

// ── Hook ───────────────────────────────────────────────────────────────────

export interface GameSocketAPI {
  send: (message: { type: string; payload?: any }) => void;
  subscribe: (type: string, handler: MessageHandler) => () => void;
  isConnected: () => boolean;
}

export function useGameSocket(): GameSocketAPI {
  // Force re-render when connection state changes by tracking it via ref
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const sendMsg = useCallback((message: { type: string; payload?: any }) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('[ws] ←', message.type);
      socket.send(JSON.stringify(message));
    } else {
      console.log('[ws] ← (queued)', message.type);
      pendingMessages.push(message);
    }
  }, []);

  const subscribe = useCallback((type: string, handler: MessageHandler): (() => void) => {
    if (!listeners.has(type)) {
      listeners.set(type, new Set());
    }
    listeners.get(type)!.add(handler);
    return () => {
      listeners.get(type)?.delete(handler);
    };
  }, []);

  const isConnected = useCallback(() => _isConnected, []);

  return { send: sendMsg, subscribe, isConnected };
}
