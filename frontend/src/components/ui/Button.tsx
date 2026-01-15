import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

type ButtonVariant = 'default' | 'primary' | 'danger' | 'success' | 'ghost'
type ButtonSize = 'small' | 'normal'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  children: ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  default: 'bg-[#2c2c2e] text-white border border-[#3a3a3c]',
  primary: 'bg-[#0a84ff] text-white border-transparent',
  danger: 'bg-[rgba(255,59,48,0.2)] text-[#ff3b30] border border-[rgba(255,59,48,0.3)]',
  success: 'bg-[rgba(52,199,89,0.2)] text-[#34c759] border border-[rgba(52,199,89,0.3)]',
  ghost: 'bg-transparent text-[#8e8e93] border border-transparent',
}

const sizeStyles: Record<ButtonSize, string> = {
  small: 'px-3 py-1.5 text-[11px]',
  normal: 'px-[18px] py-2.5 text-xs',
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
        'inline-flex items-center gap-1.5 rounded-md font-semibold tracking-wide transition-all duration-200',
        'hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50',
        'font-mono',
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
