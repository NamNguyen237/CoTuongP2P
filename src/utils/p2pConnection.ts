import { Peer, DataConnection, PeerOptions } from 'peerjs';
import { PingStats, Position, TacticalPingType } from '../types/xiangqi';

export interface P2PCallbacks {
  onPeerJoined: (peer: { id: string; name: string; role: string }) => void;
  onPeerLeft: (peerId: string) => void;
  onPeersUpdated: (peers: { id: string; name: string; role: string }[]) => void;
  onRoleAssigned: (role: 'red' | 'black' | 'spectator' | 'coop') => void;
  onRoomJoined: (info: { roomId: string; peerId: string; role: any; peers: any[]; gameState?: any }) => void;
  onMoveReceived: (move: any, state?: any) => void;
  onTacticalPing: (ping: { pos: Position; type: TacticalPingType; senderName: string }) => void;
  onTacticalArrow: (arrow: { from: Position; to: Position; color: string; senderName: string }) => void;
  onClearArrows: () => void;
  onChatReceived: (msg: { id: string; sender: string; text: string; time: string }) => void;
  onGameControl: (action: string, payload?: any) => void;
  onCoopSuggestion: (suggestion: { from: Position; to: Position; senderName: string }) => void;
  onPingUpdate: (stats: PingStats) => void;
  onStateSync: (state: any) => void;
}

// Public STUN servers for WebRTC direct P2P NAT traversal
const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
];

export class P2PManager {
  // PeerJS instance & Active Connections
  private peer: Peer | null = null;
  private activeConnections = new Map<string, DataConnection>();

  // Local WebSocket fallback (if running fullstack)
  private ws: WebSocket | null = null;

  public roomId: string = '';
  public peerId: string = '';
  public playerName: string = '';
  public role: 'red' | 'black' | 'spectator' | 'coop' = 'red';
  public isHost: boolean = false;

  private callbacks: P2PCallbacks;
  private pingInterval: any = null;
  private processedPacketIds = new Set<string>();

  private stats: PingStats = {
    p2pPingMs: null,
    wsPingMs: null,
    jitterMs: 0,
    connectionType: 'local',
    packetsSent: 0,
    packetsReceived: 0,
    lastPingTime: Date.now(),
  };

  private lastRtt: number = 0;
  private knownPeers = new Map<string, { id: string; name: string; role: string }>();

  constructor(callbacks: P2PCallbacks) {
    this.callbacks = callbacks;
    this.peerId = 'p_' + Math.random().toString(36).substring(2, 8);
  }

  // Join or Create Room (Works 100% serverless for GitHub Pages via Public PeerJS cloud)
  joinRoom(rawRoomId: string, playerName: string, mode: string, preferredRole?: string) {
    const cleanRoomCode = rawRoomId.replace(/[^A-Za-z0-9]/g, '').toUpperCase().trim();
    this.roomId = cleanRoomCode || 'XQ' + Math.floor(1000 + Math.random() * 9000);
    this.playerName = playerName.trim() || `Kỳ thủ ${this.peerId.slice(-4)}`;

    this.disconnect();
    this.knownPeers.clear();

    const hostPeerId = `cotuong_${this.roomId}_host`;
    const guestPeerId = `cotuong_${this.roomId}_p2_${Math.random().toString(36).substring(2, 6)}`;

    // Try creating Host peer first. If host ID is taken, connect as Guest!
    this.initPeerAsHost(hostPeerId, guestPeerId, mode, preferredRole);

    // Also attempt local WebSocket connection in background (if running on a server)
    this.tryConnectLocalWebSocket(mode, preferredRole);
  }

  private initPeerAsHost(hostPeerId: string, guestPeerId: string, mode: string, preferredRole?: string) {
    const peerOptions: PeerOptions = {
      config: {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 4,
      },
      debug: 1,
    };

    try {
      this.peer = new Peer(hostPeerId, peerOptions);

      this.peer.on('open', (id) => {
        this.isHost = true;
        this.peerId = id;
        this.role = (preferredRole as any) || 'red';

        this.knownPeers.set(id, {
          id,
          name: this.playerName,
          role: this.role,
        });

        this.stats.connectionType = 'webrtc-direct';
        this.callbacks.onPingUpdate({ ...this.stats });

        this.callbacks.onRoomJoined({
          roomId: this.roomId,
          peerId: this.peerId,
          role: this.role,
          peers: Array.from(this.knownPeers.values()),
        });

        this.startPingMonitor();
      });

      // When another peer connects to this host
      this.peer.on('connection', (conn) => {
        this.setupConnection(conn, true);
      });

      this.peer.on('error', (err: any) => {
        // If Host ID is already taken, it means someone else already created this room!
        // Join as Guest peer and connect directly to the existing Host!
        if (err.type === 'unavailable-id') {
          this.peer?.destroy();
          this.initPeerAsGuest(guestPeerId, hostPeerId, mode, preferredRole);
        } else {
          console.warn('PeerJS status:', err.type, err.message);
        }
      });
    } catch (e) {
      console.warn('PeerJS init failed, attempting guest fallback:', e);
      this.initPeerAsGuest(guestPeerId, hostPeerId, mode, preferredRole);
    }
  }

