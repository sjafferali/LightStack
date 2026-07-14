import { ReactNode, useEffect } from 'react'
import clsx from 'clsx'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  /** 'wide' suits forms with a side-by-side preview. */
  size?: 'normal' | 'wide'
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'normal',
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)

    // Keep the page behind the dialog from scrolling under it.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previous
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx(
          'animate-slide-up flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl',
          'border border-line bg-panel shadow-modal',
          size === 'wide' ? 'max-w-[880px]' : 'max-w-[560px]',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
          <div>
            <h2 className="m-0 text-[17px] font-bold tracking-[-0.2px] text-tx">{title}</h2>
            {description && <p className="m-0 mt-1 text-[13px] text-tx2">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-line2 text-tx2 transition-colors hover:border-p1 hover:text-p1"
          >
            ✕
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
