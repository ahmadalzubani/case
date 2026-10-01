import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpLeft,
  Check,
  ChevronLeft,
  Eye,
  FileSearch,
  FileText,
  Fingerprint,
  LockKeyhole,
  MapPin,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Radio,
  ScanLine,
  Shield,
  Sparkles,
  UserRound,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { playClickSound, playPaperSound } from '@/lib/audio';
import { AudioControl } from './audio-control';
import { DetectiveProfileButton } from './detective-profile-button';
import type {
  CaseFile,
  Evidence,
  Location,
  Suspect,
  TimelineEvent,
} from '@/data/case-data';
import {
  formatEvidenceIndex,
  type ConnectionKind,
  type InvestigationState,
  inspectableKind,
} from '@/lib/case-logic';

type ShellProps = {
  children: ReactNode;
  active?: string;
  minimal?: boolean;
};

export type SelectedItem = Suspect | Location | Evidence | TimelineEvent;

export function CaseLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" onClick={() => playClickSound()} className="group flex items-center gap-2.5 sm:gap-3 shrink-0" data-testid="link-case-logo">
      <span className="relative grid h-9 w-9 sm:h-10 sm:w-10 place-items-center border border-primary/70 bg-primary/10 text-primary shrink-0 transition-colors group-hover:border-primary">
        <ScanLine size={18} strokeWidth={1.4} className="sm:w-5 sm:h-5" />
        <span className="absolute -bottom-1 -left-1 h-1.5 w-1.5 sm:h-2 sm:w-2 bg-primary" />
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-lg sm:text-xl font-bold tracking-[.18em] text-foreground">CASE</span>
          <span className="mt-0.5 hidden sm:block font-mono-case text-[9px] text-muted-foreground">ملفات غير مغلقة</span>
        </span>
      )}
    </Link>
  );
}

export function CaseShell({ children, active = '', minimal = false }: ShellProps) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground" dir="rtl">
      <header className={`relative z-30 border-b border-border/70 ${minimal ? '' : 'bg-background/85 backdrop-blur-md'}`}>
        <div className="mx-auto flex max-w-[1480px] items-center justify-between gap-3 px-3.5 py-3 sm:px-8 sm:py-4 lg:px-12">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-3 sm:gap-6 min-w-0 shrink">
            <CaseLogo />
            {!minimal && (
              <nav className="hidden items-center gap-6 text-[11px] tracking-[.12em] text-muted-foreground md:flex" aria-label="التنقل الرئيسي">
                <Link href="/" onClick={() => playClickSound()} className={`transition-colors hover:text-primary ${active === 'home' ? 'text-primary' : ''}`} data-testid="link-nav-home">الرئيسية</Link>
                <span className="font-mono-case text-[10px] text-muted-foreground/50">LOCAL / 001</span>
              </nav>
            )}
          </div>

          {/* Action Header Controls (Audio, Detective Profile, Return / Safe System Status) */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <AudioControl inline />
            <DetectiveProfileButton inline />

            {minimal ? (
              <Link
                href="/"
                onClick={() => playClickSound()}
                className="flex h-9 sm:h-10 items-center gap-1.5 border border-border/70 bg-card/40 px-2 sm:px-3 text-xs text-muted-foreground transition-all hover:border-primary/50 hover:text-primary"
                data-testid="link-return-home"
              >
                <ArrowLeft size={15} />
                <span className="hidden sm:inline">العودة</span>
              </Link>
            ) : (
              <div className="hidden md:flex items-center gap-2 border border-border/40 bg-card/30 px-2.5 py-1.5 text-[10px] text-muted-foreground">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/.7)]" />
                <span>نظام محلي آمن</span>
              </div>
            )}
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

export function Eyebrow({ children, icon: Icon = FileSearch }: { children: ReactNode; icon?: typeof FileSearch }) {
  return (
    <div className="flex items-center gap-3 font-mono-case text-[10px] text-primary" data-testid="text-eyebrow">
      <Icon size={14} strokeWidth={1.5} />
      <span>{children}</span>
      <span className="h-px w-12 bg-primary/50" />
    </div>
  );
}

export function SectionHeading({ index, title, subtitle, subtitleSuffix }: { index: string; title: string; subtitle?: React.ReactNode; subtitleSuffix?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 border-b border-border/70 pb-3">
      <div>
        <div className="mb-1 font-mono-case text-[9px] text-primary/80" dir="ltr">{index}</div>
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
      </div>
      {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}{subtitleSuffix ? ` ${subtitleSuffix}` : ''}</span>}
    </div>
  );
}

