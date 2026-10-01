import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  FileWarning,
  Fingerprint,
  Home as HomeIcon,
  ShieldAlert,
  AlertTriangle,
  Clock,
  MapPin,
  User,
  FileText,
} from 'lucide-react';
import { useParams, Link } from 'wouter';
import { CaseButton, CaseShell } from '@/components/case-ui';
import { Stamp } from '@/components/ui/Stamp';
import { getCaseById } from '@/content';
import { playClickSound, playPaperSound } from '@/core/engine.audio';

function CaseNotFound({ caseId }: { caseId?: string }) {
  return (
    <CaseShell minimal>
      <main className="mx-auto max-w-[600px] px-5 py-24 text-center" dir="rtl">
        <div className="manila-texture border border-black/30 p-8 sm:p-12 shadow-lifted">
          <div className="mx-auto grid h-16 w-16 place-items-center border border-black/30 bg-black/10 text-red-700 mb-6">
            <FileWarning size={28} />
          </div>
          <h1 className="font-serif text-2xl font-bold text-black mb-4">ملف غير متوفر</h1>
          <p className="font-mono text-sm leading-8 text-black/70 mb-8">
            عذراً، رقم الملف المطلوب ({caseId ?? '---'}) غير مسجل في أرشيف القضايا الجنائية.
          </p>
          <div className="flex justify-center">
            <CaseButton href="/" testId="link-back-home" icon={<HomeIcon size={15} />}>
              العودة لمكتب القضايا
            </CaseButton>
          </div>
        </div>
      </main>
    </CaseShell>
  );
}

