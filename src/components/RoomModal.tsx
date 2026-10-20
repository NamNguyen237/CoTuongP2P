import React, { useState } from 'react';
import { GameMode } from '../types/xiangqi';
import { Users, Bot, Swords, Compass, Copy, Check, Sparkles, Play, Shield, Zap } from 'lucide-react';

interface RoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomId: string, playerName: string, mode: GameMode, timeControlMinutes: number) => void;
  onStartSolo: (mode: 'solo-ai' | 'pass-and-play', timeControlMinutes: number) => void;
  defaultRoomId?: string;
}

export const RoomModal: React.FC<RoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  onStartSolo,
  defaultRoomId,
}) => {
  if (!isOpen) return null;

  const [tab, setTab] = useState<'create' | 'join' | 'solo'>('create');
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('xiangqi_player_name') || `Kỳ thủ ${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [roomCode, setRoomCode] = useState(defaultRoomId || generateRandomCode());
  const [joinCodeInput, setJoinCodeInput] = useState(defaultRoomId || '');
  const [selectedMode, setSelectedMode] = useState<GameMode>('p2p-1v1');
  const [timeControl, setTimeControl] = useState<number>(10); // 10 minutes default
  const [copied, setCopied] = useState(false);

  function generateRandomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'XQ';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  const handleCopyLink = () => {
    const fullUrl = `${window.location.origin}?room=${roomCode}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const extractRoomCode = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed.includes('room=')) {
      try {
        const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
        const code = url.searchParams.get('room');
        if (code) return code.toUpperCase().trim();
      } catch (_) {}
    }
    return trimmed.toUpperCase();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('xiangqi_player_name', playerName);
    onJoinRoom(roomCode, playerName, selectedMode, timeControl);
  };

  const handleJoinExistingRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = extractRoomCode(joinCodeInput);
    if (!cleanCode) return;
    localStorage.setItem('xiangqi_player_name', playerName);
    onJoinRoom(cleanCode, playerName, 'p2p-1v1', timeControl);
  };

  const handleSoloGame = (mode: 'solo-ai' | 'pass-and-play') => {
    onStartSolo(mode, timeControl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl p-6 sm:p-7 text-stone-100 overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-red-600/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold font-serif tracking-wide text-amber-200">
                Cờ Tướng P2P Siêu Tốc
              </h2>
              <span className="flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <Zap className="w-3 h-3" /> WebRTC P2P
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Kết nối trực tiếp Peer-to-Peer không qua server trung gian — Ping siêu thấp!
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 my-4 bg-stone-950/80 rounded-xl border border-stone-800 text-xs font-semibold">
          <button
            onClick={() => setTab('create')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'create'
                ? 'bg-amber-600 text-stone-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Tạo Phòng Mới
          </button>
          <button
            onClick={() => setTab('join')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'join'
                ? 'bg-amber-600 text-stone-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Vào Bằng Mã
          </button>
          <button
            onClick={() => setTab('solo')}
            className={`py-2 rounded-lg transition-all cursor-pointer ${
              tab === 'solo'
                ? 'bg-amber-600 text-stone-950 shadow-md font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Chơi Offline / Máy
          </button>
        </div>

        {/* Player Name Field (Shared) */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-stone-400 mb-1.5">
            Tên kỳ thủ hiển thị:
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={24}
            className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-sm focus:outline-none focus:border-amber-500 transition-colors"
            placeholder="Nhập tên của bạn..."
          />
        </div>

        {/* TAB 1: CREATE ROOM */}
        {tab === 'create' && (
          <form onSubmit={handleCreateRoom} className="space-y-4">
            {/* Mode Selector */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Chế độ chơi:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMode('p2p-1v1')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedMode === 'p2p-1v1'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                      : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Swords className="w-5 h-5 text-amber-400 mb-1" />
                  <div>
                    <div className="text-xs font-bold text-stone-200">1v1 Đối Kháng</div>
                    <div className="text-[10px] text-stone-400">Đỏ vs Đen P2P</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('coop-ai')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedMode === 'coop-ai'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                      : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Users className="w-5 h-5 text-emerald-400 mb-1" />
                  <div>
                    <div className="text-xs font-bold text-stone-200">Co-op vs Máy</div>
                    <div className="text-[10px] text-stone-400">2 người hợp sức</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMode('coop-analysis')}
                  className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    selectedMode === 'coop-analysis'
                      ? 'border-amber-500 bg-amber-500/10 text-amber-200'
                      : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  <Compass className="w-5 h-5 text-sky-400 mb-1" />
                  <div>
                    <div className="text-xs font-bold text-stone-200">Bàn Phân Tích</div>
                    <div className="text-[10px] text-stone-400">Vẽ tên & luyện cờ</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Thời gian mỗi bên:
              </label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { label: '3 Phút (Chớp)', val: 3 },
                  { label: '5 Phút', val: 5 },
                  { label: '10 Phút', val: 10 },
                  { label: 'Không giới hạn', val: 0 },
                ].map((tc) => (
                  <button
                    key={tc.val}
                    type="button"
                    onClick={() => setTimeControl(tc.val)}
                    className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                      timeControl === tc.val
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-bold'
                        : 'border-stone-800 bg-stone-950 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Code Display & Copy Link */}
            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-stone-400">Mã phòng của bạn:</span>
                <button
                  type="button"
                  onClick={() => setRoomCode(generateRandomCode())}
                  className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                >
                  Đổi mã khác
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 py-2 px-3 rounded-xl bg-stone-900 border border-stone-700/80 font-mono text-center text-lg font-extrabold text-amber-300 tracking-widest">
                  {roomCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Đã chép link' : 'Chép link'}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-110 text-stone-950 font-bold text-sm shadow-xl shadow-amber-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              Khởi Tạo Phòng & Chờ Bạn
            </button>
          </form>
        )}

        {/* TAB 2: JOIN EXISTING ROOM */}
        {tab === 'join' && (
          <form onSubmit={handleJoinExistingRoom} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Nhập mã phòng 6 ký tự:
              </label>
              <input
                type="text"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                placeholder="VD: XQ8888 hoặc dán link"
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-center font-mono text-xl tracking-widest focus:outline-none focus:border-amber-500 uppercase transition-colors"
              />
              <p className="text-[11px] text-stone-500 mt-2">
                Hệ thống sẽ ngay lập tức thiết lập kênh truyền WebRTC DataChannel trực tiếp với máy đối thủ.
              </p>
            </div>

            <button
              type="submit"
              disabled={!joinCodeInput.trim()}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 disabled:opacity-50 text-stone-950 font-bold text-sm shadow-xl shadow-teal-900/30 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
            >
              <Play className="w-4 h-4 fill-stone-950" />
              Tham Gia Phòng Ngay
            </button>
          </form>
        )}

        {/* TAB 3: SOLO / PRACTICE */}
        {tab === 'solo' && (
          <div className="space-y-3">
            <p className="text-xs text-stone-400">
              Chơi ngay không cần kết nối mạng hoặc thử sức với máy tính:
            </p>

            <button
              onClick={() => handleSoloGame('solo-ai')}
              className="w-full p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/60 text-left flex items-center justify-between group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-100">Đấu Với Máy (AI)</div>
                  <div className="text-xs text-stone-400">Thuật toán MiniMax Alpha-Beta cờ tướng</div>
                </div>
              </div>
              <Play className="w-4 h-4 text-stone-500 group-hover:text-amber-400" />
            </button>

            <button
              onClick={() => handleSoloGame('pass-and-play')}
              className="w-full p-4 rounded-2xl bg-stone-950 border border-stone-800 hover:border-emerald-500/60 text-left flex items-center justify-between group transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-stone-100">2 Người 1 Máy (Pass & Play)</div>
                  <div className="text-xs text-stone-400">Thay nhau đi trực tiếp trên màn hình này</div>
                </div>
              </div>
              <Play className="w-4 h-4 text-stone-500 group-hover:text-emerald-400" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
