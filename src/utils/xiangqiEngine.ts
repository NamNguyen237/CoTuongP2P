import { Piece, PieceSide, Position, Move, GameState } from '../types/xiangqi';

export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(10).fill(null).map(() => Array(9).fill(null));

  // Helper to place piece
  const place = (r: number, c: number, type: Piece['type'], side: PieceSide, text: string, viText: string, id: string) => {
    board[r][c] = { id, type, side, text, viText };
  };

  // Black pieces (rows 0-3)
  place(0, 0, 'rook', 'black', '車', 'Xe', 'b_r1');
  place(0, 1, 'horse', 'black', '馬', 'Mã', 'b_h1');
  place(0, 2, 'elephant', 'black', '象', 'Tượng', 'b_e1');
  place(0, 3, 'advisor', 'black', '士', 'Sĩ', 'b_a1');
  place(0, 4, 'king', 'black', '將', 'Tướng', 'b_k');
  place(0, 5, 'advisor', 'black', '士', 'Sĩ', 'b_a2');
  place(0, 6, 'elephant', 'black', '象', 'Tượng', 'b_e2');
  place(0, 7, 'horse', 'black', '馬', 'Mã', 'b_h2');
  place(0, 8, 'rook', 'black', '車', 'Xe', 'b_r2');

  place(2, 1, 'cannon', 'black', '砲', 'Pháo', 'b_c1');
  place(2, 7, 'cannon', 'black', '砲', 'Pháo', 'b_c2');

  place(3, 0, 'pawn', 'black', '卒', 'Tốt', 'b_p1');
  place(3, 2, 'pawn', 'black', '卒', 'Tốt', 'b_p2');
  place(3, 4, 'pawn', 'black', '卒', 'Tốt', 'b_p3');
  place(3, 6, 'pawn', 'black', '卒', 'Tốt', 'b_p4');
  place(3, 8, 'pawn', 'black', '卒', 'Tốt', 'b_p5');

  // Red pieces (rows 6-9)
  place(6, 0, 'pawn', 'red', '兵', 'Binh', 'r_p1');
  place(6, 2, 'pawn', 'red', '兵', 'Binh', 'r_p2');
  place(6, 4, 'pawn', 'red', '兵', 'Binh', 'r_p3');
  place(6, 6, 'pawn', 'red', '兵', 'Binh', 'r_p4');
  place(6, 8, 'pawn', 'red', '兵', 'Binh', 'r_p5');

  place(7, 1, 'cannon', 'red', '炮', 'Pháo', 'r_c1');
  place(7, 7, 'cannon', 'red', '炮', 'Pháo', 'r_c2');

  place(9, 0, 'rook', 'red', '俥', 'Xe', 'r_r1');
  place(9, 1, 'horse', 'red', '傌', 'Mã', 'r_h1');
  place(9, 2, 'elephant', 'red', '相', 'Tượng', 'r_e1');
  place(9, 3, 'advisor', 'red', '仕', 'Sĩ', 'r_a1');
  place(9, 4, 'king', 'red', '帥', 'Tướng', 'r_k');
  place(9, 5, 'advisor', 'red', '仕', 'Sĩ', 'r_a2');
  place(9, 6, 'elephant', 'red', '相', 'Tượng', 'r_e2');
  place(9, 7, 'horse', 'red', '傌', 'Mã', 'r_h2');
  place(9, 8, 'rook', 'red', '俥', 'Xe', 'r_r2');

  return board;
}

export function createInitialGameState(): GameState {
  return {
    board: createInitialBoard(),
    turn: 'red',
    status: 'playing',
    winner: null,
    moveHistory: [],
    capturedRed: [],
    capturedBlack: [],
    lastMove: null,
    inCheckSide: null,
  };
}

// In bounds check
export function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 10 && c >= 0 && c < 9;
}

// Check Palace bounds
export function inPalace(r: number, c: number, side: PieceSide): boolean {
  if (c < 3 || c > 5) return false;
  if (side === 'red') {
    return r >= 7 && r <= 9;
  } else {
    return r >= 0 && r <= 2;
  }
}

