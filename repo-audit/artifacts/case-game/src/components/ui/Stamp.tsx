import type { CSSProperties, ReactNode } from 'react';

export type StampProps = {
  children: ReactNode;
  rotate?: number;
  tone?: 'crimson' | 'ink' | 'amber' | 'emerald' | 'gold';
  className?: string;
  animate?: boolean;
};

export function Stamp({
  children,
  rotate = -12,
  tone = 'crimson',
  className = '',
  animate = false,
}: StampProps) {
  const toneClasses = {
    crimson: 'border-red-600 text-red-600 shadow-[0_0_24px_rgba(220,38,38,0.4)]',
    ink: 'border-neutral-800 text-neutral-500',
    amber: 'border-amber-600 text-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
    emerald: 'border-emerald-600 text-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.35)]',
    gold: 'border-yellow-500 text-yellow-400 shadow-[0_0_24px_rgba(234,179,8,0.4)]',
  }[tone];

  return (
    <span
      style={
        {
          '--stamp-rot': `${rotate}deg`,
          transform: `rotate(${rotate}deg)`,
        } as CSSProperties
      }
      className={`inline-block select-none rounded-[3px] border-[3px] px-2.5 py-0.5 font-mono text-xs font-black uppercase tracking-[0.2em] mix-blend-multiply ${toneClasses} ${
        animate ? 'animate-stamp-in' : ''
      } ${className}`}
    >
      <span className="block opacity-90 [mask-image:radial-gradient(circle_at_30%_40%,black_60%,transparent_100%)]">
        {children}
      </span>
    </span>
  );
}
