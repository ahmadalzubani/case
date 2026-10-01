import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  RotateCcw,
  FileSearch,
  ChevronDown,
  ChevronUp,
  Terminal,
} from 'lucide-react';
import { Link } from 'wouter';
import type { CaseFile } from '@/data/types';
import type { FinalAccusationResult, InvestigationState } from '@/lib/case-logic';
import {
  playClickSound,
  playDramaticSting,
  playHeartbeatSound,
  playPaperSound,
} from '@/lib/audio';

export type CinematicRevealProps = {
  caseFile: CaseFile;
  state?: InvestigationState;
  result: FinalAccusationResult;
  onRetry: () => void;
  onReturnToDashboard?: () => void;
};

export function CinematicReveal({
  caseFile,
  result,
  onRetry,
}: CinematicRevealProps) {
  // outcome === 'solved' is the authoritative success marker (Phase 1D)
  const isSuccess = result.outcome === 'solved';

  // Exact text content specified in requirements
  const targetText = isSuccess
    ? `CASE ${caseFile.number}: CLOSED. The suspect has been remanded. Justice served in the shadows.`
    : `CASE ${caseFile.number}: FAILED. The DA rejected the file. An innocent person suffers while the real killer walks.`;

  const arabicDispatchText = isSuccess
    ? `تم إيداع المتهم رهن الحبس الاحتياطي رسمياً بناءً على الأدلة الجنائية القاطعة. أُسدل الستار على لغز ${caseFile.title}.`
    : `رفضت النيابة العامة لائحة الاتهام بسبب ثغرات حاسمة في النظرية والأدلة. الجاني الحقيقي ما يزال طليقاً.`;

  const [displayedText, setDisplayedText] = useState<string>('');
  const [displayedArabic, setDisplayedArabic] = useState<string>('');
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(false);
  const [showDossierBreakdown, setShowDossierBreakdown] = useState<boolean>(false);

  const hasTriggeredEndAudio = useRef(false);

  // Typewriter effect loop
  useEffect(() => {
    let charIndex = 0;
    setDisplayedText('');
    setDisplayedArabic('');
    setIsTypingComplete(false);
    hasTriggeredEndAudio.current = false;

    const interval = setInterval(() => {
      if (charIndex < targetText.length) {
        charIndex++;
        setDisplayedText(targetText.slice(0, charIndex));

        // Audio Hook inside the typewriter effect loop
        // TODO: playTypewriterSound()
        playClickSound();
      } else {
        clearInterval(interval);

        // Once primary English dispatch finishes, reveal the Arabic police memorandum
        setDisplayedArabic(arabicDispatchText);
        setIsTypingComplete(true);

        if (!hasTriggeredEndAudio.current) {
          hasTriggeredEndAudio.current = true;
          if (isSuccess) {
            // Audio Hook at the end of success state
            // TODO: playCaseClosedStampSound()
            playDramaticSting();
          } else {
            // Audio Hook at the end of fail state
            // TODO: playHeavyJailDoorSound()
            playHeartbeatSound();
          }
        }
      }
    }, 38);

    return () => clearInterval(interval);
  }, [targetText, arabicDispatchText, isSuccess]);

  // Click to instantly complete typewriter animation
  const handleFastForward = () => {
    if (!isTypingComplete) {
      setDisplayedText(targetText);
      setDisplayedArabic(arabicDispatchText);
      setIsTypingComplete(true);

      if (!hasTriggeredEndAudio.current) {
        hasTriggeredEndAudio.current = true;
        if (isSuccess) {
          // TODO: playCaseClosedStampSound()
          playDramaticSting();
        } else {
          // TODO: playHeavyJailDoorSound()
          playHeartbeatSound();
        }
      }
    }
  };

  return (
    <div
      onClick={handleFastForward}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-neutral-950 p-4 sm:p-8 select-none overflow-y-auto"
      style={{ backgroundColor: '#0a0a0a' }}
    >
      {/* CRT Scanline & Dark Noir Vignette Overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(0,0,0,0.85) 0px, rgba(0,0,0,0.85) 1px, transparent 1px, transparent 2px)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.98)_100%)]" />

      {/* Main Terminal Dossier Container */}
      <div className="relative z-20 w-full max-w-3xl flex flex-col items-center">
        {/* Top Header: Police Department Dispatch Info */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 w-full border-b border-neutral-800/80 pb-3 font-mono text-[11px] tracking-widest text-neutral-500">
          <div className="flex items-center gap-2">
            <Terminal size={14} className={isSuccess ? 'text-emerald-500' : 'text-red-500'} />
            <span>CENTRAL POLICE ARCHIVE // RECORD #{caseFile.number}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>PRECINCT 04</span>
            <span className="h-2.5 w-px bg-neutral-800" />
            <span className="uppercase text-neutral-400">DISPATCH CONFIDENTIAL</span>
          </div>
        </div>

        {/* Typewriter Report Screen */}
        <div
          className={`w-full border-2 p-6 sm:p-10 transition-all duration-700 ${
            isSuccess
              ? 'border-emerald-900/50 bg-neutral-950 shadow-[0_0_60px_rgba(16,185,129,0.12)]'
              : 'border-red-950/80 bg-neutral-950 shadow-[0_0_60px_rgba(239,68,68,0.18)]'
          }`}
        >
          {/* Status Ribbon */}
          <div className="mb-4 flex items-center justify-between font-mono text-xs tracking-widest">
            <span className="text-neutral-500 uppercase">
              // TELETYPE OUTPUT TRANSCRIPT //
            </span>
            <span
              className={`font-bold px-2 py-0.5 border ${
                isSuccess
                  ? 'border-emerald-700 bg-emerald-950/40 text-emerald-400'
                  : 'border-red-700 bg-red-950/40 text-red-500'
              }`}
            >
              {isSuccess ? 'STATUS: CLOSED' : 'STATUS: DISMISSED'}
            </span>
          </div>

          {/* Typewriter Primary Text */}
          <div
            dir="ltr"
            className={`font-mono text-lg sm:text-2xl md:text-3xl leading-relaxed tracking-wide min-h-[5rem] sm:min-h-[6rem] text-left ${
              isSuccess ? 'text-neutral-100' : 'text-red-500'
            }`}
          >
            {displayedText}
            {!isTypingComplete && (
              <span className="inline-block w-3 h-6 sm:h-7 bg-current ml-1.5 animate-pulse align-middle" />
            )}
          </div>

          {/* Secondary Police Memorandum (Arabic translation & detail) */}
          {displayedArabic && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mt-6 border-t border-neutral-800/80 pt-5 text-right"
              dir="rtl"
            >
              <div className="font-mono text-[10px] text-neutral-500 tracking-wider mb-2">
                مذكرة النيابة العامة والمباحث الجنائية:
              </div>
              <p className="text-sm sm:text-base leading-8 text-neutral-300 font-sans">
                {displayedArabic}
              </p>
            </motion.div>
          )}

          {/* Ink Rubber Stamp Emblem */}
          {isTypingComplete && (
            <motion.div
              initial={{ scale: 2.2, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 0.85, rotate: -8 }}
              transition={{ type: 'spring', damping: 14, stiffness: 200 }}
              className={`mt-8 inline-block border-4 px-5 py-2 font-mono font-black text-sm sm:text-base tracking-widest uppercase ${
                isSuccess
                  ? 'border-emerald-500/80 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                  : 'border-red-600/80 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)]'
              }`}
            >
              {isSuccess ? '★ OFFICIAL: CASE SOLVED ★' : '✖ CASE DISMISSED / INSUFFICIENT EVIDENCE ✖'}
            </motion.div>
          )}
        </div>

        {/* Faded Exit & Action Controls */}
        <AnimatePresence>
          {isTypingComplete && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.0, delay: 0.2 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full"
            >
              {/* Return to Dashboard Button as requested */}
              <Link
                href="/"
                onClick={() => playClickSound()}
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 border border-neutral-700 bg-neutral-900/90 px-7 font-mono text-xs uppercase tracking-widest text-neutral-200 hover:border-neutral-400 hover:bg-neutral-800 hover:text-white transition-all shadow-[0_0_20px_rgba(0,0,0,0.8)]"
              >
                <Home size={15} /> Return to Dashboard
              </Link>

              {/* Retry / Reopen Case Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playPaperSound();
                  onRetry();
                }}
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 border border-neutral-800 bg-neutral-950 px-6 font-mono text-xs uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 transition-all"
              >
                <RotateCcw size={14} /> إعادة صياغة الاتهام (Retry)
              </button>

              {/* View Full Dossier Breakdown Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  playClickSound();
                  setShowDossierBreakdown(!showDossierBreakdown);
                }}
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 border border-neutral-800 bg-neutral-950 px-5 font-mono text-xs uppercase tracking-widest text-neutral-400 hover:border-neutral-600 hover:text-neutral-200 transition-all"
              >
                <FileSearch size={14} />
                <span>تفاصيل التقرير الجنائي</span>
                {showDossierBreakdown ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Detailed Dossier Accordion (Preserves Score & Reveal Steps) */}
        <AnimatePresence>
          {showDossierBreakdown && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="mt-8 w-full border border-neutral-800 bg-neutral-950/95 p-6 text-right overflow-hidden shadow-2xl"
              dir="rtl"
            >
              <div className="mb-6 flex items-center justify-between border-b border-neutral-800 pb-3">
                <span className="font-mono text-xs text-neutral-400">
                  سجل وقائع الحقيقة الرسمية // {caseFile.title}
                </span>
                <span className="font-mono text-[10px] text-neutral-600">
                  CONFIDENTIAL DOSSIER
                </span>
              </div>

              {/* Official Solution Summary */}
              <div className="mb-6 border-r-2 border-neutral-700 bg-neutral-900/40 p-4 text-xs leading-7 text-neutral-300">
                <div className="font-bold text-neutral-100 mb-1">
                  طريقة التنفيذ الرسمية:
                </div>
                <div>{caseFile.solution.method}</div>
                <div className="mt-2 text-neutral-400">
                  الدافع: {caseFile.solution.motive}
                </div>
              </div>

              {/* Metric Breakdown — Phase 1D claims */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-xs text-neutral-400 mb-6">
                <div className="border border-neutral-800 p-3 bg-black/40">
                  <div className="text-[10px] text-neutral-500">المتهم</div>
                  <div className={`mt-1 font-bold ${result.correctCulprit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {result.correctCulprit ? 'مطابق' : 'غير مطابق'}
                  </div>
                </div>
                <div className="border border-neutral-800 p-3 bg-black/40">
                  <div className="text-[10px] text-neutral-500">الحضور</div>
                  <div className={`mt-1 font-bold ${result.validatedClaims.includes('identity') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {result.validatedClaims.includes('identity') ? 'مثبت' : 'غير مثبت'}
                  </div>
                </div>
                <div className="border border-neutral-800 p-3 bg-black/40">
                  <div className="text-[10px] text-neutral-500">الدافع</div>
                  <div className={`mt-1 font-bold ${result.validatedClaims.includes('motive') ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {result.validatedClaims.includes('motive') ? 'مثبت' : 'غير مثبت'}
                  </div>
                </div>
                <div className="border border-neutral-800 p-3 bg-black/40">
                  <div className="text-[10px] text-neutral-500">الأدلة الحاسمة</div>
                  <div className="mt-1 font-bold text-neutral-200" dir="ltr">
                    {result.criticalEvidenceFound} / {result.criticalEvidenceTotal}
                  </div>
                </div>
              </div>

              {/* Sequence of events */}
              <div className="space-y-3 border-t border-neutral-800 pt-4">
                <div className="font-mono text-[11px] text-neutral-500 mb-2">
                  تسلسل الأحداث المثبت:
                </div>
                {caseFile.solution.revealSteps.map((step) => (
                  <div key={step.id} className="border-b border-neutral-900 pb-3 last:border-0">
                    <div className="flex items-center gap-3 font-mono text-xs text-neutral-400">
                      <span className="text-neutral-500" dir="ltr">{step.time}</span>
                      <span className="font-bold text-neutral-200">{step.title}</span>
                    </div>
                    <p className="mt-1 text-xs text-neutral-400 leading-6 font-sans">
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
