import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BadgeCheck,
  Check,
  Fingerprint,
  RotateCcw,
  Save,
  Shield,
  User,
  X,
  Sparkles,
  HardDrive,
} from 'lucide-react';
import { useDetectiveProfile } from '@/lib/profile';
import { playClickSound } from '@/lib/audio';
import { useToast } from '@/hooks/use-toast';

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function DetectiveProfileModal({ isOpen, onClose }: ModalProps) {
  const { profile, update, resetProgress } = useDetectiveProfile();
  const { toast } = useToast();

  const [name, setName] = useState(profile.name === 'محقق زائر' ? '' : profile.name);
  const [email, setEmail] = useState(profile.email || '');
  const [showConfirmReset, setShowConfirmReset] = useState(false);

  if (!isOpen) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    const trimmedName = name.trim();
    const finalName = trimmedName || 'محقق زائر';
    const isGuest = !trimmedName && !email.trim();

    update({
      name: finalName,
      email: email.trim(),
      isGuest,
    });

    toast({
      title: 'تم حفظ سجل المحقق بنجاح',
      description: isGuest
        ? 'تم تحديث الملف بالوضع الافتراضي (محقق زائر).'
        : `تم اعتماد اسم المحقق: "${finalName}". تم تحديث الشارة في الشريط العلوي.`,
    });
  };

  const handleContinueAsGuest = () => {
    playClickSound();
    setName('');
    setEmail('');
    update({
      name: 'محقق زائر',
      email: '',
      isGuest: true,
    });

    toast({
      title: 'الاستمرار كضيف (Guest Mode)',
      description: 'يتم حفظ جميع الأدلة والروابط تلقائياً في المتصفح دون الحاجة لتسجيل.',
    });
  };

  const handleReset = () => {
    playClickSound();
    resetProgress('001');
    setShowConfirmReset(false);

    toast({
      variant: 'destructive',
      title: 'تمت إعادة ضبط القضية',
      description: 'تم مسح جميع الأدلة المفحوصة والروابط المنشأة للغرفة 407 بنجاح للبدء من جديد.',
    });
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-background/80 backdrop-blur-md"
        />

        {/* Modal Card - Police Badge Style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 14 }}
          transition={{ duration: 0.25 }}
          className="relative w-full max-w-lg overflow-hidden border border-primary/50 bg-[hsl(218_26%_10%)] p-6 sm:p-8 shadow-[0_15px_50px_rgba(0,0,0,0.7)]"
        >
          {/* Top Gold Accent Strip */}
          <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-l from-primary via-primary/70 to-transparent" />

          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/80 pb-5">
            <div className="flex items-center gap-3">
              <span className="relative grid h-12 w-12 place-items-center border border-primary/60 bg-primary/10 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.2)]">
                <Shield size={24} strokeWidth={1.5} />
                <span className="absolute -bottom-1 -left-1 h-2 w-2 bg-primary" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono-case text-[10px] text-primary">
                    BADGE // {profile.badgeNumber}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-border" />
                  <span className="text-[10px] text-muted-foreground font-mono-case">
                    CASE INVESTIGATION
                  </span>
                </div>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                  ملف المحقق الجنائي
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                playClickSound();
                onClose();
              }}
              className="grid h-9 w-9 place-items-center border border-border/80 text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              aria-label="إغلاق النافذة"
              data-testid="button-close-profile-modal"
            >
              <X size={16} />
            </button>
          </div>

          <div className="mt-6 space-y-6">
            {/* Option 1: Guest Mode (Active by Default) */}
            <div
              className={`border p-4 transition-all ${
                profile.isGuest
                  ? 'border-primary/60 bg-primary/5 shadow-[inset_0_0_20px_hsl(var(--primary)/0.05)]'
                  : 'border-border/70 bg-card/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive size={16} className="text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    الخيار الأول: المتابعة كضيف (حفظ تلقائي محلي)
                  </h3>
                </div>
                {profile.isGuest && (
                  <span className="flex items-center gap-1.5 font-mono-case text-[10px] text-primary border border-primary/40 bg-primary/10 px-2 py-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    الوضع النشط
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                يتم حفظ جميع الأدلة المفحوصة، الأحداث، والتناقضات والروابط المنشأة محلياً في متصفحك (localStorage) تلقائياً دون الحاجة لأي تسجيل أو كلمة سر.
              </p>
              {!profile.isGuest && (
                <button
                  type="button"
                  onClick={handleContinueAsGuest}
                  className="mt-3 inline-flex items-center gap-2 text-xs text-primary underline hover:text-primary/80"
                >
                  التحويل للوضع الافتراضي (محقق زائر)
                </button>
              )}
            </div>

            {/* Option 2: Custom Detective Identity */}
            <form onSubmit={handleSaveProfile} className="border border-border/70 bg-card/30 p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  الخيار الثاني: تخصيص هوية المحقق
                </h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                أدخل اسمك أو رمزك المهني ليظهر على الشارة والتقارير الجنائية:
              </p>

              <div className="grid gap-3">
                <div>
                  <label className="block text-[11px] font-mono-case text-muted-foreground mb-1.5">
                    اسم المحقق / اللقب
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="مثال: المحقق عمر / شيرلوك"
                    className="h-10 w-full border border-border bg-background/80 px-3 text-xs text-foreground outline-none transition-colors focus:border-primary"
                    data-testid="input-detective-name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono-case text-muted-foreground mb-1.5">
                    البريد الإلكتروني (اختياري للمزامنة المستقبلية)
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-10 w-full border border-border bg-background/80 px-3 text-xs text-foreground outline-none transition-colors focus:border-primary"
                    data-testid="input-detective-email"
                  />
                </div>

                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-all hover:bg-primary/90"
                    data-testid="button-save-detective-profile"
                  >
                    <Save size={14} />
                    <span>حفظ السجل</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Reset Progress Section */}
            <div className="border-t border-border/70 pt-4">
              {!showConfirmReset ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      إعادة ضبط تقدم القضية
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      مسح حالة الغرفة 407 وإعادة فحص الأدلة من الصفر
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playClickSound();
                      setShowConfirmReset(true);
                    }}
                    className="inline-flex items-center gap-1.5 border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    data-testid="button-trigger-reset-progress"
                  >
                    <RotateCcw size={13} />
                    <span>إعادة ضبط التقدم</span>
                  </button>
                </div>
              ) : (
                <div className="border border-destructive/60 bg-destructive/10 p-3">
                  <div className="text-xs font-semibold text-destructive mb-2">
                    هل أنت متأكد من رغبتك في مسح كل التقدم بالقضية 001؟
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowConfirmReset(false)}
                      className="border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="bg-destructive px-3 py-1 text-xs font-semibold text-destructive-foreground hover:bg-destructive/90"
                      data-testid="button-confirm-reset-progress"
                    >
                      تأكيد المسح والبدء من جديد
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