export function CaseButton({
  children,
  onClick,
  href,
  variant = 'primary',
  icon = <ChevronLeft size={17} />,
  testId,
  className = '',
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'quiet';
  icon?: ReactNode;
  testId: string;
  className?: string;
  disabled?: boolean;
}) {
  const classes = `group inline-flex items-center justify-center gap-3 px-5 py-3 text-xs font-semibold transition-all duration-300 ${
    disabled
      ? 'opacity-50 cursor-not-allowed pointer-events-none'
      : variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_8px_26px_hsl(var(--primary)/.13)]'
      : 'border border-border bg-card/40 text-foreground hover:border-primary/60 hover:text-primary'
  } ${className}`;
  if (href) {
    return (
      <Link
        href={href}
        onClick={() => {
          if (disabled) return;
          playClickSound();
        }}
        className={classes}
        data-testid={testId}
      >
        {children}
        {icon}
      </Link>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        playClickSound();
        onClick?.();
      }}
      className={classes}
      data-testid={testId}
    >
      {children}
      {icon}
    </button>
  );
}

export function DataChip({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-2 border-r border-border pr-4 first:border-0 first:pr-0" data-testid={`chip-${label}`}>
      <Icon size={14} className="text-primary" strokeWidth={1.5} />
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <strong className="font-mono-case text-xs font-medium text-foreground">{value}</strong>
    </div>
  );
}

type DetailDrawerProps = {
  item: SelectedItem | null;
  caseFile: CaseFile;
  state: InvestigationState;
  onClose: () => void;
  onInspectEvidence: (item: Evidence) => void;
  onAddToNotebook: (kind: ConnectionKind | 'clue' | 'contradiction', id: string) => void;
  onOpenInterrogation?: (suspect: Suspect) => void;
  isPinned?: boolean;
  onTogglePin?: (item: SelectedItem) => void;
};

