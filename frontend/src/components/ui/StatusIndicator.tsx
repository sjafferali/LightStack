import clsx from 'clsx'

interface StatusIndicatorProps {
  active: boolean
}

export function StatusIndicator({ active }: StatusIndicatorProps) {
  return (
    <div
      className={clsx(
        'h-2.5 w-2.5 rounded-full',
        active
          ? 'animate-pulse-glow bg-[#34c759] shadow-[0_0_10px_#34c759,0_0_20px_rgba(52,199,89,0.5)]'
          : 'bg-[#48484a]',
      )}
    />
  )
}
