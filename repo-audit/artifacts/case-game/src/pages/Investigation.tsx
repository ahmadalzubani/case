import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  FileSearch,
  FileWarning,
  Grid,
  Home as HomeIcon,
  Layers,
  LayoutGrid,
  Link2,
  Lock,
  MapPin,
  MapPinned,
  Pin,
  PinOff,
  RotateCcw,
  Scale,
  Sparkles,
  UsersRound,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'wouter';
import { calculatePinAnchor, calculateStringPhysics } from '@/lib/string-physics';
import {
  CaseButton,
  CaseShell,
  DetailDrawer,
  type SelectedItem,
} from '@/components/case-ui';
import {
  getCaseById,
  type CaseFile,
  type Evidence,
  type Location,
  type Suspect,
  type TimelineEvent,
} from '@/content';
import {
  addConnection,
  addToNotebook,
  attemptDeriveContradiction,
  breakSuspect,
  clearInvestigationState,
  createInitialInvestigationState,
  deductCredibility,
  discoverHotspot,
  getDiscoveredContradictions,
  getInspectableTitle,
  getInvestigationProgress,
  inspectEvidence,
  inspectLocation,
  inspectSuspect,
  loadInvestigationState,
  removeConnection,
  resetCredibility,
  reviewTimeline,
  saveInvestigationState,
  type ConnectionKind,
  type InvestigationState,
} from '@/core/engine.logic';
import { EvidenceViewer } from '@/components/EvidenceViewer';
import { InterrogationUI } from '@/components/interrogation/InterrogationUI';
import { playClickSound, playPaperSound, playPindropSound } from '@/core/engine.audio';

function CaseNotFound({ caseId }: { caseId?: string }) {
  return (
    <CaseShell minimal>
      <main className="mx-auto max-w-[600px] px-5 py-24 text-center" dir="rtl">
        <div className="case-card border-accent/40 p-8 sm:p-12">
          <div className="mx-auto grid h-16 w-16 place-items-center border border-accent/50 bg-accent/10 text-accent mb-6">
            <FileWarning size={28} />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-4">ملف غير متوفر</h1>
          <p className="text-sm leading-8 text-muted-foreground mb-8">
            عذراً، رقم الملف المطلوب ({caseId ?? '---'}) غير مسجل في أرشيف القضايا النشطة.
          </p>
          <div className="flex justify-center">
            <CaseButton href="/" testId="link-back-home" icon={<HomeIcon size={15} />}>
              العودة للرئيسية
            </CaseButton>
          </div>
        </div>
      </main>
    </CaseShell>
  );
}

const kindLabels: Record<ConnectionKind, string> = {
  evidence: 'دليل',
  suspect: 'مشتبه به',
  timeline: 'حدث زمني',
  location: 'موقع',
};

interface PinnedBoardItem {
  kind: ConnectionKind;
  id: string;
  x: number;
  y: number;
}