  private initPeerAsGuest(myGuestId: string, hostPeerId: string, mode: string, preferredRole?: string) {
    const peerOptions: PeerOptions = {
      config: {
        iceServers: ICE_SERVERS,
        iceCandidatePoolSize: 4,
      },
      debug: 1,
    };

    try {
      this.peer = new Peer(myGuestId, peerOptions);

      this.peer.on('open', (id) => {
        this.isHost = false;
        this.peerId = id;
        this.role = (preferredRole as any) || 'black';

        this.knownPeers.set(id, {
          id,
          name: this.playerName,
          role: this.role,
        });

        this.callbacks.onRoomJoined({
          roomId: this.roomId,
          peerId: this.peerId,
          role: this.role,
          peers: Array.from(this.knownPeers.values()),
        });

        // Connect directly to the Host peer
        const conn = this.peer!.connect(hostPeerId, {
          reliable: true,
          metadata: {
            playerName: this.playerName,
            role: this.role,
          },
        });

        this.setupConnection(conn, false);
        this.startPingMonitor();
      });

      this.peer.on('connection', (conn) => {
        this.setupConnection(conn, false);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS guest status:', err.type, err.message);
      });
    } catch (e) {
      console.warn('PeerJS guest error:', e);
    }
  }

  private setupConnection(conn: DataConnection, isHostSide: boolean) {
    conn.on('open', () => {
      this.activeConnections.set(conn.peer, conn);
      this.stats.connectionType = 'webrtc-direct';
      this.callbacks.onPingUpdate({ ...this.stats });

      // Greet peer and exchange player info
      const joinPacket = {
        type: 'peer-handshake',
        peerId: this.peerId,
        playerName: this.playerName,
        role: this.role,
        isHost: this.isHost,
      };
      conn.send(joinPacket);

      // Notify peer joined
      const peerName = (conn.metadata as any)?.playerName || `Kỳ thủ ${conn.peer.slice(-4)}`;
      const peerRole = isHostSide ? 'black' : 'red';

      const peerInfo = { id: conn.peer, name: peerName, role: peerRole };
      this.knownPeers.set(conn.peer, peerInfo);

      this.callbacks.onPeerJoined(peerInfo);
      this.callbacks.onPeersUpdated(Array.from(this.knownPeers.values()));
    });

    conn.on('data', (data: any) => {
      this.stats.packetsReceived++;
      this.handleIncomingData(data, conn);
    });

    conn.on('close', () => {
      this.activeConnections.delete(conn.peer);
      this.knownPeers.delete(conn.peer);
      this.callbacks.onPeerLeft(conn.peer);
      this.callbacks.onPeersUpdated(Array.from(this.knownPeers.values()));

      if (this.activeConnections.size === 0) {
        this.stats.connectionType = this.ws ? 'websocket-relay' : 'local';
        this.callbacks.onPingUpdate({ ...this.stats });
      }
    });

    conn.on('error', (err) => {
      console.warn('DataConnection issue:', err);
    });
  }

  // Handle incoming packets from PeerJS DataConnection
  private handleIncomingData(packet: any, conn: DataConnection) {
    if (!packet) return;

    // Handle P2P Ping / Pong directly for ultra-accurate latency
    if (packet.type === 'p2p-ping') {
      try {
        conn.send({ type: 'p2p-pong', clientTs: packet.clientTs });
      } catch (_) {}
      return;
    }

    if (packet.type === 'p2p-pong') {
      const currentRtt = performance.now() - packet.clientTs;
      const roundedRtt = Math.max(1, Math.round(currentRtt));

      if (this.lastRtt > 0) {
        const diff = Math.abs(roundedRtt - this.lastRtt);
        this.stats.jitterMs = Math.round((this.stats.jitterMs + (diff - this.stats.jitterMs) / 16) * 10) / 10;
      }
      this.lastRtt = roundedRtt;
      this.stats.p2pPingMs = roundedRtt;
      this.stats.lastPingTime = Date.now();
      this.callbacks.onPingUpdate({ ...this.stats });
      return;
    }

    if (packet.type === 'peer-handshake') {
      const peerInfo = {
        id: packet.peerId,
        name: packet.playerName,
        role: packet.role,
      };
      this.knownPeers.set(packet.peerId, peerInfo);
      this.callbacks.onPeerJoined(peerInfo);
      this.callbacks.onPeersUpdated(Array.from(this.knownPeers.values()));

      // If we are Host, send back our handshake so guest gets our name
      if (this.isHost) {
        conn.send({
          type: 'peer-handshake-ack',
          peerId: this.peerId,
          playerName: this.playerName,
          role: this.role,
        });
      }
      return;
    }

    if (packet.type === 'peer-handshake-ack') {
      const peerInfo = {
        id: packet.peerId,
        name: packet.playerName,
        role: packet.role,
      };
      this.knownPeers.set(packet.peerId, peerInfo);
      this.callbacks.onPeerJoined(peerInfo);
      this.callbacks.onPeersUpdated(Array.from(this.knownPeers.values()));
      return;
    }

    // Deduplicate general game packets
    if (packet.packetId) {
      if (this.processedPacketIds.has(packet.packetId)) return;
      this.processedPacketIds.add(packet.packetId);
      if (this.processedPacketIds.size > 150) {
        const first = this.processedPacketIds.values().next().value;
        if (first) this.processedPacketIds.delete(first);
      }
    }

    this.dispatchApplicationPacket(packet);
  }

