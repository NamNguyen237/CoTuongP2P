export type PieceType = 'king' | 'advisor' | 'elephant' | 'horse' | 'rook' | 'cannon' | 'pawn';

export type PieceSide = 'red' | 'black';

export interface Piece {
  id: string;
  type: PieceType;
  side: PieceSide;
  text: string;      // Traditional character (帥, 將, 兵, 卒, etc.)
  viText: string;    // Vietnamese readable short text (Tướng, Sĩ, Tượng, Mã, Xe, Pháo, Tốt)
}

export interface Position {
  r: number; // 0 to 9
  c: number; // 0 to 8
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured?: Piece | null;
  notationVi: string;
  notationCoord: string;
  timestamp: number;
}

export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate' | 'draw' | 'waiting';

export interface GameState {
  board: (Piece | null)[][];
  turn: PieceSide;
  status: GameStatus;
  winner?: PieceSide | 'draw' | null;
  moveHistory: Move[];
  capturedRed: Piece[];   // Black pieces captured by Red
  capturedBlack: Piece[]; // Red pieces captured by Black
  lastMove?: Move | null;
  inCheckSide?: PieceSide | null;
}

export type GameMode = 'p2p-1v1' | 'coop-ai' | 'coop-analysis' | 'solo-ai' | 'pass-and-play';

export type TacticalPingType = 'attack' | 'defend' | 'danger' | 'suggest';

export interface TacticalPing {
  id: string;
  pos: Position;
  type: TacticalPingType;
  senderName: string;
  timestamp: number;
}

export interface TacticalArrow {
  id: string;
  from: Position;
  to: Position;
  color: string;
  senderName: string;
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

export interface PeerPlayer {
  id: string;
  name: string;
  role: 'red' | 'black' | 'spectator' | 'coop';
}

export interface PingStats {
  p2pPingMs: number | null;
  wsPingMs: number | null;
  jitterMs: number;
  connectionType: 'webrtc-direct' | 'websocket-relay' | 'local';
  packetsSent: number;
  packetsReceived: number;
  lastPingTime: number;
}
