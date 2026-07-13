import type { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'amber' | 'muted';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-zinc-800 text-zinc-300',
  amber: 'bg-amber-400/15 text-amber-400',
  muted: 'bg-zinc-800 text-zinc-500',
};

export function Badge({ children, tone = 'default' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}
