import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  FileWarning,
  Flame,
  Gavel,
  Home as HomeIcon,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { CaseShell } from '@/components/case-ui';
import { CinematicReveal } from '@/components/CinematicReveal';
import { Stamp } from '@/components/ui/Stamp';
import { getCaseById } from '@/content';
import {
  playClickSound,
  playErrorSound,
  playEurekaSound,
  playHeartbeatSound,
  playPaperSound,
} from '@/core/engine.audio';
import {
  getAccusationConfig,
  getEarnedDeductions,
  loadInvestigationState,
  saveInvestigationState,
  type InvestigationState,
} from '@/core/engine.logic';
import type { CaseFile, Suspect, EvidenceItem } from '@/types/game.types';

// ─── Case Not Found Screen ──────────────────────────────────────────────────
function CaseNotFound({ caseId }: { caseId?: string }) {
  return (
    <CaseShell minimal>
      <main className="mx-auto max-w-[600px] px-5 py-24 text-center" dir="rtl">
        <div className="border border-red-900/50 bg-neutral-950 p-8 sm:p-12 shadow-2xl">
          <div className="mx-auto grid h-16 w-16 place-items-center border border-red-700/50 bg-red-950/30 text-red-500 mb-6">
            <FileWarning size={32} />
          </div>
          <h1 className="font-display text-2xl font-bold text-white mb-4">ملف القضية غير متوفر</h1>
          <p className="text-sm leading-8 text-neutral-400 mb-8">
            رقم القضية المطلوب ({caseId ?? '---'}) غير مسجل في السجلات الجنائية النشطة.
          </p>
          <div className="flex justify-center">
            <Link
              href="/"
              className="flex items-center gap-2 border border-neutral-700 bg-neutral-900 px-6 py-3 text-xs font-mono text-neutral-200 hover:border-amber-600 hover:text-white transition-colors"
            >
              <HomeIcon size={15} />
              العودة للمكتب الرئيسي
            </Link>
          </div>
        </div>
      </main>
    </CaseShell>
  );
}

