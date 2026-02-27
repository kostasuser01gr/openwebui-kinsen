import type { PropsWithChildren } from 'react';

type BadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

interface BadgeProps extends PropsWithChildren {
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ tone = 'neutral', className = '', children }: BadgeProps) {
  const merged = ['ui-badge', `ui-badge-${tone}`, className].filter(Boolean).join(' ');
  return <span className={merged}>{children}</span>;
}
