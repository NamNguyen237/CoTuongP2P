import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  GameState,
  PieceSide,
  Position,
  Move,
  GameMode,
  TacticalPing,
  TacticalArrow,
  ChatMessage,
  PeerPlayer,
  PingStats,
} from './types/xiangqi';
import {
  createInitialGameState,
  getLegalMoves,
  applyMove,
  soundEffects,
  findBestAiMove,
} from './utils/xiangqiEngine';
import { P2PManager } from './utils/p2pConnection';
import { Board } from './components/Board';
import { GameSidebar } from './components/GameSidebar';
import { PingMonitor } from './components/PingMonitor';
import { RoomModal } from './components/RoomModal';
import {
  Users,
  RotateCcw,
  Volume2,
  VolumeX,
  Clock,
  MessageSquare,
  Handshake,
  Flag,
  Share2,
  Sparkles,
  ShieldAlert,
  X,
  Eraser,
} from 'lucide-react';

export default function App() {
  // Game & Board State
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Networking & Room State
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>(() => {
    return localStorage.getItem('xiangqi_player_name') || `Kỳ thủ ${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [playerRole, setPlayerRole] = useState<'red' | 'black' | 'spectator' | 'coop'>('red');
  const [mode, setMode] = useState<GameMode>('p2p-1v1');
  const [peers, setPeers] = useState<PeerPlayer[]>([]);
  const [roomModalOpen, setRoomModalOpen] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Interactive Tactical Overlay State
  const [tacticalPings, setTacticalPings] = useState<TacticalPing[]>([]);
  const [tacticalArrows, setTacticalArrows] = useState<TacticalArrow[]>([]);
  const [coopSuggestion, setCoopSuggestion] = useState<{
    from: Position;
    to: Position;
    senderName: string;
  } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Ping & Network HUD
  const [pingStats, setPingStats] = useState<PingStats>({
    p2pPingMs: null,
    wsPingMs: null,
    jitterMs: 0,
    connectionType: 'local',
    packetsSent: 0,
    packetsReceived: 0,
    lastPingTime: Date.now(),
  });

  // Clocks
  const [initialTimeMinutes, setInitialTimeMinutes] = useState(10);
  const [redTimeLeft, setRedTimeLeft] = useState(10 * 60);
  const [blackTimeLeft, setBlackTimeLeft] = useState(10 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Dialog Prompts
  const [pendingPrompt, setPendingPrompt] = useState<{
    type: 'takeback' | 'draw' | 'rematch';
    senderName: string;
  } | null>(null);

  const p2pRef = useRef<P2PManager | null>(null);
  const timerRef = useRef<any>(null);

  // Helper toast notification
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Sound wrapper
  const playSfx = (fn: () => void) => {
    if (soundEnabled) {
      fn();
    }
  };

  // Initialize P2P connection manager
  useEffect(() => {
    const manager = new P2PManager({
      onRoomJoined: (info) => {
        setRoomId(info.roomId);
        setPlayerRole(info.role);
        setPeers(info.peers as PeerPlayer[]);
        showToast(`Đã vào phòng ${info.roomId} - Phe: ${info.role === 'red' ? 'ĐỎ (Đi trước)' : 'ĐEN'}`);
        if (info.role === 'black') {
          setFlipped(true); // Automatically flip board for Black player
        }
        if (info.gameState) {
          setGameState(info.gameState);
        }
      },
      onPeerJoined: (peer) => {
        showToast(`Kỳ thủ ${peer.name} đã kết nối vào phòng!`);
        playSfx(() => soundEffects.playPing());
      },
      onPeerLeft: () => {
        showToast(`Một người chơi đã rời phòng.`);
      },
      onPeersUpdated: (updatedPeers) => {
        setPeers(updatedPeers as PeerPlayer[]);
      },
      onRoleAssigned: (role) => {
        setPlayerRole(role);
        if (role === 'black') setFlipped(true);
      },
      onMoveReceived: (move: Move, remoteState?: GameState) => {
        setGameState((prev) => {
          const nextState = remoteState || applyMove(prev, move.from, move.to);
          if (move.captured) {
            playSfx(() => soundEffects.playCapture());
          } else {
            playSfx(() => soundEffects.playMove());
          }
          if (nextState.status === 'check') {
            playSfx(() => soundEffects.playCheck());
          } else if (nextState.status === 'checkmate') {
            playSfx(() => soundEffects.playWin());
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
          }
          return nextState;
        });
        setSelectedPos(null);
        setLegalMoves([]);
        setIsTimerRunning(true);
      },
      onTacticalPing: (ping) => {
        setTacticalPings((prev) => [
          ...prev,
          {
            id: 'ping_' + Math.random(),
            pos: ping.pos,
            type: ping.type,
            senderName: ping.senderName,
            timestamp: Date.now(),
          },
        ]);
        playSfx(() => soundEffects.playPing());
      },
      onTacticalArrow: (arrow) => {
        setTacticalArrows((prev) => [...prev, { id: 'arr_' + Math.random(), ...arrow }]);
      },
      onClearArrows: () => {
        setTacticalArrows([]);
        setCoopSuggestion(null);
      },
      onChatReceived: (msg) => {
        setChatMessages((prev) => [...prev, msg]);
        playSfx(() => soundEffects.playPing());
      },
      onGameControl: (action, payload) => {
        if (action === 'request-takeback') {
          setPendingPrompt({ type: 'takeback', senderName: payload?.senderName || 'Đối thủ' });
        } else if (action === 'accept-takeback') {
          handleExecuteTakeback();
          showToast('Đối thủ đã đồng ý cho đi lại!');
        } else if (action === 'offer-draw') {
          setPendingPrompt({ type: 'draw', senderName: payload?.senderName || 'Đối thủ' });
        } else if (action === 'accept-draw') {
          setGameState((prev) => ({ ...prev, status: 'draw', winner: 'draw' }));
          showToast('Hai bên đồng ý HÒA cờ!');
        } else if (action === 'resign') {
          const winnerSide = playerRole === 'red' ? 'red' : 'black';
          setGameState((prev) => ({ ...prev, status: 'checkmate', winner: winnerSide }));
          showToast('Đối thủ đã xin thua!');
          confetti({ particleCount: 120, spread: 80 });
        } else if (action === 'restart') {
          resetLocalGame();
          showToast('Ván mới đã bắt đầu!');
        }
      },
      onCoopSuggestion: (suggestion) => {
        setCoopSuggestion(suggestion);
        playSfx(() => soundEffects.playPing());
        showToast(`${suggestion.senderName} gợi ý nước cờ!`);
      },
      onPingUpdate: (stats) => {
        setPingStats(stats);
      },
      onStateSync: (remoteState) => {
        setGameState(remoteState);
      },
    });

    p2pRef.current = manager;

    // Check URL parameters for ?room=XYZ
    const searchParams = new URLSearchParams(window.location.search);
    const roomParam = searchParams.get('room');
    if (roomParam) {
      const storedName = localStorage.getItem('xiangqi_player_name') || playerName;
      joinRoomAction(roomParam.toUpperCase(), storedName, 'p2p-1v1', 10);
    }

    return () => {
      manager.disconnect();
    };
  }, []);

  // Clock countdown interval
  useEffect(() => {
    if (!isTimerRunning || gameState.status !== 'playing' || initialTimeMinutes === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      if (gameState.turn === 'red') {
        setRedTimeLeft((t) => {
          if (t <= 1) {
            setGameState((s) => ({ ...s, status: 'checkmate', winner: 'black' }));
            showToast('Bên Đỏ hết giờ! Bên Đen thắng!');
            return 0;
          }
          return t - 1;
        });
      } else {
        setBlackTimeLeft((t) => {
          if (t <= 1) {
            setGameState((s) => ({ ...s, status: 'checkmate', winner: 'red' }));
            showToast('Bên Đen hết giờ! Bên Đỏ thắng!');
            return 0;
          }
          return t - 1;
        });
      }
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, gameState.turn, gameState.status, initialTimeMinutes]);

  // Cleanup old tactical pings after 4.5 seconds
  useEffect(() => {
    if (tacticalPings.length === 0) return;
    const cleanup = setInterval(() => {
      const now = Date.now();
      setTacticalPings((prev) => prev.filter((p) => now - p.timestamp < 4500));
    }, 1000);
    return () => clearInterval(cleanup);
  }, [tacticalPings]);

  // AI response in Solo-AI or Coop-AI mode
  useEffect(() => {
    if (
      (mode === 'solo-ai' || mode === 'coop-ai') &&
      gameState.turn === 'black' &&
      gameState.status === 'playing'
    ) {
      const aiTimer = setTimeout(() => {
        const bestMove = findBestAiMove(gameState.board, 'black', 3);
        if (bestMove) {
          executeMove(bestMove.from, bestMove.to, false);
        }
      }, 500);

      return () => clearTimeout(aiTimer);
    }
  }, [gameState.turn, gameState.status, mode]);

  // Execute Move handler: Dual-broadcast for 100% synchronization guarantee
  const executeMove = (from: Position, to: Position, broadcast = true) => {
    const nextState = applyMove(gameState, from, to);
    const destPiece = gameState.board[to.r][to.c];

    if (destPiece) {
      playSfx(() => soundEffects.playCapture());
    } else {
      playSfx(() => soundEffects.playMove());
    }

    if (nextState.status === 'check') {
      playSfx(() => soundEffects.playCheck());
    } else if (nextState.status === 'checkmate') {
      playSfx(() => soundEffects.playWin());
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    setGameState(nextState);
    setSelectedPos(null);
    setLegalMoves([]);
    setCoopSuggestion(null);

    if (!isTimerRunning && initialTimeMinutes > 0) {
      setIsTimerRunning(true);
    }

    // Broadcast move + full nextState over P2P DataChannel & WebSocket relay
    if (broadcast && p2pRef.current && (mode === 'p2p-1v1' || mode === 'coop-ai' || mode === 'coop-analysis')) {
      const move = nextState.lastMove;
      p2pRef.current.sendPacket({
        type: 'move',
        move,
        state: nextState,
      });
    }
  };

  // Piece Selection on Board
  const handleSelectPiece = (pos: Position) => {
    const piece = gameState.board[pos.r][pos.c];

    // Deselect if clicking on same selected piece
    if (selectedPos && selectedPos.r === pos.r && selectedPos.c === pos.c) {
      setSelectedPos(null);
      setLegalMoves([]);
      return;
    }

    if (!piece) {
      setSelectedPos(null);
      setLegalMoves([]);
      return;
    }

    // Check turn constraints
    if (mode === 'p2p-1v1') {
      if (piece.side !== playerRole) {
        showToast(`Bạn đang cầm quân ${playerRole === 'red' ? 'ĐỎ' : 'ĐEN'}!`);
        return;
      }
      if (gameState.turn !== playerRole) {
        showToast('Chưa tới lượt của bạn! Đang chờ đối thủ...');
        return;
      }
    } else if (mode === 'solo-ai' || mode === 'coop-ai') {
      if (piece.side !== 'red') return;
      if (gameState.turn !== 'red') return;
    }

    setSelectedPos(pos);
    const moves = getLegalMoves(gameState.board, pos);
    setLegalMoves(moves);
  };

  // Join Room Action
  const joinRoomAction = (
    code: string,
    pName: string,
    selectedMode: GameMode,
    timeMinutes: number
  ) => {
    setPlayerName(pName);
    setMode(selectedMode);
    setInitialTimeMinutes(timeMinutes);
    setRedTimeLeft(timeMinutes > 0 ? timeMinutes * 60 : 0);
    setBlackTimeLeft(timeMinutes > 0 ? timeMinutes * 60 : 0);
    setRoomModalOpen(false);

    // Update browser URL query param without reload
    const newUrl = `${window.location.pathname}?room=${code}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);

    p2pRef.current?.joinRoom(code, pName, selectedMode);
  };

  // Start Solo Game Action
  const startSoloAction = (soloMode: 'solo-ai' | 'pass-and-play', timeMinutes: number) => {
    setMode(soloMode);
    setPlayerRole('red');
    setInitialTimeMinutes(timeMinutes);
    setRedTimeLeft(timeMinutes > 0 ? timeMinutes * 60 : 0);
    setBlackTimeLeft(timeMinutes > 0 ? timeMinutes * 60 : 0);
    setRoomModalOpen(false);
    resetLocalGame();
    showToast(soloMode === 'solo-ai' ? 'Bắt đầu đấu với Máy AI!' : 'Bắt đầu 2 người 1 máy!');
  };

  const resetLocalGame = () => {
    setGameState(createInitialGameState());
    setSelectedPos(null);
    setLegalMoves([]);
    setTacticalArrows([]);
    setTacticalPings([]);
    setCoopSuggestion(null);
    setRedTimeLeft(initialTimeMinutes > 0 ? initialTimeMinutes * 60 : 0);
    setBlackTimeLeft(initialTimeMinutes > 0 ? initialTimeMinutes * 60 : 0);
    setIsTimerRunning(false);
  };

  // Tactical Arrows & Pings
  const handleCreateArrow = (arrow: { from: Position; to: Position; color: string }) => {
    const newArrow: TacticalArrow = {
      id: 'arr_' + Date.now(),
      ...arrow,
      senderName: playerName,
    };
    setTacticalArrows((prev) => [...prev, newArrow]);
    p2pRef.current?.sendPacket({
      type: 'tactical-arrow',
      ...newArrow,
    });
  };

  const handleCreatePing = (pos: Position, type: 'attack' | 'defend' | 'danger' | 'suggest') => {
    const newPing: TacticalPing = {
      id: 'ping_' + Date.now(),
      pos,
      type,
      senderName: playerName,
      timestamp: Date.now(),
    };
    setTacticalPings((prev) => [...prev, newPing]);
    playSfx(() => soundEffects.playPing());
    p2pRef.current?.sendPacket({
      type: 'tactical-ping',
      pos,
      pingType: type,
      senderName: playerName,
    });
  };

  const handleClearArrows = () => {
    setTacticalArrows([]);
    setCoopSuggestion(null);
    p2pRef.current?.sendPacket({ type: 'clear-arrows' });
  };

  // Chat
  const handleSendChat = (text: string) => {
    const msg: ChatMessage = {
      id: 'msg_' + Date.now(),
      sender: playerName,
      text,
      time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, msg]);
    p2pRef.current?.sendPacket({
      type: 'chat',
      ...msg,
    });
  };

  // Game control actions
  const handleOfferDraw = () => {
    showToast('Đã gửi đề nghị hòa cờ!');
    p2pRef.current?.sendPacket({
      type: 'game-control',
      action: 'offer-draw',
      payload: { senderName: playerName },
    });
  };

  const handleRequestTakeback = () => {
    if (gameState.moveHistory.length === 0) return;
    if (mode === 'solo-ai' || mode === 'pass-and-play') {
      handleExecuteTakeback();
      showToast('Đã đi lại 1 nước!');
    } else {
      showToast('Đã gửi yêu cầu xin đi lại!');
      p2pRef.current?.sendPacket({
        type: 'game-control',
        action: 'request-takeback',
        payload: { senderName: playerName },
      });
    }
  };

  const handleExecuteTakeback = () => {
    if (gameState.moveHistory.length === 0) return;
    const newInit = createInitialGameState();
    const count = mode === 'solo-ai' ? Math.max(0, gameState.moveHistory.length - 2) : gameState.moveHistory.length - 1;
    let curr = newInit;
    for (let i = 0; i < count; i++) {
      const m = gameState.moveHistory[i];
      curr = applyMove(curr, m.from, m.to);
    }
    setGameState(curr);
    setSelectedPos(null);
    setLegalMoves([]);
  };

  const handleResign = () => {
    if (confirm('Bạn có chắc chắn muốn xin thua ván này không?')) {
      const winnerSide = playerRole === 'red' ? 'black' : 'red';
      setGameState((prev) => ({ ...prev, status: 'checkmate', winner: winnerSide }));
      p2pRef.current?.sendPacket({
        type: 'game-control',
        action: 'resign',
      });
    }
  };

  const handleNewGame = () => {
    if (confirm('Bắt đầu một ván cờ mới?')) {
      resetLocalGame();
      p2pRef.current?.sendPacket({
        type: 'game-control',
        action: 'restart',
      });
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const redPlayer = peers.find((p) => p.role === 'red');
  const blackPlayer = peers.find((p) => p.role === 'black');

  // Determine top player vs bottom player based on board flip
  const topPlayerSide: PieceSide = flipped ? 'red' : 'black';
  const bottomPlayerSide: PieceSide = flipped ? 'black' : 'red';

  const topPlayerName =
    topPlayerSide === 'red'
      ? redPlayer?.name || 'Bên Đỏ'
      : mode === 'solo-ai' || mode === 'coop-ai'
      ? '🤖 Máy AI (Black)'
      : blackPlayer?.name || 'Bên Đen (Chờ đối thủ)';

  const bottomPlayerName =
    bottomPlayerSide === 'red'
      ? redPlayer?.name || playerName
      : blackPlayer?.name || playerName;

  const topPlayerTime = topPlayerSide === 'red' ? redTimeLeft : blackTimeLeft;
  const bottomPlayerTime = bottomPlayerSide === 'red' ? redTimeLeft : blackTimeLeft;

  const topCaptured = topPlayerSide === 'red' ? gameState.capturedBlack : gameState.capturedRed;
  const bottomCaptured = bottomPlayerSide === 'red' ? gameState.capturedBlack : gameState.capturedRed;

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar */}
      <header className="h-12 sm:h-14 border-b border-stone-800/80 bg-stone-900/70 backdrop-blur-xl px-2 sm:px-4 flex items-center justify-between z-40 sticky top-0">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center font-serif text-base sm:text-lg font-black text-stone-950 shadow-md">
            帥
          </span>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-wide font-serif text-amber-200 flex items-center gap-1">
              CỜ TƯỚNG P2P
              <span className="text-[9px] sm:text-[10px] font-sans font-extrabold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                SIÊU TỐC
              </span>
            </h1>
          </div>
        </div>

        {/* Right Control Center */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Live P2P Ping Monitor */}
          <PingMonitor stats={pingStats} roomId={roomId} isP2P={pingStats.connectionType === 'webrtc-direct'} />

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 sm:p-2 rounded-xl bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer"
            title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-500" />}
          </button>

          {/* Room Modal Launcher */}
          <button
            onClick={() => setRoomModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[11px] sm:text-xs shadow-md shadow-amber-900/20 cursor-pointer transition-all active:scale-95"
          >
            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>{roomId ? `${roomId}` : 'Phòng'}</span>
          </button>
        </div>
      </header>

      {/* Main Arena */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center lg:items-start justify-center p-1 sm:p-3 gap-2 sm:gap-4 lg:gap-6">
        {/* Board Arena Column */}
        <div className="w-full max-w-[min(100vw,530px)] flex flex-col items-center">
          {/* TOP PLAYER BANNER (Opponent) */}
          <div
            className={`w-full px-2.5 py-1.5 mb-1 rounded-xl border flex items-center justify-between text-xs transition-all ${
              gameState.turn === topPlayerSide && gameState.status === 'playing'
                ? 'bg-amber-950/40 border-amber-500/60 shadow-md'
                : 'bg-stone-900/60 border-stone-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 ${
                  topPlayerSide === 'red' ? 'bg-red-600 border-red-400' : 'bg-stone-900 border-stone-500'
                }`}
              />
              <div>
                <span className="font-bold text-stone-200 text-xs">{topPlayerName}</span>
                {gameState.turn === topPlayerSide && (
                  <span className="text-[10px] text-amber-400 ml-1.5 font-medium animate-pulse">● Đang đi...</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              {/* Captured piece icons */}
              <div className="flex -space-x-1 overflow-hidden max-w-[100px]">
                {topCaptured.slice(-4).map((p, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      p.side === 'red' ? 'bg-amber-100 text-red-600' : 'bg-stone-800 text-stone-200'
                    }`}
                  >
                    {p.text}
                  </span>
                ))}
              </div>
              {/* Clock Timer */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                  gameState.turn === topPlayerSide && isTimerRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-stone-950 text-stone-400 border border-stone-800'
                }`}
              >
                <Clock className="w-3 h-3" />
                {formatTime(topPlayerTime)}
              </div>
            </div>
          </div>

          {/* CHECK ALERT BANNER (If King in Check) */}
          {gameState.status === 'check' && (
            <div className="w-full py-1 px-3 mb-1 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse shadow-md">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>CHIẾU TƯỚNG! ({gameState.inCheckSide === 'red' ? 'Bên Đỏ' : 'Bên Đen'} bị chiếu)</span>
            </div>
          )}

          {gameState.status === 'checkmate' && (
            <div className="w-full py-1.5 px-3 mb-1 rounded-lg bg-amber-500/25 border border-amber-500/70 text-amber-300 text-xs font-bold text-center shadow-lg">
              🎉 CHIẾU BÍ! {gameState.winner === 'red' ? 'Bên Đỏ' : 'Bên Đen'} chiến thắng vẻ vang!
            </div>
          )}

          {/* MAIN BOARD */}
          <Board
            board={gameState.board}
            turn={gameState.turn}
            playerRole={playerRole}
            flipped={flipped}
            selectedPos={selectedPos}
            legalMoves={legalMoves}
            lastMove={gameState.lastMove}
            inCheckSide={gameState.inCheckSide}
            tacticalPings={tacticalPings}
            tacticalArrows={tacticalArrows}
            coopSuggestion={coopSuggestion}
            onSelectPiece={handleSelectPiece}
            onMakeMove={(from, to) => executeMove(from, to, true)}
            onCreateArrow={handleCreateArrow}
            onCreatePing={handleCreatePing}
          />

          {/* BOTTOM PLAYER BANNER (You / Bottom player) */}
          <div
            className={`w-full px-2.5 py-1.5 mt-1 rounded-xl border flex items-center justify-between text-xs transition-all ${
              gameState.turn === bottomPlayerSide && gameState.status === 'playing'
                ? 'bg-amber-950/40 border-amber-500/60 shadow-md'
                : 'bg-stone-900/60 border-stone-800/70'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 rounded-full border-2 ${
                  bottomPlayerSide === 'red' ? 'bg-red-600 border-red-400' : 'bg-stone-900 border-stone-500'
                }`}
              />
              <div>
                <span className="font-bold text-stone-200 text-xs">{bottomPlayerName} (Bạn)</span>
                {gameState.turn === bottomPlayerSide && (
                  <span className="text-[10px] text-amber-400 ml-1.5 font-medium animate-pulse">● Tới lượt bạn!</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono">
              <div className="flex -space-x-1 overflow-hidden max-w-[100px]">
                {bottomCaptured.slice(-4).map((p, i) => (
                  <span
                    key={i}
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      p.side === 'red' ? 'bg-amber-100 text-red-600' : 'bg-stone-800 text-stone-200'
                    }`}
                  >
                    {p.text}
                  </span>
                ))}
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold ${
                  gameState.turn === bottomPlayerSide && isTimerRunning
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-stone-950 text-stone-400 border border-stone-800'
                }`}
              >
                <Clock className="w-3 h-3" />
                {formatTime(bottomPlayerTime)}
              </div>
            </div>
          </div>

          {/* Quick Ergonomic Action Toolbar (Always visible on mobile & desktop) */}
          <div className="w-full mt-2 grid grid-cols-5 gap-1.5 text-xs font-semibold">
            <button
              onClick={() => setFlipped(!flipped)}
              className="py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              title="Lật mặt bàn cờ"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px]">Lật cờ</span>
            </button>

            <button
              onClick={handleRequestTakeback}
              className="py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              title="Xin đi lại"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span className="text-[10px]">Đi lại</span>
            </button>

            <button
              onClick={handleOfferDraw}
              className="py-2 px-1 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              title="Cầu hòa"
            >
              <Handshake className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[10px]">Cầu hòa</span>
            </button>

            <button
              onClick={handleResign}
              className="py-2 px-1 rounded-xl bg-stone-900 hover:bg-rose-950/40 border border-stone-800 text-stone-300 hover:text-rose-400 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 transition-all"
              title="Xin thua"
            >
              <Flag className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-[10px]">Xin thua</span>
            </button>

            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="py-2 px-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 flex flex-col items-center gap-0.5 cursor-pointer active:scale-95 transition-all relative"
              title="Xem biên bản & Chat"
            >
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px]">Biên bản</span>
              {chatMessages.length > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>
          </div>
        </div>

        {/* Desktop Sidebar (Hidden on small mobile screens to prioritize board size, shown on lg+) */}
        <div className="hidden lg:block">
          <GameSidebar
            gameState={gameState}
            playerRole={playerRole}
            myPeerId={p2pRef.current?.peerId || ''}
            peers={peers}
            roomId={roomId}
            mode={mode}
            redTimeLeft={redTimeLeft}
            blackTimeLeft={blackTimeLeft}
            isTimerRunning={isTimerRunning}
            flipped={flipped}
            chatMessages={chatMessages}
            onFlipBoard={() => setFlipped(!flipped)}
            onSendChat={handleSendChat}
            onRequestTakeback={handleRequestTakeback}
            onOfferDraw={handleOfferDraw}
            onResign={handleResign}
            onNewGame={handleNewGame}
            onLeaveRoom={() => setRoomModalOpen(true)}
            onClearArrows={handleClearArrows}
            onQuickTacticalPing={(type) => {
              if (selectedPos) {
                handleCreatePing(selectedPos, type);
              } else {
                showToast('Hãy chọn 1 ô trên bàn cờ trước để chỉ điểm!');
              }
            }}
          />
        </div>
      </main>

      {/* Mobile Slide-up Drawer for Move History & Chat */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-sm lg:hidden animate-in fade-in">
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl max-h-[80vh] flex flex-col p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <span className="font-bold text-sm text-stone-200">Biên Bản Ván Đấu & Trò Chuyện</span>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1 rounded-xl bg-stone-800 text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <GameSidebar
                gameState={gameState}
                playerRole={playerRole}
                myPeerId={p2pRef.current?.peerId || ''}
                peers={peers}
                roomId={roomId}
                mode={mode}
                redTimeLeft={redTimeLeft}
                blackTimeLeft={blackTimeLeft}
                isTimerRunning={isTimerRunning}
                flipped={flipped}
                chatMessages={chatMessages}
                onFlipBoard={() => setFlipped(!flipped)}
                onSendChat={handleSendChat}
                onRequestTakeback={handleRequestTakeback}
                onOfferDraw={handleOfferDraw}
                onResign={handleResign}
                onNewGame={handleNewGame}
                onLeaveRoom={() => {
                  setMobileDrawerOpen(false);
                  setRoomModalOpen(true);
                }}
                onClearArrows={handleClearArrows}
                onQuickTacticalPing={(type) => {
                  if (selectedPos) {
                    handleCreatePing(selectedPos, type);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Interactive Room Setup Modal */}
      <RoomModal
        isOpen={roomModalOpen}
        onClose={() => setRoomModalOpen(false)}
        onJoinRoom={joinRoomAction}
        onStartSolo={startSoloAction}
        defaultRoomId={roomId}
      />

      {/* Pending Peer Requests Modal (Draw / Takeback) */}
      {pendingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 p-6 rounded-3xl max-w-sm w-full text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto text-xl">
              {pendingPrompt.type === 'draw' ? '🤝' : '↩️'}
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-100">
                {pendingPrompt.type === 'draw' ? 'Đề Nghị Hòa Cờ' : 'Yêu Cầu Xin Đi Lại'}
              </h3>
              <p className="text-xs text-stone-400 mt-1">
                {pendingPrompt.senderName} muốn{' '}
                {pendingPrompt.type === 'draw' ? 'kết thúc ván cờ hòa' : 'quay lại nước đi trước'}.
                Bạn có đồng ý không?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setPendingPrompt(null)}
                className="py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
              >
                Từ chối
              </button>
              <button
                onClick={() => {
                  if (pendingPrompt.type === 'draw') {
                    setGameState((prev) => ({ ...prev, status: 'draw', winner: 'draw' }));
                    p2pRef.current?.sendPacket({
                      type: 'game-control',
                      action: 'accept-draw',
                    });
                  } else if (pendingPrompt.type === 'takeback') {
                    handleExecuteTakeback();
                    p2pRef.current?.sendPacket({
                      type: 'game-control',
                      action: 'accept-takeback',
                    });
                  }
                  setPendingPrompt(null);
                }}
                className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-14 sm:bottom-5 left-1/2 -translate-x-1/2 z-50 py-2 px-3.5 rounded-2xl bg-stone-900/95 border border-amber-500/40 text-amber-200 text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-in slide-in-from-bottom-3 fade-in duration-200 max-w-[90vw] text-center">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
