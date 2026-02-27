import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md';

interface ButtonProps extends PropsWithChildren, ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  className = '',
  variant = 'primary',
  size = 'md',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  const merged = ['ui-button', `ui-button-${variant}`, `ui-button-${size}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={merged} type={type} {...rest}>
      {children}
    </button>
  );
}
