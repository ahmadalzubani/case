import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { playDialogueBlipSound } from '@/core/engine.audio';

export interface EmotionToken {
  id: string;
  rawText: string;
  shake: boolean;
  slow: boolean;
  red: boolean;
  impact: boolean;
  startIndex: number;
  endIndex: number;
}

export interface ParsedDialogue {
  tokens: EmotionToken[];
  totalChars: number;
  plainText: string;
}

/**
 * Parses inline emotion tags:
 * [SHAKE]word[/SHAKE] -> Fear/Anger continuous jitter
 * [SLOW]word[/SLOW]   -> Hesitation drastic slowdown
 * [RED]word[/RED]     -> Crimson red text
 * [IMPACT]word[/IMPACT] -> Dramatic scale-up slam & shockwave
 */
export function parseDialogueTags(input: string): ParsedDialogue {
  if (!input) {
    return { tokens: [], totalChars: 0, plainText: '' };
  }

  const tagRegex = /\[(\/?)(SHAKE|SLOW|RED|IMPACT)\]/gi;
  const tokens: EmotionToken[] = [];

  let activeShake = 0;
  let activeSlow = 0;
  let activeRed = 0;
  let activeImpact = 0;

  let lastIndex = 0;
  let runningCharIndex = 0;
  let plainText = '';
  let match: RegExpExecArray | null;

  while ((match = tagRegex.exec(input)) !== null) {
    const textSegment = input.slice(lastIndex, match.index);
    if (textSegment.length > 0) {
      const len = textSegment.length;
      tokens.push({
        id: `tok-${tokens.length}-${runningCharIndex}`,
        rawText: textSegment,
        shake: activeShake > 0,
        slow: activeSlow > 0,
        red: activeRed > 0,
        impact: activeImpact > 0,
        startIndex: runningCharIndex,
        endIndex: runningCharIndex + len,
      });
      runningCharIndex += len;
      plainText += textSegment;
    }

    const isClosing = match[1] === '/';
    const tagName = match[2].toUpperCase();

    if (tagName === 'SHAKE') {
      activeShake = Math.max(0, activeShake + (isClosing ? -1 : 1));
    } else if (tagName === 'SLOW') {
      activeSlow = Math.max(0, activeSlow + (isClosing ? -1 : 1));
    } else if (tagName === 'RED') {
      activeRed = Math.max(0, activeRed + (isClosing ? -1 : 1));
    } else if (tagName === 'IMPACT') {
      activeImpact = Math.max(0, activeImpact + (isClosing ? -1 : 1));
    }

    lastIndex = tagRegex.lastIndex;
  }

  const remaining = input.slice(lastIndex);
  if (remaining.length > 0) {
    const len = remaining.length;
    tokens.push({
      id: `tok-${tokens.length}-${runningCharIndex}`,
      rawText: remaining,
      shake: activeShake > 0,
      slow: activeSlow > 0,
      red: activeRed > 0,
      impact: activeImpact > 0,
      startIndex: runningCharIndex,
      endIndex: runningCharIndex + len,
    });
    runningCharIndex += len;
    plainText += remaining;
  }

  return {
    tokens,
    totalChars: runningCharIndex,
    plainText,
  };
}

export interface TypewriterTextProps {
  text: string;
  speed?: number; // Base speed in ms per character (default 24ms)
  slowSpeed?: number; // Speed when typing inside [SLOW] (default 85ms)
  onComplete?: () => void;
  className?: string;
  disableAudio?: boolean;
  onImpactShake?: () => void;
}

