'use client';

import { useEffect, useRef, useState } from 'react';

export type LiveEvent =
  | { type: 'state' }
  | { type: 'friends' }
  | { type: 'message'; from: string }
  | { type: 'signal'; signal: { id: number; sessionId: string; from: string; type: string; payload: string } };

// One WebSocket to /api/live. The server pushes events here the moment
// something changes, so the page doesn't have to keep asking. Reconnects on
// its own; while it's down, the page falls back to polling.
export function useLive(onEvent: (e: LiveEvent) => void) {
  const [connected, setConnected] = useState(false);
  const handler = useRef(onEvent);
  handler.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let stopped = false;
    let retry = 0;
    let ping: ReturnType<typeof setInterval> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;

    const open = () => {
      if (stopped) return;
      const url = `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/live`;
      try {
        ws = new WebSocket(url);
      } catch {
        return schedule();
      }
      ws.onopen = () => {
        retry = 0;
        setConnected(true);
        handler.current({ type: 'state' }); // catch up on anything missed while offline
        ping = setInterval(() => ws?.readyState === WebSocket.OPEN && ws.send('ping'), 20_000);
      };
      ws.onmessage = (m) => {
        if (m.data === 'pong') return;
        try {
          handler.current(JSON.parse(String(m.data)) as LiveEvent);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        clearInterval(ping);
        schedule();
      };
      ws.onerror = () => ws?.close();
    };
    const schedule = () => {
      if (stopped) return;
      retry = Math.min(retry + 1, 6);
      reconnect = setTimeout(open, Math.min(30_000, 1000 * 2 ** retry));
    };

    open();
    return () => {
      stopped = true;
      clearInterval(ping);
      clearTimeout(reconnect);
      ws?.close();
    };
  }, []);

  return { connected };
}