export function DetailDrawer({
  item,
  caseFile,
  state,
  onClose,
  onInspectEvidence,
  onAddToNotebook,
  onOpenInterrogation,
  isPinned = false,
  onTogglePin,
}: DetailDrawerProps) {
  useEffect(() => {
    if (item) {
      playPaperSound();
    }
  }, [item?.id]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  const inspected = item && 'discoveredText' in item
    ? state.inspectedEvidenceIds.includes(item.id)
    : true;
  const saved = item
      ? 'discoveredText' in item
      ? state.notebook.evidenceIds.includes(item.id)
      : 'role' in item
        ? state.notebook.suspectIds.includes(item.id)
        : 'time' in item
          ? state.notebook.timelineIds.includes(item.id)
          : false
    : false;

  return (
    <AnimatePresence>
      {item && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px]"
            aria-hidden="true"
          />
          <motion.aside
            initial={{ opacity: 0, x: -32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -32 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-y-0 left-0 z-50 w-full max-w-md h-full flex flex-col border-r-2 border-[#b59a6d] manila-texture text-[#1e150b] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden"
            dir="rtl"
            aria-label="تفاصيل العنصر"
            data-testid="panel-detail-drawer"
          >
            {/* FIXED HEADER (Never shrinks, never overlaps content) */}
            <div className="shrink-0 px-6 pt-5 pb-4 border-b-2 border-[#cbb793] bg-[#f0e3ca]/95 backdrop-blur-sm shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 font-mono-case text-[10px] font-bold uppercase tracking-wider text-[#855e1b]">
                    {inspectableKind(item)} // تفاصيل الملف الجنائي
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-black text-[#1e150b] leading-tight truncate">
                    {'name' in item ? item.name : 'label' in item ? item.label : item.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="shrink-0 grid h-8 w-8 place-items-center border border-[#b8a47e] bg-[#faf4e8] text-[#4a3520] hover:bg-[#e4d4b2] hover:text-[#1e150b] transition-colors rounded-xs cursor-pointer shadow-xs"
                  aria-label="إغلاق"
                  data-testid="button-close-detail"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Pin to Murder Board Action - Cleanly integrated in header */}
              {onTogglePin && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => onTogglePin(item)}
                    className={`flex w-full items-center justify-center gap-2 border-2 px-3.5 py-2 text-xs font-mono font-bold transition-all rounded-xs cursor-pointer ${
                      isPinned
                        ? 'border-red-700/80 bg-red-950/15 text-red-900 hover:bg-red-900/25 shadow-xs'
                        : 'border-[#a8936b] bg-[#f7eedc] text-[#3d2813] hover:bg-[#ebdcc3] hover:border-[#8f7952] shadow-xs'
                    }`}
                    data-testid="button-toggle-pin-drawer"
                  >
                    {isPinned ? (
                      <>
                        <PinOff size={14} className="text-red-700" />
                        <span>مُثبَّت على لوحة التحقيق (انقر لنزع الدبوس)</span>
                      </>
                    ) : (
                      <>
                        <Pin size={14} className="text-[#855e1b]" />
                        <span>📌 تثبيت على لوحة التحقيق (Pin to Board)</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* SCROLLABLE BODY (flex-1 min-h-0 prevents any clipping behind header or viewport edges) */}
            <div className="case-scrollbar flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-6">
              {'role' in item && (
                <div className="space-y-6">
                  {/* Polaroid Dossier Header */}
                  <div className="flex items-center gap-4 border border-[#cbb793] bg-[#faf5eb] p-3.5 relative rounded-xs shadow-xs">
                    <div className="relative h-20 w-16 shrink-0 overflow-hidden border-2 border-[#94784b] bg-[#1a1713] shadow-md rounded-xs">
                      <img
                        src={`/assets/characters/${item.id}.png`}
                        alt={item.name}
                        className="w-full h-full object-cover object-top filter contrast-105"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      <span className="thumbtack-3d-red absolute -top-1 -right-1 z-10 scale-75" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-case text-[10px] font-bold text-[#855e1b]">{item.portrait}</span>
                        {item.suspectType && (
                          <span className="border border-[#8f7447] bg-[#ede0c4] px-2 py-0.5 text-[9px] font-mono font-bold text-[#3d2813] rounded-xs">
                            {item.suspectType}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-[#2b1f13] font-bold">{item.role}</div>
                      <div className="mt-0.5 text-[11px] font-mono-case text-[#634e35]">العمر: {item.age} عاماً</div>
                    </div>
                  </div>

                  {/* Section 1: الإفادة الرسمية */}
                  <div className="border border-[#cfbe9b] bg-[#fbf8f0] p-4 rounded-xs shadow-2xs">
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] font-bold text-[#855e1b]">
                      <FileText size={13} />
                      <span>الإفادة الرسمية الموثقة</span>
                    </div>
                    <blockquote className="text-xs leading-7 text-[#1e150b] border-r-3 border-[#a37930] pr-3 italic bg-[#f3ebd7] p-3 rounded-xs font-serif">
                      «{item.alibi}»
                    </blockquote>
                    <p className="mt-2 text-[11px] leading-6 text-[#57442d]">
                      {item.knownInformation}
                    </p>
                  </div>

                  {/* Section 2: ملاحظات المحقق السلوكية */}
                  <div className="border border-[#cbb793] bg-[#f7eedc] p-4 rounded-xs shadow-2xs">
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] font-bold text-[#7d5018]">
                      <Eye size={13} />
                      <span>ملاحظات المحقق السلوكية ولغة الجسد</span>
                    </div>
                    <p className="text-xs leading-7 text-[#261b10]">
                      {item.behavioralNotes || 'يتحفظ في الردود ويبدو عليه التوتر أثناء التحقيق حول توقيت وقوع الجريمة.'}
                    </p>
                  </div>

                  {/* Section 3: قائمة التناقضات والشكوك المحتملة */}
                  <div className="border-2 border-red-700/60 bg-[#fdf2f2] p-4 rounded-xs shadow-2xs text-red-950">
                    <div className="flex items-center gap-2 mb-2 font-mono text-[10px] font-black text-red-900 flex-wrap">
                      <AlertTriangle size={13} />
                      <span>التناقضات والشكوك المحتملة</span>
                    </div>
                    <p className="text-xs leading-7 text-red-950 font-mono-case">
                      {item.detail}
                    </p>
                  </div>

                  {/* Last Seen */}
                  <div className="border border-[#d6c7a7] bg-[#f5ede0] p-3 flex items-center justify-between rounded-xs shadow-2xs">
                    <span className="text-[10px] text-[#634e35] font-mono">آخر ظهور مسجل رسمياً</span>
                    <span className="font-mono-case text-xs text-[#855e1b] font-bold">{item.lastSeen}</span>
                  </div>

                  {/* Action with Amber Glow */}
                  <div className="pt-2 space-y-2.5">
                    {onOpenInterrogation && (
                      <button
                        type="button"
                        onClick={() => onOpenInterrogation(item)}
                        className="flex w-full items-center justify-center gap-2 border-2 border-red-800 bg-red-900 px-4 py-3 text-xs font-mono font-black text-white hover:bg-red-800 transition-all rounded-xs shadow-[0_4px_14px_rgba(185,28,28,0.35)] cursor-pointer uppercase tracking-wider"
                      >
                        <Zap size={14} className="text-amber-300 animate-pulse" />
                        <span>بدء الاستجواب والمواجهة (Interrogation Duel)</span>
                      </button>
                    )}
                    <NotebookAction saved={saved} onClick={() => onAddToNotebook('suspect', item.id)} />
                  </div>
                </div>
              )}

              {'clue' in item && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border border-[#c9b793] bg-[#efe3cb] p-3 rounded-xs font-mono text-xs font-bold text-[#422e1b]">
                    <div className="flex items-center gap-2">
                      <MapPin size={18} className="text-[#855e1b]" />
                      <span>المسرح المكاني: {item.imageLabel || item.name}</span>
                    </div>
                  </div>
                  <DetailBlock label="طبيعة الموقع">{item.type}</DetailBlock>
                  <DetailBlock label="المشهد">{item.summary}</DetailBlock>
                  <DetailBlock label="ملاحظات">{item.detail}</DetailBlock>
                  <div className="border-r-3 border-[#855e1b] bg-[#f3ebd7] p-4 rounded-xs shadow-2xs">
                    <span className="font-mono text-[10px] font-bold text-[#855e1b]">أثر جدير بالفحص والمتابعة</span>
                    <p className="mt-1 text-xs leading-7 text-[#261b10]">{item.clue}</p>
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-bold text-[#855e1b]">تفاصيل بيئية ومادية</div>
                    <ul className="space-y-2 text-xs leading-6 text-[#3d2b18]">
                      {item.environmentalDetails.map((detail) => (
                        <li key={detail} className="border-r-2 border-[#c4b38d] pr-3 bg-[#faf5eb] p-2 rounded-xs">
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-bold text-[#855e1b]">الأدلة المرتبطة بهذا الموقع</div>
                    <div className="flex flex-wrap gap-2">
                      {item.evidenceIds.map((id) => (
                        <span
                          key={id}
                          className={`border px-2.5 py-1 text-[10px] font-mono rounded-xs ${
                            state.inspectedEvidenceIds.includes(id)
                              ? 'border-emerald-700 bg-emerald-950/10 text-emerald-900 font-bold'
                              : 'border-[#bfae8b] bg-[#faf5eb] text-[#554228]'
                          }`}
                        >
                          {caseFile.evidence.find((evidence) => evidence.id === id)?.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {'discoveredText' in item && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between border border-[#c9b793] bg-[#efe3cb] p-3 rounded-xs font-mono text-xs font-bold text-[#422e1b]">
                    <div className="flex items-center gap-2">
                      <Fingerprint size={22} className="text-[#855e1b]" />
                      <span>نوع الحرز الجنائي: {item.type}</span>
                    </div>
                    <span className="text-[10px] bg-[#dfd0b2] px-2 py-0.5 rounded-xs text-[#2b1f13]">حرز رسمي</span>
                  </div>
                  <DetailBlock label="مكان العثور">{item.foundAt}</DetailBlock>
                  {item.imageUrl && (
                    <div className="polaroid-card p-2 bg-[#fcf9ee] border border-[#d2c3a5] rounded-xs shadow-sm">
                      <div className="h-44 w-full overflow-hidden border border-[#bfae8d] bg-black/10 rounded-xs mb-1.5">
                        <img
                          src={item.imageUrl}
                          alt={item.label}
                          className="w-full h-full object-cover filter contrast-105"
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-[#7a6448] px-1">
                        <span>📷 توثيق فوتوغرافي لمسرح الجريمة</span>
                        <span>{item.foundAt}</span>
                      </div>
                    </div>
                  )}
                  <DetailBlock label="الوصف الفني">{item.summary}</DetailBlock>
                  {!inspected ? (
                    <div className="border-2 border-dashed border-[#b89a69] bg-[#f7eedc] p-5 rounded-xs text-[#382613]">
                      <p className="text-xs leading-7">
                        {item.hotspots && item.hotspots.length > 0
                          ? 'هذا الدليل يتطلب فحصاً مجهرياً دقيقاً بالمنظار الجنائي لكشف الآثار والخدوش الخفية.'
                          : 'الملف الأولي لا يكشف كل شيء. افحص هذا الدليل بحثاً عن تفاصيل قابلة للربط.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => onInspectEvidence(item)}
                        className="mt-4 inline-flex items-center gap-2 border-2 border-[#7a5525] bg-[#3d2510] px-4 py-2.5 text-xs font-mono font-bold text-[#fbf5eb] hover:bg-[#543417] transition-colors rounded-xs shadow-xs cursor-pointer"
                        data-testid="button-inspect-evidence"
                      >
                        {item.hotspots && item.hotspots.length > 0 ? (
                          <>
                            <ScanLine size={15} /> فتح المنظار الجنائي المجهري
                          </>
                        ) : (
                          <>
                            <FileSearch size={15} /> افحص الدليل
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <>
                      {item.hotspots && item.hotspots.length > 0 && (
                        <div className="mb-2">
                          <button
                            type="button"
                            onClick={() => onInspectEvidence(item)}
                            className="flex w-full items-center justify-center gap-2 border-2 border-red-700/80 bg-red-950/15 text-red-900 hover:bg-red-900/25 px-4 py-2.5 text-xs font-mono font-bold rounded-xs transition-colors shadow-xs cursor-pointer"
                          >
                            <ScanLine size={14} className="text-red-700" />
                            <span>إعادة فتح المنظار الجنائي المجهري</span>
                          </button>
                        </div>
                      )}
                      <div className="border-r-3 border-emerald-700 bg-[#edf5ed] p-4 rounded-xs shadow-2xs text-[#133917]">
                        <span className="font-mono text-[10px] font-bold text-emerald-800">معلومة جنائية مكتشفة</span>
                        <p className="mt-1 text-xs leading-7">{item.discoveredText}</p>
                      </div>
                      {item.hotspots && item.hotspots.length > 0 ? (
                        <div>
                          <div className="mb-2 text-[10px] font-mono font-bold text-[#855e1b] flex items-center justify-between">
                            <span>الآثار المجهرية المكتشفة بالمنظار</span>
                            <span className="font-mono-case text-emerald-800 font-bold">
                              {item.hotspots.filter((h) => state.discoveredHotspotIds?.includes(h.id)).length} / {item.hotspots.length}
                            </span>
                          </div>
                          <ul className="space-y-2 text-xs leading-6 text-[#2b1f13]">
                            {item.hotspots.map((h) => {
                              const found = state.discoveredHotspotIds?.includes(h.id);
                              const inNotebook = state.notebook.clueIds.includes(`${item.id}:${h.id}`);
                              return (
                                <li
                                  key={h.id}
                                  className={`flex items-start gap-2 border-r p-3 rounded-xs ${
                                    found
                                      ? 'border-r-3 border-red-700 bg-[#fdf2f2] text-red-950'
                                      : 'border-r-2 border-[#d0c09e] bg-[#f0e4cc] text-[#7a6448] italic'
                                  }`}
                                >
                                  <span className="flex-1">
                                    {found ? (
                                      <>
                                        <strong className="block text-red-800 font-mono text-[11px] mb-0.5">[{h.title || 'أثر ميكانيكي'}]</strong>
                                        {h.clue}
                                      </>
                                    ) : (
                                      'أثر مجهري لم يُكتشف بعد في المنظار (يحتاج تكبير >= 2.0x)'
                                    )}
                                  </span>
                                  {found && (
                                    <button
                                      type="button"
                                      onClick={() => onAddToNotebook('clue', `${item.id}:${h.id}`)}
                                      className={`shrink-0 text-xs font-mono font-bold p-1 rounded-xs cursor-pointer ${
                                        inNotebook ? 'text-emerald-800 bg-emerald-950/10' : 'text-[#855e1b] hover:text-[#3d2813] hover:bg-[#e4d4b2]'
                                      }`}
                                      aria-label={inNotebook ? 'الخيط محفوظ' : 'احفظ الخيط'}
                                    >
                                      {inNotebook ? <Check size={14} /> : <Plus size={14} />}
                                    </button>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : (
                        <div>
                          <div className="mb-2 text-[10px] font-mono font-bold text-[#855e1b]">خيوط قابلة للربط</div>
                          <ul className="space-y-2 text-xs leading-6 text-[#2b1f13]">
                            {item.clues.map((clue, index) => (
                              <li key={clue} className="flex items-start gap-2 border-r-3 border-[#855e1b] bg-[#faf5eb] p-2.5 rounded-xs">
                                <span className="flex-1">{clue}</span>
                                <button
                                  type="button"
                                  onClick={() => onAddToNotebook('clue', `${item.id}:${index}`)}
                                  className={`shrink-0 text-xs font-mono font-bold p-1 rounded-xs cursor-pointer ${
                                    state.notebook.clueIds.includes(`${item.id}:${index}`)
                                      ? 'text-emerald-800 bg-emerald-950/10'
                                      : 'text-[#855e1b] hover:text-[#3d2813] hover:bg-[#e4d4b2]'
                                  }`}
                                  aria-label={state.notebook.clueIds.includes(`${item.id}:${index}`) ? 'الخيط محفوظ' : 'احفظ الخيط'}
                                >
                                  {state.notebook.clueIds.includes(`${item.id}:${index}`) ? <Check size={14} /> : <Plus size={14} />}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <DetailBlock label="العلاقات والصلات الظاهرة">
                        {item.relatedSuspectIds.map((id) => caseFile.suspects.find((suspect) => suspect.id === id)?.name).filter(Boolean).join('، ') || 'لا توجد صلات مسجلة'}
                      </DetailBlock>
                      <NotebookAction saved={saved} onClick={() => onAddToNotebook('evidence', item.id)} />
                    </>
                  )}
                </div>
              )}

              {'time' in item && (
                <div className="space-y-6">
                  <div className="font-mono-case text-4xl font-black text-[#855e1b] tracking-wider bg-[#faf5eb] p-3 border border-[#dbceb4] rounded-xs text-center">
                    {item.time}
                  </div>
                  <DetailBlock label="المسرح والموقع">{item.location}</DetailBlock>
                  <DetailBlock label="الحدث المرصود">{item.title}</DetailBlock>
                  <DetailBlock label="السجل والتفاصيل">{item.detail}</DetailBlock>
                  <div>
                    <div className="mb-2 font-mono text-[10px] font-bold text-[#855e1b]">الأدلة الجنائية المرتبطة بهذا التوقيت</div>
                    <div className="flex flex-wrap gap-2">
                      {item.relatedEvidenceIds.length ? (
                        item.relatedEvidenceIds.map((id) => (
                          <span
                            key={id}
                            className={`border px-2.5 py-1 text-[10px] font-mono rounded-xs ${
                              state.inspectedEvidenceIds.includes(id)
                                ? 'border-emerald-700 bg-emerald-950/10 text-emerald-900 font-bold'
                                : 'border-[#bfae8b] bg-[#faf5eb] text-[#554228]'
                            }`}
                          >
                            {caseFile.evidence.find((evidence) => evidence.id === id)?.label}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-[#7a6448] italic">لا توجد إحالات مباشرة مسجلة</span>
                      )}
                    </div>
                  </div>
                  <NotebookAction saved={saved} onClick={() => onAddToNotebook('timeline', item.id)} />
                </div>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function NotebookAction({ saved, onClick }: { saved: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saved}
      className={`flex w-full items-center justify-center gap-2 border-2 px-4 py-3 text-xs font-mono font-bold transition-all duration-200 rounded-xs cursor-pointer ${
        saved
          ? 'border-emerald-800/60 bg-emerald-950/10 text-emerald-900'
          : 'border-[#8f7447] bg-[#ede0c4] text-[#3d2813] hover:bg-[#e4d4b2] hover:border-[#6e5632] shadow-xs'
      }`}
      data-testid="button-add-to-notebook"
    >
      {saved ? <Check size={15} /> : <Plus size={15} />}
      {saved ? 'أُضيف إلى دفتر المحقق' : 'أضف هذا الملف إلى الدفتر'}
    </button>
  );
}

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-[#faf5eb] border border-[#dbceb4] p-3.5 rounded-xs shadow-2xs">
      <div className="mb-1 font-mono-case text-[10px] font-bold uppercase tracking-wider text-[#855e1b]">
        {label}
      </div>
      <p className="text-xs leading-7 text-[#261b10]">{children}</p>
    </div>
  );
}

const suspectRotations = ['rotate-[-0.8deg]', 'rotate-[0.6deg]', 'rotate-[-0.5deg]', 'rotate-[0.7deg]'];

const categoryStyles: Record<string, { badge: string; border: string }> = {
  'شريكة تجارية': { badge: 'bg-card/80 text-muted-foreground border-border/80', border: 'border-border/60' },
  'موظف الاستقبال': { badge: 'bg-card/80 text-muted-foreground border-border/80', border: 'border-border/60' },
  'نزيل مجاور': { badge: 'bg-card/80 text-muted-foreground border-border/80', border: 'border-border/60' },
  'طاقم الخدمة': { badge: 'bg-card/80 text-muted-foreground border-border/80', border: 'border-border/60' },
};

export function SuspectList({ items, selectedId, onSelect, inspectedIds = [] }: { items: Suspect[]; selectedId: string; onSelect: (item: Suspect) => void; inspectedIds?: string[] }) {
  return (
    <div className="space-y-3 pt-1">
      {items.map((item, index) => {
        const rot = suspectRotations[index % suspectRotations.length];
        const cat = categoryStyles[item.suspectType || ''] || {
          badge: 'bg-card text-muted-foreground border-border',
          border: 'border-border/60',
        };
        const isSelected = selectedId === item.id;
        const isInspected = inspectedIds.includes(item.id);

        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item)}
            aria-pressed={isSelected}
            className={`group manila-card relative flex w-full items-center gap-3 p-3.5 text-right transition-all duration-300 ${rot} ${
              isSelected
                ? 'border-primary bg-[hsl(220_22%_14%)] shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
                : 'hover:rotate-0'
            }`}
            data-testid={`button-suspect-${item.id}`}
          >
            {/* Thumbtack Pin on top right */}
            <div className="absolute -top-1.5 right-6 flex items-center justify-center pointer-events-none">
              <span className="thumbtack-pin" />
            </div>

            {/* Polaroid Avatar / Accent */}
            <span
              className={`relative grid h-11 w-11 shrink-0 place-items-center border font-mono-case text-xs font-bold transition-colors ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_10px_hsl(var(--primary)/0.4)]'
                  : 'border-border/80 bg-background/90 text-foreground/80 group-hover:border-primary/60'
              }`}
            >
              {item.accent}
              <span className="absolute -bottom-1 -right-1 h-1.5 w-1.5 bg-primary/80" />
            </span>

            {/* Content */}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 flex-wrap">
                <span className="block truncate text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                  {item.name}
                </span>
                {item.suspectType && (
                  <span className={`border px-1.5 py-0.5 text-[9px] font-mono-case ${cat.badge}`}>
                    {item.suspectType}
                  </span>
                )}
              </span>
              <span className="mt-1 block truncate text-[11px] text-muted-foreground">
                {item.role}
              </span>
            </span>

            {/* Status & Index */}
            <span className="flex flex-col items-end gap-1 shrink-0">
              {isInspected ? (
                <span className="flex items-center gap-1 font-mono-case text-[9px] text-primary">
                  <Check size={12} />
                  <span>مفحوص</span>
                </span>
              ) : (
                <span className="font-mono-case text-[9px] text-muted-foreground/60">
                  غير مفحوص
                </span>
              )}
              <span className="font-mono-case text-[9px] text-muted-foreground/50">
                #0{index + 1}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function LocationList({ items, selectedId, onSelect, inspectedIds = [] }: { items: Location[]; selectedId: string; onSelect: (item: Location) => void; inspectedIds?: string[] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5 pt-1">
      {items.map((item, index) => {
        const isSelected = selectedId === item.id;
        const rot = index % 2 === 0 ? 'rotate-[-0.4deg]' : 'rotate-[0.4deg]';
        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item)}
            aria-pressed={isSelected}
            className={`manila-card relative min-h-[90px] p-3 text-right transition-all duration-300 ${rot} ${
              isSelected ? 'border-primary bg-[hsl(220_22%_14%)] shadow-[0_0_15px_hsl(var(--primary)/0.2)]' : 'hover:rotate-0'
            }`}
            data-testid={`button-location-${item.id}`}
          >
            <div className="absolute -top-1.5 right-4 pointer-events-none">
              <span className="thumbtack-pin" />
            </div>
            <div className="mb-2 flex items-center justify-between">
              <MapPin size={14} className={isSelected ? 'text-primary' : 'text-muted-foreground'} />
              <span className="font-mono-case text-[9px] text-muted-foreground">{item.type}</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs font-semibold text-foreground/90">
              <span>{item.name}</span>
              {inspectedIds.includes(item.id) && <Check size={13} className="shrink-0 text-primary" />}
            </div>
          </button>
        );
      })}
    </div>
  );
}

const evidenceRotations = ['rotate-[0.5deg]', 'rotate-[-0.6deg]', 'rotate-[0.4deg]', 'rotate-[-0.5deg]'];

const evidenceTypeBadges: Record<string, string> = {
  'آلية إغلاق': 'bg-red-950/40 text-red-300 border-red-800/40',
  'أداة جريمة مادية': 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  'أداة ميكانيكية': 'bg-amber-950/40 text-amber-300 border-amber-800/40',
  'سجل رقمي مشفر': 'bg-blue-950/40 text-blue-300 border-blue-800/40',
  'مستند رقمي': 'bg-blue-950/40 text-blue-300 border-blue-800/40',
  'وثيقة مالية': 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40',
  'تسجيل صوتي تجسسي': 'bg-purple-950/40 text-purple-300 border-purple-800/40',
  'سجل إلكتروني': 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40',
};

export function EvidenceList({ items, selectedId, onSelect, inspectedIds = [] }: { items: Evidence[]; selectedId: string; onSelect: (item: Evidence) => void; inspectedIds?: string[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
      {items.map((item, index) => {
        const rot = evidenceRotations[index % evidenceRotations.length];
        const typeBadge = evidenceTypeBadges[item.type] || 'bg-card text-muted-foreground border-border';
        const isSelected = selectedId === item.id;
        const isInspected = inspectedIds.includes(item.id);

        return (
          <button
            type="button"
            key={item.id}
            onClick={() => onSelect(item)}
            aria-pressed={isSelected}
            className={`group manila-card relative flex items-start gap-3 p-3.5 text-right transition-all duration-300 ${rot} ${
              isSelected
                ? 'border-primary bg-[hsl(220_22%_14%)] shadow-[0_0_20px_hsl(var(--primary)/0.2)]'
                : 'hover:rotate-0'
            }`}
            data-testid={`button-evidence-${item.id}`}
          >
            {/* Evidence Tag Pin */}
            <div className="absolute -top-1.5 left-4 flex items-center justify-center pointer-events-none">
              <span className="thumbtack-pin" />
            </div>

            {/* Evidence Index Tag */}
            <span
              className={`grid h-8 w-8 shrink-0 place-items-center border font-mono-case text-[10px] font-bold ${
                isSelected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background/80 text-primary/80'
              }`}
            >
              {formatEvidenceIndex(index)}
            </span>

            {/* Label & Details */}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 flex-wrap">
                <span className="block truncate text-xs font-semibold text-foreground/90 group-hover:text-primary transition-colors">
                  {item.label}
                </span>
              </span>
              <span className="mt-1 flex items-center gap-1.5">
                <span className={`border px-1.5 py-0.2 text-[8px] font-mono-case ${typeBadge}`}>
                  {item.type}
                </span>
                <span className="truncate text-[10px] text-muted-foreground/80">
                  {item.foundAt}
                </span>
              </span>
            </span>

            {/* Inspection Status */}
            <span className="shrink-0 mt-0.5">
              {isInspected ? (
                <Check size={14} className="text-primary" />
              ) : (
                <Fingerprint size={14} className="text-muted-foreground/40 group-hover:text-primary/60" />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function TimelineList({ items, selectedId, onSelect, reviewedIds = [] }: { items: TimelineEvent[]; selectedId: string; onSelect: (item: TimelineEvent) => void; reviewedIds?: string[] }) {
  return (
    <div className="relative space-y-0 pr-5 before:absolute before:right-[5px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
      {items.map((item) => (
        <button type="button" key={item.id} onClick={() => onSelect(item)} aria-pressed={selectedId === item.id} className={`relative flex w-full items-start gap-3 py-3 text-right transition-colors ${selectedId === item.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`} data-testid={`button-timeline-${item.id}`}>
          <span className={`absolute -right-[19px] top-4 h-2.5 w-2.5 rounded-full border-2 border-background ${item.tone === 'important' ? 'bg-primary' : item.tone === 'warning' ? 'bg-accent' : 'bg-muted-foreground'}`} />
          <span className="w-12 shrink-0 font-mono-case text-[10px] text-primary">{item.time}</span>
          <span className="min-w-0 flex-1"><span className="block text-xs font-semibold">{item.title}</span><span className="mt-1 block text-[10px]">{item.location}</span></span>
          {reviewedIds.includes(item.id) && <Check size={13} className="mt-1 text-primary" />}
          {selectedId === item.id && <ArrowUpLeft size={14} className="mt-1 text-primary" />}
        </button>
      ))}
    </div>
  );
}

export function Notebook({
  state,
  caseFile,
  onChange,
  onSelect,
}: {
  state: InvestigationState;
  caseFile: CaseFile;
  onChange: (value: string) => void;
  onSelect: (item: SelectedItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const savedEvidence = caseFile.evidence.filter((item) => state.notebook.evidenceIds.includes(item.id));
  const savedSuspects = caseFile.suspects.filter((item) => state.notebook.suspectIds.includes(item.id));
  const savedTimeline = caseFile.timeline.filter((item) => state.notebook.timelineIds.includes(item.id));
  const savedContradictions = caseFile.contradictions.filter((item) => state.notebook.contradictionIds.includes(item.id));
  const savedClues = caseFile.evidence.flatMap((evidence) => evidence.clues.map((clue, index) => ({ id: `${evidence.id}:${index}`, label: clue }))).filter((clue) => state.notebook.clueIds.includes(clue.id));
  const savedCount = savedEvidence.length + savedSuspects.length + savedTimeline.length + savedContradictions.length + state.notebook.clueIds.length;

  return (
    <div className="border border-border bg-card/50">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between p-4 text-right hover:bg-primary/5" data-testid="button-toggle-notebook">
        <span className="flex items-center gap-2 text-xs font-semibold"><NotebookPen size={15} className="text-primary" /> دفتر المحقق</span>
        <span className="font-mono-case text-[9px] text-muted-foreground">{savedCount ? `${savedCount} محفوظ` : 'فارغ'}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-5 border-t border-border p-4">
              <NotebookSection title="الأدلة" count={savedEvidence.length}>{savedEvidence.map((item) => <NotebookItem key={item.id} label={item.label} onClick={() => onSelect(item)} />)}</NotebookSection>
              <NotebookSection title="خيوط مكتشفة" count={savedClues.length}>{savedClues.map((item) => <NotebookItem key={item.id} label={item.label} />)}</NotebookSection>
              <NotebookSection title="المشتبه بهم" count={savedSuspects.length}>{savedSuspects.map((item) => <NotebookItem key={item.id} label={item.name} onClick={() => onSelect(item)} />)}</NotebookSection>
              <NotebookSection title="التناقضات" count={savedContradictions.length}>{savedContradictions.map((item) => <NotebookItem key={item.id} label={item.title} />)}</NotebookSection>
              <NotebookSection title="خط الزمن" count={savedTimeline.length}>{savedTimeline.map((item) => <NotebookItem key={item.id} label={`${item.time} — ${item.title}`} onClick={() => onSelect(item)} />)}</NotebookSection>
              <div><label htmlFor="investigator-notes" className="mb-2 block text-[10px] text-muted-foreground">ملاحظاتي</label><textarea id="investigator-notes" value={state.notebook.notes} onChange={(event) => onChange(event.target.value)} className="min-h-24 w-full resize-y border border-border bg-transparent p-3 text-xs leading-7 text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary" placeholder="سجّل ملاحظة تربط بين الأدلة..." aria-label="ملاحظات التحقيق" data-testid="textarea-notes" /></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NotebookSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return <div><div className="mb-2 flex items-center justify-between border-b border-border/70 pb-2 text-[10px] text-muted-foreground"><span>{title}</span><span className="font-mono-case">{String(count).padStart(2, '0')}</span></div>{count ? <div className="space-y-1">{children}</div> : <p className="text-[10px] text-muted-foreground/60">لم تتم إضافة عناصر بعد</p>}</div>;
}

function NotebookItem({ label, onClick }: { label: string; onClick?: () => void }) {
  const content = <><span className="truncate">{label}</span><ArrowUpLeft size={12} className="shrink-0 text-primary" /></>;
  return onClick ? <button type="button" onClick={onClick} className="flex w-full items-center justify-between gap-2 py-1 text-right text-[10px] text-foreground/75 hover:text-primary">{content}</button> : <div className="flex items-center justify-between gap-2 py-1 text-[10px] text-foreground/75">{content}</div>;
}

export function InvestigationTopbar() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[10px] text-muted-foreground">
      <span className="flex items-center gap-2"><Radio size={12} className="text-primary" /> اتصال محلي</span>
      <span className="text-border">/</span>
      <span className="flex items-center gap-2"><LockKeyhole size={12} /> مستوى الوصول: محقق</span>
      <span className="text-border">/</span>
      <span className="flex items-center gap-2"><Shield size={12} /> الملف محمي</span>
    </div>
  );
}