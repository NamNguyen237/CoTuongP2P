import React, { useState, useRef, useEffect } from 'react';
import { Piece, PieceSide, Position, Move, TacticalPing, TacticalArrow } from '../types/xiangqi';

interface BoardProps {
  board: (Piece | null)[][];
  turn: PieceSide;
  playerRole: 'red' | 'black' | 'spectator' | 'coop';
  flipped: boolean;
  selectedPos: Position | null;
  legalMoves: Position[];
  lastMove?: Move | null;
  inCheckSide?: PieceSide | null;
  tacticalPings: TacticalPing[];
  tacticalArrows: TacticalArrow[];
  coopSuggestion?: { from: Position; to: Position; senderName: string } | null;
  onSelectPiece: (pos: Position) => void;
  onMakeMove: (from: Position, to: Position) => void;
  onCreateArrow?: (arrow: { from: Position; to: Position; color: string }) => void;
  onCreatePing?: (pos: Position, type: 'attack' | 'defend' | 'danger' | 'suggest') => void;
}

export const Board: React.FC<BoardProps> = ({
  board,
  turn,
  playerRole,
  flipped,
  selectedPos,
  legalMoves,
  lastMove,
  inCheckSide,
  tacticalPings,
  tacticalArrows,
  coopSuggestion,
  onSelectPiece,
  onMakeMove,
  onCreateArrow,
  onCreatePing,
}) => {
  // Ultra-optimized geometry: Maximize piece size and board area, minimal margins
  const MARGIN_X = 24;
  const MARGIN_Y = 27;
  const STEP = 54;
  const WIDTH = MARGIN_X * 2 + 8 * STEP; // 480
  const HEIGHT = MARGIN_Y * 2 + 9 * STEP; // 540
  const PIECE_RADIUS = 24; // 48px piece diameter on 54px cell = huge & legible!

  // Coordinates transformation considering board flip
  const toDisplay = (r: number, c: number) => {
    const dr = flipped ? 9 - r : r;
    const dc = flipped ? 8 - c : c;
    return {
      x: MARGIN_X + dc * STEP,
      y: MARGIN_Y + dr * STEP,
      r,
      c,
    };
  };

  const fromDisplayPoint = (px: number, py: number): Position | null => {
    const dc = Math.round((px - MARGIN_X) / STEP);
    const dr = Math.round((py - MARGIN_Y) / STEP);
    if (dc < 0 || dc > 8 || dr < 0 || dr > 9) return null;
    const r = flipped ? 9 - dr : dr;
    const c = flipped ? 8 - dc : dc;
    return { r, c };
  };

  // State for drawing tactical arrows (right click drag or long press)
  const [arrowStart, setArrowStart] = useState<Position | null>(null);
  const [arrowCurrent, setArrowCurrent] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number; pos: Position } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Close context menu on outside click
  useEffect(() => {
    const closeMenu = () => setContextMenuPos(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Handle board click / interaction
  const handleCellClick = (r: number, c: number) => {
    setContextMenuPos(null);
    const piece = board[r][c];

    // If already selected a piece and clicked on a legal move destination
    if (selectedPos) {
      const isLegal = legalMoves.some((m) => m.r === r && m.c === c);
      if (isLegal) {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(20); } catch (_) {}
        }
        onMakeMove(selectedPos, { r, c });
        return;
      }
    }

    // Otherwise select piece if allowed
    const canSelectPiece =
      piece &&
      (playerRole === 'coop' ||
        playerRole === piece.side ||
        playerRole === 'spectator' ||
        playerRole === undefined);

    if (piece && canSelectPiece) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(15); } catch (_) {}
      }
      onSelectPiece({ r, c });
    } else if (selectedPos) {
      // Deselect if clicking on invalid empty spot
      onSelectPiece({ r, c });
    }
  };

  // Convert client coordinate to SVG point
  const getSvgPoint = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = WIDTH / rect.width;
    const scaleY = HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      e.preventDefault();
      const pt = getSvgPoint(e);
      if (pt) {
        const pos = fromDisplayPoint(pt.x, pt.y);
        if (pos) {
          setArrowStart(pos);
          setArrowCurrent(pt);
        }
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (arrowStart) {
      const pt = getSvgPoint(e);
      if (pt) setArrowCurrent(pt);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button === 2 && arrowStart && arrowCurrent) {
      e.preventDefault();
      const endPos = fromDisplayPoint(arrowCurrent.x, arrowCurrent.y);
      if (endPos && (endPos.r !== arrowStart.r || endPos.c !== arrowStart.c)) {
        onCreateArrow?.({
          from: arrowStart,
          to: endPos,
          color: '#eab308',
        });
      } else if (arrowStart) {
        setContextMenuPos({
          x: e.clientX,
          y: e.clientY,
          pos: arrowStart,
        });
      }
      setArrowStart(null);
      setArrowCurrent(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Corner markers generator
  const renderCrossMarkers = (r: number, c: number) => {
    const pt = toDisplay(r, c);
    const d = 4.5;
    const l = 7;
    const col = 'rgba(120, 53, 15, 0.7)';

    const left = c > 0;
    const right = c < 8;

    return (
      <g key={`marker_${r}_${c}`} stroke={col} strokeWidth="1.5" fill="none">
        {left && (
          <>
            <path d={`M ${pt.x - d} ${pt.y - d - l} L ${pt.x - d} ${pt.y - d} L ${pt.x - d - l} ${pt.y - d}`} />
            <path d={`M ${pt.x - d} ${pt.y + d + l} L ${pt.x - d} ${pt.y + d} L ${pt.x - d - l} ${pt.y + d}`} />
          </>
        )}
        {right && (
          <>
            <path d={`M ${pt.x + d} ${pt.y - d - l} L ${pt.x + d} ${pt.y - d} L ${pt.x + d + l} ${pt.y - d}`} />
            <path d={`M ${pt.x + d} ${pt.y + d + l} L ${pt.x + d} ${pt.y + d} L ${pt.x + d + l} ${pt.y + d}`} />
          </>
        )}
      </g>
    );
  };

  return (
    <div className="relative flex flex-col items-center select-none w-full max-w-[min(100vw,520px)] mx-auto px-1 sm:px-0">
      {/* Wooden Frame with Minimal Outer Padding for Max Mobile Size */}
      <div className="relative w-full p-1 sm:p-2.5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-950 via-stone-900 to-amber-950 shadow-[0_15px_45px_-10px_rgba(0,0,0,0.85)] border border-amber-800/50">
        <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-amber-700/60 shadow-inner bg-[#edd2a4]">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            className="w-full h-auto aspect-[480/540] cursor-pointer touch-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onContextMenu={handleContextMenu}
          >
            <defs>
              {/* Rich Wood Grain Gradient Background */}
              <radialGradient id="woodBg" cx="50%" cy="50%" r="75%">
                <stop offset="0%" stopColor="#f7e6ca" />
                <stop offset="45%" stopColor="#efd5a8" />
                <stop offset="85%" stopColor="#dfba80" />
                <stop offset="100%" stopColor="#cca264" />
              </radialGradient>

              {/* Red Piece Wooden Gradient */}
              <radialGradient id="pieceRedGrad" cx="35%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="35%" stopColor="#fdf1dc" />
                <stop offset="85%" stopColor="#e5c494" />
                <stop offset="100%" stopColor="#c5995d" />
              </radialGradient>

              {/* Black Piece Wooden Gradient */}
              <radialGradient id="pieceBlackGrad" cx="35%" cy="32%" r="68%">
                <stop offset="0%" stopColor="#fbf9f5" />
                <stop offset="35%" stopColor="#f5e9d4" />
                <stop offset="85%" stopColor="#dec08d" />
                <stop offset="100%" stopColor="#bc9255" />
              </radialGradient>

              {/* Piece drop shadow */}
              <filter id="pieceShadow" x="-20%" y="-20%" width="150%" height="150%">
                <feDropShadow dx="1.2" dy="2.8" stdDeviation="2.2" floodColor="#221102" floodOpacity="0.45" />
              </filter>

              {/* Arrow Head Markers */}
              <marker id="arrowHead" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#eab308" />
              </marker>
              <marker id="arrowHeadRed" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#ef4444" />
              </marker>
              <marker id="arrowHeadBlue" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#3b82f6" />
              </marker>
              <marker id="arrowHeadGreen" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">
                <path d="M 0 0 L 6 3 L 0 6 z" fill="#10b981" />
              </marker>
            </defs>

            {/* Board Background */}
            <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#woodBg)" />

            {/* Inner Double Frame Border */}
            <rect
              x={MARGIN_X - 10}
              y={MARGIN_Y - 10}
              width={8 * STEP + 20}
              height={9 * STEP + 20}
              fill="none"
              stroke="#532908"
              strokeWidth="2.2"
            />
            <rect
              x={MARGIN_X - 14}
              y={MARGIN_Y - 14}
              width={8 * STEP + 28}
              height={9 * STEP + 28}
              fill="none"
              stroke="#7c4613"
              strokeWidth="1"
            />

            {/* Grid Lines */}
            <g stroke="#532908" strokeWidth="1.3">
              {/* Horizontal Lines (10 lines) */}
              {Array.from({ length: 10 }).map((_, r) => {
                const pt1 = toDisplay(r, 0);
                const pt2 = toDisplay(r, 8);
                return <line key={`h_${r}`} x1={pt1.x} y1={pt1.y} x2={pt2.x} y2={pt2.y} />;
              })}

              {/* Outer vertical borders across river */}
              {(() => {
                const p0_top = toDisplay(0, 0);
                const p0_bot = toDisplay(9, 0);
                const p8_top = toDisplay(0, 8);
                const p8_bot = toDisplay(9, 8);
                return (
                  <>
                    <line x1={p0_top.x} y1={p0_top.y} x2={p0_bot.x} y2={p0_bot.y} strokeWidth="1.6" />
                    <line x1={p8_top.x} y1={p8_top.y} x2={p8_bot.x} y2={p8_bot.y} strokeWidth="1.6" />
                  </>
                );
              })()}

              {/* Inner Vertical Lines (Break across the river) */}
              {Array.from({ length: 7 }).map((_, i) => {
                const c = i + 1;
                const ptTopStart = toDisplay(0, c);
                const ptTopEnd = toDisplay(4, c);
                const ptBotStart = toDisplay(5, c);
                const ptBotEnd = toDisplay(9, c);

                return (
                  <React.Fragment key={`v_${c}`}>
                    <line x1={ptTopStart.x} y1={ptTopStart.y} x2={ptTopEnd.x} y2={ptTopEnd.y} />
                    <line x1={ptBotStart.x} y1={ptBotStart.y} x2={ptBotEnd.x} y2={ptBotEnd.y} />
                  </React.Fragment>
                );
              })}

              {/* Palace Diagonals (Cửu Cung) */}
              {(() => {
                const t1 = toDisplay(0, 3);
                const t2 = toDisplay(2, 5);
                const t3 = toDisplay(0, 5);
                const t4 = toDisplay(2, 3);

                const b1 = toDisplay(7, 3);
                const b2 = toDisplay(9, 5);
                const b3 = toDisplay(7, 5);
                const b4 = toDisplay(9, 3);

                return (
                  <>
                    <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} strokeWidth="1.1" />
                    <line x1={t3.x} y1={t3.y} x2={t4.x} y2={t4.y} strokeWidth="1.1" />
                    <line x1={b1.x} y1={b1.y} x2={b2.x} y2={b2.y} strokeWidth="1.1" />
                    <line x1={b3.x} y1={b3.y} x2={b4.x} y2={b4.y} strokeWidth="1.1" />
                  </>
                );
              })()}
            </g>

            {/* River Calligraphy (Sở Hà - Hán Giới) */}
            {(() => {
              const riverY = (toDisplay(4, 4).y + toDisplay(5, 4).y) / 2;
              const leftCenter = toDisplay(4, 2);
              const rightCenter = toDisplay(4, 6);

              return (
                <g fill="#6d3007" opacity="0.88" className="select-none font-serif">
                  <text
                    x={leftCenter.x}
                    y={riverY + 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-base sm:text-lg font-bold tracking-widest"
                    style={{ fontFamily: "'Ma Shan Zheng', 'Noto Serif TC', serif" }}
                  >
                    楚 河
                  </text>
                  <text
                    x={rightCenter.x}
                    y={riverY + 5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-base sm:text-lg font-bold tracking-widest"
                    style={{ fontFamily: "'Ma Shan Zheng', 'Noto Serif TC', serif" }}
                  >
                    漢 界
                  </text>
                  <text
                    x={toDisplay(4, 4).x}
                    y={riverY + 4}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[9px] font-sans tracking-[0.25em] opacity-60 uppercase font-semibold"
                  >
                    Sở Hà — Hán Giới
                  </text>
                </g>
              );
            })()}

            {/* Corner Markers for Cannons and Pawns */}
            {[
              [2, 1], [2, 7], [7, 1], [7, 7],
              [3, 0], [3, 2], [3, 4], [3, 6], [3, 8],
              [6, 0], [6, 2], [6, 4], [6, 6], [6, 8],
            ].map(([r, c]) => renderCrossMarkers(r, c))}

            {/* Last Move Highlight Indicator */}
            {lastMove && (
              <g>
                {(() => {
                  const pt = toDisplay(lastMove.from.r, lastMove.from.c);
                  return (
                    <rect
                      x={pt.x - 24}
                      y={pt.y - 24}
                      width="48"
                      height="48"
                      rx="10"
                      fill="rgba(245, 158, 11, 0.22)"
                      stroke="#f59e0b"
                      strokeWidth="1.8"
                      strokeDasharray="4 2"
                    />
                  );
                })()}
                {(() => {
                  const pt = toDisplay(lastMove.to.r, lastMove.to.c);
                  return (
                    <rect
                      x={pt.x - 25}
                      y={pt.y - 25}
                      width="50"
                      height="50"
                      rx="12"
                      fill="rgba(245, 158, 11, 0.3)"
                      stroke="#d97706"
                      strokeWidth="2.2"
                    />
                  );
                })()}
              </g>
            )}

            {/* King in Check Warning Aura */}
            {inCheckSide && (
              <g>
                {(() => {
                  for (let r = 0; r < 10; r++) {
                    for (let c = 0; c < 9; c++) {
                      const p = board[r][c];
                      if (p && p.type === 'king' && p.side === inCheckSide) {
                        const pt = toDisplay(r, c);
                        return (
                          <g key="check-aura">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="33"
                              fill="rgba(239, 68, 68, 0.35)"
                              className="animate-ping origin-center"
                            />
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="28"
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="3.5"
                              className="animate-pulse"
                            />
                          </g>
                        );
                      }
                    }
                  }
                  return null;
                })()}
              </g>
            )}

            {/* Selected Piece Highlight Ring */}
            {selectedPos && (
              <g>
                {(() => {
                  const pt = toDisplay(selectedPos.r, selectedPos.c);
                  return (
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="27"
                      fill="none"
                      stroke="#eab308"
                      strokeWidth="3.8"
                      className="animate-pulse"
                    />
                  );
                })()}
              </g>
            )}

            {/* Empty Intersections Clickable Hotspots (Ensure easy tapping on empty cells) */}
            {Array.from({ length: 10 }).map((_, r) =>
              Array.from({ length: 9 }).map((_, c) => {
                if (board[r][c]) return null;
                const pt = toDisplay(r, c);
                return (
                  <circle
                    key={`hit_${r}_${c}`}
                    cx={pt.x}
                    cy={pt.y}
                    r={26}
                    fill="transparent"
                    onClick={() => handleCellClick(r, c)}
                    className="cursor-pointer"
                  />
                );
              })
            )}

            {/* Legal Move Destination Dots & Capture Rings */}
            {legalMoves.map((m, idx) => {
              const pt = toDisplay(m.r, m.c);
              const targetPiece = board[m.r][m.c];

              return (
                <g
                  key={`legal_${idx}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedPos) {
                      handleCellClick(m.r, m.c);
                    }
                  }}
                  className="cursor-pointer group"
                >
                  {targetPiece ? (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="27"
                        fill="rgba(239, 68, 68, 0.28)"
                        stroke="#dc2626"
                        strokeWidth="3"
                        strokeDasharray="5 3"
                        className="group-hover:fill-rose-500/40 transition-all"
                      />
                      <circle cx={pt.x} cy={pt.y} r="7" fill="#ef4444" />
                    </g>
                  ) : (
                    <g>
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="9"
                        fill="rgba(16, 185, 129, 0.85)"
                        className="group-hover:r-[12] transition-all"
                      />
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r="25"
                        fill="transparent"
                        className="hover:fill-emerald-500/20"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Co-op Partner Move Suggestion Ghost Arrow */}
            {coopSuggestion && (
              <g>
                {(() => {
                  const p1 = toDisplay(coopSuggestion.from.r, coopSuggestion.from.c);
                  const p2 = toDisplay(coopSuggestion.to.r, coopSuggestion.to.c);
                  return (
                    <g opacity="0.88">
                      <line
                        x1={p1.x}
                        y1={p1.y}
                        x2={p2.x}
                        y2={p2.y}
                        stroke="#06b6d4"
                        strokeWidth="3.5"
                        strokeDasharray="6 3"
                        markerEnd="url(#arrowHead)"
                      />
                      <circle cx={p2.x} cy={p2.y} r="25" fill="none" stroke="#06b6d4" strokeWidth="2.5" />
                      <text
                        x={p2.x}
                        y={p2.y - 28}
                        textAnchor="middle"
                        fill="#0891b2"
                        className="text-[10px] font-bold font-sans"
                      >
                        {coopSuggestion.senderName} gợi ý
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Tactical Arrows (Drawn by players) */}
            {tacticalArrows.map((arrow) => {
              const p1 = toDisplay(arrow.from.r, arrow.from.c);
              const p2 = toDisplay(arrow.to.r, arrow.to.c);

              const markerId =
                arrow.color === '#ef4444'
                  ? 'url(#arrowHeadRed)'
                  : arrow.color === '#3b82f6'
                  ? 'url(#arrowHeadBlue)'
                  : arrow.color === '#10b981'
                  ? 'url(#arrowHeadGreen)'
                  : 'url(#arrowHead)';

              return (
                <line
                  key={arrow.id}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={arrow.color}
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  opacity="0.85"
                  markerEnd={markerId}
                />
              );
            })}

            {/* Currently dragging arrow */}
            {arrowStart && arrowCurrent && (
              <line
                x1={toDisplay(arrowStart.r, arrowStart.c).x}
                y1={toDisplay(arrowStart.r, arrowStart.c).y}
                x2={arrowCurrent.x}
                y2={arrowCurrent.y}
                stroke="#eab308"
                strokeWidth="4.5"
                strokeDasharray="5 3"
                opacity="0.85"
                markerEnd="url(#arrowHead)"
              />
            )}

            {/* Tactical Pings (Animated Ripples on board) */}
            {tacticalPings.map((ping) => {
              const pt = toDisplay(ping.pos.r, ping.pos.c);
              const colorMap = {
                attack: '#ef4444',
                defend: '#3b82f6',
                danger: '#f97316',
                suggest: '#10b981',
              };
              const col = colorMap[ping.type] || '#eab308';

              return (
                <g key={ping.id}>
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="30"
                    fill="none"
                    stroke={col}
                    strokeWidth="3.5"
                    className="animate-ping origin-center"
                    opacity="0.75"
                  />
                  <circle cx={pt.x} cy={pt.y} r="15" fill={col} opacity="0.35" />
                  <text
                    x={pt.x}
                    y={pt.y - 22}
                    textAnchor="middle"
                    fill={col}
                    className="text-[10px] font-extrabold uppercase tracking-wider font-sans drop-shadow"
                  >
                    {ping.senderName}: {ping.type}
                  </text>
                </g>
              );
            })}

            {/* Pieces Rendering (Bigger, more tactile and ultra-sharp) */}
            {board.map((row, r) =>
              row.map((piece, c) => {
                if (!piece) return null;

                const pt = toDisplay(r, c);
                const isRed = piece.side === 'red';

                return (
                  <g
                    key={piece.id}
                    onClick={() => handleCellClick(r, c)}
                    className="cursor-pointer group transition-transform duration-100 ease-out active:scale-95"
                    style={{
                      transformOrigin: `${pt.x}px ${pt.y}px`,
                    }}
                  >
                    {/* Invisible extra-wide touch hotspot */}
                    <circle cx={pt.x} cy={pt.y} r={PIECE_RADIUS + 3} fill="transparent" />

                    {/* Piece Wooden Body */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={PIECE_RADIUS}
                      fill={isRed ? 'url(#pieceRedGrad)' : 'url(#pieceBlackGrad)'}
                      filter="url(#pieceShadow)"
                    />

                    {/* Outer Bevel Ring Groove */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={PIECE_RADIUS - 2}
                      fill="none"
                      stroke={isRed ? '#b91c1c' : '#1c1917'}
                      strokeWidth="1.4"
                      opacity="0.85"
                    />

                    {/* Inner Groove */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={PIECE_RADIUS - 4}
                      fill="none"
                      stroke={isRed ? '#f87171' : '#78716c'}
                      strokeWidth="0.8"
                      opacity="0.65"
                    />

                    {/* Traditional Chinese Character (Bigger & High Contrast) */}
                    <text
                      x={pt.x}
                      y={pt.y - 2.5}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isRed ? '#dc2626' : '#1c1917'}
                      className="font-bold select-none"
                      style={{
                        fontFamily: "'Ma Shan Zheng', 'Noto Serif TC', serif",
                        fontSize: '25px',
                        textShadow: isRed
                          ? '0.6px 0.6px 0px rgba(255,255,255,0.75)'
                          : '0.6px 0.6px 0px rgba(255,255,255,0.55)',
                      }}
                    >
                      {piece.text}
                    </text>

                    {/* Vietnamese Subtitle for Instant Readability */}
                    <text
                      x={pt.x}
                      y={pt.y + 13}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isRed ? '#991b1b' : '#332f2c'}
                      className="font-sans font-black select-none tracking-tight"
                      style={{ fontSize: '9px' }}
                    >
                      {piece.viText}
                    </text>
                  </g>
                );
              })
            )}
          </svg>
        </div>
      </div>

      {/* Floating Tactical Context Menu for Right-Click Pings */}
      {contextMenuPos && (
        <div
          className="fixed z-50 bg-stone-900/95 border border-stone-700/80 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 backdrop-blur-md text-xs animate-in zoom-in-95 duration-150"
          style={{ left: contextMenuPos.x, top: contextMenuPos.y }}
        >
          <div className="px-2 py-1 text-[10px] text-stone-400 font-bold border-b border-stone-800">
            CHỈ ĐIỂM CHIẾN THUẬT
          </div>
          <button
            onClick={() => {
              onCreatePing?.(contextMenuPos.pos, 'attack');
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 font-medium text-left cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Tấn công điểm này
          </button>
          <button
            onClick={() => {
              onCreatePing?.(contextMenuPos.pos, 'defend');
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/20 text-blue-400 font-medium text-left cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            Phòng thủ / Bảo vệ
          </button>
          <button
            onClick={() => {
              onCreatePing?.(contextMenuPos.pos, 'danger');
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-orange-500/20 text-orange-400 font-medium text-left cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            Coi chừng nguy hiểm
          </button>
          <button
            onClick={() => {
              onCreatePing?.(contextMenuPos.pos, 'suggest');
              setContextMenuPos(null);
            }}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-emerald-500/20 text-emerald-400 font-medium text-left cursor-pointer"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Gợi ý nước cờ
          </button>
        </div>
      )}
    </div>
  );
};
