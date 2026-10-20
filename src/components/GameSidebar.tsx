import React, { useState, useRef, useEffect } from 'react';
import { GameState, PieceSide, Move, ChatMessage, PeerPlayer, GameMode, Piece } from '../types/xiangqi';
import {
  RotateCcw,
  Flag,
  Handshake,
  MessageSquare,
  Clock,
  Send,
  Eye,
  Eraser,
  Sparkles,
  RefreshCw,
  LogOut,
  Swords,
  ChevronRight,
  ShieldAlert,
  Flame,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { soundEffects } from '../utils/xiangqiEngine';

interface GameSidebarProps {
  gameState: GameState;
  playerRole: 'red' | 'black' | 'spectator' | 'coop';
  myPeerId: string;
  peers: PeerPlayer[];
  roomId: string;
  mode: GameMode;
  redTimeLeft: number;
  blackTimeLeft: number;
  isTimerRunning: boolean;
  flipped: boolean;
  chatMessages: ChatMessage[];
  onFlipBoard: () => void;
  onSendChat: (text: string) => void;
  onRequestTakeback: () => void;
  onOfferDraw: () => void;
  onResign: () => void;
  onNewGame: () => void;
  onLeaveRoom: () => void;
  onClearArrows: () => void;
  onQuickTacticalPing: (type: 'attack' | 'defend' | 'danger' | 'suggest') => void;
}

export const GameSidebar: React.FC<GameSidebarProps> = ({
  gameState,
  playerRole,
  peers,
  roomId,
  mode,
  redTimeLeft,
  blackTimeLeft,
  isTimerRunning,
  flipped,
  chatMessages,
  onFlipBoard,
  onSendChat,
  onRequestTakeback,
  onOfferDraw,
  onResign,
  onNewGame,
  onLeaveRoom,
  onClearArrows,
  onQuickTacticalPing,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState<'moves' | 'chat'>('moves');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim());
    setChatInput('');
  };

  const quickMessages = [
    'Nước cờ hay quá! 🔥',
    'Coi chừng pháo lồng! ⚠️',
    'Chiếu tướng! 👑',
    'Xin lỗi, lỡ tay đi nhầm! 😅',
    'Trận đấu gay cấn thật! ⚔️',
    'Đồng ý hòa không bạn? 🤝',
  ];

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Group captured pieces for display
  const renderCapturedPieces = (pieces: Piece[]) => {
    return (
      <div className="flex flex-wrap gap-1 items-center min-h-[22px]">
        {pieces.map((p, i) => (
          <span
            key={i}
            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
              p.side === 'red'
                ? 'bg-amber-100 text-red-600 border border-red-400'
                : 'bg-stone-800 text-stone-200 border border-stone-600'
            }`}
            title={p.viText}
          >
            {p.text}
          </span>
        ))}
      </div>
    );
  };

  const redPlayer = peers.find((p) => p.role === 'red');
  const blackPlayer = peers.find((p) => p.role === 'black');

  return (
    <div className="w-full lg:w-96 flex flex-col gap-3 rounded-3xl bg-stone-900/90 border border-stone-800 p-4 shadow-xl backdrop-blur-md text-stone-200">
      {/* Room and Status Header */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-400">Phòng:</span>
            <span className="font-mono font-extrabold text-amber-400 tracking-wider">
              {roomId || 'OFFLINE'}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-stone-800 text-stone-300 font-medium">
              {mode === 'p2p-1v1'
                ? '1v1 P2P'
                : mode === 'coop-ai'
                ? 'Co-op vs AI'
                : mode === 'coop-analysis'
                ? 'Phân Tích'
                : 'Luyện Tập'}
            </span>
          </div>
          <div className="text-[11px] text-stone-400 mt-0.5">
            Vai trò: {playerRole === 'red' ? '🔴 Bên Đỏ (Tiên)' : playerRole === 'black' ? '⚫ Bên Đen (Hậu)' : playerRole === 'coop' ? '🤝 Đồng Đội Co-op' : '👁️ Khán Giả'}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onFlipBoard}
            title="Lật bàn cờ"
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-400 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onLeaveRoom}
            title="Đổi phòng / Rời phòng"
            className="p-2 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-300 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Players Card & Clock */}
      <div className="space-y-2">
        {/* Black Player Card */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            gameState.turn === 'black' && gameState.status === 'playing'
              ? 'bg-stone-950/90 border-amber-500/60 shadow-lg shadow-amber-950/20'
              : 'bg-stone-950/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-stone-900 border-2 border-stone-500 shadow-sm" />
              <div>
                <span className="text-xs font-bold text-stone-200">
                  {mode === 'coop-ai' || mode === 'solo-ai'
                    ? '🤖 Máy AI (Black)'
                    : blackPlayer?.name || 'Bên Đen (Chờ đối thủ)'}
                </span>
                {gameState.turn === 'black' && (
                  <span className="block text-[10px] text-amber-400 font-medium">Đang nghĩ...</span>
                )}
              </div>
            </div>
            {/* Clock Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-sm font-bold ${
                gameState.turn === 'black' && isTimerRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-stone-900 text-stone-400 border border-stone-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTime(blackTimeLeft)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-800/50 flex items-center justify-between text-[11px] text-stone-400">
            <span>Ăn được:</span>
            {renderCapturedPieces(gameState.capturedRed)}
          </div>
        </div>

        {/* Turn Status Alert Banner */}
        {gameState.status === 'check' && (
          <div className="py-2 px-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs font-bold flex items-center justify-center gap-2 animate-pulse shadow-md">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span>CHIẾU TƯỚNG! ({gameState.inCheckSide === 'red' ? 'Bên Đỏ' : 'Bên Đen'} bị chiếu)</span>
          </div>
        )}

        {gameState.status === 'checkmate' && (
          <div className="py-2.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-bold text-center shadow-lg">
            🎉 CHIẾU BÍ! {gameState.winner === 'red' ? 'Bên Đỏ' : 'Bên Đen'} chiến thắng!
          </div>
        )}

        {gameState.status === 'stalemate' && (
          <div className="py-2.5 px-3 rounded-xl bg-amber-500/20 border border-amber-500/60 text-amber-300 text-xs font-bold text-center shadow-lg">
            HẾT NƯỚC ĐI! {gameState.winner === 'red' ? 'Bên Đỏ' : 'Bên Đen'} thắng theo luật cờ tướng!
          </div>
        )}

        {gameState.status === 'draw' && (
          <div className="py-2 px-3 rounded-xl bg-stone-800 border border-stone-700 text-stone-300 text-xs font-bold text-center">
            🤝 Ván cờ kết thúc HÒA
          </div>
        )}

        {/* Red Player Card */}
        <div
          className={`p-3 rounded-2xl border transition-all ${
            gameState.turn === 'red' && gameState.status === 'playing'
              ? 'bg-stone-950/90 border-red-500/60 shadow-lg shadow-red-950/20'
              : 'bg-stone-950/40 border-stone-800/80'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-red-400 shadow-sm" />
              <div>
                <span className="text-xs font-bold text-stone-200">
                  {redPlayer?.name || 'Bên Đỏ (Chờ đối thủ)'}
                </span>
                {gameState.turn === 'red' && (
                  <span className="block text-[10px] text-red-400 font-medium">Đang nghĩ...</span>
                )}
              </div>
            </div>
            {/* Clock Timer */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-xl font-mono text-sm font-bold ${
                gameState.turn === 'red' && isTimerRunning
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                  : 'bg-stone-900 text-stone-400 border border-stone-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {formatTime(redTimeLeft)}
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-800/50 flex items-center justify-between text-[11px] text-stone-400">
            <span>Ăn được:</span>
            {renderCapturedPieces(gameState.capturedBlack)}
          </div>
        </div>
      </div>

      {/* Tactical Quick Action Toolbar */}
      <div className="p-2.5 rounded-2xl bg-stone-950/60 border border-stone-800/80 flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-1">
          Chỉ Điểm:
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onQuickTacticalPing('attack')}
            title="Đánh dấu điểm tấn công"
            className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-90"
          >
            🎯 Đánh
          </button>
          <button
            onClick={() => onQuickTacticalPing('defend')}
            title="Đánh dấu phòng thủ"
            className="p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-90"
          >
            🛡️ Thủ
          </button>
          <button
            onClick={() => onQuickTacticalPing('suggest')}
            title="Gợi ý nước đi"
            className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1 cursor-pointer transition-transform active:scale-90"
          >
            💡 Ý hay
          </button>
          <button
            onClick={onClearArrows}
            title="Xóa tất cả mũi tên chiến thuật"
            className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 text-xs flex items-center gap-1 cursor-pointer transition-transform active:scale-90"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs: Move History vs Chat */}
      <div className="flex-1 flex flex-col min-h-[220px]">
        <div className="flex border-b border-stone-800">
          <button
            onClick={() => setActiveTab('moves')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'moves'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Biên Bản Ván Đấu ({gameState.moveHistory.length})
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'chat'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Trò Chuyện
            {chatMessages.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-amber-500 text-stone-950 text-[10px] flex items-center justify-center font-extrabold">
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: MOVE NOTATION LIST */}
        {activeTab === 'moves' && (
          <div className="flex-1 overflow-y-auto max-h-56 p-2 space-y-1 text-xs font-mono">
            {gameState.moveHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-stone-500 text-center py-8">
                Chưa có nước đi nào.
                <br />
                Bên Đỏ đi trước!
              </div>
            ) : (
              <div className="space-y-1">
                {Array.from({ length: Math.ceil(gameState.moveHistory.length / 2) }).map((_, i) => {
                  const redMove = gameState.moveHistory[i * 2];
                  const blackMove = gameState.moveHistory[i * 2 + 1];

                  return (
                    <div
                      key={i}
                      className="grid grid-cols-7 py-1 px-2 rounded-lg hover:bg-stone-800/50 text-[11px]"
                    >
                      <span className="col-span-1 text-stone-500 font-bold">{i + 1}.</span>
                      <span className="col-span-3 text-red-400 font-bold flex items-center gap-1">
                        {redMove.notationVi}
                        {redMove.captured && (
                          <span className="text-[9px] text-amber-400">×{redMove.captured.viText}</span>
                        )}
                      </span>
                      <span className="col-span-3 text-stone-300 font-bold flex items-center gap-1">
                        {blackMove ? (
                          <>
                            {blackMove.notationVi}
                            {blackMove.captured && (
                              <span className="text-[9px] text-amber-400">×{blackMove.captured.viText}</span>
                            )}
                          </>
                        ) : (
                          '...'
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CHAT & QUICK EMOTES */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col justify-between max-h-56">
            <div className="flex-1 overflow-y-auto p-2 space-y-2 text-xs">
              {chatMessages.length === 0 ? (
                <div className="text-center text-stone-500 py-6 text-[11px]">
                  Chưa có tin nhắn nào.
                  <br />
                  Gửi lời chào kỳ hữu nào!
                </div>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-2 rounded-xl text-xs ${
                      msg.isSystem
                        ? 'bg-amber-500/10 text-amber-300 text-center text-[10px]'
                        : 'bg-stone-950/80 border border-stone-800'
                    }`}
                  >
                    {!msg.isSystem && (
                      <div className="flex justify-between items-center text-[10px] text-stone-400 mb-0.5">
                        <span className="font-bold text-stone-300">{msg.sender}</span>
                        <span>{msg.time}</span>
                      </div>
                    )}
                    <div className="text-stone-200">{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick preset emotes */}
            <div className="flex gap-1 overflow-x-auto py-1 px-1 border-t border-stone-800/80 text-[10px] no-scrollbar">
              {quickMessages.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendChat(q)}
                  className="whitespace-nowrap px-2 py-1 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-300 cursor-pointer shrink-0"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Input form */}
            <form onSubmit={handleChatSubmit} className="flex gap-1.5 p-1 pt-1.5">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Nhắn tin cờ tướng..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Game Actions Footer */}
      <div className="pt-2 border-t border-stone-800 grid grid-cols-4 gap-1.5 text-xs font-semibold">
        <button
          onClick={onRequestTakeback}
          className="py-2 px-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 flex flex-col items-center gap-1 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px]">Xin đi lại</span>
        </button>

        <button
          onClick={onOfferDraw}
          className="py-2 px-1 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 flex flex-col items-center gap-1 cursor-pointer transition-colors"
        >
          <Handshake className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[10px]">Cầu hòa</span>
        </button>

        <button
          onClick={onResign}
          className="py-2 px-1 rounded-xl bg-stone-800 hover:bg-rose-950 text-stone-300 hover:text-rose-400 flex flex-col items-center gap-1 cursor-pointer transition-colors"
        >
          <Flag className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[10px]">Xin thua</span>
        </button>

        <button
          onClick={onNewGame}
          className="py-2 px-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 flex flex-col items-center gap-1 border border-amber-500/30 cursor-pointer transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-[10px]">Ván mới</span>
        </button>
      </div>
    </div>
  );
};
