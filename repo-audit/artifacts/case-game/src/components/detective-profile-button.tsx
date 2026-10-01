import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, ChevronDown } from 'lucide-react';
import { useDetectiveProfile } from '@/lib/profile';
import { playClickSound } from '@/lib/audio';
import { DetectiveProfileModal } from './detective-profile-modal';

export function DetectiveProfileButton({ inline = false }: { inline?: boolean }) {
  const { profile } = useDetectiveProfile();
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    playClickSound();
    setIsOpen(true);
  };

  const buttonClasses = inline
    ? 'relative flex h-9 sm:h-10 shrink-0 items-center justify-center gap-1.5 sm:gap-2 border border-border/80 bg-background/85 px-2 sm:px-3 backdrop-blur-md transition-all duration-300 hover:border-primary/70 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)] text-foreground text-xs'
    : 'fixed top-4 left-16 sm:top-5 sm:left-18 z-50 flex h-9 sm:h-10 shrink-0 items-center justify-center gap-1.5 sm:gap-2 border border-border/80 bg-background/85 px-2 sm:px-3 backdrop-blur-md transition-all duration-300 hover:border-primary/70 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)] text-foreground text-xs';

  return (
    <>
      <motion.button
        type="button"
        onClick={handleClick}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={buttonClasses}
        aria-label="ملف المحقق"
        title={`ملف المحقق: ${profile.name}`}
        data-testid="button-detective-profile"
      >
        <span className="relative flex items-center justify-center text-primary">
          <Shield size={16} strokeWidth={1.7} />
          <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5 sm:h-2 sm:w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-primary" />
          </span>
        </span>

        {/* Text label: hidden on narrow mobile screens, visible on sm+ */}
        <span className="hidden sm:inline-block max-w-[110px] sm:max-w-[150px] truncate font-medium text-[11px] sm:text-xs">
          {profile.name}
        </span>

        <ChevronDown size={13} className="hidden sm:inline-block text-muted-foreground shrink-0" />
      </motion.button>

      <DetectiveProfileModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