export default function Briefing() {
  const { caseId } = useParams();
  const caseFile = caseId ? getCaseById(caseId) : undefined;
  const [photoError, setPhotoError] = useState<boolean>(false);

  if (!caseFile) {
    return <CaseNotFound caseId={caseId} />;
  }

  const getAssetUrl = (path: string) => {
    const base = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL
      ? import.meta.env.BASE_URL.replace(/\/$/, '')
      : '';
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  };

  return (
    <CaseShell minimal>
      <div className="relative min-h-[calc(100vh-65px)] overflow-hidden bg-[#0a0908] text-[#e9dfc6]" dir="rtl">
        {/* Dark Vignette & Atmospheric Lighting */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(224,160,67,0.08),transparent_55%),radial-gradient(ellipse_at_80%_80%,rgba(179,25,44,0.14),transparent_50%)]"
        />
        <div aria-hidden="true" className="desk-vignette pointer-events-none absolute inset-0" />

        {/* Content Container */}
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-10 lg:py-12">
          {/* Top Bar: Back to Desk & Status */}
          <div className="flex items-center justify-between border-b border-[#e9dfc6]/15 pb-4 mb-8">
            <Link
              href="/"
              onClick={() => playClickSound()}
              className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[#e9dfc6]/60 transition-colors hover:text-[#e0a043]"
              data-testid="link-back-to-desk"
            >
              <ArrowRight className="size-4" />
              <span>العودة إلى مكتب القضايا // BACK TO DESK</span>
            </Link>

            <div className="flex items-center gap-2 text-xs font-mono text-[#e9dfc6]/50">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse" />
              <span>ملف الجريمة · استهلال رسمي</span>
            </div>
          </div>

          {/* Two-Column Responsive Grid */}
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:items-start">
            {/* Left Column: Victim Spotlight */}
            <motion.section
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
              aria-label="صورة وبيانات الضحية"
              className="flex flex-col gap-6"
            >
              <div>
                <p className="font-mono text-xs uppercase tracking-widest text-[#b3192c]">
                  القضية {caseFile.number} // PROLOGUE
                </p>
                <h1 className="mt-2 font-serif text-4xl sm:text-6xl font-black tracking-tight text-[#f4ead2] leading-tight">
                  الرجل في <em className="text-[#e0a043] not-italic">الغرفة ٤٠٧</em>
                </h1>
              </div>

              {/* Large Imposing Victim Portrait with Noir Lighting */}
              <figure className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden rounded-sm bg-black shadow-lifted border border-white/10 group">
                <img
                  src={
                    photoError
                      ? getAssetUrl('/images/victim-tariq.png')
                      : getAssetUrl('/assets/characters/tariq.png')
                  }
                  alt="بورتريه رجل الأعمال الضحية طارق منصور في الغرفة 407"
                  onError={() => setPhotoError(true)}
                  className="w-full h-full object-cover object-top filter contrast-105 group-hover:scale-102 transition-transform duration-500"
                />

                {/* Dark Vignette Overlay fading into darkness at the bottom */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-r from-black/30 via-transparent to-black/30"
                />

                {/* Overlay Text Details on the Portrait */}
                <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7 flex items-end justify-between gap-4">
                  <div>
                    <span className="inline-block border border-red-800/80 bg-red-950/80 px-2 py-0.5 font-mono text-[10px] font-bold text-red-300 uppercase tracking-widest mb-1.5">
                      المتوفى // DECEASED
                    </span>
                    <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white tracking-wide">
                      طارق منصور
                    </h2>
                    <p className="font-mono text-xs text-white/70 mt-1">
                      ٤١ عاماً · رجل أعمال واستيراد · نزيل الغرفة ٤٠٧ بفندق الميريديان
                    </p>
                  </div>
                  <span className="font-mono text-5xl font-black text-white/10 select-none hidden sm:block">
                    41
                  </span>
                </div>
              </figure>

              <figcaption className="text-center sm:text-right font-mono text-[11px] text-[#e9dfc6]/50">
                المتوفى: طارق منصور، ٤١ عاماً — وُجد مقتولاً خلف باب مُغلق بإحكام من الداخل.
              </figcaption>
            </motion.section>

            {/* Right Column: Physical Police Report Document */}
            <motion.section
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.6 }}
              aria-label="التقرير الأولي للشرطة"
              className="flex flex-col gap-8"
            >
              {/* The Paper Document */}
              <article className="paper-texture relative rotate-[0.6deg] p-6 sm:p-9 font-mono text-[13px] leading-relaxed text-black shadow-lifted border border-black/25">
                {/* Translucent Scotch Tape pinned to the top */}
                <span
                  aria-hidden="true"
                  className="absolute -top-3.5 left-1/2 h-7 w-32 -translate-x-1/2 -rotate-2 bg-amber-100/60 shadow-sm border border-amber-300/40 backdrop-blur-[1px] pointer-events-none"
                />

                {/* Document Header */}
                <header className="border-b-2 border-double border-black/40 pb-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-black/60 font-bold">
                    شرطة العاصمة · قسم التحقيقات الجنائية
                  </p>
                  <h2 className="mt-1 text-base sm:text-lg font-black uppercase tracking-wider text-black">
                    نموذج ١١-ب // التقرير الأولي للشرطة
                  </h2>
                  <p className="font-mono text-[11px] text-black/60 mt-0.5">
                    توقيت البلاغ: ٠٣:٤٢ فجراً · ١٤ نوفمبر ١٩٩٦
                  </p>
                </header>

                {/* Official Fields Summary */}
                <dl className="mt-5 grid grid-cols-1 gap-y-1.5 text-xs border-b border-dotted border-black/30 pb-3">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-black/60 font-bold">المتوفى:</dt>
                    <dd className="font-bold text-black">منصور، طارق. ذكر، ٤١ عاماً. نزيل الغرفة ٤٠٧، فندق الميريديان.</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-black/60 font-bold">الموقع:</dt>
                    <dd className="font-bold text-black">فندق الميريديان (السرو) — الطابق الرابع، جناح ٤٠٧.</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-black/60 font-bold">ساعة الاقتحام:</dt>
                    <dd className="font-bold text-black">٠٣:١٢ فجراً بواسطة ضباط الدورية والأمن الفندقي.</dd>
                  </div>
                </dl>

                {/* Incident Narrative with Typewriter Spacing */}
                <div className="mt-5 space-y-3 text-black/90 font-mono text-[12px] sm:text-[13px] leading-relaxed">
                  <p className="font-bold uppercase tracking-wider text-[11px] text-black/70 border-b border-black/15 pb-1">
                    وقائع المعاينة الأولية (Narrative):
                  </p>

                  <p>
                    عثرت عاملة التنظيف على الجثة ممدّدة على الأرض بجانب الكرسي. كان الباب موصداً من الداخل: المزلاج مُقفل والسلسلة مشدودة، والنافذة في الطابق الرابع مطليّة ملتصقة بإطارها ولم تُفتح منذ سنوات. اقتحم الضباط الغرفة عند ٠٣:١٢.
                  </p>

                  <p>
                    لا آثار مقاومة أو كسر عنيف. زجاجة دواء على الطاولة، وكان{' '}
                    <span
                      aria-label="محجوب بأمر النيابة"
                      className="inline-block px-2.5 py-0.5 bg-black text-black select-none font-mono tracking-widest rounded-[1px] shadow-[inset_0_0_4px_rgba(255,255,255,0.2)]"
                    >
                      ██████████
                    </span>{' '}
                    فارغاً. ورسالة غير موقّعة مطروحة قرب السرير.
                  </p>
                </div>

                {/* Conclusion & Suicide Stamp */}
                <div className="relative mt-7 flex items-end justify-between gap-4 border-t-2 border-black/30 pt-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-black/60 font-bold">
                      الخلاصة الرسمية (Determination):
                    </p>
                    <p className="mt-1 text-sm sm:text-base font-black text-black">
                      انتحار. لا يوصى بمتابعة التحقيق الجنائي.
                    </p>
                    <p className="mt-1 text-[11px] text-black/60">
                      أُغلقت القضية بانتظار توقيع تقرير الطب الشرعي النهائي.
                    </p>
                  </div>

                  {/* Massive Angled Crimson SUICIDE Stamp */}
                  <div className="shrink-0 pb-1">
                    <Stamp
                      rotate={-16}
                      tone="crimson"
                      animate
                      className="text-lg sm:text-2xl px-3.5 py-1.5 shadow-[0_0_15px_rgba(220,38,38,0.25)]"
                    >
                      انتحار // SUICIDE
                    </Stamp>
                  </div>
                </div>

                {/* The Detective's Red Handwritten Note in Margin */}
                <div className="mt-6 border-r-4 border-[#b3192c] pr-3 py-1.5 font-serif text-sm sm:text-base italic font-bold text-[#b3192c] bg-[#b3192c]/5 rounded-l">
                  «إذن لماذا أحضرت خدمة الغرف كأسين عند 23:15؟ — المحقق»
                </div>
              </article>

              {/* Action Area: Enter Murder Board */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
                <div className="text-right">
                  <p className="font-serif text-base sm:text-lg italic text-[#f4ead2]/90">
                    كان الباب مقفلاً من الداخل... فمن كان في الغرفة؟
                  </p>
                  <p className="font-mono text-xs text-[#e0a043]">
                    الحكم الأولي خاطئ. مهمتك إثبات ذلك على لوحة الجريمة.
                  </p>
                </div>

                {/* Massive Urgency CTA Button with Heartbeat */}
                <Link
                  href={`/investigation/${caseFile.id}`}
                  onClick={() => playClickSound()}
                  className="animate-heartbeat group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-sm bg-[#b3192c] px-7 py-4 font-mono text-xs sm:text-sm font-bold uppercase tracking-widest text-[#f4ead2] shadow-[0_4px_30px_rgba(179,25,44,0.6)] transition-all hover:bg-[#8b1422] hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e0a043]"
                  data-testid="button-enter-murder-board"
                >
                  <Fingerprint className="size-5 transition-transform group-hover:rotate-12 text-[#f4ead2]" />
                  <span>ادخل لوحة الجريمة</span>
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1.5" />
                </Link>
              </div>
            </motion.section>
          </div>
        </main>
      </div>
    </CaseShell>
  );
}
