import { Volume2, VolumeX } from 'lucide-react';
import { useAudio } from '@/lib/audio';
import { motion } from 'framer-motion';

export function AudioControl({ inline = false }: { inline?: boolean }) {
  const { isPlaying, toggle } = useAudio();

  const buttonClasses = inline
    ? `relative flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center border transition-all duration-300 ${
        isPlaying
          ? 'border-primary/70 bg-card/90 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.25)]'
          : 'border-border/80 bg-background/80 text-muted-foreground hover:border-primary/50 hover:text-foreground'
      } backdrop-blur-md`
    : `fixed top-4 left-4 z-50 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center border transition-all duration-300 sm:top-5 sm:left-6 ${
        isPlaying
          ? 'border-primary/70 bg-card/90 text-primary shadow-[0_0_15px_hsl(var(--primary)/0.25)]'
          : 'border-border/80 bg-background/80 text-muted-foreground hover:border-primary/50 hover:text-foreground'
      } backdrop-blur-md`;

  return (
    <motion.button
      type="button"
      onClick={toggle}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={buttonClasses}
      aria-label={isPlaying ? 'كتم الصوت المحيطي' : 'تشغيل الصوت المحيطي'}
      title={isPlaying ? 'كتم الصوت المحيطي' : 'تشغيل الصوت المحيطي'}
      data-testid="button-toggle-audio"
    >
      <span className="relative flex items-center justify-center">
        {isPlaying ? (
          <>
            <Volume2 size={18} className="transition-transform duration-200" />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </>
        ) : (
          <VolumeX size={18} className="opacity-70" />
        )}
      </span>
    </motion.button>
  );
}