export default function Investigation() {
  const { caseId } = useParams();
  const caseFile = caseId ? getCaseById(caseId) : undefined;

  if (!caseFile) {
    return <CaseNotFound caseId={caseId} />;
  }

  const activeCase = caseFile;

  // Canonical investigation state
  const [state, setState] = useState<InvestigationState>(() => loadInvestigationState(activeCase.id));

  // Pinned board items (presentation state only, stored under UI storage key)
  const [pinnedItems, setPinnedItems] = useState<PinnedBoardItem[]>(() => {
    try {
      const saved = localStorage.getItem(`case-board-pinned-${activeCase.id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return [];
  });

  // Tray Drawer State
  const [isTrayOpen, setIsTrayOpen] = useState(false);
  const [trayTab, setTrayTab] = useState<'evidence' | 'suspects' | 'timeline' | 'locations' | 'notebook' | 'contradictions'>('evidence');

  // Murder Board Selection Slots (for two-card hypothesis formation)
  const [selectedSlotA, setSelectedSlotA] = useState<{ kind: ConnectionKind; id: string } | null>(null);
  const [selectedSlotB, setSelectedSlotB] = useState<{ kind: ConnectionKind; id: string } | null>(null);

  // Inspector & Modals State
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [activeVisualEvidence, setActiveVisualEvidence] = useState<Evidence | null>(null);
  const [activeInterrogationSuspect, setActiveInterrogationSuspect] = useState<Suspect | null>(null);
  const [deductionFeedback, setDeductionFeedback] = useState<{ type: 'success' | 'error'; message: string; title?: string } | null>(null);

  // Derived state
  const progress = useMemo(() => getInvestigationProgress(activeCase, state), [state, activeCase]);
  const discoveredContradictions = useMemo(() => getDiscoveredContradictions(activeCase, state), [state, activeCase]);

  // Save canonical state
  useEffect(() => {
    saveInvestigationState(activeCase.id, state);
  }, [state, activeCase.id]);

  // Save pinned board items
  useEffect(() => {
    try {
      localStorage.setItem(`case-board-pinned-${activeCase.id}`, JSON.stringify(pinnedItems));
    } catch {
      // ignore
    }
  }, [pinnedItems, activeCase.id]);

  // Handle external reset events
  useEffect(() => {
    const handleReset = (e: Event) => {
      const custom = e as CustomEvent<{ caseId: string }>;
      if (!custom.detail?.caseId || custom.detail.caseId === activeCase.id) {
        setState(createInitialInvestigationState());
        setPinnedItems([]);
        setSelectedSlotA(null);
        setSelectedSlotB(null);
        setSelected(null);
      }
    };
    window.addEventListener('case:progress-reset', handleReset);
    return () => {
      window.removeEventListener('case:progress-reset', handleReset);
    };
  }, [activeCase.id]);

  // Inspect item helpers (Inspect vs Pin: Inspection NEVER pins implicitly)
  function handleInspectItem(kind: ConnectionKind, id: string) {
    playPaperSound();
    switch (kind) {
      case 'evidence': {
        const ev = activeCase.evidence.find((e) => e.id === id);
        if (ev) {
          if (ev.hotspots && ev.hotspots.length > 0 && !state.inspectedEvidenceIds.includes(ev.id)) {
            setActiveVisualEvidence(ev);
          } else {
            setState((cur) => inspectEvidence(cur, ev.id));
            setSelected(ev);
          }
        }
        break;
      }
      case 'suspect': {
        const s = activeCase.suspects.find((sp) => sp.id === id);
        if (s) {
          setState((cur) => inspectSuspect(cur, s.id));
          setSelected(s);
        }
        break;
      }
      case 'timeline': {
        const t = activeCase.timeline.find((tl) => tl.id === id);
        if (t) {
          setState((cur) => reviewTimeline(cur, t.id));
          setSelected(t);
        }
        break;
      }
      case 'location': {
        const l = activeCase.locations.find((lc) => lc.id === id);
        if (l) {
          setState((cur) => inspectLocation(cur, l.id));
          setSelected(l);
        }
        break;
      }
    }
  }

  // Pin & Unpin Actions
  function isItemPinned(kind: ConnectionKind, id: string): boolean {
    return pinnedItems.some((item) => item.kind === kind && item.id === id);
  }

  function pinItem(kind: ConnectionKind, id: string) {
    if (isItemPinned(kind, id)) return;
    playPindropSound();
    setPinnedItems((prev) => {
      const count = prev.length;
      const col = count % 4;
      const row = Math.floor(count / 4);
      const x = 40 + col * 260;
      const y = 80 + row * 200;
      return [...prev, { kind, id, x, y }];
    });
  }

  function unpinItem(kind: ConnectionKind, id: string) {
    playClickSound();
    setPinnedItems((prev) => prev.filter((item) => !(item.kind === kind && item.id === id)));
    if (selectedSlotA?.kind === kind && selectedSlotA?.id === id) setSelectedSlotA(null);
    if (selectedSlotB?.kind === kind && selectedSlotB?.id === id) setSelectedSlotB(null);
  }

  function togglePin(kind: ConnectionKind, id: string) {
    if (isItemPinned(kind, id)) {
      unpinItem(kind, id);
    } else {
      pinItem(kind, id);
    }
  }

  function handleAutoArrangeCards() {
    playPaperSound();
    setPinnedItems((prev) =>
      prev.map((item, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        return {
          ...item,
          x: 40 + col * 260,
          y: 80 + row * 200,
        };
      })
    );
  }

  // Fluid Freeform Pointer Drag State (Subpixel smooth, continuous 1:1 cursor movement, zero snapping)
  const [activeDraggingCard, setActiveDraggingCard] = useState<{ kind: ConnectionKind; id: string } | null>(null);
  const dragRef = useRef<{
    kind: ConnectionKind;
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  } | null>(null);

  function handleCardPointerDown(
    e: React.PointerEvent<HTMLDivElement>,
    kind: ConnectionKind,
    id: string,
    curX: number,
    curY: number
  ) {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, a, input, textarea')) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragRef.current = {
      kind,
      id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: curX,
      initialY: curY,
      hasMoved: false,
    };
    setActiveDraggingCard({ kind, id });
  }

  function handleCardPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const { kind, id, startX, startY, initialX, initialY } = dragRef.current;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (!dragRef.current.hasMoved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
      dragRef.current.hasMoved = true;
    }

    if (dragRef.current.hasMoved) {
      const nextX = Math.max(10, Math.round(initialX + dx));
      const nextY = Math.max(10, Math.round(initialY + dy));
      setPinnedItems((prev) =>
        prev.map((item) => (item.kind === kind && item.id === id ? { ...item, x: nextX, y: nextY } : item))
      );
    }
  }

  function handleCardPointerUp(e: React.PointerEvent<HTMLDivElement>, kind: ConnectionKind, id: string) {
    if (!dragRef.current) return;
    const wasMoved = dragRef.current.hasMoved;
    dragRef.current = null;
    setActiveDraggingCard(null);

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    if (wasMoved) {
      playPaperSound();
    } else {
      handleCardClick(kind, id);
    }
  }

  // Murder Board Selection (Selecting items to compare/derive)
  function handleCardClick(kind: ConnectionKind, id: string) {
    // If clicked slot A, deselect it
    if (selectedSlotA?.kind === kind && selectedSlotA?.id === id) {
      setSelectedSlotA(null);
      playClickSound();
      return;
    }
    // If clicked slot B, deselect it
    if (selectedSlotB?.kind === kind && selectedSlotB?.id === id) {
      setSelectedSlotB(null);
      playClickSound();
      return;
    }
    // If slot A is empty, assign slot A
    if (!selectedSlotA) {
      setSelectedSlotA({ kind, id });
      playClickSound();
      return;
    }
    // If slot B is empty, assign slot B
    if (!selectedSlotB) {
      setSelectedSlotB({ kind, id });
      playClickSound();
      return;
    }
    // If both occupied, replace slot B
    setSelectedSlotB({ kind, id });
    playClickSound();
  }

  // Hypothesis & Derivation Actions (Routes through existing Phase 1 engine)
  function handleDeriveContradiction() {
    if (!selectedSlotA || !selectedSlotB) return;
    const { kind: fromKind, id: fromId } = selectedSlotA;
    const { kind: toKind, id: toId } = selectedSlotB;

    let activeState = state;
    // Check if connection already exists in state
    let connection = state.connections.find(
      (c) =>
        (c.fromKind === fromKind && c.fromId === fromId && c.toKind === toKind && c.toId === toId) ||
        (c.fromKind === toKind && c.fromId === toId && c.toKind === fromKind && c.toId === fromId)
    );

    // If connection doesn't exist, create it as a hypothesis first
    if (!connection) {
      activeState = addConnection(state, fromKind, fromId, toKind, toId);
      connection = activeState.connections[activeState.connections.length - 1];
    }

    // Attempt authoritative engine derivation
    const result = attemptDeriveContradiction(activeCase, activeState, connection.id);
    setState(result.newState);
    playPindropSound();

    if (result.success && result.discoveredContradiction) {
      setDeductionFeedback({
        type: 'success',
        title: result.discoveredContradiction.title,
        message: result.message,
      });
    } else {
      setDeductionFeedback({
        type: 'error',
        message: result.message || 'لم يثبت أي تعارض جنائي مباشر بين هاتين القرينتين.',
      });
    }
  }

  function handleRecordHypothesis() {
    if (!selectedSlotA || !selectedSlotB) return;
    playPindropSound();
    setState((cur) => addConnection(cur, selectedSlotA.kind, selectedSlotA.id, selectedSlotB.kind, selectedSlotB.id));
    setDeductionFeedback({
      type: 'success',
      message: 'تم تسجيل الفرضية بنجاح على اللوحة. اضغط «استنتاج تعارض» لاختبار صحتها.',
    });
  }

  function resetInvestigation() {
    clearInvestigationState(activeCase.id);
    try {
      localStorage.removeItem(`case-board-pinned-${activeCase.id}`);
    } catch {
      // ignore
    }
    setState(createInitialInvestigationState());
    setPinnedItems([]);
    setSelectedSlotA(null);
    setSelectedSlotB(null);
    setSelected(null);
    setDeductionFeedback(null);
  }

  // Helper to extract item label/title
  function getItemTitle(kind: ConnectionKind, id: string): string {
    return getInspectableTitle(activeCase, kind, id);
  }

  // Helper to check if item is inspected in canonical state
  function isItemInspected(kind: ConnectionKind, id: string): boolean {
    switch (kind) {
      case 'evidence':
        return state.inspectedEvidenceIds.includes(id);
      case 'suspect':
        return state.inspectedSuspectIds.includes(id);
      case 'timeline':
        return state.reviewedTimelineIds.includes(id);
      case 'location':
        return state.inspectedLocationIds.includes(id);
    }
  }

  // Active Connections & Tentative String Connections for the Murder Board
  const activeStrings = useMemo(() => {
    const list: Array<{
      id: string;
      fromKind: ConnectionKind;
      fromId: string;
      toKind: ConnectionKind;
      toId: string;
      type: 'validated' | 'hypothesis' | 'tentative';
      label?: string;
    }> = [];

    // Validated and Hypothesis connections
    state.connections.forEach((c) => {
      if (c.status === 'validated' || c.status === 'hypothesis') {
        list.push({
          id: `conn-${c.fromKind}-${c.fromId}-${c.toKind}-${c.toId}`,
          fromKind: c.fromKind,
          fromId: c.fromId,
          toKind: c.toKind,
          toId: c.toId,
          type: c.status,
          label: c.status === 'validated' ? 'تعارض مُثبت' : 'فرضية',
        });
      }
    });

    // Tentative comparison string between Slot A and Slot B
    if (selectedSlotA && selectedSlotB) {
      const exists = list.some(
        (item) =>
          (item.fromKind === selectedSlotA.kind &&
            item.fromId === selectedSlotA.id &&
            item.toKind === selectedSlotB.kind &&
            item.toId === selectedSlotB.id) ||
          (item.fromKind === selectedSlotB.kind &&
            item.fromId === selectedSlotB.id &&
            item.toKind === selectedSlotA.kind &&
            item.toId === selectedSlotA.id)
      );
      if (!exists) {
        list.push({
          id: `tentative-${selectedSlotA.kind}-${selectedSlotA.id}-${selectedSlotB.kind}-${selectedSlotB.id}`,
          fromKind: selectedSlotA.kind,
          fromId: selectedSlotA.id,
          toKind: selectedSlotB.kind,
          toId: selectedSlotB.id,
          type: 'tentative',
          label: 'مقارنة',
        });
      }
    }

    return list;
  }, [state.connections, selectedSlotA, selectedSlotB]);

  return (
    <CaseShell active="investigation">
      <div className="relative min-h-[calc(100dvh-73px)] w-full bg-neutral-950 text-neutral-100 flex flex-col overflow-hidden select-none">
        {/* ========================================================================= */}
        {/* MURDER BOARD HUD TOPBAR                                                   */}
        {/* ========================================================================= */}
        <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 bg-neutral-900/90 px-4 py-3 backdrop-blur-sm sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-mono text-sm font-bold text-amber-400">
              <span className="grid h-7 w-7 place-items-center border border-amber-500/40 bg-amber-500/10 text-xs">
                {activeCase.number}
              </span>
              <span>{activeCase.title}</span>
            </div>
            <span className="hidden sm:inline-block h-3.5 w-px bg-neutral-800" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
              <span className="text-neutral-500">لوحة التحقيق الجنائية</span>
              <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                {pinnedItems.length} عنصر مُثبَّت
              </span>
              {discoveredContradictions.length > 0 && (
                <span className="rounded bg-red-950/60 border border-red-800/50 px-1.5 py-0.5 font-mono text-[10px] text-red-300 flex items-center gap-1">
                  <AlertTriangle size={11} />
                  <span>{discoveredContradictions.length} تناقضات مُثبتة</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle Evidence Tray Button */}
            <button
              type="button"
              onClick={() => {
                playClickSound();
                setIsTrayOpen((prev) => !prev);
              }}
              className={`flex items-center gap-1.5 border px-3 py-1.5 text-xs font-mono transition-colors ${
                isTrayOpen
                  ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                  : 'border-neutral-700 bg-neutral-800/80 text-neutral-300 hover:border-amber-500/60 hover:text-white'
              }`}
              data-testid="button-toggle-tray"
            >
              <Archive size={14} className={isTrayOpen ? 'text-amber-400' : 'text-neutral-400'} />
              <span>حقيبة التحقيق (Dossier Tray)</span>
              <span className="rounded bg-neutral-700/60 px-1 text-[10px] font-mono text-neutral-300">
                {pinnedItems.length}
              </span>
            </button>

            {/* Auto-arrange Board Cards */}
            {pinnedItems.length > 1 && (
              <button
                type="button"
                onClick={handleAutoArrangeCards}
                className="hidden md:flex items-center gap-1 border border-neutral-800 bg-neutral-900/80 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-neutral-700 hover:text-neutral-200 transition-colors"
                title="إعادة ترتيب البطاقات بشكل منظم"
              >
                <Grid size={13} />
                <span>ترتيب تلقائي</span>
              </button>
            )}

            {/* Reset Investigation Button */}
            <button
              type="button"
              onClick={resetInvestigation}
              className="flex items-center gap-1.5 border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-neutral-400 hover:border-red-900/80 hover:text-red-400 transition-colors font-mono"
              data-testid="button-reset-investigation"
              title="إعادة تعيين التحقيق واللوحة"
            >
              <RotateCcw size={13} />
              <span className="hidden sm:inline">إعادة ضبط</span>
            </button>

            {/* Final Accusation Link */}
            <CaseButton
              href={`/accusation/${caseFile.id}`}
              variant="primary"
              className="h-8 px-3.5 text-xs font-semibold"
              testId="link-open-accusation"
              icon={<Scale size={13} />}
            >
              تقديم الاتهام
            </CaseButton>
          </div>
        </header>

        {/* ========================================================================= */}
        {/* MURDER BOARD FREEFORM CANVAS (AREA B)                                     */}
        {/* ========================================================================= */}
        <main
          className="relative flex-1 w-full min-h-[calc(100dvh-130px)] overflow-auto detective-corkboard-canvas select-none shadow-[inset_0_0_120px_rgba(0,0,0,0.95)]"
          dir="ltr"
          data-testid="investigation-board"
        >
          {/* Warm overhead desk lamp pool of light (Vignette) */}
          <div className="pointer-events-none absolute inset-0 desk-vignette opacity-75" />

          {/* Dynamic Red String Physics SVG Layer */}
          <svg className="pointer-events-none absolute inset-0 w-full h-full min-w-[2000px] min-h-[1600px] z-10">
            {activeStrings.map((str) => {
              const cardA = pinnedItems.find((p) => p.kind === str.fromKind && p.id === str.fromId);
              const cardB = pinnedItems.find((p) => p.kind === str.toKind && p.id === str.toId);
              if (!cardA || !cardB) return null;

              const p1 = calculatePinAnchor(cardA.x, cardA.y);
              const p2 = calculatePinAnchor(cardB.x, cardB.y);
              const physics = calculateStringPhysics(p1, p2, str.type);

              return (
                <g key={str.id}>
                  {/* Soft Ground Shadow of Thread */}
                  <path
                    d={physics.shadowPath}
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.45)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                  {/* Physical Thread */}
                  <path
                    d={physics.path}
                    fill="none"
                    stroke={
                      str.type === 'validated'
                        ? '#dc2626'
                        : str.type === 'hypothesis'
                        ? '#f59e0b'
                        : '#fbbf24'
                    }
                    strokeWidth={str.type === 'validated' ? '3' : '2.2'}
                    strokeDasharray={str.type === 'hypothesis' ? '6,4' : str.type === 'tentative' ? '4,4' : undefined}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>

          {/* Empty Canvas Placeholder (Pinned Investigation Memo) */}
          {pinnedItems.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none z-10">
              <div className="warrant-paper max-w-md p-8 shadow-lifted border border-amber-900/40 text-neutral-900 pointer-events-auto relative rounded-xs" dir="rtl">
                {/* 3D Brass Pin holding the memo */}
                <div
                  className="thumbtack-3d-brass absolute pointer-events-none z-30"
                  style={{ top: '-8px', left: '50%', marginLeft: '-8px' }}
                />

                <div className="font-mono text-[10px] tracking-widest text-amber-900 font-bold uppercase mb-2">
                  CID INVESTIGATION MEMORANDUM // مذكرة المحقق
                </div>
                <h2 className="font-display text-xl font-black text-neutral-950 mb-2">
                  لوحة التحقيق الجدارية بانتظار القرائن
                </h2>
                <p className="text-xs leading-6 text-neutral-700 mb-6">
                  لم تقم بتثبيت أي قرائن على لوحة الفلين بعد. افتح «حقيبة التحقيق» لتفحص الأدلة، بطاقات المشتبه بهم، وبرقيات خط الزمن، ثم اضغط «تثبيت بدبوس» لوضعها أمامك وصياغة الفرضيات الجنائية.
                </p>
                <button
                  type="button"
                  onClick={() => setIsTrayOpen(true)}
                  className="inline-flex items-center gap-2 border-2 border-amber-800 bg-amber-900/10 px-5 py-2.5 text-xs font-mono font-bold text-amber-950 hover:bg-amber-900 hover:text-white transition-colors shadow-sm cursor-pointer"
                >
                  <Archive size={15} />
                  <span>فتح حقيبة التحقيق واستعراض الأدلة</span>
                </button>
              </div>
            </div>
          )}

          {/* Render Pinned Draggable Cards */}
          {pinnedItems.map((item) => {
            const isSlotA = selectedSlotA?.kind === item.kind && selectedSlotA?.id === item.id;
            const isSlotB = selectedSlotB?.kind === item.kind && selectedSlotB?.id === item.id;
            const inspected = isItemInspected(item.kind, item.id);

            // Check if involved in validated contradiction
            const isValidated = state.connections.some(
              (c) =>
                c.status === 'validated' &&
                ((c.fromKind === item.kind && c.fromId === item.id) ||
                  (c.toKind === item.kind && c.toId === item.id))
            );

            // Check if involved in pending hypothesis
            const isHypothesis = state.connections.some(
              (c) =>
                c.status === 'hypothesis' &&
                ((c.fromKind === item.kind && c.fromId === item.id) ||
                  (c.toKind === item.kind && c.toId === item.id))
            );

            // Specific data references for detailed rich skeuomorphic rendering
            const suspect = item.kind === 'suspect' ? activeCase.suspects.find((s) => s.id === item.id) : undefined;
            const evidence = item.kind === 'evidence' ? activeCase.evidence.find((e) => e.id === item.id) : undefined;
            const timeline = item.kind === 'timeline' ? activeCase.timeline.find((t) => t.id === item.id) : undefined;
            const location = item.kind === 'location' ? activeCase.locations.find((l) => l.id === item.id) : undefined;
            const isBroken = item.kind === 'suspect' && (state.brokenSuspectIds || []).includes(item.id);
            const isDraggingThis = activeDraggingCard?.kind === item.kind && activeDraggingCard?.id === item.id;

            return (
              <div
                key={`${item.kind}-${item.id}`}
                onPointerDown={(e) => handleCardPointerDown(e, item.kind, item.id, item.x, item.y)}
                onPointerMove={handleCardPointerMove}
                onPointerUp={(e) => handleCardPointerUp(e, item.kind, item.id)}
                style={{
                  position: 'absolute',
                  left: item.x,
                  top: item.y,
                  width: 256,
                  touchAction: 'none',
                }}
                className={`w-64 select-none relative cursor-grab active:cursor-grabbing z-20 ${
                  isDraggingThis ? 'shadow-2xl z-40 scale-[1.02]' : ''
                } ${
                  item.kind === 'suspect'
                    ? 'polaroid-card p-3 shadow-lifted'
                    : item.kind === 'evidence'
                    ? 'manila-evidence-card p-3 shadow-tactile'
                    : item.kind === 'timeline'
                    ? 'timeline-dispatch-card p-3 shadow-tactile'
                    : 'location-blueprint-card p-3 shadow-tactile'
                } ${
                  isSlotA
                    ? 'ring-4 ring-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.6)]'
                    : isSlotB
                    ? 'ring-4 ring-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                    : 'hover:shadow-2xl'
                }`}
                data-testid={`board-card-${item.kind}-${item.id}`}
              >
                {/* 3D Physical Thumbtack Pin at exact top center */}
                <div
                  className={`absolute pointer-events-none z-30 ${
                    item.kind === 'suspect' ? 'thumbtack-3d-red' : 'thumbtack-3d-brass'
                  }`}
                  style={{
                    top: '-8px',
                    left: '128px',
                    marginLeft: '-8px',
                  }}
                />

                <div dir="rtl" className="w-full">
                  {/* Card Top Utility Bar */}
                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-black/10">
                    <div className="font-mono text-[9px] font-black uppercase tracking-wider opacity-75">
                      {item.kind === 'suspect' && 'SUSPECT DOSSIER // مشتبه به'}
                      {item.kind === 'evidence' && 'EVIDENCE // حرز جنائي'}
                      {item.kind === 'timeline' && 'DISPATCH // برقية خط الزمن'}
                      {item.kind === 'location' && 'BLUEPRINT // مسرح مكاني'}
                    </div>

                    {/* Unpin Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        unpinItem(item.kind, item.id);
                      }}
                      className="text-neutral-500 hover:text-red-700 p-0.5 transition-colors cursor-pointer"
                      title="نزع الدبوس من اللوحة"
                      aria-label="نزع الدبوس من اللوحة"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* ── VARIANT 1: POLAROID SUSPECT CARD ── */}
                  {item.kind === 'suspect' && suspect && (
                    <div>
                      <div className="polaroid-photo-viewport h-36 w-full overflow-hidden relative border border-neutral-900/60 rounded-xs mb-2">
                        <img
                          src={suspect.image || `/assets/characters/${suspect.id}.png`}
                          alt={suspect.name}
                          className="w-full h-full object-cover object-top filter contrast-105"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                        <span className="absolute bottom-1.5 right-2 font-mono text-[9px] text-amber-200/95 font-bold bg-black/70 px-1.5 py-0.5 rounded-xs">
                          {suspect.role}
                        </span>
                      </div>

                      <div className="font-serif text-sm font-black text-neutral-900 text-center tracking-tight leading-snug">
                        {suspect.name}
                      </div>
                    </div>
                  )}

                  {/* ── VARIANT 2: MANILA EVIDENCE CARD ── */}
                  {item.kind === 'evidence' && evidence && (
                    <div>
                      {(evidence.imageUrl || evidence.image) && (
                        <div className="h-24 w-full overflow-hidden border border-[#c4b387] bg-[#1a1713] mb-2 rounded-xs relative">
                          <img
                            src={evidence.imageUrl || evidence.image}
                            alt={evidence.label}
                            className="w-full h-full object-cover filter contrast-105"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        </div>
                      )}
                      <div className="font-bold text-xs text-[#281e13] leading-snug line-clamp-2 mb-1">
                        {evidence.label}
                      </div>
                      <div className="text-[10px] text-[#634e30] line-clamp-2 leading-4 mb-2">
                        {evidence.summary}
                      </div>
                    </div>
                  )}

                  {/* ── VARIANT 3: TIMELINE DISPATCH CARD ── */}
                  {item.kind === 'timeline' && timeline && (
                    <div>
                      <div className="flex items-center gap-1 font-mono text-[10px] font-black text-[#855e1b] mb-1">
                        <Clock3 size={12} />
                        <span>{timeline.time}</span>
                      </div>
                      <div className="font-mono text-xs font-bold text-[#2d2110] leading-snug mb-1">
                        {timeline.title}
                      </div>
                      <div className="text-[10px] text-[#554228] line-clamp-2 leading-4 mb-2">
                        {timeline.detail}
                      </div>
                    </div>
                  )}

                  {/* ── VARIANT 4: LOCATION BLUEPRINT CARD ── */}
                  {item.kind === 'location' && location && (
                    <div>
                      <div className="font-bold text-xs text-white leading-snug mb-1">
                        {location.name}
                      </div>
                      <div className="text-[10px] text-cyan-200/80 line-clamp-2 leading-4 mb-2">
                        {location.summary}
                      </div>
                    </div>
                  )}

                  {/* Card Status & Actions Bar */}
                  <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-black/10 text-[10px] font-mono">
                    <div className="flex items-center gap-1 flex-wrap">
                      {isValidated && (
                        <span className="rubber-stamp-verified text-[9px] px-1 py-0.5">
                          مُثبَت
                        </span>
                      )}
                      {isHypothesis && !isValidated && (
                        <span className="rubber-stamp-pending text-[9px] px-1 py-0.5">
                          فرضية
                        </span>
                      )}
                      {isBroken && (
                        <span className="rubber-stamp-verified text-[9px] px-1 py-0.5">
                          مُنْهَار
                        </span>
                      )}
                      {!isValidated && !isHypothesis && (
                        <span className={inspected ? 'text-emerald-700 font-bold' : 'text-neutral-500'}>
                          {inspected ? '✓ مفحوص' : 'غير مفحوص'}
                        </span>
                      )}
                    </div>

                    {/* Inspect Details Action */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInspectItem(item.kind, item.id);
                      }}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xs font-bold transition-colors cursor-pointer ${
                        item.kind === 'location'
                          ? 'text-cyan-300 hover:text-white hover:bg-cyan-900/40'
                          : 'text-neutral-800 hover:text-amber-900 hover:bg-amber-900/10'
                      }`}
                      title="معاينة وفحص"
                    >
                      <Eye size={12} />
                      <span>{item.kind === 'suspect' ? 'استجواب' : 'فحص'}</span>
                    </button>
                  </div>

                  {/* Selection Adhesive Tape Indicators */}
                  {isSlotA && (
                    <div className="mt-2 text-center text-[10px] font-mono font-bold bg-amber-500/30 text-amber-950 border border-amber-600/80 py-0.5 rounded-xs shadow-xs">
                      الطرف الأول للمقارنة ⟵
                    </div>
                  )}
                  {isSlotB && (
                    <div className="mt-2 text-center text-[10px] font-mono font-bold bg-red-600/30 text-red-950 border border-red-600/80 py-0.5 rounded-xs shadow-xs">
                      الطرف الثاني للمقارنة ⟵
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </main>

        {/* ========================================================================= */}
        {/* FLOATING HYPOTHESIS & CONTRADICTION HUD (TWO-CARD COMPARISON)              */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {(selectedSlotA || selectedSlotB) && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-2xl border-2 border-[#b8860b]/70 leather-texture p-4 shadow-[0_15px_45px_rgba(0,0,0,0.95)] rounded-xs text-[#f5ebd7]"
              data-testid="hypothesis-hud"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Comparison Pair Display */}
                <div className="flex items-center gap-2 sm:gap-3 text-xs flex-1 min-w-0">
                  {/* Slot A */}
                  <div className="bg-[#241a12] border border-amber-600/70 p-2.5 rounded-xs flex-1 truncate shadow-inner">
                    <span className="font-mono text-[9px] text-amber-400 block font-bold">
                      الطرف الأول: {selectedSlotA ? kindLabels[selectedSlotA.kind] : '---'}
                    </span>
                    <span className="font-semibold text-amber-100 truncate block text-xs mt-0.5">
                      {selectedSlotA ? getItemTitle(selectedSlotA.kind, selectedSlotA.id) : 'اختر قرينة أولى...'}
                    </span>
                  </div>

                  <span className="font-mono font-black text-amber-400 shrink-0 text-sm px-1">⟷</span>

                  {/* Slot B */}
                  <div className="bg-[#241a12] border border-red-600/70 p-2.5 rounded-xs flex-1 truncate shadow-inner">
                    <span className="font-mono text-[9px] text-red-400 block font-bold">
                      الطرف الثاني: {selectedSlotB ? kindLabels[selectedSlotB.kind] : '---'}
                    </span>
                    <span className="font-semibold text-red-100 truncate block text-xs mt-0.5">
                      {selectedSlotB ? getItemTitle(selectedSlotB.kind, selectedSlotB.id) : 'اختر قرينة ثانية...'}
                    </span>
                  </div>
                </div>

                {/* Explicit Engine Trigger Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {selectedSlotA && selectedSlotB ? (
                    <>
                      {/* Derive Contradiction Engine Button */}
                      <button
                        type="button"
                        onClick={handleDeriveContradiction}
                        className="flex items-center gap-1.5 border-2 border-red-600 bg-red-900 text-white px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xs shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:bg-red-800 transition-all cursor-pointer font-mono"
                        data-testid="button-derive-contradiction"
                      >
                        <Zap size={14} className="text-amber-300" />
                        <span>استنتاج تعارض</span>
                      </button>

                      {/* Record Hypothesis Button */}
                      <button
                        type="button"
                        onClick={handleRecordHypothesis}
                        className="flex items-center gap-1 border border-[#b8860b] bg-[#2a1d12] text-amber-200 px-3.5 py-2 text-xs font-bold rounded-xs hover:bg-[#382718] transition-colors font-mono cursor-pointer"
                        data-testid="button-add-connection"
                        title="تسجيل كفرضية على اللوحة"
                      >
                        <Link2 size={13} />
                        <span>تسجيل فرضية</span>
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] text-[#c9b89d] font-mono">
                      اختر قرينة ثانية لاكتمال المقارنة
                    </span>
                  )}

                  {/* Clear Selection */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSlotA(null);
                      setSelectedSlotB(null);
                    }}
                    className="p-1.5 text-neutral-400 hover:text-white transition-colors"
                    title="إلغاء التحديد"
                    aria-label="إلغاء التحديد"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* DEDUCTION FEEDBACK BANNER                                                 */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {deductionFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center justify-between gap-4 border-2 p-4 shadow-2xl max-w-xl w-[90%] text-xs leading-6 rounded-xs ${
                deductionFeedback.type === 'success'
                  ? 'border-emerald-600 bg-emerald-950/95 text-emerald-100 shadow-[0_0_25px_rgba(16,185,129,0.3)]'
                  : 'border-amber-600 bg-amber-950/95 text-amber-100 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
              }`}
              data-testid="deduction-feedback-banner"
            >
              <div className="flex items-center gap-3">
                {deductionFeedback.type === 'success' ? (
                  <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle size={20} className="shrink-0 text-amber-400" />
                )}
                <div>
                  {deductionFeedback.title && (
                    <div className="font-bold text-sm mb-0.5">{deductionFeedback.title}</div>
                  )}
                  <span>{deductionFeedback.message}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeductionFeedback(null)}
                className="text-neutral-400 hover:text-white transition-colors p-1"
                aria-label="إغلاق التنبيه"
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* AREA A: THE DOSSIER / EVIDENCE TRAY (SKEUOMORPHIC MANILA DRAWER)          */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {isTrayOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsTrayOpen(false)}
                className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs"
              />

              {/* Skeuomorphic Manila / Leather Filing Drawer */}
              <motion.aside
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] border-t-4 border-[#b8860b] leather-texture p-4 sm:p-6 shadow-[0_-20px_50px_rgba(0,0,0,0.95)] flex flex-col"
                data-testid="evidence-tray-panel"
              >
                {/* Brass Archive Drawer Header Plate */}
                <div className="flex items-center justify-between border-b-2 border-[#b8860b]/40 pb-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 place-items-center border-2 border-[#b8860b] bg-[#221810] text-amber-400 shadow-md rounded-xs">
                      <Archive size={20} />
                    </div>
                    <div>
                      <div className="font-mono text-[10px] tracking-widest text-amber-500/90 uppercase font-black">
                        ARCHIVE DRAWER // درج المحرزات الجنائية
                      </div>
                      <h2 className="font-display text-base sm:text-lg font-black text-[#f5ebd7] tracking-tight">
                        حقيبة التحقيق والأدلة (Evidence & Dossier Tray)
                      </h2>
                      <p className="text-[11px] text-[#d1c2a8] leading-5">
                        تصفح وثائق ومحرزات القضية، أو ثبّتها بدبوس على لوحة الفلين لصياغة الفرضيات وربط الخيوط.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTrayOpen(false)}
                    className="grid h-8 w-8 sm:h-9 sm:w-9 place-items-center border border-[#b8860b]/50 bg-[#221810] text-[#f5ebd7] hover:border-amber-400 hover:text-white transition-colors rounded-xs shadow cursor-pointer"
                    aria-label="إغلاق الحقيبة"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Manila Folder Tab Cutouts (Index Tabs) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-3 font-mono text-xs border-b border-[#c8a466]/40">
                  <button
                    type="button"
                    onClick={() => setTrayTab('evidence')}
                    className={`rounded-t-md px-3.5 py-2 font-mono text-xs transition-all flex items-center gap-1.5 -mb-px shrink-0 cursor-pointer ${
                      trayTab === 'evidence'
                        ? 'bg-[#f4ead5] text-[#2c1d0d] font-bold border-t-2 border-x border-[#c8a466] shadow-sm z-10'
                        : 'bg-[#1e1710] text-[#a4917d] border-t border-x border-[#3a2c20] hover:bg-[#2c2218] hover:text-[#d1c2a8]'
                    }`}
                  >
                    <FileSearch size={14} className={trayTab === 'evidence' ? 'text-amber-800' : 'text-neutral-500'} />
                    <span>الأدلة الجنائية</span>
                    <span className="text-[10px] opacity-80">
                      ({state.inspectedEvidenceIds.length}/{activeCase.evidence.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrayTab('suspects')}
                    className={`rounded-t-md px-3.5 py-2 font-mono text-xs transition-all flex items-center gap-1.5 -mb-px shrink-0 cursor-pointer ${
                      trayTab === 'suspects'
                        ? 'bg-[#f4ead5] text-[#2c1d0d] font-bold border-t-2 border-x border-[#c8a466] shadow-sm z-10'
                        : 'bg-[#1e1710] text-[#a4917d] border-t border-x border-[#3a2c20] hover:bg-[#2c2218] hover:text-[#d1c2a8]'
                    }`}
                  >
                    <UsersRound size={14} className={trayTab === 'suspects' ? 'text-amber-800' : 'text-neutral-500'} />
                    <span>المشتبه بهم</span>
                    <span className="text-[10px] opacity-80">
                      ({state.inspectedSuspectIds.length}/{activeCase.suspects.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrayTab('timeline')}
                    className={`rounded-t-md px-3.5 py-2 font-mono text-xs transition-all flex items-center gap-1.5 -mb-px shrink-0 cursor-pointer ${
                      trayTab === 'timeline'
                        ? 'bg-[#f4ead5] text-[#2c1d0d] font-bold border-t-2 border-x border-[#c8a466] shadow-sm z-10'
                        : 'bg-[#1e1710] text-[#a4917d] border-t border-x border-[#3a2c20] hover:bg-[#2c2218] hover:text-[#d1c2a8]'
                    }`}
                  >
                    <Clock3 size={14} className={trayTab === 'timeline' ? 'text-amber-800' : 'text-neutral-500'} />
                    <span>خط الزمن</span>
                    <span className="text-[10px] opacity-80">
                      ({state.reviewedTimelineIds.length}/{activeCase.timeline.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrayTab('locations')}
                    className={`rounded-t-md px-3.5 py-2 font-mono text-xs transition-all flex items-center gap-1.5 -mb-px shrink-0 cursor-pointer ${
                      trayTab === 'locations'
                        ? 'bg-[#f4ead5] text-[#2c1d0d] font-bold border-t-2 border-x border-[#c8a466] shadow-sm z-10'
                        : 'bg-[#1e1710] text-[#a4917d] border-t border-x border-[#3a2c20] hover:bg-[#2c2218] hover:text-[#d1c2a8]'
                    }`}
                  >
                    <MapPin size={14} className={trayTab === 'locations' ? 'text-amber-800' : 'text-neutral-500'} />
                    <span>المواقع والمشاهد</span>
                    <span className="text-[10px] opacity-80">
                      ({state.inspectedLocationIds.length}/{activeCase.locations.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrayTab('contradictions')}
                    className={`rounded-t-md px-3.5 py-2 font-mono text-xs transition-all flex items-center gap-1.5 -mb-px shrink-0 cursor-pointer ${
                      trayTab === 'contradictions'
                        ? 'bg-[#fdf2f2] text-red-950 font-bold border-t-2 border-x border-red-700 shadow-sm z-10'
                        : 'bg-[#1e1710] text-red-400/80 border-t border-x border-[#3a2c20] hover:bg-[#2c2218]'
                    }`}
                  >
                    <AlertTriangle size={14} className={trayTab === 'contradictions' ? 'text-red-700' : 'text-red-500'} />
                    <span>التناقضات المثبتة</span>
                    <span className="text-[10px] opacity-80">
                      ({discoveredContradictions.length})
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTrayTab('notebook')}
                    className={`rounded-t-md px-3.5 py-2 font-mono text-xs transition-all flex items-center gap-1.5 -mb-px shrink-0 cursor-pointer ${
                      trayTab === 'notebook'
                        ? 'bg-[#f4ead5] text-[#2c1d0d] font-bold border-t-2 border-x border-[#c8a466] shadow-sm z-10'
                        : 'bg-[#1e1710] text-[#a4917d] border-t border-x border-[#3a2c20] hover:bg-[#2c2218] hover:text-[#d1c2a8]'
                    }`}
                  >
                    <BookOpen size={14} className={trayTab === 'notebook' ? 'text-amber-800' : 'text-neutral-500'} />
                    <span>مفكرة المحقق</span>
                  </button>
                </div>

                {/* Tactile Filing Drawer Contents */}
                <div className="flex-1 overflow-y-auto max-h-[50dvh] pr-1 bg-[#140f0a]/95 p-4 rounded-sm border border-[#483726] shadow-inner">
                  {/* EVIDENCE TAB */}
                  {trayTab === 'evidence' && (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {activeCase.evidence.map((ev) => {
                        const pinned = isItemPinned('evidence', ev.id);
                        const inspected = state.inspectedEvidenceIds.includes(ev.id);
                        return (
                          <div
                            key={ev.id}
                            className="manila-evidence-card p-3.5 flex flex-col justify-between gap-3 shadow-md border border-[#cfbe96] text-[#241c13] rounded-xs hover:scale-[1.01] transition-transform"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#cfbe96]/60">
                                <span className="font-mono text-[9px] font-black text-[#7a5f33] uppercase">
                                  حرز // {ev.type === 'physical' ? 'أثر مادي' : 'مستند'}
                                </span>
                                {inspected ? (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-800 font-bold">
                                    <Check size={11} />
                                    <span>مفحوص</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-neutral-500">
                                    غير مفحوص
                                  </span>
                                )}
                              </div>
                              {ev.imageUrl && (
                                <div className="h-24 w-full overflow-hidden rounded-xs border border-[#cfbe96] bg-[#1a1713] mb-2 shadow-2xs">
                                  <img
                                    src={ev.imageUrl}
                                    alt={ev.label}
                                    className="w-full h-full object-cover filter contrast-105"
                                  />
                                </div>
                              )}
                              <h3 className="font-bold text-xs text-[#281e13] mb-1 leading-snug">
                                {ev.label}
                              </h3>
                              <p className="text-[11px] text-[#634e30] line-clamp-2 leading-4">
                                {ev.summary}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#cfbe96]/60">
                              <button
                                type="button"
                                onClick={() => handleInspectItem('evidence', ev.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 border border-[#ab956b] bg-[#ede1c6] py-1.5 text-xs font-bold text-[#2a2014] hover:bg-[#f7efe0] transition-colors rounded-xs cursor-pointer shadow-2xs"
                              >
                                <Eye size={13} />
                                <span>فحص مجهري</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePin('evidence', ev.id)}
                                className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors rounded-xs cursor-pointer shadow-2xs ${
                                  pinned
                                    ? 'border-amber-700 bg-amber-600/30 text-amber-950 font-black'
                                    : 'border-[#ab956b] bg-[#ede1c6] text-[#2a2014] hover:bg-[#f7efe0]'
                                }`}
                                title={pinned ? 'نزع الدبوس من اللوحة' : 'تثبيت بدبوس على اللوحة'}
                              >
                                {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SUSPECTS TAB */}
                  {trayTab === 'suspects' && (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {activeCase.suspects.map((s) => {
                        const pinned = isItemPinned('suspect', s.id);
                        const inspected = state.inspectedSuspectIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            className="polaroid-card p-3 flex flex-col justify-between gap-3 shadow-md rounded-xs border border-[#dcd7cb] text-neutral-900 hover:scale-[1.01] transition-transform"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-neutral-300">
                                <span className="font-mono text-[9px] font-black text-neutral-600 uppercase">
                                  ملف // {s.role}
                                </span>
                                {inspected ? (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 font-bold">
                                    <Check size={11} />
                                    <span>مفحوص</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-neutral-500">
                                    غير مفحوص
                                  </span>
                                )}
                              </div>
                              <div className="flex gap-2.5 mb-1.5">
                                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xs border border-neutral-400 bg-neutral-900 shadow-2xs">
                                  <img
                                    src={`/assets/characters/${s.id}.png`}
                                    alt={s.name}
                                    className="w-full h-full object-cover object-top filter contrast-105"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <h3 className="font-serif text-sm font-black text-neutral-950 mb-1 leading-snug">
                                    {s.name}
                                  </h3>
                                  <p className="text-[11px] text-neutral-600 line-clamp-3 leading-4">
                                    {s.knownInformation}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-neutral-300">
                              <button
                                type="button"
                                onClick={() => handleInspectItem('suspect', s.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 border border-neutral-400 bg-white py-1.5 text-xs font-bold text-neutral-900 hover:bg-neutral-100 transition-colors rounded-xs cursor-pointer shadow-2xs"
                              >
                                <Eye size={13} />
                                <span>استجواب</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePin('suspect', s.id)}
                                className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors rounded-xs cursor-pointer shadow-2xs ${
                                  pinned
                                    ? 'border-red-600 bg-red-600/20 text-red-900'
                                    : 'border-neutral-400 bg-white text-neutral-800 hover:bg-neutral-100'
                                }`}
                                title={pinned ? 'نزع الدبوس من اللوحة' : 'تثبيت بدبوس على اللوحة'}
                              >
                                {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TIMELINE TAB */}
                  {trayTab === 'timeline' && (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {activeCase.timeline.map((t) => {
                        const pinned = isItemPinned('timeline', t.id);
                        const reviewed = state.reviewedTimelineIds.includes(t.id);
                        return (
                          <div
                            key={t.id}
                            className="timeline-dispatch-card p-3.5 flex flex-col justify-between gap-3 shadow-md rounded-xs border-dashed border-[#cbb886] text-[#2a1e0d]"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-dashed border-[#cbb886]/70">
                                <span className="font-mono text-xs font-black text-[#855e1b]">
                                  ⏱ {t.time}
                                </span>
                                {reviewed ? (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-800 font-bold">
                                    <Check size={11} />
                                    <span>تمت المراجعة</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-neutral-500">
                                    غير مراجع
                                  </span>
                                )}
                              </div>
                              <h3 className="font-mono text-xs font-bold text-[#2d2110] mb-1">
                                {t.title}
                              </h3>
                              <p className="text-[11px] text-[#554228] line-clamp-2 leading-4">
                                {t.detail}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-[#cbb886]/70">
                              <button
                                type="button"
                                onClick={() => handleInspectItem('timeline', t.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 border border-[#b8a573] bg-[#f5ebd3] py-1.5 text-xs font-bold text-[#2a1e0d] hover:bg-[#fff9eb] transition-colors rounded-xs cursor-pointer shadow-2xs"
                              >
                                <Eye size={13} />
                                <span>مراجعة البرقية</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePin('timeline', t.id)}
                                className={`px-3 py-1.5 text-xs font-mono font-bold border transition-colors rounded-xs cursor-pointer shadow-2xs ${
                                  pinned
                                    ? 'border-amber-700 bg-amber-600/30 text-amber-950'
                                    : 'border-[#b8a573] bg-[#f5ebd3] text-[#2a1e0d] hover:bg-[#fff9eb]'
                                }`}
                                title={pinned ? 'نزع الدبوس من اللوحة' : 'تثبيت بدبوس على اللوحة'}
                              >
                                {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* LOCATIONS TAB */}
                  {trayTab === 'locations' && (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                      {activeCase.locations.map((loc) => {
                        const pinned = isItemPinned('location', loc.id);
                        const inspected = state.inspectedLocationIds.includes(loc.id);
                        return (
                          <div
                            key={loc.id}
                            className="location-blueprint-card p-3.5 flex flex-col justify-between gap-3 shadow-md rounded-xs border border-[#1e3a5f] text-cyan-100"
                          >
                            <div>
                              <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-[#1e3a5f]">
                                <span className="font-mono text-[10px] font-bold text-cyan-300">
                                  BLUEPRINT // {loc.type}
                                </span>
                                {inspected ? (
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold">
                                    <Check size={11} />
                                    <span>مفحوص</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono text-neutral-400">
                                    غير مفحوص
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-xs text-white mb-1">
                                {loc.name}
                              </h3>
                              <p className="text-[11px] text-cyan-200/80 line-clamp-2 leading-4">
                                {loc.summary}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-[#1e3a5f]">
                              <button
                                type="button"
                                onClick={() => handleInspectItem('location', loc.id)}
                                className="flex-1 flex items-center justify-center gap-1.5 border border-cyan-800 bg-cyan-950/80 py-1.5 text-xs text-cyan-200 hover:bg-cyan-900 transition-colors rounded-xs cursor-pointer shadow-2xs"
                              >
                                <Eye size={13} />
                                <span>معاينة المخطط</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => togglePin('location', loc.id)}
                                className={`px-3 py-1.5 text-xs font-mono border transition-colors rounded-xs cursor-pointer shadow-2xs ${
                                  pinned
                                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-300'
                                    : 'border-cyan-800 bg-cyan-950/80 text-cyan-300 hover:bg-cyan-900'
                                }`}
                                title={pinned ? 'نزع الدبوس من اللوحة' : 'تثبيت بدبوس على اللوحة'}
                              >
                                {pinned ? <PinOff size={13} /> : <Pin size={13} />}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* CONTRADICTIONS TAB */}
                  {trayTab === 'contradictions' && (
                    <div className="space-y-3">
                      {discoveredContradictions.length === 0 ? (
                        <div className="border-2 border-dashed border-[#4a3525] bg-[#1e1610] p-8 text-center text-xs text-[#b8a692] rounded-xs">
                          <AlertTriangle size={24} className="mx-auto mb-2 text-amber-600/70" />
                          <p className="font-bold text-amber-200">لم يتم استنباط أي تناقضات جنائية حتى الآن.</p>
                          <p className="mt-1 text-[11px] text-[#9c8976]">
                            قم بربط الأدلة والمشتبه بهم ومحطات الزمن على لوحة التحقيق واضغط «استنتاج تعارض» للكشف عن الثغرات.
                          </p>
                        </div>
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                          {discoveredContradictions.map((c) => (
                            <div
                              key={c.id}
                              className="border-2 border-red-700/60 bg-[#fdf2f2] p-4 font-mono flex flex-col justify-between rounded-xs shadow-md text-red-950"
                            >
                              <div>
                                <div className="flex items-center gap-2 text-xs font-black text-red-900 mb-2">
                                  <AlertTriangle size={15} className="text-red-700 shrink-0" />
                                  <span>{c.title}</span>
                                </div>
                                <p className="text-xs leading-6 text-neutral-800 font-sans">
                                  {c.description}
                                </p>
                              </div>
                              <div className="mt-3 pt-2 border-t border-red-300 text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                                <Check size={12} />
                                <span>مُثبت ومتاح لصياغة الاتهام في مذكرة التوقيف</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* NOTEBOOK TAB */}
                  {trayTab === 'notebook' && (
                    <div className="space-y-4">
                      <div className="bg-[#fdfbf6] p-4 border border-[#d2c9b4] shadow-md rounded-xs">
                        <label htmlFor="detective-notes" className="block text-xs font-mono font-bold text-[#352514] mb-2">
                          مفكرة المحقق الجنائية الخاصة (تُحفظ تلقائياً في السجل)
                        </label>
                        <textarea
                          id="detective-notes"
                          rows={6}
                          value={state.notebook.notes}
                          onChange={(e) =>
                            setState((cur) => ({
                              ...cur,
                              notebook: { ...cur.notebook, notes: e.target.value },
                            }))
                          }
                          placeholder="دوّن استنتاجاتك، شكوكك، والروابط التي تريد تذكرها..."
                          className="w-full border border-[#c4b79c] bg-[#fffefc] p-3 text-xs leading-6 text-neutral-900 placeholder:text-neutral-500 focus:border-amber-800 focus:outline-none font-serif rounded-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* INSPECTION DETAIL DRAWER                                                  */}
        {/* ========================================================================= */}
        <DetailDrawer
          item={selected}
          caseFile={caseFile}
          state={state}
          onClose={() => setSelected(null)}
          isPinned={selected ? isItemPinned(selected && 'discoveredText' in selected ? 'evidence' : 'role' in selected ? 'suspect' : 'time' in selected ? 'timeline' : 'location', selected.id) : false}
          onTogglePin={(item) => {
            const kind: ConnectionKind = 'discoveredText' in item ? 'evidence' : 'role' in item ? 'suspect' : 'time' in item ? 'timeline' : 'location';
            togglePin(kind, item.id);
          }}
          onInspectEvidence={(item) => {
            if (item.hotspots && item.hotspots.length > 0) {
              setActiveVisualEvidence(item);
            } else {
              setState((current) => inspectEvidence(current, item.id));
            }
          }}
          onAddToNotebook={(kind, id) => setState((current) => addToNotebook(current, kind, id))}
          onOpenInterrogation={(suspect) => setActiveInterrogationSuspect(suspect)}
        />

        {/* ========================================================================= */}
        {/* VISUAL EVIDENCE VIEWER (MICROSCOPIC HOTSPOTS)                             */}
        {/* ========================================================================= */}
        {activeVisualEvidence && (
          <EvidenceViewer
            evidenceName={activeVisualEvidence.label}
            imageUrl={activeVisualEvidence.imageUrl || '/images/evidence/door-latch-macro.svg'}
            hotspots={activeVisualEvidence.hotspots || []}
            initialDiscoveredClueIds={state.discoveredHotspotIds || []}
            caseNumber={activeCase.number}
            onClose={() => setActiveVisualEvidence(null)}
            onClueFound={(hotspot) => {
              setState((current) => {
                let next = inspectEvidence(current, activeVisualEvidence.id);
                next = discoverHotspot(next, hotspot.id);
                next = addToNotebook(next, 'clue', `${activeVisualEvidence.id}:${hotspot.id}`);
                return next;
              });
            }}
          />
        )}

        {/* ========================================================================= */}
        {/* INTERROGATION UI                                                          */}
        {/* ========================================================================= */}
        {activeInterrogationSuspect && (
          <InterrogationUI
            suspect={activeInterrogationSuspect}
            caseFile={caseFile}
            state={state}
            onClose={() => setActiveInterrogationSuspect(null)}
            onDeductCredibility={() => setState((cur) => deductCredibility(cur))}
            onSuspectBroken={(suspect, truth) => {
              setState((cur) => {
                let next = breakSuspect(cur, suspect.id);
                if (truth.unlockedClue) {
                  next = addToNotebook(next, 'clue', `confession:${suspect.id}`);
                }
                return next;
              });
            }}
            onResetCredibility={() => setState((cur) => resetCredibility(cur))}
            onUpdateState={(next) => setState(next)}
          />
        )}
      </div>
    </CaseShell>
  );
}