// Find King position for a side
export function findKing(board: (Piece | null)[][], side: PieceSide): Position | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.side === side) {
        return { r, c };
      }
    }
  }
  return null;
}

// Flying General check: two kings on the same file with no pieces in between
export function isFlyingGeneral(board: (Piece | null)[][]): boolean {
  const redKing = findKing(board, 'red');
  const blackKing = findKing(board, 'black');
  if (!redKing || !blackKing) return false;

  if (redKing.c !== blackKing.c) return false;

  const col = redKing.c;
  const minR = Math.min(redKing.r, blackKing.r);
  const maxR = Math.max(redKing.r, blackKing.r);

  for (let r = minR + 1; r < maxR; r++) {
    if (board[r][col] !== null) {
      return false;
    }
  }
  return true;
}

// Pseudo-legal moves for a piece at (r, c)
export function getPseudoLegalMoves(board: (Piece | null)[][], from: Position): Position[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];

  const moves: Position[] = [];
  const { r, c } = from;
  const side = piece.side;

  switch (piece.type) {
    case 'king': {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inPalace(nr, nc, side)) {
          const dest = board[nr][nc];
          if (!dest || dest.side !== side) {
            moves.push({ r: nr, c: nc });
          }
        }
      }
      break;
    }

    case 'advisor': {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;
        if (inPalace(nr, nc, side)) {
          const dest = board[nr][nc];
          if (!dest || dest.side !== side) {
            moves.push({ r: nr, c: nc });
          }
        }
      }
      break;
    }

    case 'elephant': {
      const jumps = [
        { dr: -2, dc: -2, eyeR: -1, eyeC: -1 },
        { dr: -2, dc: 2, eyeR: -1, eyeC: 1 },
        { dr: 2, dc: -2, eyeR: 1, eyeC: -1 },
        { dr: 2, dc: 2, eyeR: 1, eyeC: 1 },
      ];
      for (const { dr, dc, eyeR, eyeC } of jumps) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;

        // River boundary
        if (side === 'red' && nr < 5) continue;
        if (side === 'black' && nr > 4) continue;

        // Eye of elephant check (cản tượng)
        if (board[r + eyeR][c + eyeC] !== null) continue;

        const dest = board[nr][nc];
        if (!dest || dest.side !== side) {
          moves.push({ r: nr, c: nc });
        }
      }
      break;
    }

    case 'horse': {
      const hops = [
        { dr: -2, dc: -1, legR: -1, legC: 0 },
        { dr: -2, dc: 1, legR: -1, legC: 0 },
        { dr: 2, dc: -1, legR: 1, legC: 0 },
        { dr: 2, dc: 1, legR: 1, legC: 0 },
        { dr: -1, dc: -2, legR: 0, legC: -1 },
        { dr: 1, dc: -2, legR: 0, legC: -1 },
        { dr: -1, dc: 2, legR: 0, legC: 1 },
        { dr: 1, dc: 2, legR: 0, legC: 1 },
      ];
      for (const { dr, dc, legR, legC } of hops) {
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;

        // Leg check (cản chân mã)
        if (board[r + legR][c + legC] !== null) continue;

        const dest = board[nr][nc];
        if (!dest || dest.side !== side) {
          moves.push({ r: nr, c: nc });
        }
      }
      break;
    }

    case 'rook': {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        while (inBounds(nr, nc)) {
          const dest = board[nr][nc];
          if (!dest) {
            moves.push({ r: nr, c: nc });
          } else {
            if (dest.side !== side) {
              moves.push({ r: nr, c: nc });
            }
            break;
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'cannon': {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        let nr = r + dr;
        let nc = c + dc;
        let jumped = false;

        while (inBounds(nr, nc)) {
          const dest = board[nr][nc];
          if (!jumped) {
            if (!dest) {
              moves.push({ r: nr, c: nc });
            } else {
              jumped = true; // Found screen (ngòi pháo)
            }
          } else {
            // Already jumped over 1 piece, look for enemy target
            if (dest) {
              if (dest.side !== side) {
                moves.push({ r: nr, c: nc });
              }
              break; // Cannon can only jump one screen
            }
          }
          nr += dr;
          nc += dc;
        }
      }
      break;
    }

    case 'pawn': {
      const isRed = side === 'red';
      const forwardR = isRed ? r - 1 : r + 1;
      const crossedRiver = isRed ? r <= 4 : r >= 5;

      // Forward step
      if (inBounds(forwardR, c)) {
        const dest = board[forwardR][c];
        if (!dest || dest.side !== side) {
          moves.push({ r: forwardR, c });
        }
      }

      // Horizontal steps after crossing river
      if (crossedRiver) {
        for (const dc of [-1, 1]) {
          const nc = c + dc;
          if (inBounds(r, nc)) {
            const dest = board[r][nc];
            if (!dest || dest.side !== side) {
              moves.push({ r, c: nc });
            }
          }
        }
      }
      break;
    }
  }

  return moves;
}

