import clsx from 'clsx'
import type { Mode } from '../hooks/useTheme'

interface ThemeToggleProps {
  mode: Mode
  onToggle: () => void
  className?: string
}

export function ThemeToggle({ mode, onToggle, className }: ThemeToggleProps) {
  const isLight = mode === 'light'

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
      onClick={onToggle}
      className={clsx(
        'relative h-7 w-[50px] shrink-0 rounded-full border border-line2 bg-panel2 transition-colors',
        className,
      )}
    >
      <span
        className={clsx(
          'absolute left-[2px] top-[2px] grid h-[22px] w-[22px] place-items-center rounded-full',
          'bg-tx text-[11px] text-panel transition-transform duration-200',
          isLight && 'translate-x-[22px]',
        )}
      >
        {isLight ? '☀' : '☾'}
      </span>
    </button>
  )
}
