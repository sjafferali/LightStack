import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'default' | 'primary' | 'danger' | 'ghost'
type ButtonSize = 'small' | 'normal'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'border border-line2 bg-panel text-tx hover:border-accent hover:text-accent',
  primary: 'border border-transparent bg-accent text-white hover:opacity-90',
  danger: 'border border-line2 bg-panel text-tx2 hover:border-p1 hover:text-p1',
  ghost: 'border border-transparent bg-transparent text-tx2 hover:bg-panel2 hover:text-tx',
}

const sizeStyles: Record<ButtonSize, string> = {
  small: 'px-3 py-1.5 text-[12px]',
  normal: 'px-4 py-2.5 text-[13px]',
}

export function Button({
  variant = 'default',
  size = 'normal',
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-45',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
