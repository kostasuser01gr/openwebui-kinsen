import type { HTMLAttributes, PropsWithChildren } from 'react';

interface PageShellProps extends PropsWithChildren, HTMLAttributes<HTMLElement> {}

export function PageShell({ className = '', children, ...rest }: PageShellProps) {
  const merged = ['ui-page-shell', className].filter(Boolean).join(' ');
  return (
    <main className={merged} {...rest}>
      {children}
    </main>
  );
}
