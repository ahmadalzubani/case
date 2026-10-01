import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Crosshair,
  FileSearch,
  Fingerprint,
  HelpCircle,
  RotateCcw,
  ShieldAlert,
  Skull,
  Sparkles,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import type { CaseFile, Evidence, Suspect, InterrogationTruth, InterrogationStatement } from '@/data/types';
import {
  type InvestigationState,
  getEarnedDeductions,
  getAvailableStatements,
  executeInterrogationChallenge,
  executeRawEvidenceConfrontation,
  type EarnedDeduction,
} from '@/core/engine.logic';
import {
  playClickSound,
  playPaperSound,
  playPindropSound,
  playHeartbeatSound,
  playDramaticSting,
} from '@/core/engine.audio';
import { TypewriterText } from './TypewriterText';

export type InterrogationUIProps = {
  suspect: Suspect;
  caseFile: CaseFile;
  state: InvestigationState;
  onClose: () => void;
  onDeductCredibility: () => void;
  onSuspectBroken: (suspect: Suspect, truth: { unlockedClue?: string }) => void;
  onResetCredibility: () => void;
  onUpdateState?: (nextState: InvestigationState) => void;
};

export function InterrogationUI({
  suspect,
  caseFile,
  state,
  onClose,
  onDeductCredibility,
  onSuspectBroken,
  onResetCredibility,
  onUpdateState,
}: InterrogationUIProps) {
  const [selectedStatementId, setSelectedStatementId] = useState<string | null>(null);
  const [isConfrontationModalOpen, setIsConfrontationModalOpen] = useState<boolean>(false);
  const [confrontationTab, setConfrontationTab] = useState<'deductions' | 'evidence'>('deductions');
  const [imageError, setImageError] = useState<boolean>(false);

  // Helper to resolve portrait URL with fallback
  const getSpeakerPortrait = (speakerId: string): string => {
    const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/$/, '')
      : '';
    const normalizedId = speakerId === 'mariam' ? 'maryam' : speakerId;
    return `${base}/assets/characters/${normalizedId}.png`;
  };

  useEffect(() => {
    setImageError(false);
  }, [suspect.id]);

  const [activeDialogue, setActiveDialogue] = useState<{
    type: 'success' | 'fail' | 'intro';
    title: string;
    text: string;
    unlockedClue?: string;
  }>({
    type: 'intro',
    title: 'بدء الاستجواب والمواجهة الجنائية',
    text: 'استمع إلى أقوال المشتبه به بدقة. اختر [RED]الادعاء المتناقض[/RED] لمواجهته بـ [IMPACT]استنتاج جنائي مُثبَت[/IMPACT] قمت بصياغته على لوحة التحقيق. انتبه، أي اتهام غير مبني على دليل سيكلفك [SHAKE]مصداقيتك الجنائية[/SHAKE].',
  });

  const credibility = state.credibilityPoints ?? 3;
  const isBroken = state.brokenSuspectIds?.includes(suspect.id);
  const isFailed = credibility <= 0;

  // Real, earned deductions from state - undiscovered ones are never returned
  const earnedDeductions = getEarnedDeductions(caseFile, state);

  // Available statements (initial + unlocked through successful cross-examinations)
  const statements = getAvailableStatements(suspect, state);

  // Raw inspected evidence
  const availableEvidences = caseFile.evidence.filter((ev) =>
    state.inspectedEvidenceIds.includes(ev.id)
  );

  // Check if any statement for this suspect has already been challenged
  const challengedIds = state.challengedStatementIds || [];
  const hasAnyChallengedStatement = statements.some((s) => challengedIds.includes(s.statementId));

  // Keyboard shortcut: ESC closes modal or whole interrogation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isConfrontationModalOpen) {
          playClickSound();
          setIsConfrontationModalOpen(false);
        } else {
          playPaperSound();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConfrontationModalOpen, onClose]);

  const handleSelectStatement = (stmtId: string) => {
    if (isFailed || isBroken) return;
    playClickSound();
    setSelectedStatementId(stmtId);
    setIsConfrontationModalOpen(false);
    const stmt = statements.find((s) => s.statementId === stmtId);
    if (stmt) {
      setActiveDialogue({
        type: 'intro',
        title: `تحليل التصريح الجنائي #${stmtId}`,
        text: `تم استهداف التصريح الجنائي: «${stmt.text}». واجهه بـ [IMPACT]استنتاج جنائي مثبت[/IMPACT] لدحض هذا الادعاء!`,
      });
    }
  };

  const handleConfrontWithDeduction = (deduction: EarnedDeduction) => {
    if (!selectedStatementId || isFailed || isBroken) return;
    setIsConfrontationModalOpen(false);
    playClickSound();

    const result = executeInterrogationChallenge(
      caseFile,
      suspect,
      state,
      selectedStatementId,
      deduction.id,
    );

    if (result.success) {
      playDramaticSting();
      setActiveDialogue({
        type: 'success',
        title: result.title,
        text: result.dialogueText,
        unlockedClue: result.unlockedClue,
      });

      if (onUpdateState) {
        onUpdateState(result.newState);
      }

      if (result.breaksSuspect) {
        onSuspectBroken(suspect, { unlockedClue: result.unlockedClue });
      }
    } else {
      playHeartbeatSound();
      setActiveDialogue({
        type: 'fail',
        title: result.title,
        text: result.dialogueText,
      });

      if (result.credibilityDeducted) {
        onDeductCredibility();
      }

      if (onUpdateState) {
        onUpdateState(result.newState);
      }
    }
  };

  const handleConfrontWithEvidence = (evidence: Evidence) => {
    if (!selectedStatementId || isFailed || isBroken) return;
    setIsConfrontationModalOpen(false);
    playClickSound();

    const result = executeRawEvidenceConfrontation(
      caseFile,
      suspect,
      state,
      selectedStatementId,
      evidence.id,
    );

    playHeartbeatSound();
    setActiveDialogue({
      type: 'fail',
      title: result.title,
      text: result.dialogueText,
    });

    onDeductCredibility();

    if (onUpdateState) {
      onUpdateState(result.newState);
    }
  };

  // Composure evaluation
  const composureText = isBroken
    ? 'منهارة كلياً / اعتراف مسجل'
    : isFailed
    ? 'رافضة للتعاون'
    : hasAnyChallengedStatement
    ? 'مرتبكة ومحاصرة بالقرائن'
    : 'متماسكة بحذر';

  const composureColor = isBroken
    ? 'text-emerald-800'
    : isFailed
    ? 'text-neutral-500'
    : hasAnyChallengedStatement
    ? 'text-amber-800'
    : 'text-[#57442d]';

  const composureBarWidth = isBroken
    ? 'w-full bg-emerald-700 shadow-sm'
    : isFailed
    ? 'w-0 bg-neutral-400'
    : hasAnyChallengedStatement
    ? 'w-1/2 bg-amber-600 shadow-sm'
    : 'w-full bg-[#8a5d20]';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 select-none overflow-y-auto"
      dir="rtl"
      data-testid="interrogation-modal"
    >
      {/* Warm Ambient Desk Lamp Vignette */}
      <div className="pointer-events-none absolute inset-0 z-40 bg-[radial-gradient(ellipse_at_center,rgba(245,190,110,0.08)_0%,rgba(0,0,0,0.85)_100%)]" />

      {/* Main Confrontation Window (Aged Leather & Manila Case File) */}
      <div className="relative z-40 flex flex-col w-full max-w-5xl max-h-[92vh] border-2 border-[#8f7447] leather-texture text-[#1e150b] shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden rounded-xs">
        {/* Full-Screen Lockout / Disciplinary Strike Screen when credibility hits 0 */}
        {isFailed && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-6 sm:p-10 text-center font-mono border-3 border-red-800 shadow-[inset_0_0_100px_rgba(153,27,27,0.4)] animate-in fade-in duration-300" data-testid="lockout-screen">
            <div className="relative mb-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center border-2 border-red-600 bg-red-950/80 shadow-[0_0_40px_rgba(220,38,38,0.5)] rounded-xs">
                <Skull size={44} className="text-red-500 animate-pulse" />
              </div>
              <div className="absolute -bottom-2 -right-2 border border-red-600 bg-black px-2 py-0.5 text-[9px] font-bold text-red-400">
                DISCIPLINARY LOCKOUT
              </div>
            </div>

            <div className="inline-block border border-red-800 bg-red-950/70 px-3 py-1 text-[11px] font-bold tracking-widest text-red-300 uppercase mb-3">
              INTERROGATION TERMINATED // إيقاف فوري للجلسة
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white mb-2 font-serif">
              انهيار مصداقية المحقق القانونية
            </h2>

            <p className="max-w-lg text-xs sm:text-sm text-neutral-300 leading-relaxed mb-8 font-sans">
              تدخل محامي المشتبه به وطالب بإنهاء الاستجواب فوراً إثر توجيه طعون غير مبنية على استنتاجات وتناقضات مثبتة.
              رصيد المصداقية نَفِد بالكامل (0 / 3). لا يمكنك استجواب المشتبه به حتى تراجع الأدلة على لوحة التحقيق أو تُجري إعادة فتح استثنائية للمحضر.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  playPaperSound();
                  onClose();
                }}
                className="flex items-center justify-center gap-2 border-2 border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 px-6 py-3 text-xs font-mono font-bold transition-all w-full sm:w-auto rounded-xs cursor-pointer"
                data-testid="button-lockout-exit"
              >
                <ArrowLeft size={15} />
                <span>الانسحاب ومراجعة مسرح الجريمة</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  playClickSound();
                  onResetCredibility();
                  setActiveDialogue({
                    type: 'intro',
                    title: 'إعادة فتح الجلسة استثنائياً',
                    text: 'تمت استعادة رصيد المصداقية (3 رصاصات). صغ فرضياتك جيداً واختبرها على لوحة التحقيق قبل الطعن في أقوال المشتبه به.',
                  });
                }}
                className="flex items-center justify-center gap-2 border-2 border-red-600 bg-red-950 hover:bg-red-900 text-red-200 px-6 py-3 text-xs font-mono font-bold transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)] w-full sm:w-auto rounded-xs cursor-pointer"
                data-testid="button-lockout-retry"
              >
                <RotateCcw size={15} />
                <span>[إعادة فتح الجلسة استثنائياً]</span>
              </button>
            </div>
          </div>
        )}

        {/* Top Header: Interrogation Station & Credibility Bullets */}
        <header className="flex flex-wrap items-center justify-between border-b-2 border-[#cbb793] bg-[#f0e3ca]/95 px-4 py-3 sm:px-6 backdrop-blur-sm shadow-xs">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 border border-[#8a5d20] bg-[#ede0c4] px-3 py-1 text-[11px] font-mono font-bold tracking-wider text-[#3d2813] rounded-xs shadow-2xs">
              <Crosshair size={13} className="text-red-700 animate-pulse" />
              <span>CROSS-EXAMINATION // غرفة الاستجواب والمواجهة الجنائية</span>
            </span>
            <span className="hidden sm:inline-block font-mono text-xs font-black text-[#1e150b]">
              الملف: {suspect.name}
            </span>
          </div>

          {/* Credibility Indicator (3 Brass Revolver Cartridges) */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5 border-2 border-[#a89168] bg-[#f4ebd7] px-3.5 py-1 rounded-xs shadow-inner">
              <span className="font-mono text-[10px] font-bold text-[#422e1b]">رصيد المصداقية:</span>
              <div className="flex items-center gap-2" data-testid="credibility-bullets">
                {[1, 2, 3].map((num) => {
                  const isLoaded = num <= credibility;
                  return (
                    <div
                      key={num}
                      title={isLoaded ? `رصاصة مصداقية متبقية #${num}` : `رصاصة مستهلكة #${num}`}
                      className="relative flex items-center justify-center"
                    >
                      <svg
                        width="15"
                        height="26"
                        viewBox="0 0 14 26"
                        className={`transition-all duration-300 ${
                          isLoaded
                            ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]'
                            : 'opacity-25 grayscale'
                        }`}
                      >
                        {/* Copper Bullet Head */}
                        <path
                          d="M 2 8 C 2 2.5, 12 2.5, 12 8 L 12 11 L 2 11 Z"
                          fill={isLoaded ? '#c25838' : '#525252'}
                        />
                        {/* Brass Cartridge Case */}
                        <rect
                          x="2"
                          y="12"
                          width="10"
                          height="11"
                          rx="1"
                          fill={isLoaded ? '#c9962a' : '#333333'}
                        />
                        {/* Cartridge Rim */}
                        <rect
                          x="1"
                          y="23"
                          width="12"
                          height="3"
                          rx="1"
                          fill={isLoaded ? '#dfad3f' : '#222222'}
                        />
                      </svg>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playPaperSound();
                onClose();
              }}
              title="إنهاء جلسة الاستجواب [ESC]"
              className="grid h-8 w-8 place-items-center border border-[#b8a47e] bg-[#faf4e8] text-[#4a3520] hover:bg-[#e4d4b2] hover:text-[#1e150b] transition-colors rounded-xs cursor-pointer shadow-xs"
              data-testid="button-close-interrogation"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Central Split Layout */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-[290px_1fr] overflow-y-auto">
          {/* Left Column: Suspect Dossier, Composure & Police Mugshot */}
          <aside className="border-b md:border-b-0 md:border-l-2 border-[#cbb793] bg-[#f4ead5] manila-texture p-5 flex flex-col justify-between overflow-y-auto">
            <div>
              {/* Authentic Polaroid Suspect Mugshot pinned to the dossier */}
              <div className="relative mx-auto w-40 sm:w-48 polaroid-card p-2.5 pb-4 shadow-lifted">
                {/* 3D Red Thumbtack Pin at Top Center */}
                <div
                  className="thumbtack-3d-red absolute pointer-events-none z-30"
                  style={{ top: '-8px', left: '50%', marginLeft: '-8px' }}
                />

                {/* Polaroid Photo Viewport */}
                <div className="polaroid-photo-viewport h-44 sm:h-52 w-full overflow-hidden relative border border-neutral-900/60 rounded-xs mb-2">
                  {!imageError ? (
                    <img
                      src={getSpeakerPortrait(suspect.id)}
                      alt={suspect.name}
                      onError={() => setImageError(true)}
                      className="w-full h-full object-cover object-top filter contrast-105 shadow-inner"
                      data-testid="interrogation-suspect-portrait"
                    />
                  ) : (
                    <div className="relative w-full h-full grid place-items-center bg-neutral-900 text-amber-200 font-serif text-3xl font-black">
                      {suspect.accent}
                    </div>
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10" />
                </div>

                {/* Handwritten / Typewriter Name on Polaroid Frame */}
                <div className="text-center">
                  <h2 className="font-serif text-sm font-black text-neutral-900 leading-snug">
                    {suspect.name}
                  </h2>
                  <p className="font-mono text-[10px] text-[#7a5b28] font-bold mt-0.5">
                    {suspect.role}
                  </p>
                </div>

                {/* Case File Reference Badge */}
                <div className="mt-2 text-center">
                  <span className="font-mono text-[9px] font-bold text-[#855e1b] bg-[#ede0c4] border border-[#cfbe9b] px-2 py-0.5 rounded-xs inline-block shadow-2xs">
                    ملف مشتبه به // {suspect.id.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Suspect Metadata Box */}
              <div className="mt-4 text-center bg-[#faf5eb] border border-[#d6c7a7] p-2.5 rounded-xs shadow-2xs">
                <span className="font-mono text-[11px] text-[#554228] font-bold">
                  العمر: {suspect.age} عاماً // السجل: محتجز للتحقيق
                </span>
              </div>

              {/* Psychological Composure Gauge */}
              <div className="mt-5 border-t border-[#d8cbb0] pt-4">
                <div className="flex items-center justify-between text-[10px] font-mono mb-1.5">
                  <span className="text-[#57442d] font-bold">رباطة الجأش (Composure):</span>
                  <span className={`font-black ${composureColor}`} data-testid="suspect-composure-status">
                    {composureText}
                  </span>
                </div>
                <div className="h-2 w-full bg-[#e8dbc0] overflow-hidden border border-[#cbb793] rounded-xs shadow-inner">
                  <div className={`h-full transition-all duration-500 ${composureBarWidth}`} />
                </div>
              </div>
            </div>

            {/* Status Footer Alert */}
            <div className="mt-4 border-2 border-[#d6c7a7] bg-[#faf5eb] p-3 text-[10px] font-mono text-[#382613] leading-relaxed rounded-xs shadow-2xs">
              {isBroken ? (
                <span className="text-emerald-800 flex items-center gap-1.5 font-bold">
                  <UserCheck size={14} className="text-emerald-700 shrink-0" />
                  <span>تم كسر ادعاء المشتبه به بنجاح وتوثيق الاعتراف في المحضر الرسمي.</span>
                </span>
              ) : isFailed ? (
                <span className="text-red-900 flex items-center gap-1.5 font-bold">
                  <Skull size={14} className="text-red-700 shrink-0" />
                  <span>نَفِد رصيد المصداقية. يرفض المشتبه به التحدث ويطالب بإنهاء الجلسة.</span>
                </span>
              ) : (
                <span className="text-[#57442d]">
                  حدد تصريحاً تشك في صحته، ثم اضغط «مواجهة بالاستنتاج الجنائي» لدحضه ببرهان مثبت.
                </span>
              )}
            </div>
          </aside>

          {/* Right Column: Testimony Stream & Confrontation Logic */}
          <main className="flex flex-col justify-between p-5 sm:p-6 bg-[#fbf8f0] warrant-paper text-[#1e150b] overflow-y-auto">
            <div>
              {/* Section Header */}
              <div className="flex items-center justify-between border-b-2 border-[#d6c7a7] pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-700 animate-pulse" />
                  <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-[#3d2813]">
                    أقوال المشتبه به المسجلة في المحضر (Official Testimony)
                  </h3>
                </div>
                <span className="font-mono text-[10px] text-[#7a6448]">
                  انقر على جملة لاستهدافها بالطعن الجنائي
                </span>
              </div>

              {/* Clickable Statement Paragraphs (Vintage Manila Evidence Strips) */}
              <div className="space-y-3 font-mono">
                {statements.map((stmt, idx) => {
                  const isSelected = selectedStatementId === stmt.statementId;
                  const isChallenged = challengedIds.includes(stmt.statementId);

                  return (
                    <button
                      key={stmt.statementId}
                      type="button"
                      disabled={isFailed || isBroken}
                      onClick={() => handleSelectStatement(stmt.statementId)}
                      className={`group relative w-full text-right p-3.5 sm:p-4 border-2 transition-all duration-200 rounded-xs cursor-pointer ${
                        isSelected
                          ? 'border-red-700 bg-[#fdf2f2] text-red-950 shadow-[0_4px_16px_rgba(185,28,28,0.25)] border-r-4'
                          : isChallenged
                          ? 'border-emerald-800 bg-[#eef7ee] text-emerald-950'
                          : 'border-[#d6c7a7] bg-[#f8f2e4] text-[#261b10] hover:border-[#a8936b] hover:bg-[#efe5d0] shadow-2xs'
                      } ${isFailed ? 'opacity-40 cursor-not-allowed' : ''}`}
                      data-testid={`statement-item-${stmt.statementId}`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 border font-bold rounded-xs ${
                            isSelected
                              ? 'border-red-700 bg-red-900 text-white'
                              : isChallenged
                              ? 'border-emerald-800 bg-emerald-950 text-emerald-300'
                              : 'border-[#cbb793] bg-[#ede0c4] text-[#554228]'
                          }`}
                        >
                          #0{idx + 1}
                        </span>
                        <p className="flex-1 text-xs sm:text-sm leading-relaxed font-mono font-medium">
                          {stmt.text}
                        </p>
                      </div>

                      {/* Visual Indicator */}
                      {isSelected ? (
                        <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-mono font-bold text-red-800">
                          <Crosshair size={13} className="animate-spin text-red-700" />
                          <span>عبارة مستهدفة للطعن</span>
                        </div>
                      ) : isChallenged ? (
                        <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-800">
                          <CheckCircle2 size={13} className="text-emerald-700" />
                          <span>تم دحض هذا الادعاء ✓</span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Confrontation Action Trigger */}
              {selectedStatementId && !isFailed && !isBroken && (
                <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t-2 border-[#d6c7a7] pt-4">
                  <div className="text-[11px] font-mono text-[#57442d] font-bold flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#855e1b]" />
                    <span>تم استهداف العبارة. واجه المشتبه به باستنتاج مثبت يدحض ادعاءه:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setIsConfrontationModalOpen(true);
                    }}
                    className="flex items-center gap-2 border-2 border-red-800 bg-red-900 px-5 py-2.5 text-xs font-mono font-black text-white hover:bg-red-800 transition-all shadow-[0_4px_14px_rgba(185,28,28,0.35)] rounded-xs cursor-pointer animate-pulse uppercase tracking-wider"
                    data-testid="button-open-confrontation"
                  >
                    <Zap size={14} className="text-amber-300" />
                    <span>مواجهة بالاستنتاج الجنائي</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Feedback Banner & Dialogue Console — Official Inquiry Memo */}
            <div className="mt-6 border-t-2 border-[#d6c7a7] pt-4">
              <div
                className={`relative overflow-hidden border-2 p-4 sm:p-5 font-mono text-xs leading-relaxed transition-all rounded-xs shadow-md ${
                  activeDialogue.type === 'success'
                    ? 'border-emerald-700 bg-[#edf7ed] text-emerald-950 shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                    : activeDialogue.type === 'fail'
                    ? 'border-red-700 bg-[#fdf2f2] text-red-950 shadow-[0_4px_20px_rgba(220,38,38,0.18)]'
                    : 'border-[#cbb793] bg-[#f5ede0] text-[#1e150b] shadow-xs'
                }`}
                data-testid="interrogation-dialogue-box"
              >
                {/* Header bar with audio recorder monitor */}
                <div className="relative z-10 flex items-center justify-between border-b border-black/10 pb-2.5 mb-3">
                  <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                    {activeDialogue.type === 'success' ? (
                      <Check size={15} className="text-emerald-700" />
                    ) : activeDialogue.type === 'fail' ? (
                      <AlertTriangle size={15} className="text-red-700" />
                    ) : (
                      <Fingerprint size={15} className="text-[#855e1b]" />
                    )}
                    <span className="font-serif font-black text-sm text-[#1e150b]">{activeDialogue.title}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] font-mono text-[#634e35]">
                    <span className="flex items-center gap-1.5 bg-[#ede0c4] border border-[#cbb793] px-2.5 py-0.5 rounded-xs font-bold">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-700 animate-pulse" />
                      <span>تسجيل المحضر // شريط 01</span>
                    </span>
                  </div>
                </div>

                {/* Typewriter Dialogue Text with Emotion VFX */}
                <div className="relative z-10 font-sans text-xs sm:text-sm text-[#1e150b] leading-relaxed min-h-[3rem]">
                  <TypewriterText
                    key={activeDialogue.title + ':' + activeDialogue.text}
                    text={activeDialogue.text}
                    speed={22}
                    slowSpeed={80}
                  />
                </div>

                {activeDialogue.unlockedClue && (
                  <div
                    className="relative z-10 mt-3.5 border-r-3 border-emerald-700 bg-emerald-950/10 p-3 text-xs text-emerald-900 font-mono font-bold flex items-start gap-2 rounded-xs shadow-2xs"
                    data-testid="unlocked-clue-banner"
                  >
                    <Sparkles size={15} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>خيط جنائي جديد تم توثيقه في المحضر:</strong> {activeDialogue.unlockedClue}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* DEDUCTION & EVIDENCE CONFRONTATION TRAY MODAL */}
      <AnimatePresence>
        {isConfrontationModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsConfrontationModalOpen(false)}
              className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
            />
            {/* Skeuomorphic Manila/Leather Confrontation Drawer */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="fixed bottom-0 inset-x-0 z-50 max-w-4xl mx-auto border-t-4 border-[#b8860b] leather-texture p-4 sm:p-5 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] text-[#1e150b] rounded-t-sm"
              data-testid="confrontation-drawer"
            >
              {/* Drawer Header Plate with Vintage Manila Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-[#b8860b]/40 pb-3 mb-4 gap-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center border-2 border-[#b8860b] bg-[#221810] text-amber-400 shadow-md rounded-xs">
                    <Crosshair size={18} className="text-amber-400" />
                  </div>
                  <div>
                    <div className="font-mono text-[9px] tracking-widest text-amber-500 uppercase font-black">
                      EVIDENTIARY WEAPONRY // محفظة الحجج ومحرزات المواجهة
                    </div>
                    <h3 className="font-serif text-sm sm:text-base font-black text-[#f5ebd7] tracking-tight">
                      سلاح الطعن والمواجهة الجنائية
                    </h3>
                  </div>
                </div>

                {/* Tabs styled as authentic Manila Index Tabs */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 font-mono text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setConfrontationTab('deductions');
                        playPaperSound();
                      }}
                      className={`px-3 py-1.5 text-xs font-mono transition-all rounded-t-xs border-t-2 border-x cursor-pointer shadow-xs ${
                        confrontationTab === 'deductions'
                          ? 'border-[#b8860b] bg-[#fbf5e6] text-[#24170a] font-black shadow-sm'
                          : 'border-[#4a3928] bg-[#1f1710] text-[#a89782] hover:bg-[#2b2118] hover:text-[#f4ead5]'
                      }`}
                      data-testid="tab-deductions"
                    >
                      الاستنتاجات والتناقضات المثبتة ({earnedDeductions.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfrontationTab('evidence');
                        playPaperSound();
                      }}
                      className={`px-3 py-1.5 text-xs font-mono transition-all rounded-t-xs border-t-2 border-x cursor-pointer shadow-xs ${
                        confrontationTab === 'evidence'
                          ? 'border-[#b8860b] bg-[#fbf5e6] text-[#24170a] font-black shadow-sm'
                          : 'border-[#4a3928] bg-[#1f1710] text-[#a89782] hover:bg-[#2b2118] hover:text-[#f4ead5]'
                      }`}
                      data-testid="tab-evidence"
                    >
                      الأدلة المادية الخام ({availableEvidences.length})
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsConfrontationModalOpen(false);
                      playClickSound();
                    }}
                    className="grid h-8 w-8 place-items-center border border-[#b8860b]/50 bg-[#221810] text-[#f5ebd7] hover:border-amber-400 hover:text-white transition-colors rounded-xs shadow cursor-pointer"
                    aria-label="إغلاق درج المواجهة"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Tab 1: VALIDATED DEDUCTIONS (Core Gameplay Object) */}
              {confrontationTab === 'deductions' && (
                <div>
                  {earnedDeductions.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                      {earnedDeductions.map((deduction) => (
                        <div
                          key={deduction.id}
                          className="flex flex-col justify-between border-2 border-[#b8860b] bg-[#fcf8ed] manila-texture p-4 text-right rounded-xs hover:border-amber-700 shadow-md transition-all group"
                          data-testid={`deduction-card-${deduction.id}`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#e2d4bc]">
                              <span className="font-mono text-[9px] border border-red-800/60 bg-red-900/10 px-2 py-0.5 text-red-900 font-black flex items-center gap-1 rounded-xs">
                                <Sparkles size={11} className="text-red-700" />
                                <span>استنتاج جنائي مُثبَت // حجة قاطعة</span>
                              </span>
                              <span className="font-mono text-[9px] text-[#7a6448] font-bold">
                                بـرهـان قـضـائـي
                              </span>
                            </div>
                            <h4 className="font-serif text-xs font-black text-[#1e150b] group-hover:text-red-950 transition-colors">
                              {deduction.title}
                            </h4>
                            <p className="mt-1 text-[11px] text-[#55422d] leading-relaxed line-clamp-2 font-sans">
                              {deduction.description}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-[#e2d4bc] flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleConfrontWithDeduction(deduction)}
                              className="flex items-center gap-1.5 border border-[#6b1410] bg-[#8a1c14] hover:bg-[#aa2319] text-[#fff8ee] px-3.5 py-1.5 text-xs font-mono font-bold transition-all shadow-sm rounded-xs cursor-pointer active:scale-95"
                              data-testid={`button-present-deduction-${deduction.id}`}
                            >
                              <Zap size={13} className="text-amber-300" />
                              <span>مواجهة بهذه الحجة الجنائية</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Tactile Police Internal Memo - Stamped Manila Advisory Card */
                    <div
                      className="relative border-2 border-dashed border-[#bfa87a] bg-[#fbf5e6] warrant-paper p-6 sm:p-7 text-center rounded-xs shadow-md overflow-hidden"
                      data-testid="no-deductions-notice"
                    >
                      {/* Top Corner Paperclip decoration */}
                      <div className="absolute top-2 right-4 flex items-center gap-1 opacity-70">
                        <span className="font-mono text-[9px] text-[#8c6f45] uppercase tracking-wider font-bold">
                          // OFFICIAL MEMORANDUM
                        </span>
                      </div>

                      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full border-2 border-[#b8860b] bg-[#f3e7cf] text-[#8c5917] shadow-inner">
                        <AlertTriangle size={24} />
                      </div>

                      <div className="inline-block border border-red-800/40 bg-red-800/10 px-3 py-1 rounded-xs mb-2">
                        <h4 className="font-serif text-sm font-black text-red-950">
                          لم تثبت أي استنتاجات أو تناقضات بعد!
                        </h4>
                      </div>

                      <p className="max-w-xl mx-auto text-xs text-[#42311e] leading-relaxed font-sans mt-1">
                        المشتبه به متمرس ولن ينهار لمجرد إبراز أدلة مفردة معزولة. ارجع إلى مسرح الجريمة، وابنِ فرضياتك على لوحة التحقيق واختبرها لتكتسب حججاً قاطعة تدحض بها ادعاءات المشتبه به.
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#dfd2ba] flex items-center justify-center gap-4 text-[10px] font-mono text-[#7a6448]">
                        <span>📌 اربط الأدلة على اللوحة</span>
                        <span>⚡ استخرج التناقض الجنائي</span>
                        <span>⚖️ عُد لمواجهة المشتبه به</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: RAW EVIDENCE (Secondary - Cannot solve a deduction challenge) */}
              {confrontationTab === 'evidence' && (
                <div>
                  <div className="mb-2.5 text-[11px] font-mono text-[#5a3809] bg-[#faebd7] p-2.5 border-l-4 border-amber-700 border-y border-r border-[#d8c29d] rounded-xs shadow-2xs flex items-center gap-2">
                    <span className="font-bold text-amber-900 shrink-0">ℹ تنبيه إجرائي:</span>
                    <span>إبراز الدليل المادي بمفرده دون استنتاج التناقض الجنائي لن يدحض ادعاء المشتبه به وسيعرض مصداقيتك للاهتزاز.</span>
                  </div>

                  {availableEvidences.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-56 overflow-y-auto pr-1">
                      {availableEvidences.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => handleConfrontWithEvidence(ev)}
                          className="flex flex-col text-right border border-[#cfbe96] bg-[#fbf6ea] manila-evidence-card p-3 hover:border-amber-700 hover:bg-[#fffcf4] transition-all group rounded-xs cursor-pointer shadow-xs"
                          data-testid={`evidence-card-${ev.id}`}
                        >
                          <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-[#cfbe96]/60">
                            <span className="font-mono text-[9px] border border-[#a88d5e] bg-[#ede0c4] px-1.5 py-0.5 text-[#5c441f] rounded-xs font-bold">
                              {ev.type === 'physical' ? 'أثر مادي' : 'مستند'}
                            </span>
                            <span className="font-mono text-[9px] text-[#78613f] font-semibold">{ev.foundAt}</span>
                          </div>
                          <span className="font-serif text-xs font-bold text-[#1e150b] group-hover:text-amber-950 transition-colors">
                            {ev.label}
                          </span>
                          <p className="mt-1 text-[11px] text-[#5c4933] line-clamp-2 leading-4">
                            {ev.summary}
                          </p>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-[#cfbe96] bg-[#fbf6ea] p-6 text-center text-xs text-[#6e563a] font-mono rounded-xs">
                      لم تفحص أي أدلة بعد في مسرح الجريمة.
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default InterrogationUI;
