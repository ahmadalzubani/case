import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Crosshair,
  AlertTriangle,
  Fingerprint,
  CheckCircle2,
  Scan,
  Maximize2,
} from 'lucide-react';

import type { EvidenceHotspot } from '@/data/types';
export type { EvidenceHotspot };
import {
  playClickSound,
  playPaperSound,
  playPindropSound,
  playWarningBuzzer,
} from '@/lib/audio';

export type EvidenceViewerProps = {
  evidenceName: string;
  imageUrl: string;
  hotspots: EvidenceHotspot[];
  onClose: () => void;
  onClueFound: (hotspot: EvidenceHotspot) => void;
  initialDiscoveredClueIds?: string[];
  caseNumber?: string;
};

export function EvidenceViewer({
  evidenceName,
  imageUrl,
  hotspots,
  onClose,
  onClueFound,
  initialDiscoveredClueIds = [],
  caseNumber = '001',
}: EvidenceViewerProps) {
  // Zoom & Pan states
  const [scale, setScale] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hasMovedRef = useRef<boolean>(false);

  // Discovery states
  const [discoveredClueIds, setDiscoveredClueIds] = useState<string[]>(initialDiscoveredClueIds);
  const [activeClue, setActiveClue] = useState<EvidenceHotspot | null>(() => {
    if (initialDiscoveredClueIds.length > 0) {
      return hotspots.find((h) => h.id === initialDiscoveredClueIds[initialDiscoveredClueIds.length - 1]) || null;
    }
    return null;
  });
  const [feedbackNotice, setFeedbackNotice] = useState<{ text: string; type: 'warning' | 'neutral' | 'success' } | null>(null);

  // Live coordinate HUD tracking
  const [cursorNormCoords, setCursorNormCoords] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTemporaryNotice = useCallback((text: string, type: 'warning' | 'neutral' | 'success' = 'warning', durationMs = 2800) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedbackNotice({ text, type });
    feedbackTimeoutRef.current = setTimeout(() => {
      setFeedbackNotice(null);
    }, durationMs);
  }, []);

  // Keyboard navigation & Shortcuts (Esc to close, + / - to zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playPaperSound();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoom(0.5);
      } else if (e.key === '-' || e.key === '_') {
        handleZoom(-0.5);
      } else if (e.key === '0') {
        handleResetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, scale]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Zoom manipulation with clamping (1x to 4x)
  const handleZoom = (delta: number) => {
    playClickSound();
    setScale((prevScale) => {
      const nextScale = Math.min(4.0, Math.max(1.0, parseFloat((prevScale + delta).toFixed(2))));
      const nextMaxOffset = (nextScale - 1) * 350;
      setOffset((prevOffset) => ({
        x: nextScale === 1.0 ? 0 : Math.min(nextMaxOffset, Math.max(-nextMaxOffset, prevOffset.x)),
        y: nextScale === 1.0 ? 0 : Math.min(nextMaxOffset, Math.max(-nextMaxOffset, prevOffset.y)),
      }));
      return nextScale;
    });
  };

  const handleResetZoom = () => {
    playClickSound();
    setScale(1.0);
    setOffset({ x: 0, y: 0 });
  };

  // Mouse wheel zoom support
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoom(0.25);
    } else {
      handleZoom(-0.25);
    }
  };

  // Drag & Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    hasMovedRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialOffsetRef.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imageRef.current) return;

    // Track normalized coordinate on image for live HUD readouts
    const rect = imageRef.current.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    ) {
      const normX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const normY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setCursorNormCoords({ x: normX, y: normY });
    } else {
      setCursorNormCoords(null);
    }

    if (!isDragging || scale <= 1) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      hasMovedRef.current = true;
    }

    // Boundary constraint calculations
    const maxOffset = (scale - 1) * 350;
    setOffset({
      x: Math.min(maxOffset, Math.max(-maxOffset, initialOffsetRef.current.x + dx)),
      y: Math.min(maxOffset, Math.max(-maxOffset, initialOffsetRef.current.y + dy)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Primary Investigation & Discovery Mechanic
  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // If the user was actively panning/dragging across the image, ignore click
    if (hasMovedRef.current) {
      hasMovedRef.current = false;
      return;
    }

    if (!imageRef.current) return;

    const rect = imageRef.current.getBoundingClientRect();
    const clickXPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const clickYPercent = ((e.clientY - rect.top) / rect.height) * 100;

    // 1. CRITICAL MECHANIC: Scale requirement verification
    if (scale < 2.0) {
      playWarningBuzzer();
      showTemporaryNotice(
        `[دقة الفحص غير كافية: ${scale.toFixed(1)}x] — يتطلب الفحص الجنائي تكبير الصورة إلى 2.0x أو أكثر لكشف الآثار المجهرية.`,
        'warning'
      );
      return;
    }

    // 2. Calculate proximity to all defined hotspots
    let matchedHotspot: EvidenceHotspot | null = null;
    let minDistance = Infinity;

    for (const hotspot of hotspots) {
      const distance = Math.hypot(clickXPercent - hotspot.x, clickYPercent - hotspot.y);
      if (distance <= hotspot.radius && distance < minDistance) {
        matchedHotspot = hotspot;
        minDistance = distance;
      }
    }

    if (matchedHotspot) {
      const alreadyDiscovered = discoveredClueIds.includes(matchedHotspot.id);
      setActiveClue(matchedHotspot);

      if (!alreadyDiscovered) {
        setDiscoveredClueIds((prev) => [...prev, matchedHotspot!.id]);
        onClueFound(matchedHotspot);
        playPindropSound();
        showTemporaryNotice(`[أثر جنائي مؤكد]: تم توثيق "${matchedHotspot.title || matchedHotspot.clue.slice(0, 32)}..."`, 'success');
      } else {
        playPaperSound();
        showTemporaryNotice(`[أثر مسجل سابقاً]: تم استعراض التقرير الميكروسكوبي.`, 'neutral', 1800);
      }
    } else {
      // Clicked with high zoom, but no clue present in this sector
      playClickSound();
      showTemporaryNotice(`[مسح سلبي: X:${clickXPercent.toFixed(1)}% Y:${clickYPercent.toFixed(1)}%] لا توجد آثار أو خدوش ميكانيكية في هذا القطاع.`, 'neutral', 1800);
    }
  };

  const isAnalyticalZoom = scale >= 2.0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl text-neutral-200 select-none overflow-hidden"
      dir="rtl"
      onMouseUp={handleMouseUp}
    >
      {/* CRT Scanline & Grain Texture Overlays */}
      <div
        className="pointer-events-none absolute inset-0 z-40 opacity-15"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.7) 0px, rgba(0,0,0,0.7) 1px, transparent 1px, transparent 2px)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      {/* TOP BAR: Gritty Forensic Inspection Console */}
      <header className="relative z-50 flex items-center justify-between border-b border-red-950/60 bg-black/80 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 border border-red-900/60 bg-red-950/20 px-2.5 py-1 text-[11px] font-mono tracking-widest text-red-500">
            <Scan size={14} className="animate-pulse text-red-500" />
            <span>CASE // {caseNumber}</span>
          </div>

          <div className="hidden sm:block">
            <h1 className="text-sm font-bold tracking-wider text-neutral-100 uppercase font-mono">
              فحص الدليل الجنائي: <span className="text-red-400 font-normal">{evidenceName}</span>
            </h1>
          </div>
        </div>

        {/* Optical Magnification & Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom Status Chip */}
          <div
            className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] font-mono tracking-wider ${
              isAnalyticalZoom
                ? 'border-emerald-800/80 bg-emerald-950/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-amber-900/60 bg-amber-950/20 text-amber-500'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isAnalyticalZoom ? 'bg-emerald-400 animate-ping' : 'bg-amber-500'
              }`}
            />
            <span>{isAnalyticalZoom ? 'دقة فحص مجهري نشطة (>= 2.0x)' : 'تكبير غير كافٍ للفحص (< 2.0x)'}</span>
          </div>

          {/* Current Scale Display */}
          <div className="hidden sm:flex items-center border border-neutral-800 bg-neutral-950 px-3 py-1 font-mono text-xs text-neutral-300">
            <span className="text-neutral-500 mr-1.5">ZOOM:</span>
            <span className={scale >= 2.0 ? 'text-red-400 font-bold' : 'text-neutral-300'}>
              {scale.toFixed(1)}x
            </span>
            <span className="text-neutral-600 text-[10px] mr-1">/ 4.0x</span>
          </div>

          {/* Zoom Action Buttons */}
          <div className="flex items-center border border-neutral-800 bg-neutral-950">
            <button
              type="button"
              onClick={() => handleZoom(0.5)}
              disabled={scale >= 4.0}
              title="تكبير (Zoom In) [+]"
              className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 disabled:opacity-30 transition-colors"
            >
              <ZoomIn size={16} />
            </button>
            <div className="h-4 w-px bg-neutral-800" />
            <button
              type="button"
              onClick={() => handleZoom(-0.5)}
              disabled={scale <= 1.0}
              title="تصغير (Zoom Out) [-]"
              className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 disabled:opacity-30 transition-colors"
            >
              <ZoomOut size={16} />
            </button>
            <div className="h-4 w-px bg-neutral-800" />
            <button
              type="button"
              onClick={handleResetZoom}
              title="إعادة ضبط المقياس [0]"
              className="p-2 text-neutral-400 hover:text-neutral-100 hover:bg-neutral-900 transition-colors"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => {
              playPaperSound();
              onClose();
            }}
            title="إغلاق المنظار الجنائي [ESC]"
            className="flex items-center justify-center border border-red-900/60 bg-red-950/30 p-2 text-red-400 hover:bg-red-900/50 hover:text-red-200 transition-all shadow-[0_0_10px_rgba(220,38,38,0.2)]"
          >
            <X size={17} />
          </button>
        </div>
      </header>

      {/* CENTER VIEWPORT: Pan & Zoom Interactive Stage */}
      <main
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        className={`relative flex-1 overflow-hidden flex items-center justify-center cursor-crosshair bg-neutral-950 ${
          isDragging ? 'cursor-grabbing' : ''
        }`}
      >
        {/* Gritty Industrial Crosshair Guides in Viewport Corners */}
        <div className="pointer-events-none absolute top-4 left-4 z-30 font-mono text-[10px] text-neutral-600 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-red-900/90 font-bold">
            <Crosshair size={12} />
            <span>MICROSCOPIC EVIDENCE VIEWER v2.4</span>
          </div>
          <div>RES: 3840x2160 ULTRA-MACRO</div>
          <div>OPTICS: POLARIZED SPECTRUM</div>
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-30 font-mono text-[10px] text-neutral-600">
          {cursorNormCoords ? (
            <span className="text-neutral-400">
              TARGET X: <strong className="text-red-400">{cursorNormCoords.x.toFixed(1)}%</strong> | Y:{' '}
              <strong className="text-red-400">{cursorNormCoords.y.toFixed(1)}%</strong>
            </span>
          ) : (
            <span>TARGET: OUT OF BOUNDS</span>
          )}
        </div>

        <div className="pointer-events-none absolute top-4 right-4 z-30 font-mono text-[10px] text-neutral-600 text-right">
          <div>CLUES DETECTED: {discoveredClueIds.length} / {hotspots.length}</div>
          <div className="text-neutral-500">HOLD & DRAG TO PAN WHEN ZOOMED</div>
        </div>

        {/* Temporary HUD Notice / Feedback */}
        {feedbackNotice && (
          <div
            className={`absolute top-6 z-40 max-w-xl mx-auto border px-4 py-2.5 text-xs font-mono tracking-wide shadow-2xl transition-all ${
              feedbackNotice.type === 'warning'
                ? 'border-amber-700 bg-black/90 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                : feedbackNotice.type === 'success'
                ? 'border-red-600 bg-black/90 text-red-300 shadow-[0_0_25px_rgba(220,38,38,0.35)]'
                : 'border-neutral-700 bg-black/90 text-neutral-300'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {feedbackNotice.type === 'warning' ? (
                <AlertTriangle size={15} className="shrink-0 text-amber-400" />
              ) : feedbackNotice.type === 'success' ? (
                <CheckCircle2 size={15} className="shrink-0 text-red-500" />
              ) : (
                <Fingerprint size={15} className="shrink-0 text-neutral-400" />
              )}
              <span>{feedbackNotice.text}</span>
            </div>
          </div>
        )}

        {/* Target Stage Wrapper for Scale and Pan */}
        <div
          onClick={handleImageClick}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          className="relative max-w-[85vw] max-h-[65vh] inline-block border-2 border-neutral-800 shadow-[0_0_50px_rgba(0,0,0,0.9)]"
        >
          <img
            ref={imageRef}
            src={imageUrl}
            alt={evidenceName}
            draggable={false}
            className="block max-h-[65vh] max-w-[85vw] object-contain pointer-events-none"
          />

          {/* Visual Overlays for Discovered Hotspots & Undiscovered Optical Anomaly Glow */}
          {hotspots.map((hotspot) => {
            const isDiscovered = discoveredClueIds.includes(hotspot.id);

            // Optical Anomaly Glow for undiscovered hotspots (subtle shimmer when zoomed in)
            if (!isDiscovered) {
              return (
                <div
                  key={hotspot.id}
                  style={{
                    left: `${hotspot.x}%`,
                    top: `${hotspot.y}%`,
                    width: `${hotspot.radius * 2}%`,
                    height: `${hotspot.radius * 2}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-full transition-all duration-500 z-10 flex items-center justify-center ${
                    isAnalyticalZoom
                      ? 'opacity-40 border border-dashed border-amber-400/80 animate-pulse bg-amber-400/10 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                      : 'opacity-0 border border-transparent'
                  }`}
                >
                  {isAnalyticalZoom && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400/70 animate-ping" />
                  )}
                </div>
              );
            }

            return (
              <div
                key={hotspot.id}
                style={{
                  left: `${hotspot.x}%`,
                  top: `${hotspot.y}%`,
                  width: `${hotspot.radius * 2}%`,
                  height: `${hotspot.radius * 2}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 flex items-center justify-center"
              >
                {/* Pulsing Dark-Red Reticle Overlay */}
                <div className="absolute inset-0 rounded-full border-2 border-red-600/80 bg-red-950/30 shadow-[0_0_20px_rgba(220,38,38,0.5)] animate-pulse" />
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <div className="absolute -top-3.5 right-0 font-mono text-[8px] font-bold text-red-400 uppercase tracking-tighter bg-black/90 px-1 border border-red-900/60">
                  REF-{hotspot.id}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* BOTTOM PANEL: Gritty CRT Teletype Forensic Clue Console */}
      <footer className="relative z-50 border-t border-neutral-800 bg-neutral-950/95 p-4 sm:px-6 font-mono">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Active Clue Readout */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 text-[10px] text-neutral-500 tracking-wider">
              <span className="h-2 w-2 bg-red-600 inline-block animate-pulse" />
              <span>FORENSIC EXAMINATION LOG // سجل الفحص المجهري</span>
              {activeClue && (
                <span className="text-red-400 font-bold border border-red-900/60 bg-red-950/30 px-1.5 py-0.2">
                  TRACE ID: {activeClue.id}
                </span>
              )}
            </div>

            {activeClue ? (
              <div className="border border-red-950/70 bg-black/70 p-3 text-xs leading-relaxed text-red-200">
                <span className="text-red-400 font-bold ml-2">
                  [{activeClue.title || 'أثر ميكانيكي مكتشف'}]:
                </span>
                <span className="text-neutral-200 font-sans">{activeClue.clue}</span>
              </div>
            ) : (
              <div className="border border-neutral-900 bg-black/50 p-3 text-xs text-neutral-500 italic">
                {scale < 2.0
                  ? '» استخدم عجلة الفأرة أو زر التكبير للوصول إلى 2.0x فما فوق، ثم انقر على الآثار والمقابض لكشف الخيوط الجنائية.'
                  : '» حرك المؤشر فوق مساحات الاحتكاك واضغط للتحقق من العينات المخبرية.'}
              </div>
            )}
          </div>

          {/* Hotspots Summary Tracker / Badges */}
          <div className="shrink-0 flex items-center gap-3 border-t md:border-t-0 md:border-r border-neutral-800 pt-3 md:pt-0 md:pr-6">
            <div className="flex flex-col text-left font-mono">
              <span className="text-[10px] text-neutral-500">DISCOVERY PROGRESS</span>
              <span className="text-sm font-bold text-neutral-200">
                <span className="text-red-500">{discoveredClueIds.length}</span> / {hotspots.length} آثار
              </span>
            </div>

            <div className="flex gap-1">
              {hotspots.map((h, i) => {
                const found = discoveredClueIds.includes(h.id);
                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      if (found) {
                        setActiveClue(h);
                        // TODO: Trigger file switch audio
                      }
                    }}
                    title={found ? `عرض تفاصيل الأثر #${i + 1}` : `أثر غير مكتشف #${i + 1}`}
                    className={`h-7 w-7 grid place-items-center text-[10px] font-mono border transition-all ${
                      found
                        ? 'border-red-600 bg-red-950/50 text-red-300 hover:border-red-400'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-600 cursor-not-allowed'
                    }`}
                  >
                    0{i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default EvidenceViewer;
