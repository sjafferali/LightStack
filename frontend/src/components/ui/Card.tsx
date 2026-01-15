import { ReactNode } from 'react';
import clsx from 'clsx';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: string | null;
  noPadding?: boolean;
}

export function Card({ children, className, glow, noPadding }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-[#2c2c2e] bg-[#1c1c1e]',
        !noPadding && 'p-5',
        className
      )}
      style={{ boxShadow: glow || undefined }}
    >
      {children}
    </div>
  );
}
