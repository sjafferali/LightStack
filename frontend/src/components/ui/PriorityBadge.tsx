import clsx from 'clsx'
import { priorityColor, priorityLabel, priorityTint } from '../../constants/priority'

interface PriorityBadgeProps {
  priority: number
  /** 'compact' drops the label, for tight rows where the number carries it. */
  variant?: 'full' | 'compact'
  className?: string
}

export function PriorityBadge({ priority, variant = 'full', className }: PriorityBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-bold',
        variant === 'full' ? 'px-2.5 py-1 text-[11px]' : 'px-2 py-0.5 text-[11px]',
        className,
      )}
      style={{ background: priorityTint(priority), color: priorityColor(priority) }}
    >
      {variant === 'full' ? `P${priority} · ${priorityLabel(priority)}` : `P${priority}`}
    </span>
  )
}