// Clone board for simulation
export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row => [...row]);
}

// Check if a side's king is currently in check
export function isKingInCheck(board: (Piece | null)[][], side: PieceSide): boolean {
  if (isFlyingGeneral(board)) return true;

  const kingPos = findKing(board, side);
  if (!kingPos) return true; // King missing means captured/in-check

  const opponentSide: PieceSide = side === 'red' ? 'black' : 'red';

  // Check all opponent pieces to see if any can hit kingPos
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.side === opponentSide) {
        const moves = getPseudoLegalMoves(board, { r, c });
        if (moves.some(m => m.r === kingPos.r && m.c === kingPos.c)) {
          return true;
        }
      }
    }
  }

  return false;
}

// Get fully validated legal moves for piece at (r, c)
export function getLegalMoves(board: (Piece | null)[][], from: Position): Position[] {
  const piece = board[from.r][from.c];
  if (!piece) return [];

  const pseudoMoves = getPseudoLegalMoves(board, from);
  const legalMoves: Position[] = [];

  for (const to of pseudoMoves) {
    // Simulate move
    const simulatedBoard = cloneBoard(board);
    simulatedBoard[to.r][to.c] = piece;
    simulatedBoard[from.r][from.c] = null;

    // Check if own king would be in check or flying general
    if (!isKingInCheck(simulatedBoard, piece.side)) {
      legalMoves.push(to);
    }
  }

  return legalMoves;
}

// Generate all legal moves for a player side
export function getAllLegalMoves(board: (Piece | null)[][], side: PieceSide): { from: Position; to: Position; piece: Piece }[] {
  const allMoves: { from: Position; to: Position; piece: Piece }[] = [];

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.side === side) {
        const moves = getLegalMoves(board, { r, c });
        for (const to of moves) {
          allMoves.push({ from: { r, c }, to, piece: p });
        }
      }
    }
  }

  return allMoves;
}