  private dispatchApplicationPacket(packet: any) {
    switch (packet.type) {
      case 'move':
        this.callbacks.onMoveReceived(packet.move, packet.state);
        break;
      case 'tactical-ping':
        this.callbacks.onTacticalPing({
          pos: packet.pos,
          type: packet.pingType || packet.type,
          senderName: packet.senderName,
        });
        break;
      case 'tactical-arrow':
        this.callbacks.onTacticalArrow(packet);
        break;
      case 'clear-arrows':
        this.callbacks.onClearArrows();
        break;
      case 'chat':
        this.callbacks.onChatReceived(packet);
        break;
      case 'game-control':
        this.callbacks.onGameControl(packet.action, packet.payload);
        break;
      case 'coop-suggestion':
        this.callbacks.onCoopSuggestion(packet);
        break;
      case 'game-state-sync':
        this.callbacks.onStateSync(packet.state);
        break;
    }
  }

  // Send packet to all peers (Direct WebRTC DataConnection + optional WS backup)
  sendPacket(packet: any) {
    this.stats.packetsSent++;
    const packetId = `${this.peerId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const enrichedPacket = {
      ...packet,
      roomId: this.roomId,
      fromPeerId: this.peerId,
      packetId,
    };

    // 1. Direct PeerJS WebRTC DataChannel (0 server hop, lowest ping)
    for (const conn of this.activeConnections.values()) {
      if (conn.open) {
        try {
          conn.send(enrichedPacket);
        } catch (e) {
          console.warn('Direct P2P send issue:', e);
        }
      }
    }

    // 2. WebSocket fallback (if available on local dev server)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'relay-message',
        roomId: this.roomId,
        peerId: this.peerId,
        payload: enrichedPacket,
      }));
    }
  }

  // Optional background WebSocket connection (silently fails on static GitHub Pages)
  private tryConnectLocalWebSocket(mode: string, preferredRole?: string) {
    if (typeof window === 'undefined') return;

    // Check if hosted on github.io or file protocol where no server.ts exists
    if (window.location.hostname.endsWith('github.io') || window.location.protocol === 'file:') {
      return; // Skip server WebSocket on pure static hosting
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws-signal`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.ws?.send(JSON.stringify({
          type: 'join-room',
          roomId: this.roomId,
          peerId: this.peerId,
          playerName: this.playerName,
          mode,
          preferredRole,
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'relay-message' && msg.payload) {
            this.handleIncomingData(msg.payload, null as any);
          } else if (msg.type === 'server-pong') {
            const rtt = Date.now() - msg.clientTs;
            this.stats.wsPingMs = rtt;
            this.callbacks.onPingUpdate({ ...this.stats });
          }
        } catch (_) {}
      };

      this.ws.onerror = () => {
        // Expected when deployed statically without a backend
      };
    } catch (_) {}
  }

  private startPingMonitor() {
    if (this.pingInterval) clearInterval(this.pingInterval);

    this.pingInterval = setInterval(() => {
      // Measure direct P2P ping across active connections
      for (const conn of this.activeConnections.values()) {
        if (conn.open) {
          try {
            conn.send({
              type: 'p2p-ping',
              clientTs: performance.now(),
            });
          } catch (_) {}
        }
      }

      // Measure WS server ping if available
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({
            type: 'server-ping',
            clientTs: Date.now(),
          }));
        } catch (_) {}
      }
    }, 1500);
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    for (const conn of this.activeConnections.values()) {
      try { conn.close(); } catch (_) {}
    }
    this.activeConnections.clear();

    if (this.peer) {
      try { this.peer.destroy(); } catch (_) {}
      this.peer = null;
    }
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
      this.ws = null;
    }
    this.knownPeers.clear();
    this.processedPacketIds.clear();
    this.stats.connectionType = 'local';
    this.isHost = false;
  }
}
