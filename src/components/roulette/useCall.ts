'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Video between up to three people: one RTCPeerConnection per pair. Signaling
// goes through /api/signal (polled). With Cloudflare TURN configured, media is
// relayed so nobody sees anyone's IP address.

interface IceConfig { iceServers: RTCIceServer[]; relayOnly: boolean }

async function postSignal(sessionId: string, to: string, type: string, payload: unknown) {
  await fetch('/api/signal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId, to, type, payload }) }).catch(() => {});
}

export function useLocalMedia() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let acquired: MediaStream | null = null;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser cannot open the camera. Try Chrome, Safari or Firefox over https or localhost.');
      return;
    }
    navigator.mediaDevices
      // 480p is plenty for a face and keeps calls smooth on mobile data and through the relay.
      .getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24, max: 30 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        acquired = s;
        setStream(s);
      })
      .catch(() => setError('Camera or microphone blocked. Allow access in your browser to be seen and heard.'));
    return () => {
      cancelled = true;
      acquired?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { stream, error };
}

interface Signal { id: number; from: string; type: string; payload: string }

interface Peer {
  pc: RTCPeerConnection;
  pendingIce: RTCIceCandidateInit[];
  offerer: boolean;
  restarts: number;
  restartTimer?: ReturnType<typeof setTimeout>;
}

// If a connection hasn't come up (or dropped) for this long, try a fresh route.
const RESTART_AFTER_MS = 6000;
const MAX_RESTARTS = 2;
const VIDEO_MAX_BITRATE = 600_000;

// Cap video so a weak network lowers the picture, not the voice.
async function tuneSenders(pc: RTCPeerConnection) {
  for (const sender of pc.getSenders()) {
    const kind = sender.track?.kind;
    if (!kind) continue;
    try {
      const p = sender.getParameters();
      if (!p.encodings?.length) continue;
      if (kind === 'video') {
        p.encodings[0].maxBitrate = VIDEO_MAX_BITRATE;
        (p as RTCRtpSendParameters & { degradationPreference?: string }).degradationPreference = 'balanced';
      }
      p.encodings[0].priority = kind === 'audio' ? 'high' : 'low';
      p.encodings[0].networkPriority = kind === 'audio' ? 'high' : 'low';
      await sender.setParameters(p);
    } catch {
      /* not every browser supports every field */
    }
  }
}

