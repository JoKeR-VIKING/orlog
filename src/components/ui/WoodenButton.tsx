import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'gold';
  children: ReactNode;
}

export function WoodenButton({ variant = 'default', className = '', children, ...rest }: Props) {
  const v = variant === 'default' ? '' : variant;
  return (
    <button
      {...rest}
      className={`btn-wood ${v} ${className}`.trim()}
    >
      {children}
    </button>
  );
}
