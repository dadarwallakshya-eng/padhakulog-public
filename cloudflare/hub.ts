import { DurableObject } from 'cloudflare:workers';

// One Durable Object holds every open WebSocket, tagged with the user's id.
// The app tells it "send this event to these users" and it pushes instantly,
// so browsers no longer have to keep asking. Sockets hibernate between
// messages and "ping"/"pong" is answered without waking the object, so idle
// connections cost nothing.
export class Hub extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as never);
    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === '/connect') {
      const userId = req.headers.get('x-user-id');
      if (!userId || req.headers.get('Upgrade') !== 'websocket') return new Response('Bad request', { status: 400 });
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server, [userId]);
      return new Response(null, { status: 101, webSocket: client });
    }

    if (url.pathname === '/notify' && req.method === 'POST') {
      const { userIds, event } = (await req.json()) as { userIds: string[]; event: unknown };
      const text = JSON.stringify(event);
      let delivered = 0;
      for (const id of new Set(userIds)) {
        for (const ws of this.ctx.getWebSockets(id)) {
          try {
            ws.send(text);
            delivered++;
          } catch {
            /* socket already closing */
          }
        }
      }
      return Response.json({ delivered });
    }

    return new Response('Not found', { status: 404 });
  }

  // Browsers never send anything but pings (auto-answered above).
  async webSocketMessage() {}

  async webSocketClose(ws: WebSocket, code: number) {
    try {
      ws.close(code === 1005 ? 1000 : code, 'bye');
    } catch {
      /* already closed */
    }
  }
}