export function useMesh(myId: string, localStream: MediaStream | null, live: boolean) {
  const liveRef = useRef(live);
  liveRef.current = live;
  const [streams, setStreams] = useState<Record<string, MediaStream>>({});
  const [states, setStates] = useState<Record<string, RTCPeerConnectionState>>({});
  // When each person's video first came through, for the safe-start timers.
  const [connectedAt, setConnectedAt] = useState<Record<string, number>>({});
  // Since when each connection has been down (or not up yet), for giving up on it.
  const [downSince, setDownSince] = useState<Record<string, number>>({});
  const [relayOnly, setRelayOnly] = useState(false);
  const peers = useRef(new Map<string, Peer>());
  const sessionRef = useRef<string | null>(null);
  const cursor = useRef(0);
  const poll = useRef<ReturnType<typeof setInterval> | null>(null);
  const ice = useRef<Promise<IceConfig> | null>(null);
  const localRef = useRef(localStream);
  localRef.current = localStream;

  const iceConfig = useCallback(() => {
    if (!ice.current) {
      ice.current = fetch('/api/ice')
        .then((r) => r.json() as Promise<IceConfig>)
        .then((c) => {
          setRelayOnly(c.relayOnly);
          return c;
        })
        .catch(() => ({ iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }], relayOnly: false }));
    }
    return ice.current;
  }, []);

  const closePeer = useCallback((id: string) => {
    const p = peers.current.get(id);
    if (!p) return;
    clearTimeout(p.restartTimer);
    p.pc.close();
    peers.current.delete(id);
    setStreams((s) => {
      const { [id]: _gone, ...rest } = s;
      return rest;
    });
    setStates((s) => {
      const { [id]: _gone, ...rest } = s;
      return rest;
    });
    setConnectedAt((s) => {
      const { [id]: _gone, ...rest } = s;
      return rest;
    });
    setDownSince((s) => {
      const { [id]: _gone, ...rest } = s;
      return rest;
    });
  }, []);

  // A fresh offer with new ICE candidates: finds a new route after a network
  // change or a failed first attempt. Only the offerer starts it, so the two
  // sides never both send offers at once.
  const restartIce = useCallback(async (sessionId: string, peerId: string) => {
    const p = peers.current.get(peerId);
    if (!p || !p.offerer || sessionRef.current !== sessionId || p.restarts >= MAX_RESTARTS) return;
    if (p.pc.connectionState === 'connected' || p.pc.signalingState !== 'stable') return;
    p.restarts++;
    try {
      await p.pc.setLocalDescription(await p.pc.createOffer({ iceRestart: true }));
      await postSignal(sessionId, peerId, 'offer', p.pc.localDescription);
    } catch (err) {
      console.warn('ice restart failed', err);
    }
  }, []);

  const scheduleRestart = useCallback(
    (sessionId: string, peerId: string) => {
      const p = peers.current.get(peerId);
      if (!p) return;
      clearTimeout(p.restartTimer);
      p.restartTimer = setTimeout(() => void restartIce(sessionId, peerId), RESTART_AFTER_MS);
    },
    [restartIce],
  );

  const stopAll = useCallback(() => {
    if (poll.current) clearInterval(poll.current);
    poll.current = null;
    Array.from(peers.current.keys()).forEach(closePeer);
    sessionRef.current = null;
    cursor.current = 0;
  }, [closePeer]);

  const ensurePeer = useCallback(
    async (sessionId: string, peerId: string): Promise<Peer | null> => {
      const existing = peers.current.get(peerId);
      if (existing) return existing;
      const cfg = await iceConfig();
      if (sessionRef.current !== sessionId) return null;
      if (peers.current.has(peerId)) return peers.current.get(peerId)!;

      const pc = new RTCPeerConnection({ iceServers: cfg.iceServers, iceTransportPolicy: cfg.relayOnly ? 'relay' : 'all' });
      // The person with the smaller id makes the offer, so both sides agree.
      const peer: Peer = { pc, pendingIce: [], offerer: myId < peerId, restarts: 0 };
      peers.current.set(peerId, peer);
      setDownSince((s) => ({ ...s, [peerId]: Date.now() }));
      scheduleRestart(sessionId, peerId);

      const local = localRef.current;
      if (local) local.getTracks().forEach((t) => pc.addTrack(t, local));
      else {
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });
      }
      const remote = new MediaStream();
      pc.ontrack = (e) => {
        (e.streams[0]?.getTracks() ?? [e.track]).forEach((t) => {
          if (!remote.getTracks().includes(t)) remote.addTrack(t);
        });
        setStreams((s) => ({ ...s, [peerId]: new MediaStream(remote.getTracks()) }));
      };
      pc.onicecandidate = (e) => {
        if (e.candidate && sessionRef.current === sessionId) postSignal(sessionId, peerId, 'ice', e.candidate.toJSON());
      };
      pc.onconnectionstatechange = () => {
        const st = pc.connectionState;
        setStates((s) => ({ ...s, [peerId]: st }));
        if (st === 'connected') {
          clearTimeout(peer.restartTimer);
          peer.restarts = 0;
          setConnectedAt((s) => (s[peerId] ? s : { ...s, [peerId]: Date.now() }));
          setDownSince((s) => {
            const { [peerId]: _up, ...rest } = s;
            return rest;
          });
          void tuneSenders(pc);
        } else if (st === 'disconnected' || st === 'failed') {
          setDownSince((s) => (s[peerId] ? s : { ...s, [peerId]: Date.now() }));
          if (st === 'failed') void restartIce(sessionId, peerId);
          else scheduleRestart(sessionId, peerId);
        }
      };

      if (peer.offerer) {
        await pc.setLocalDescription(await pc.createOffer());
        await postSignal(sessionId, peerId, 'offer', pc.localDescription);
      }
      return peer;
    },
    [iceConfig, myId, restartIce, scheduleRestart],
  );

  // Signals arrive two ways: pushed over the WebSocket (instant) or fetched by a
  // fallback poll. Each one is applied once, in order, whichever way it came.
  const seen = useRef(new Set<number>());
  const chain = useRef<Promise<void>>(Promise.resolve());

  const apply = useCallback(
    (sessionId: string, list: Signal[]) => {
      chain.current = chain.current.then(async () => {
        for (const s of list) {
          if (sessionRef.current !== sessionId || seen.current.has(s.id)) continue;
          seen.current.add(s.id);
          const peer = await ensurePeer(sessionId, s.from);
          if (!peer) continue;
          const { pc } = peer;
          const data = JSON.parse(s.payload);
          try {
            if (s.type === 'offer') {
              await pc.setRemoteDescription(data);
              for (const c of peer.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
              await pc.setLocalDescription(await pc.createAnswer());
              await postSignal(sessionId, s.from, 'answer', pc.localDescription);
            } else if (s.type === 'answer' && pc.signalingState === 'have-local-offer') {
              await pc.setRemoteDescription(data);
              for (const c of peer.pendingIce.splice(0)) await pc.addIceCandidate(c).catch(() => {});
            } else if (s.type === 'ice') {
              if (pc.remoteDescription) await pc.addIceCandidate(data).catch(() => {});
              else peer.pendingIce.push(data);
            }
          } catch (err) {
            console.warn('signal error', err);
          }
        }
      });
    },
    [ensurePeer],
  );

  const pollSignals = useCallback(
    async (sessionId: string) => {
      const res = await fetch(`/api/signal?sessionId=${sessionId}&after=${cursor.current}`).catch(() => null);
      if (!res?.ok || sessionRef.current !== sessionId) return;
      const { signals } = (await res.json()) as { signals: Signal[] };
      if (signals.length) cursor.current = Math.max(cursor.current, ...signals.map((x) => x.id));
      apply(sessionId, signals);
    },
    [apply],
  );

  // Called with a signal pushed over the WebSocket.
  const ingest = useCallback(
    (sig: Signal & { sessionId: string }) => {
      if (sig.sessionId === sessionRef.current) apply(sig.sessionId, [sig]);
    },
    [apply],
  );

  // Keep one connection per person currently in the call.
  const sync = useCallback(
    (sessionId: string | null, peerIds: string[]) => {
      if (sessionId !== sessionRef.current) {
        stopAll();
        if (!sessionId) return;
        sessionRef.current = sessionId;
        seen.current = new Set();
        // Fast polling only when the WebSocket is down; otherwise a slow safety net.
        let last = 0;
        poll.current = setInterval(() => {
          if (liveRef.current && Date.now() - last < 5000) return;
          last = Date.now();
          void pollSignals(sessionId);
        }, 700);
      }
      if (!sessionId) return;
      Array.from(peers.current.keys()).forEach((id) => !peerIds.includes(id) && closePeer(id));
      peerIds.forEach((id) => void ensurePeer(sessionId, id));
    },
    [closePeer, ensurePeer, pollSignals, stopAll],
  );

  useEffect(() => stopAll, [stopAll]);

  // Switched WiFi to mobile data, or the network came back: find a new route at once.
  useEffect(() => {
    const onOnline = () => {
      const sid = sessionRef.current;
      if (!sid) return;
      peers.current.forEach((p, id) => {
        if (p.pc.connectionState !== 'connected') {
          p.restarts = 0;
          void restartIce(sid, id);
        }
      });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [restartIce]);

  return { streams, states, connectedAt, downSince, relayOnly, sync, stopAll, ingest };
}

// A moving test pattern used for the solo "demo match" when nobody else is online.
export function makeDemoStream(name: string): { stream: MediaStream; dispose: () => void } {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d')!;
  let frame = 0;
  let raf = 0;
  const draw = () => {
    frame++;
    ctx.fillStyle = '#16202E';
    ctx.fillRect(0, 0, 640, 480);
    const bob = Math.sin(frame / 30) * 6;
    ctx.fillStyle = 'rgba(255,255,255,.10)';
    ctx.beginPath();
    ctx.arc(320, 190 + bob, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(320, 480 + bob, 170, 150, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.font = '600 22px Geist, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${name} (demo)`, 320, 60);
    raf = requestAnimationFrame(draw);
  };
  draw();
  const stream = canvas.captureStream(24);
  return { stream, dispose: () => { cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()); } };
}

export function chime() {
  try {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const t = ctx.currentTime + i * 0.09;
      o.frequency.value = f;
      o.type = 'sine';
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g);
      g.connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
    setTimeout(() => ctx.close().catch(() => {}), 1000);
  } catch {
    /* audio is a nice-to-have */
  }
}
