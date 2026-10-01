import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowLeft, Paperclip, ShieldAlert, Sparkles, Folder, CheckCircle } from 'lucide-react';
import { Link } from 'wouter';
import { CaseShell } from '@/components/case-ui';
import { Stamp } from '@/components/ui/Stamp';
import { playClickSound, playPaperSound } from '@/core/engine.audio';

type DeskCase = {
  id: string;
  number: string;
  arabicNumber: string;
  title: string;
  location: string;
  status: 'open' | 'sealed' | 'closed';
  rotate: number;
  teaser: string;
  victim?: string;
  ruling?: string;
  suspectsCount?: number;
  difficulty?: string;
  quote?: string;
  photoUrl?: string;
};

const CASES: DeskCase[] = [
  {
    id: '001',
    number: '001',
    arabicNumber: '٠٠١',
    title: 'الغرفة ٤٠٧ المقفلة',
    location: 'فندق الميريديان · الطابق الرابع',
    status: 'open',
    rotate: -3,
    victim: 'طارق منصور، ٤١ عاماً',
    ruling: 'انتحار',
    suspectsCount: 4,
    difficulty: 'متوسط ●●○',
    quote:
      '«نزيلٌ وُجد ميتاً خلف باب مُغلق من الداخل: المزلاج مقفل والسلسلة مشدودة، والنافذة ملتصقة بإطارها. أُغلق الملف خلال يوم واحد كانتحار، لكن شخصاً ما دفع كي يبقى مغلقاً... وصلك المجلّد عند منتصف الليل.»',
    photoUrl: '/images/room-407.png',
    teaser: 'نزيل وُجد ميتاً خلف باب موصد من الداخل. قضية مشبوهة أُغلقت على عجل.',
  },
  {
    id: '002',
    number: '002',
    arabicNumber: '٠٠٢',
    title: 'دفتر الميناء',
    location: 'رصيف الميناء رقم ٩',
    status: 'sealed',
    rotate: 2.5,
    difficulty: 'متقدم ●●●',
    teaser: 'ثلاثة عمّال، وشحنة مفقودة في منتصف الليل. الحراس صامتون والقيود مشدودة.',
  },
  {
    id: '003',
    number: '003',
    arabicNumber: '٠٠٣',
    title: 'ملف مشطوب',
    location: 'مبنى النيابة العامة',
    status: 'sealed',
    rotate: -1.5,
    difficulty: 'خبير ●●●',
    teaser: 'ملف مشطوب ومختوم بأمر من النيابة. يتطلب تصريحاً أمنياً من الدرجة الثانية.',
  },
  {
    id: '000',
    number: '000',
    arabicNumber: '٠٠٠',
    title: 'الأرملة الزجاجية',
    location: 'البلدة القديمة',
    status: 'closed',
    rotate: 3.5,
    difficulty: 'محلولة ✓',
    teaser: 'أُغلقت القضية واعترفت المشتبه بها في الليلة الثالثة. محفوظة في الأرشيف المركزي.',
  },
];

