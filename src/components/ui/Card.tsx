import type { HTMLAttributes, PropsWithChildren } from 'react';

interface CardProps extends PropsWithChildren, HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ className = '', elevated = false, children, ...rest }: CardProps) {
  const merged = ['ui-card', elevated ? 'ui-card-elevated' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={merged} {...rest}>
      {children}
    </div>
  );
}