export function TypewriterText({
  text,
  speed = 24,
  slowSpeed = 85,
  onComplete,
  className = '',
  disableAudio = false,
  onImpactShake,
}: TypewriterTextProps) {
  const parsed = useMemo(() => parseDialogueTags(text), [text]);
  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [isImpactShaking, setIsImpactShaking] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isComplete = revealedCount >= parsed.totalChars;

  // Reset revealed count when text changes
  useEffect(() => {
    setRevealedCount(0);
    setIsImpactShaking(false);
  }, [text]);

  // Handle typing progression
  useEffect(() => {
    if (revealedCount >= parsed.totalChars) {
      if (onComplete) onComplete();
      return;
    }

    // Determine current token to check for [SLOW] or [IMPACT]
    const currentToken = parsed.tokens.find(
      (t) => revealedCount >= t.startIndex && revealedCount < t.endIndex
    );

    const isSlow = currentToken?.slow ?? false;
    const isImpactStart = currentToken?.impact && revealedCount === currentToken.startIndex;

    // Trigger impact screen shake when hitting the start of an [IMPACT] token
    if (isImpactStart) {
      setIsImpactShaking(true);
      if (onImpactShake) onImpactShake();
      setTimeout(() => setIsImpactShaking(false), 300);
    }

    const currentDelay = isSlow ? slowSpeed : speed;

    timerRef.current = setTimeout(() => {
      const nextCount = revealedCount + 1;
      setRevealedCount(nextCount);

      // Audio blip every 2-3 characters (avoiding spaces)
      if (!disableAudio && nextCount % 2 === 0) {
        const char = parsed.plainText[revealedCount];
        if (char && char.trim() !== '') {
          playDialogueBlipSound();
        }
      }
    }, currentDelay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [revealedCount, parsed, speed, slowSpeed, disableAudio, onComplete, onImpactShake]);

  // Click to instantly reveal the full text
  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setRevealedCount(parsed.totalChars);
    if (onComplete) onComplete();
  };

  return (
    <motion.div
      onClick={handleSkip}
      animate={
        isImpactShaking
          ? {
              x: [-4, 4, -3, 3, -1, 1, 0],
              y: [-2, 2, -1, 1, 0],
            }
          : { x: 0, y: 0 }
      }
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={`relative select-text cursor-pointer group ${className}`}
      title={isComplete ? undefined : 'انقر للتخطي الفوري (Click to skip)'}
    >
      <span className="leading-relaxed inline">
        {parsed.tokens.map((token) => {
          if (revealedCount <= token.startIndex) {
            return null;
          }

          const visibleLength = Math.min(
            token.rawText.length,
            revealedCount - token.startIndex
          );
          const visibleText = token.rawText.slice(0, visibleLength);

          let tokenElement = <>{visibleText}</>;

          // [RED] effect: Crimson color with subtle noir glow
          if (token.red) {
            tokenElement = (
              <span className="text-red-500 font-semibold drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                {tokenElement}
              </span>
            );
          }

          // [SLOW] effect: Styled letter spacing / distinct hesitation styling
          if (token.slow) {
            tokenElement = (
              <span className="italic tracking-wide text-neutral-300">
                {tokenElement}
              </span>
            );
          }

          // [IMPACT] effect: Slam scale animation
          if (token.impact) {
            tokenElement = (
              <motion.span
                initial={{ scale: 1.5, filter: 'brightness(2)' }}
                animate={{ scale: 1, filter: 'brightness(1)' }}
                transition={{ type: 'spring', stiffness: 500, damping: 14 }}
                className="inline-block font-black text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]"
              >
                {tokenElement}
              </motion.span>
            );
          }

          // [SHAKE] effect: Continuous x/y jitter
          if (token.shake) {
            tokenElement = (
              <motion.span
                animate={{
                  x: [-1.5, 1.5, -2, 2, -1, 1, 0],
                  y: [1, -1.5, 1.5, -1, 2, -2, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 0.16,
                  ease: 'linear',
                }}
                className="inline-block font-bold text-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.4)]"
              >
                {tokenElement}
              </motion.span>
            );
          }

          return (
            <React.Fragment key={token.id}>
              {tokenElement}
            </React.Fragment>
          );
        })}
      </span>

      {/* Blinking Typewriter Cursor */}
      {!isComplete && (
        <span
          className="inline-block w-1.5 h-3.5 bg-red-500 ml-1.5 align-middle animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"
          aria-hidden="true"
        />
      )}

      {/* Fast-forward skip badge hint when typing */}
      {!isComplete && (
        <span className="opacity-0 group-hover:opacity-100 transition-opacity ml-2 text-[10px] font-mono text-neutral-500 border border-neutral-800 bg-black/60 px-1.5 py-0.5 pointer-events-none">
          انقر للإسراع ⏩
        </span>
      )}
    </motion.div>
  );
}
