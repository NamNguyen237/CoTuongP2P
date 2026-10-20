import React, { useState } from 'react';
import { PingStats } from '../types/xiangqi';
import { Zap, Wifi, Activity, Info, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

interface PingMonitorProps {
  stats: PingStats;
  roomId?: string;
  isP2P: boolean;
}

export const PingMonitor: React.FC<PingMonitorProps> = ({ stats, roomId, isP2P }) => {
  const [expanded, setExpanded] = useState(false);

  // Ping display: prioritize direct P2P ping if available, else WebSocket ping
  const activePing = stats.p2pPingMs !== null ? stats.p2pPingMs : stats.wsPingMs;
  const isDirectP2P = stats.connectionType === 'webrtc-direct';

  const getPingColor = (ping: number | null) => {
    if (ping === null) return 'text-zinc-400 bg-zinc-800 border-zinc-700';
    if (ping < 30) return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';
    if (ping < 80) return 'text-amber-400 bg-amber-950/60 border-amber-500/30';
    return 'text-rose-400 bg-rose-950/60 border-rose-500/30';
  };

  const getQualityText = (ping: number | null) => {
    if (ping === null) return 'Đang đo...';
    if (ping < 25) return 'Cực mượt (P2P Direct)';
    if (ping < 60) return 'Tuyệt vời';
    if (ping < 120) return 'Ổn định';
    return 'Độ trễ cao';
  };

  return (
    <div className="relative z-30">
      {/* Compact Status Bar Pill */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md transition-all cursor-pointer select-none ${getPingColor(
          activePing
        )} hover:brightness-110 active:scale-95`}
      >
        <div className="relative flex items-center justify-center">
          {isDirectP2P ? (
            <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          ) : (
            <Wifi className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span
            className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              isDirectP2P ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'
            }`}
          />
        </div>

        <div className="flex items-baseline gap-1 font-mono">
          <span className="text-xs font-bold">
            {activePing !== null ? `${activePing} ms` : '-- ms'}
          </span>
          <span className="text-[10px] opacity-75 font-sans font-medium uppercase tracking-wider">
            {isDirectP2P ? 'P2P' : 'RELAY'}
          </span>
        </div>

        {expanded ? (
          <ChevronUp className="w-3 h-3 opacity-60" />
        ) : (
          <ChevronDown className="w-3 h-3 opacity-60" />
        )}
      </button>

      {/* Expanded Metrics Card */}
      {expanded && (
        <div className="absolute right-0 mt-2 w-80 p-4 rounded-2xl bg-stone-900/95 border border-stone-800 shadow-2xl backdrop-blur-xl text-stone-200 text-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span className="font-semibold text-stone-100 text-sm">
                Đo Lường Độ Trễ (Ping)
              </span>
            </div>
            {isDirectP2P ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="w-3 h-3" /> P2P Chuẩn UDP
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                WS Relay
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 my-3">
            <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
              <span className="text-stone-400 text-[11px] block">WebRTC P2P Ping</span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {stats.p2pPingMs !== null ? `${stats.p2pPingMs} ms` : 'Đang kết nối'}
              </span>
              <span className="text-[10px] text-stone-500 block">Trực tiếp 2 máy</span>
            </div>

            <div className="bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
              <span className="text-stone-400 text-[11px] block">Jitter (Dao động)</span>
              <span className="text-lg font-mono font-bold text-amber-400">
                ±{stats.jitterMs} ms
              </span>
              <span className="text-[10px] text-stone-500 block">Độ ổn định cao</span>
            </div>
          </div>

          <div className="space-y-2 py-2 border-t border-stone-800/80 text-[11px]">
            <div className="flex justify-between items-center text-stone-300">
              <span className="text-stone-400">Chất lượng mạng:</span>
              <span className="font-medium text-emerald-400 font-sans">
                {getQualityText(activePing)}
              </span>
            </div>
            <div className="flex justify-between items-center text-stone-300">
              <span className="text-stone-400">Gói tin đã gửi / nhận:</span>
              <span className="font-mono text-stone-300">
                {stats.packetsSent} / {stats.packetsReceived}
              </span>
            </div>
            {roomId && (
              <div className="flex justify-between items-center text-stone-300">
                <span className="text-stone-400">Mã phòng:</span>
                <span className="font-mono font-bold text-amber-300 tracking-wider">
                  {roomId}
                </span>
              </div>
            )}
          </div>

          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/90 flex gap-2 items-start">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
            <span>
              <strong>Phương thức tối ưu nhất:</strong> Gói tin cờ tướng truyền trực tiếp qua kênh WebRTC DataChannel (SCTP/UDP) giữa 2 máy, không qua trung gian server, đạt độ trễ vật lý thấp nhất!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
