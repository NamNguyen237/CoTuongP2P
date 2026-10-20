import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 3000;

app.use(express.json());

// In-memory room manager for WebRTC signaling and relay backup
interface PeerInfo {
  id: string;
  name: string;
  role: 'red' | 'black' | 'spectator' | 'coop';
  ws: WebSocket;
  connectedAt: number;
}

interface Room {
  id: string;
  name?: string;
  mode: 'p2p-1v1' | 'coop-ai' | 'coop-analysis';
  peers: Map<string, PeerInfo>;
  createdAt: number;
  lastActive: number;
  gameState?: any;
}

const rooms = new Map<string, Room>();

// Cleanup stale rooms older than 6 hours
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    if (room.peers.size === 0 && now - room.lastActive > 1000 * 60 * 60) {
      rooms.delete(roomId);
    }
  }
}, 1000 * 60 * 15);

// WebSocket signaling server
const wss = new WebSocketServer({ server, path: '/ws-signal' });

wss.on('connection', (ws: WebSocket) => {
  let currentRoomId: string | null = null;
  let currentPeerId: string | null = null;

  ws.on('message', (messageRaw: string) => {
    try {
      const msg = JSON.parse(messageRaw.toString());

      switch (msg.type) {
        // Room join request
        case 'join-room': {
          const { roomId, peerId, playerName, mode, preferredRole } = msg;
          if (!roomId || !peerId) return;

          currentRoomId = String(roomId).toUpperCase().trim();
          currentPeerId = String(peerId);

          let room = rooms.get(currentRoomId);
          if (!room) {
            room = {
              id: currentRoomId,
              mode: mode || 'p2p-1v1',
              peers: new Map(),
              createdAt: Date.now(),
              lastActive: Date.now(),
            };
            rooms.set(currentRoomId, room);
          }

          const targetRoom = room;
          targetRoom.lastActive = Date.now();

          // Determine role
          let assignedRole: 'red' | 'black' | 'spectator' | 'coop' = preferredRole || 'red';
          const existingRoles = Array.from(targetRoom.peers.values()).map(p => p.role);

          if (targetRoom.mode === 'coop-ai' || targetRoom.mode === 'coop-analysis') {
            assignedRole = 'coop';
          } else {
            if (existingRoles.includes('red') && assignedRole === 'red') {
              assignedRole = existingRoles.includes('black') ? 'spectator' : 'black';
            } else if (existingRoles.includes('black') && assignedRole === 'black') {
              assignedRole = existingRoles.includes('red') ? 'spectator' : 'red';
            }
          }

          const peerInfo: PeerInfo = {
            id: currentPeerId,
            name: playerName || `Kỳ thủ ${currentPeerId.slice(0, 4)}`,
            role: assignedRole,
            ws,
            connectedAt: Date.now(),
          };

          targetRoom.peers.set(currentPeerId, peerInfo);

          // Notify joined peer
          const peerList = Array.from(targetRoom.peers.values()).map(p => ({
            id: p.id,
            name: p.name,
            role: p.role,
          }));

          ws.send(JSON.stringify({
            type: 'room-joined',
            roomId: targetRoom.id,
            peerId: currentPeerId,
            role: assignedRole,
            mode: targetRoom.mode,
            peers: peerList,
            gameState: targetRoom.gameState,
          }));

          // Broadcast to other peers in room
          for (const [otherId, otherPeer] of targetRoom.peers.entries()) {
            if (otherId !== currentPeerId && otherPeer.ws.readyState === WebSocket.OPEN) {
              otherPeer.ws.send(JSON.stringify({
                type: 'peer-joined',
                peer: { id: peerInfo.id, name: peerInfo.name, role: peerInfo.role },
                peers: peerList,
              }));
            }
          }
          break;
        }

        // WebRTC Signaling messages (offer, answer, ice-candidate)
        case 'signal': {
          const { targetPeerId, signalData } = msg;
          const roomId = (msg.roomId || currentRoomId)?.toUpperCase().trim();
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room) return;

          const target = room.peers.get(targetPeerId);
          if (target && target.ws.readyState === WebSocket.OPEN) {
            target.ws.send(JSON.stringify({
              type: 'signal',
              fromPeerId: currentPeerId,
              signalData,
            }));
          }
          break;
        }

        // Real-time message relay (guaranteed delivery across all networks)
        case 'relay-message': {
          const roomId = (msg.roomId || currentRoomId)?.toUpperCase().trim();
          const peerId = msg.peerId || currentPeerId;
          if (!roomId) return;
          const room = rooms.get(roomId);
          if (!room) return;

          room.lastActive = Date.now();
          if (msg.payload?.type === 'move' && msg.payload?.state) {
            room.gameState = msg.payload.state;
          } else if (msg.payload?.type === 'game-state-sync') {
            room.gameState = msg.payload.state;
          }

          const broadcastMsg = JSON.stringify({
            type: 'relay-message',
            fromPeerId: peerId,
            payload: msg.payload,
          });

          for (const [otherId, otherPeer] of room.peers.entries()) {
            if (otherId !== peerId && otherPeer.ws.readyState === WebSocket.OPEN) {
              otherPeer.ws.send(broadcastMsg);
            }
          }
          break;
        }

        // Ping measurement over server WebSocket
        case 'server-ping': {
          ws.send(JSON.stringify({
            type: 'server-pong',
            clientTs: msg.clientTs,
            serverTs: Date.now(),
          }));
          break;
        }

        // Role change request
        case 'change-role': {
          if (!currentRoomId || !currentPeerId) return;
          const room = rooms.get(currentRoomId);
          if (!room) return;

          const peer = room.peers.get(currentPeerId);
          if (peer && msg.newRole) {
            peer.role = msg.newRole;
            const peerList = Array.from(room.peers.values()).map(p => ({
              id: p.id,
              name: p.name,
              role: p.role,
            }));
            const updateMsg = JSON.stringify({
              type: 'peers-updated',
              peers: peerList,
            });
            for (const p of room.peers.values()) {
              if (p.ws.readyState === WebSocket.OPEN) {
                p.ws.send(updateMsg);
              }
            }
          }
          break;
        }
      }
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    if (currentRoomId && currentPeerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.peers.delete(currentPeerId);
        room.lastActive = Date.now();

        const peerList = Array.from(room.peers.values()).map(p => ({
          id: p.id,
          name: p.name,
          role: p.role,
        }));

        for (const otherPeer of room.peers.values()) {
          if (otherPeer.ws.readyState === WebSocket.OPEN) {
            otherPeer.ws.send(JSON.stringify({
              type: 'peer-left',
              peerId: currentPeerId,
              peers: peerList,
            }));
          }
        }
      }
    }
  });
});

// REST Health & Room status endpoint
app.get('/api/room/:roomId', (req, res) => {
  const roomId = req.params.roomId.toUpperCase();
  const room = rooms.get(roomId);
  if (!room) {
    return res.json({ exists: false });
  }
  return res.json({
    exists: true,
    id: room.id,
    mode: room.mode,
    peerCount: room.peers.size,
    peers: Array.from(room.peers.values()).map(p => ({ id: p.id, name: p.name, role: p.role })),
  });
});

// Dev vs Prod Vite handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, () => {
    console.log(`Xiangqi P2P Server listening on port ${port}`);
  });
}

startServer();
