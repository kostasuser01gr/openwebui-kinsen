import type { PropsWithChildren } from 'react';

type AlertTone = 'info' | 'success' | 'warning' | 'danger';

interface AlertProps extends PropsWithChildren {
  tone?: AlertTone;
  className?: string;
}

export function Alert({ tone = 'info', className = '', children }: AlertProps) {
  const merged = ['ui-alert', `ui-alert-${tone}`, className].filter(Boolean).join(' ');
  return <div className={merged}>{children}</div>;
}
