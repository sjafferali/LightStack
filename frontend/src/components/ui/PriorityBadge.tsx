import { PRIORITY_CONFIG } from '../../types/alert'

interface PriorityBadgeProps {
  priority: number
  size?: 'small' | 'normal'
}

export function PriorityBadge({ priority, size = 'normal' }: PriorityBadgeProps) {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG[3]

  const sizeClasses = size === 'small' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-[11px]'

  return (
    <span
      className={`${sizeClasses} rounded font-mono font-bold uppercase tracking-wide`}
      style={{
        background: config.bg,
        color: config.color,
        border: `1px solid ${config.color}`,
      }}
    >
      P{priority} &middot; {config.label}
    </span>
  )
}