// Generate traditional Vietnamese Xiangqi notation
export function formatVietnameseNotation(
  piece: Piece,
  from: Position,
  to: Position,
  _board: (Piece | null)[][]
): { notationVi: string; notationCoord: string } {
  // Vietnamese piece codes:
  // Tướng: Tg, Sĩ: S, Tượng: T, Mã: M, Xe: X, Pháo: P, Tốt: B
  const pieceLetters: Record<Piece['type'], string> = {
    king: 'Tg',
    advisor: 'S',
    elephant: 'T',
    horse: 'M',
    rook: 'X',
    cannon: 'P',
    pawn: piece.side === 'red' ? 'B' : 'C',
  };

  const letter = pieceLetters[piece.type];

  // In traditional Xiangqi:
  // Red counts columns 1 to 9 from Red's right to left (col 8 is 1, col 0 is 9)
  // Black counts columns 1 to 9 from Black's right to left (col 0 is 1, col 8 is 9)
  const fromCol = piece.side === 'red' ? 9 - from.c : from.c + 1;
  const toCol = piece.side === 'red' ? 9 - to.c : to.c + 1;

  let action = '';
  let target = '';

  const dr = to.r - from.r;
  const dc = to.c - from.c;

  if (dr === 0) {
    // Horizontal move: Bình (-)
    action = '-';
    target = `${toCol}`;
  } else {
    // Advancing vs Retreating
    // For Red, moving up (dr < 0) is Advance (tấn/tiến .), moving down (dr > 0) is Retreat (thoái /)
    // For Black, moving down (dr > 0) is Advance (.), moving up (dr < 0) is Retreat (/)
    const isAdvancing = piece.side === 'red' ? dr < 0 : dr > 0;
    action = isAdvancing ? '.' : '/';

    // For straight moving pieces (Xe, Pháo, Binh, Tướng along file): target is number of steps
    if (dc === 0 && (piece.type === 'rook' || piece.type === 'cannon' || piece.type === 'pawn' || piece.type === 'king')) {
      target = `${Math.abs(dr)}`;
    } else {
      // For diagonal pieces (Mã, Tượng, Sĩ) or sideways moves: target is destination file
      target = `${toCol}`;
    }
  }

  const notationVi = `${letter}${fromCol}${action}${target}`;
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'];
  const notationCoord = `${files[from.c]}${9 - from.r}-${files[to.c]}${9 - to.r}`;

  return { notationVi, notationCoord };
}

// Make a move and return the new GameState
export function applyMove(state: GameState, from: Position, to: Position): GameState {
  const piece = state.board[from.r][from.c];
  if (!piece) return state;

  const destPiece = state.board[to.r][to.c];
  const newBoard = cloneBoard(state.board);

  newBoard[to.r][to.c] = piece;
  newBoard[from.r][from.c] = null;

  const { notationVi, notationCoord } = formatVietnameseNotation(piece, from, to, state.board);

  const moveRecord: Move = {
    from,
    to,
    piece,
    captured: destPiece,
    notationVi,
    notationCoord,
    timestamp: Date.now(),
  };

  const nextTurn: PieceSide = state.turn === 'red' ? 'black' : 'red';
  const newCapturedRed = [...state.capturedRed];
  const newCapturedBlack = [...state.capturedBlack];

  if (destPiece) {
    if (destPiece.side === 'black') {
      newCapturedRed.push(destPiece);
    } else {
      newCapturedBlack.push(destPiece);
    }
  }

  // Check state of next player
  const nextInCheck = isKingInCheck(newBoard, nextTurn);
  const nextLegalMoves = getAllLegalMoves(newBoard, nextTurn);

  let newStatus = state.status;
  let winner = state.winner;

  if (nextLegalMoves.length === 0) {
    // Checkmate or Stalemate (in Xiangqi, stalemate is also loss for the trapped player)
    newStatus = nextInCheck ? 'checkmate' : 'stalemate';
    winner = state.turn; // The player who just moved wins
  } else if (nextInCheck) {
    newStatus = 'check';
  } else {
    newStatus = 'playing';
  }

  return {
    board: newBoard,
    turn: nextTurn,
    status: newStatus,
    winner,
    moveHistory: [...state.moveHistory, moveRecord],
    capturedRed: newCapturedRed,
    capturedBlack: newCapturedBlack,
    lastMove: moveRecord,
    inCheckSide: nextInCheck ? nextTurn : null,
  };
}

