import clsx from 'clsx'

interface StatusIndicatorProps {
  active: boolean
  className?: string
}

export function StatusIndicator({ active, className }: StatusIndicatorProps) {
  return (
    <span
      className={clsx('h-2 w-2 shrink-0 rounded-full', className)}
      style={
        active
          ? {
              background: 'var(--p4)',
              boxShadow: '0 0 0 3px color-mix(in srgb, var(--p4) 25%, transparent)',
            }
          : { background: 'var(--line2)' }
      }
    />
  )
}