export default function Home() {
  const [selectedId, setSelectedId] = useState<string>('001');
  const selectedCase = CASES.find((c) => c.id === selectedId) ?? CASES[0];

  const getAssetUrl = (path: string) => {
    const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/$/, '')
      : '';
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  };

  const handleSelectCase = (id: string) => {
    playPaperSound();
    setSelectedId(id);
  };

  return (
    <CaseShell active="home">
      <div className="relative min-h-[calc(100vh-65px)] overflow-hidden leather-texture text-[#e9dfc6] flex flex-col justify-between" dir="rtl">
        {/* Warm Ambient Desk Lamp Lighting & Vignette */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-48 right-1/4 h-[55rem] w-[55rem] rounded-full bg-[radial-gradient(circle,rgba(224,160,67,0.18)_0%,transparent_65%)] animate-flicker"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-36 left-1/4 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,rgba(179,25,44,0.08)_0%,transparent_60%)]"
        />
        <div aria-hidden="true" className="desk-vignette pointer-events-none absolute inset-0" />

        {/* Main Case Desk Content Container */}
        <div className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          {/* Desk Header */}
          <div className="mb-8 sm:mb-12">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-[#e0a043] uppercase mb-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#e0a043] animate-pulse" />
              <span>مكتب المحقق الجنائي · نوفمبر ١٩٩٦ // DESK OF DET. CALLOWAY</span>
            </div>
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-[#f4ead2]">
              اختر ملف <em className="text-[#b3192c] not-italic underline decoration-[#b3192c]/50">القضية</em> القادمة.
            </h1>
          </div>

          {/* Desktop Dual-Area Grid: Folders on one side, Open Dossier on the other */}
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
            {/* The Cases Folders Tray */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[#e9dfc6]/15 pb-2 text-xs font-mono text-[#e9dfc6]/60">
                <span>سجلّ الوكالة · قضايا قيد المتابعة</span>
                <span>٤ ملفات جنائية</span>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3" role="list" aria-label="ملفات القضايا">
                {CASES.map((file) => {
                  const isSelected = file.id === selectedId;

                  return (
                    <li key={file.id}>
                      <button
                        type="button"
                        onClick={() => handleSelectCase(file.id)}
                        aria-pressed={isSelected}
                        style={{
                          transform: `rotate(${file.rotate}deg) translateY(${isSelected ? -8 : 0}px)`,
                        }}
                        className={`group relative block w-full text-right transition-transform duration-300 ease-out focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e0a043] ${
                          isSelected ? 'z-20' : 'z-10'
                        }`}
                        data-testid={`folder-case-${file.id}`}
                      >
                        {/* Folder Manila Tab */}
                        <span
                          aria-hidden="true"
                          className="manila-texture absolute -top-3.5 right-4 h-5 w-24 rounded-t-sm brightness-90 shadow-sm border-t border-r border-black/20"
                        />

                        {/* Folder Main Body */}
                        <div
                          className={`manila-texture relative flex aspect-[4/3] flex-col justify-between rounded-sm p-4 transition-all duration-300 text-black border border-black/25 ${
                            isSelected
                              ? 'shadow-lifted ring-2 ring-[#e0a043]'
                              : 'shadow-tactile group-hover:shadow-lifted'
                          } ${file.status === 'closed' ? 'brightness-75 saturate-50' : ''}`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="font-mono text-[11px] font-bold tracking-wider text-black/75 uppercase">
                              قضية {file.arabicNumber}
                            </span>
                            {file.status === 'sealed' && (
                              <span className="flex items-center gap-1 font-mono text-[10px] text-black/60 bg-black/10 px-1.5 py-0.5 rounded">
                                <Lock size={12} />
                                <span>مقفل</span>
                              </span>
                            )}
                          </div>

                          {/* Paper Label attached to folder */}
                          <div className="paper-texture block -rotate-1 px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.35)] border border-black/15 text-black">
                            <span className="block font-serif text-sm sm:text-base font-bold leading-tight">
                              {file.title}
                            </span>
                            <span className="mt-1 block font-mono text-[10px] tracking-wide text-black/60">
                              {file.location}
                            </span>
                          </div>

                          {/* Stamps on Folders */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-mono text-[9px] text-black/50">
                              {file.status === 'open' ? 'ملف نشط // ACTIVE' : 'محفوظ بالأرشيف'}
                            </span>

                            {file.status === 'open' && (
                              <Stamp rotate={-8} tone="crimson" className="text-[9px]">
                                نشط // OPEN
                              </Stamp>
                            )}
                            {file.status === 'sealed' && (
                              <Stamp rotate={6} tone="ink" className="text-[9px]">
                                مختوم // SEALED
                              </Stamp>
                            )}
                            {file.status === 'closed' && (
                              <Stamp rotate={12} tone="ink" className="text-[9px]">
                                محلولة // SOLVED
                              </Stamp>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* The Open Dossier Section */}
            <div className="relative">
              <AnimatePresence mode="wait">
                <motion.article
                  key={selectedCase.id}
                  initial={{ opacity: 0, y: 15, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -15, scale: 0.98 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  className="manila-texture shadow-lifted relative rotate-[0.5deg] rounded-sm p-3.5 sm:p-5 border border-black/30"
                  aria-label={`دوسيه القضية ${selectedCase.arabicNumber}`}
                >
                  {/* Inside Aged Paper Document */}
                  <div className="paper-texture relative -rotate-[1deg] overflow-hidden p-6 text-black shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)] sm:p-8 border border-black/15">
                    {/* Dossier Header */}
                    <div className="flex items-start justify-between gap-4 border-b-2 border-black/20 pb-4">
                      <div>
                        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-black/60">
                          DOSSIER // ملف القضية {selectedCase.arabicNumber}
                        </p>
                        <h2 className="mt-1 font-serif text-2xl sm:text-4xl font-bold leading-tight text-black">
                          {selectedCase.title}
                        </h2>
                        <p className="font-mono text-xs text-black/70 mt-1">{selectedCase.location}</p>
                      </div>

                      <Stamp rotate={-14} tone={selectedCase.status === 'open' ? 'crimson' : 'ink'} animate className="shrink-0 text-xs sm:text-sm">
                        {selectedCase.status === 'open' ? 'سرّي للغاية' : selectedCase.status === 'closed' ? 'مغلقة' : 'مختوم'}
                      </Stamp>
                    </div>

                    {selectedCase.status === 'open' ? (
                      <div className="mt-6 grid gap-6 sm:grid-cols-[auto_1fr]">
                        {/* Pinned Crime Scene Polaroid with 3D Paperclip */}
                        <figure className="relative w-36 sm:w-44 rotate-[-3deg] self-start bg-[#efe8d8] p-2.5 pb-6 shadow-tactile border border-black/20 mx-auto sm:mx-0">
                          {/* 3D Paperclip effect */}
                          <Paperclip
                            aria-hidden="true"
                            className="absolute -top-3.5 right-6 size-8 rotate-[-15deg] text-zinc-600 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-20"
                          />
                          <div className="relative aspect-square overflow-hidden bg-black border border-black/40">
                            <img
                              src={getAssetUrl(selectedCase.photoUrl || '/images/room-407.png')}
                              alt="مسرح الجريمة - باب الغرفة 407"
                              className="w-full h-full object-cover grayscale contrast-125"
                            />
                            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.7)]" />
                          </div>
                          <figcaption className="mt-2 text-center font-mono text-[10px] font-bold uppercase tracking-widest text-black/75">
                            دليل أ-٠١ // EXHIBIT A
                          </figcaption>
                        </figure>

                        {/* Metadata & Narrative Quote */}
                        <div className="flex flex-col justify-between gap-4">
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs border-b border-dashed border-black/20 pb-3">
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-black/55 font-bold">الضحية (Victim)</dt>
                              <dd className="font-bold text-black text-sm">{selectedCase.victim}</dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-black/55 font-bold">الموقع (Scene)</dt>
                              <dd className="font-bold text-black text-sm">{selectedCase.location}</dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-black/55 font-bold">الحكم الأولي (Ruling)</dt>
                              <dd className="font-bold text-red-700 text-sm flex items-center gap-1">
                                <span>{selectedCase.ruling}</span>
                                <span className="text-[10px] bg-red-100 text-red-800 border border-red-300 px-1 rounded">مشكوك فيه</span>
                              </dd>
                            </div>
                            <div>
                              <dt className="text-[10px] uppercase tracking-wider text-black/55 font-bold">المشتبه بهم (Suspects)</dt>
                              <dd className="font-bold text-black text-sm">{selectedCase.suspectsCount} أشخاص</dd>
                            </div>
                          </dl>

                          <p className="font-serif text-sm sm:text-base italic leading-relaxed text-black/85 text-pretty bg-black/[0.03] p-3 border-r-2 border-[#b3192c]">
                            {selectedCase.quote}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Sealed / Closed Case Description */
                      <div className="mt-6 py-6 text-black/75 space-y-3 font-mono text-xs leading-relaxed">
                        <div className="flex items-center gap-2 text-amber-900 font-bold">
                          <ShieldAlert size={16} />
                          <span>الملف غير متاح حالياً</span>
                        </div>
                        <p>{selectedCase.teaser}</p>
                        <p className="text-[11px] text-black/50 border-t border-black/10 pt-2">
                          أنهِ التحقيق في القضية النشطة (الغرفة ٤٠٧) لكسب التصريح الأمني وفتح هذا المجلد من الأرشيف.
                        </p>
                      </div>
                    )}

                    {/* Dossier Bottom Action Bar */}
                    <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 border-t border-dashed border-black/25 pt-5">
                      <div className="font-mono text-[11px] text-black/60">
                        <span>درجة الصعوبة: </span>
                        <strong className="text-black">{selectedCase.difficulty}</strong>
                      </div>

                      {selectedCase.status === 'open' ? (
                        <Link
                          href={`/case/${selectedCase.id}`}
                          onClick={() => playClickSound()}
                          className="group inline-flex items-center justify-center gap-3 rounded-sm bg-[#0a0908] px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-widest text-[#e9dfc6] shadow-tactile transition-all hover:bg-[#8b1422] hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b3192c]"
                          data-testid="button-open-case-file"
                        >
                          <span>فتح ملف التحقيق</span>
                          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
                        </Link>
                      ) : (
                        <div className="inline-flex items-center gap-2 rounded-sm bg-black/15 px-5 py-3 font-mono text-xs text-black/50 cursor-not-allowed">
                          <Lock size={14} />
                          <span>الملف مختوم</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.article>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Tactical Footer Strip */}
        <div className="relative z-10 border-t border-[#e9dfc6]/10 bg-black/60 backdrop-blur-sm px-4 py-2.5 text-center font-mono text-[10px] text-[#e9dfc6]/40 tracking-wider">
          CASE DISPATCH // ARCHIVE OF UNRESOLVED CLOSED-ROOM MYSTERIES · NOV 1996
        </div>
      </div>
    </CaseShell>
  );
}