// ─── Lockout Screen ─────────────────────────────────────────────────────────
function LockoutScreen({ caseId }: { caseId: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black p-4 text-center" dir="rtl">
      <div className="pointer-events-none absolute inset-0 noir-scanlines opacity-40" />
      <div className="pointer-events-none absolute inset-0 pulsing-blood-vignette opacity-80" />
      <div className="relative z-10 max-w-lg border-2 border-red-900/80 bg-neutral-950/95 p-8 shadow-[0_0_80px_rgba(220,38,38,0.3)]">
        <div className="mb-6 flex justify-center">
          <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-red-600/70 bg-red-950/50 text-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)]">
            <ShieldX size={48} />
          </div>
        </div>
        <div className="font-mono text-xs font-bold tracking-widest text-red-500 uppercase mb-2">
          إجراء تأديبي عاجل // استنفاد المصداقية
        </div>
        <h1 className="font-display text-2xl sm:text-3xl font-black text-white mb-4">
          تم تعليق شارة المحقق وسحب ملف القضية
        </h1>
        <p className="text-xs sm:text-sm leading-7 text-neutral-400 mb-8">
          أدى تقديم اتهامات غير مستندة لبراهين قاطعة إلى استنزاف كامل رصيد مصداقيتك المهنية.
          أمر المدعي العام بتجميد صلاحياتك في متابعة هذه القضية حتى إشعار آخر.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href={`/investigation/${caseId}`}
            className="flex h-11 items-center justify-center gap-2 border border-neutral-700 bg-neutral-900 px-6 text-xs text-neutral-300 hover:border-neutral-500 hover:text-white transition-colors font-mono"
          >
            <ArrowLeft size={14} />
            مراجعة لوحة التحقيق
          </Link>
          <Link
            href="/"
            className="flex h-11 items-center justify-center gap-2 border border-neutral-800 bg-neutral-950 px-6 text-xs text-neutral-400 hover:text-white transition-colors font-mono"
          >
            <HomeIcon size={14} />
            مكتب القضايا
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─── Main Accusation Component ─────────────────────────────────────────────
export default function Accusation() {
  const { caseId } = useParams();
  const [, navigate] = useLocation();
  const caseFile = caseId ? getCaseById(caseId) : undefined;

  const [state, setState] = useState<InvestigationState>(() =>
    caseFile ? loadInvestigationState(caseFile.id) : ({} as InvestigationState),
  );

  // 3 Pillars Form State
  const [selectedCulprit, setSelectedCulprit] = useState<string>('');
  const [selectedEvidence, setSelectedEvidence] = useState<string>('');
  const [selectedContradiction, setSelectedContradiction] = useState<string>('');

  // Climax submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verdict, setVerdict] = useState<'idle' | 'success' | 'fail'>('idle');
  const [flashType, setFlashType] = useState<'gold' | 'red' | null>(null);
  const [showCinematic, setShowCinematic] = useState(false);

  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (caseFile) {
      const loaded = loadInvestigationState(caseFile.id);
      setState(loaded);
    }
  }, [caseFile]);

  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, []);

  if (!caseFile) return <CaseNotFound caseId={caseId} />;
  const activeCase: CaseFile = caseFile;

  // Earned contradictions for Pillar 3
  const earnedDeductions = getEarnedDeductions(activeCase, state);

  // Check if locked out
  if (state.accusationPhase === 'lockout' || state.credibilityPoints === 0) {
    return (
      <CaseShell minimal>
        <LockoutScreen caseId={activeCase.id} />
      </CaseShell>
    );
  }

  // Check if already solved
  const isAlreadySolved = state.accusationPhase === 'submitted_solved';

  if (showCinematic && state.finalResult) {
    return (
      <CaseShell minimal>
        <CinematicReveal
          caseFile={activeCase}
          state={state}
          result={state.finalResult}
          onRetry={() => setShowCinematic(false)}
        />
      </CaseShell>
    );
  }

  // Can submit check: all 3 fields filled
  const isFormComplete =
    Boolean(selectedCulprit) &&
    Boolean(selectedEvidence) &&
    Boolean(selectedContradiction);

  // The Climax Execution
  function handleSealWarrant() {
    if (!isFormComplete || isSubmitting) return;

    playPaperSound();
    setIsSubmitting(true);

    // Heartbeat cadence sound during high suspense delay
    playHeartbeatSound();
    heartbeatIntervalRef.current = setInterval(() => {
      playHeartbeatSound();
    }, 700);

    // 2.6 seconds delay: tension build-up
    setTimeout(() => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);

      // Evaluate the 3 Pillars against the case solution
      const solution = activeCase.solution;
      const config = getAccusationConfig(activeCase);

      const isCulpritCorrect =
        selectedCulprit === solution.culpritId ||
        selectedCulprit === config.culpritId;

      const isEvidenceCorrect =
        solution.criticalEvidenceIds.includes(selectedEvidence);

      // Motive check: either matches the designated motive contradiction or layla's motive
      const motiveContradiction = activeCase.contradictions.find(
        (c) => c.suspectId === solution.culpritId && (c.id.includes('motive') || c.id === 'contradiction-motive'),
      );
      const isMotiveCorrect =
        selectedContradiction === motiveContradiction?.id ||
        selectedContradiction === 'contradiction-motive' ||
        selectedContradiction === 'contradiction-layla';

      const isVerdictSuccess = isCulpritCorrect && isEvidenceCorrect && isMotiveCorrect;

      setIsSubmitting(false);

      if (isVerdictSuccess) {
        // SUCCESS: flash gold/white, Eureka stamp sound
        setFlashType('gold');
        setTimeout(() => setFlashType(null), 700);
        playEurekaSound();
        setVerdict('success');

        const nextState: InvestigationState = {
          ...state,
          accusationPhase: 'submitted_solved',
          finalResult: {
            outcome: 'solved',
            correctCulprit: true,
            validatedClaims: ['identity', 'motive', 'method', 'opportunity'],
            missingClaims: [],
            unsupportedClaims: [],
            submittedCulpritId: selectedCulprit,
            submittedDeductionMap: {
              identity: 'contradiction-layla',
              motive: selectedContradiction,
              method: 'contradiction-latch',
              opportunity: 'contradiction-nabil',
            },
            earnedContradictionIds: state.discoveredContradictionIds || [],
            criticalEvidenceFound: state.inspectedEvidenceIds.length,
            criticalEvidenceTotal: activeCase.evidence.length,
            contradictionsFound: (state.discoveredContradictionIds || []).length,
            contradictionsTotal: activeCase.contradictions.length,
          },
        };
        setState(nextState);
        saveInvestigationState(activeCase.id, nextState);
      } else {
        // FAIL: flash harsh red, gavel hit sound, deduct 2 credibility points
        setFlashType('red');
        setTimeout(() => setFlashType(null), 800);
        playErrorSound();
        setVerdict('fail');

        const currentCred = state.credibilityPoints ?? 3;
        const newCred = Math.max(0, currentCred - 2);
        const hitLockout = newCred === 0;

        const nextState: InvestigationState = {
          ...state,
          credibilityPoints: newCred,
          accusationPhase: hitLockout ? 'lockout' : undefined,
        };
        setState(nextState);
        saveInvestigationState(activeCase.id, nextState);
      }
    }, 2600);
  }

  const solution = activeCase.solution;

  return (
    <CaseShell minimal>
      {/* Dynamic Flash Overlay */}
      {flashType === 'gold' && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-amber-300/80 animate-pulse duration-500" />
      )}
      {flashType === 'red' && (
        <div className="fixed inset-0 z-50 pointer-events-none bg-red-700/80 animate-pulse duration-500" />
      )}

      {/* Tension noir ambient background */}
      <div className="fixed inset-0 pointer-events-none noir-scanlines opacity-40 z-0" />
      <div className="fixed inset-0 pointer-events-none pulsing-blood-vignette opacity-90 z-0" />

      <main
        className={`relative z-10 mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:py-12 transition-transform duration-100 ${
          isSubmitting ? 'animate-shake' : ''
        }`}
        dir="rtl"
      >
        {/* Top Navigation & Status */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-red-950/80 pb-4">
          <Link
            href={`/investigation/${activeCase.id}`}
            onClick={() => playClickSound()}
            className="inline-flex items-center gap-2 text-xs font-mono text-neutral-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} />
            العودة إلى لوحة التحقيق
          </Link>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-neutral-400">رصيد المصداقية المهنية:</span>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((pt) => {
                const isAvailable = (state.credibilityPoints ?? 3) >= pt;
                return (
                  <span
                    key={pt}
                    className={`inline-block h-3.5 w-7 rounded-sm border ${
                      isAvailable
                        ? 'border-emerald-500/70 bg-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                        : 'border-red-800/40 bg-neutral-900 text-neutral-600'
                    }`}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── THE PHYSICAL ARREST WARRANT (مذكرة التوقيف الرسمية) ─── */}
        <div className="relative warrant-paper rounded-sm p-6 sm:p-10 md:p-14 text-neutral-900 shadow-lifted border border-amber-900/40 overflow-hidden">
          {/* Official Aged Paper Watermark */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-5 select-none">
            <Scale size={420} className="text-black" />
          </div>

          {/* Red Security Double Border */}
          <div className="pointer-events-none absolute inset-3 sm:inset-5 border-2 border-red-800/30 rounded-xs" />
          <div className="pointer-events-none absolute inset-4 sm:inset-6 border border-dashed border-red-900/20 rounded-xs" />

          {/* Official Warrant Header */}
          <header className="relative z-10 text-center border-b-2 border-neutral-900/20 pb-6 mb-8">
            <div className="flex items-center justify-center gap-2 font-mono text-[10px] tracking-widest text-red-900 font-bold uppercase mb-1">
              <ShieldAlert size={14} className="text-red-800" />
              وزارة الداخلية // الإدارة العامة للمباحث الجنائية // الدائرة القضائية
            </div>
            <h1 className="font-display text-2xl sm:text-4xl font-black text-neutral-950 tracking-tight mt-1 mb-2">
              مذكرة توقيف وإحالة قضائية عاجلة
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] font-mono text-neutral-700">
              <span>ملف القضية: <strong>{activeCase.number} — {activeCase.title}</strong></span>
              <span>•</span>
              <span className="text-red-900 font-bold">التصنيف: سري ومحمي للتنفيذ الفوري</span>
              <span>•</span>
              <span>المرجع: <strong>CID-2026-001</strong></span>
            </div>
          </header>

          {/* If Case was already solved or just solved */}
          <AnimatePresence>
            {(verdict === 'success' || isAlreadySolved) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-20 mb-8 border-2 border-emerald-700 bg-emerald-950/15 p-6 rounded-sm shadow-xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-emerald-800 font-black font-mono text-xs">
                    <ShieldCheck size={20} />
                    تم التحقق من لائحة الاتهام بنجاح — إحالة القضية للنيابة العامة
                  </div>
                  <Stamp rotate={-8} tone="emerald" animate className="text-sm px-4 py-1.5">
                    القضية أُغلقت — تم الحل
                  </Stamp>
                </div>

                <div className="mt-4 bg-white/70 border border-emerald-900/20 p-5 rounded text-xs leading-relaxed text-neutral-900">
                  <h3 className="font-bold font-display text-sm text-emerald-950 mb-2 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-700" />
                    تقرير الحقيقة الجنائية المثبتة (موجز القضية):
                  </h3>
                  <p className="mb-3 leading-6 text-neutral-800">
                    أثبتت التحقيقات الجنائية الدقيقة أن المتهمة الحقيقية هي <strong>ليلى عمران</strong>، شريكة الضحية. صعدت للغرفة 407 بعد مواجهتها بإنذار نهائي من طارق بافتضاح اختلاساتها وتهديده بإحالتها للنائب العام في الصباح.
                  </p>
                  <p className="mb-3 leading-6 text-neutral-800">
                    نفّذت ليلى جريمتها واستخدمت شريط التثبيت البلاستيكي (Zip-tie) وسلكاً رفيعاً لإسقاط المزلاج الداخلي من خارج الباب، ثم قصت طرف الشريط بقاطع الأسلاك الموجود في حقيبتها لإيهام المحققين باستحالة الدخول.
                  </p>
                  <div className="border-t border-neutral-300 pt-3 flex flex-wrap gap-2 text-[11px] font-mono text-emerald-900">
                    <span>الجاني: ليلى عمران</span>
                    <span>•</span>
                    <span>الأداة: شريط التثبيت وقاطع الأسلاك</span>
                    <span>•</span>
                    <span>الدافع: تهديد النيابة العامة بالاختلاسات</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowCinematic(true);
                    }}
                    className="flex items-center gap-2 border border-emerald-700 bg-emerald-900/15 text-emerald-950 px-5 py-2.5 rounded text-xs font-mono font-bold hover:bg-emerald-900/25 transition-all cursor-pointer"
                  >
                    <FileCheck2 size={15} />
                    عرض التقرير الجنائي السينمائي
                  </button>
                  <Link
                    href="/"
                    onClick={() => playClickSound()}
                    className="flex items-center gap-2 bg-neutral-950 text-white px-6 py-2.5 rounded text-xs font-mono font-bold hover:bg-neutral-800 shadow-md transition-all"
                  >
                    <HomeIcon size={14} />
                    العودة لمكتب القضايا
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* If Verdict is False Accusation */}
          <AnimatePresence>
            {verdict === 'fail' && !isAlreadySolved && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative z-20 mb-8 border-2 border-red-700 bg-red-950/15 p-6 rounded-sm shadow-xl"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2 text-red-900 font-black font-mono text-xs">
                    <Gavel size={20} className="text-red-800" />
                    رفض قضائي قطعي — بطلان أركان الاتهام المقدم
                  </div>
                  <Stamp rotate={10} tone="crimson" animate className="text-sm px-4 py-1.5">
                    موقوف عن العمل — اتهام باطل
                  </Stamp>
                </div>

                <p className="text-xs leading-6 text-red-950 mb-4 font-semibold">
                  تحذير رسمي من هيئة الادعاء: الأدلة أو الدافع المرفق في هذه المذكرة لا يتطابق مع الحقائق الجنائية المثبتة. تم خصم نقطتين (-2) من رصيد مصداقيتك المهنية كإجراء تأديبي.
                </p>

                <div className="flex flex-wrap gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setVerdict('idle');
                    }}
                    className="flex items-center gap-2 border border-red-800 bg-white/80 px-4 py-2 text-xs font-mono font-bold text-red-900 hover:bg-white transition-colors"
                  >
                    <RotateCcw size={14} />
                    إعادة صياغة المذكرة
                  </button>
                  <Link
                    href={`/investigation/${activeCase.id}`}
                    onClick={() => playClickSound()}
                    className="flex items-center gap-2 bg-red-900 text-white px-5 py-2 text-xs font-mono font-bold hover:bg-red-800 transition-colors shadow"
                  >
                    <ArrowLeft size={14} />
                    العودة للوحة الجريمة للتحقق
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ─── THE 3 PILLARS OF INDICTMENT ─── */}
          {verdict !== 'success' && !isAlreadySolved && (
            <div className="relative z-10 space-y-8">
              <div className="text-xs leading-6 text-neutral-700 bg-neutral-900/5 p-4 border-r-4 border-neutral-800">
                بموجب الصلاحيات المخولة لفرقة المباحث الجنائية، يُشترط اكتمال الأركان الثلاثة (المتهم، الدليل المادي القاطع، والدافع المثبت) لختم أمر القبض والإحالة للمحكمة المختصة.
              </div>

              {/* PILLAR 1: CULPRIT */}
              <div className="space-y-3">
                <label className="block text-xs font-mono font-black uppercase text-neutral-900 tracking-wider">
                  الركن الأول: تحديد الجاني الرئيسي (The Culprit)
                </label>
                <div className="relative">
                  <select
                    value={selectedCulprit}
                    onChange={(e) => {
                      playPaperSound();
                      setSelectedCulprit(e.target.value);
                    }}
                    className="w-full appearance-none border-2 border-neutral-900/30 bg-white/80 px-4 py-3.5 pr-10 text-xs sm:text-sm font-semibold text-neutral-900 focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 transition-colors cursor-pointer shadow-xs"
                  >
                    <option value="">— اختر المشتبه به المراد توجيه الاتهام الرسمي له —</option>
                    {activeCase.suspects.map((suspect: Suspect) => (
                      <option key={suspect.id} value={suspect.id}>
                        {suspect.name} — ({suspect.role})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-neutral-600">
                    <UserCheck size={18} />
                  </div>
                </div>
                {selectedCulprit && (
                  <p className="text-[11px] text-neutral-600 font-mono">
                    المشتبه به المختار: {activeCase.suspects.find((s) => s.id === selectedCulprit)?.name}
                  </p>
                )}
              </div>

              {/* PILLAR 2: MURDER WEAPON / DECISIVE EVIDENCE */}
              <div className="space-y-3">
                <label className="block text-xs font-mono font-black uppercase text-neutral-900 tracking-wider">
                  الركن الثاني: أداة الجريمة / الدليل الجنائي القاطع (The Decisive Evidence)
                </label>
                <div className="relative">
                  <select
                    value={selectedEvidence}
                    onChange={(e) => {
                      playPaperSound();
                      setSelectedEvidence(e.target.value);
                    }}
                    className="w-full appearance-none border-2 border-neutral-900/30 bg-white/80 px-4 py-3.5 pr-10 text-xs sm:text-sm font-semibold text-neutral-900 focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 transition-colors cursor-pointer shadow-xs"
                  >
                    <option value="">— اختر الدليل المادي القاطع الذي يربط الجاني بالجريمة —</option>
                    {activeCase.evidence.map((item: EvidenceItem) => (
                      <option key={item.id} value={item.id}>
                        {item.label} — ({item.type === 'physical' ? 'أثر مادي' : 'مستند جنائي'})
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-neutral-600">
                    <Flame size={18} />
                  </div>
                </div>
                {selectedEvidence && (
                  <p className="text-[11px] text-neutral-600 font-mono">
                    الدليل المرفق: {activeCase.evidence.find((e) => e.id === selectedEvidence)?.label}
                  </p>
                )}
              </div>

              {/* PILLAR 3: MOTIVE / KEY CONTRADICTION */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-mono font-black uppercase text-neutral-900 tracking-wider">
                    الركن الثالث: الدافع / التناقض الحاسم المثبت (The Motive / Proven Contradiction)
                  </label>
                  <span className="text-[10px] font-mono text-neutral-500">
                    (المثبتة على اللوحة: {earnedDeductions.length})
                  </span>
                </div>

                {earnedDeductions.length === 0 ? (
                  <div className="border-2 border-dashed border-red-900/40 bg-red-900/5 p-4 rounded text-xs text-red-900 leading-6">
                    <div className="flex items-center gap-2 font-bold mb-1">
                      <AlertTriangle size={15} />
                      تنبيه أمني: لم تثبت بعد أي تناقضات على لوحة التحقيق
                    </div>
                    لا يمكن توجيه اتهام رسمي دون إثبات تناقض يوضح الدافع الجنائي. يرجى العودة للوحة التحقيق وربط الأدلة لكشف التناقضات أولاً.
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={selectedContradiction}
                      onChange={(e) => {
                        playPaperSound();
                        setSelectedContradiction(e.target.value);
                      }}
                      className="w-full appearance-none border-2 border-neutral-900/30 bg-white/80 px-4 py-3.5 pr-10 text-xs sm:text-sm font-semibold text-neutral-900 focus:border-red-800 focus:outline-none focus:ring-1 focus:ring-red-800 transition-colors cursor-pointer shadow-xs"
                    >
                      <option value="">— اختر التناقض المستنبط الذي يكشف الدافع المباشر —</option>
                      {earnedDeductions.map((deduction) => (
                        <option key={deduction.id} value={deduction.id}>
                          {deduction.title}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center px-4 text-neutral-600">
                      <Scale size={18} />
                    </div>
                  </div>
                )}
                {selectedContradiction && (
                  <p className="text-[11px] text-neutral-600 font-mono">
                    الدافع المعتمد: {earnedDeductions.find((d) => d.id === selectedContradiction)?.title}
                  </p>
                )}
              </div>

              {/* Legal Disclaimer & Detective Signature Area */}
              <div className="pt-6 border-t border-neutral-900/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-[11px] text-neutral-600">
                <div>
                  <span className="block font-bold text-neutral-800">توقيع المحقق المسؤول:</span>
                  <span className="italic font-serif text-sm text-neutral-900">المحقق الجنائي المكلف</span>
                </div>
                <div className="text-left">
                  <span>خاتم الدائرة: [معتمد قضائياً]</span>
                  <span className="block text-[9px] text-neutral-500">العقوبة للادعاء الكاذب: العزل والملاحقة</span>
                </div>
              </div>

              {/* ─── CLIMAX SUBMIT BUTTON ─── */}
              <div className="pt-4 flex justify-center">
                <button
                  type="button"
                  disabled={!isFormComplete || isSubmitting}
                  onClick={handleSealWarrant}
                  className={`group relative flex items-center justify-center gap-3 w-full sm:w-auto px-10 py-5 text-sm sm:text-base font-mono font-black uppercase tracking-wider transition-all duration-300 rounded-sm shadow-2xl ${
                    isFormComplete && !isSubmitting
                      ? 'bg-red-900 text-white hover:bg-red-800 hover:scale-[1.02] border-2 border-red-700 shadow-[0_0_30px_rgba(185,28,28,0.5)] cursor-pointer'
                      : 'bg-neutral-800 text-neutral-500 border border-neutral-700 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <Gavel size={22} className={isSubmitting ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'} />
                  <span>
                    {isSubmitting
                      ? 'جارٍ فحص الأدلة وتوقيع المذكرة...'
                      : 'ختم مذكرة التوقيف وإحالة المتهم'}
                  </span>
                  <Shield size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </CaseShell>
  );
}
