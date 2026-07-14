import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  /** Drop the padding, for cards holding a full-bleed table or list. */
  noPadding?: boolean
}

export function Card({ children, className, noPadding }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl border border-line bg-panel',
        !noPadding && 'p-5 sm:p-6',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** The small uppercase heading that titles a card. */
export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('eyebrow mb-4 flex items-center justify-between gap-3', className)}>
      {children}
    </div>
  )
}