// Audio Sound Synthesis using Web Audio API (Zero external network dependencies, instant sound)
class XiangqiSoundFx {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playMove() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.08);

      gain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (_) {}
  }

  playCapture() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(480, now);
      osc1.frequency.exponentialRampToValueAtTime(80, now + 0.16);

      osc2.type = 'square';
      osc2.frequency.setValueAtTime(140, now);
      osc2.frequency.exponentialRampToValueAtTime(60, now + 0.16);

      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start();
      osc2.start();
      osc1.stop(now + 0.16);
      osc2.stop(now + 0.16);
    } catch (_) {}
  }

  playCheck() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const notes = [440, 554, 659, 880];

      notes.forEach((freq, idx) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.06);

        gain.gain.setValueAtTime(0.3, now + idx * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx!.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.25);
      });
    } catch (_) {}
  }

  playWin() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.5]; // C E G C
      chords.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.35, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + i * 0.1 + 0.5);
      });
    } catch (_) {}
  }

  playPing() {
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.09);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (_) {}
  }
}

export const soundEffects = new XiangqiSoundFx();

// MiniMax AI Engine for Co-op vs AI and Practice
const PIECE_VALUES: Record<Piece['type'], number> = {
  king: 10000,
  rook: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  pawn: 100,
};

function evaluateBoard(board: (Piece | null)[][], sideToMax: PieceSide): number {
  let score = 0;

  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;

      let val = PIECE_VALUES[p.type];

      // Positional heuristic bonuses
      if (p.type === 'pawn') {
        const crossed = p.side === 'red' ? r <= 4 : r >= 5;
        if (crossed) {
          val += 120; // High value for passed pawn
          if (c >= 2 && c <= 6) val += 30; // Center files
        }
      } else if (p.type === 'horse') {
        // Centralized horses are stronger
        if (c >= 2 && c <= 6 && r >= 2 && r <= 7) val += 25;
      } else if (p.type === 'rook') {
        // Rooks on open files or enemy territory
        if (p.side === 'red' && r <= 4) val += 30;
        if (p.side === 'black' && r >= 5) val += 30;
      }

      if (p.side === sideToMax) {
        score += val;
      } else {
        score -= val;
      }
    }
  }

  return score;
}

export function findBestAiMove(
  board: (Piece | null)[][],
  aiSide: PieceSide,
  depth = 3
): { from: Position; to: Position; piece: Piece } | null {
  const legalMoves = getAllLegalMoves(board, aiSide);
  if (legalMoves.length === 0) return null;

  // Shuffle slightly so games are not completely identical
  legalMoves.sort(() => Math.random() - 0.5);

  let bestMove: { from: Position; to: Position; piece: Piece } = legalMoves[0];
  let bestScore = -Infinity;
  const alpha = -Infinity;
  const beta = Infinity;

  for (const move of legalMoves) {
    const simBoard = cloneBoard(board);
    simBoard[move.to.r][move.to.c] = move.piece;
    simBoard[move.from.r][move.from.c] = null;

    const score = minimax(
      simBoard,
      depth - 1,
      alpha,
      beta,
      false,
      aiSide,
      aiSide === 'red' ? 'black' : 'red'
    );

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

function minimax(
  board: (Piece | null)[][],
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean,
  aiSide: PieceSide,
  currentSide: PieceSide
): number {
  if (depth === 0) {
    return evaluateBoard(board, aiSide);
  }

  const moves = getAllLegalMoves(board, currentSide);
  if (moves.length === 0) {
    // Checkmate or stalemate
    return isMaximizing ? -9000 : 9000;
  }

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      const sim = cloneBoard(board);
      sim[m.to.r][m.to.c] = m.piece;
      sim[m.from.r][m.from.c] = null;
      const evaluation = minimax(sim, depth - 1, alpha, beta, false, aiSide, currentSide === 'red' ? 'black' : 'red');
      maxEval = Math.max(maxEval, evaluation);
      alpha = Math.max(alpha, evaluation);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      const sim = cloneBoard(board);
      sim[m.to.r][m.to.c] = m.piece;
      sim[m.from.r][m.from.c] = null;
      const evaluation = minimax(sim, depth - 1, alpha, beta, true, aiSide, currentSide === 'red' ? 'black' : 'red');
      minEval = Math.min(minEval, evaluation);
      beta = Math.min(beta, evaluation);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}
