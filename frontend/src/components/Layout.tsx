import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import clsx from 'clsx'
import { useTheme } from '../hooks/useTheme'
import { ThemeToggle } from './ThemeToggle'

interface LayoutProps {
  children: ReactNode
}

const NAV = [
  { path: '/', label: 'Dashboard', icon: '◱' },
  { path: '/alerts', label: 'Alerts', icon: '◔' },
  { path: '/simulator', label: 'Simulator', icon: '◈' },
  { path: '/history', label: 'History', icon: '≡' },
]

function Logo() {
  return (
    <div className="flex items-center gap-3 px-2">
      <div className="grid h-9 w-9 place-items-center rounded-[10px] bg-gradient-to-br from-p2 to-p1 text-lg text-white">
        ⚡
      </div>
      <div>
        <b className="block text-[16px] font-bold leading-tight tracking-[-0.2px] text-tx">
          LightStack
        </b>
        <small className="block text-[10.5px] font-semibold tracking-[0.5px] text-tx3">
          ALERT MANAGER
        </small>
      </div>
    </div>
  )
}

export function Layout({ children }: LayoutProps) {
  const { pathname } = useLocation()
  const { mode, toggle } = useTheme()
  const [navOpen, setNavOpen] = useState(false)

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await axios.get('/api/health')
      return data
    },
    refetchInterval: 30000,
  })

  const connected = !!health?.status

  const isActive = (path: string) => (path === '/' ? pathname === '/' : pathname.startsWith(path))

  const nav = (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(item.path)
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setNavOpen(false)}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
              active ? 'text-accent' : 'text-tx2 hover:bg-panel2 hover:text-tx',
            )}
            style={
              active
                ? { background: 'color-mix(in srgb, var(--accent) 16%, transparent)' }
                : undefined
            }
          >
            <span className="w-[18px] text-center opacity-90">{item.icon}</span>
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  const status = (
    <div className="rounded-xl border border-line bg-panel2 p-3">
      <div className="flex items-center gap-2 text-[12px] font-semibold text-tx2">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={
            connected
              ? {
                  background: 'var(--p4)',
                  boxShadow: '0 0 0 3px color-mix(in srgb, var(--p4) 25%, transparent)',
                }
              : { background: 'var(--line2)' }
          }
        />
        {connected ? 'Home Assistant connected' : 'Connecting…'}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[232px_1fr]">
      {/* Sidebar, on wide screens */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-line bg-panel px-4 py-6 lg:flex">
        <div className="pb-6">
          <Logo />
        </div>
        {nav}
        <div className="mt-auto flex flex-col gap-3 pt-6">
          <div className="flex items-center justify-between px-2">
            <span className="text-[12px] font-semibold text-tx2">
              {mode === 'dark' ? 'Dark' : 'Light'}
            </span>
            <ThemeToggle mode={mode} onToggle={toggle} />
          </div>
          {status}
        </div>
      </aside>

      {/* Top bar, on narrow screens */}
      <header className="sticky top-0 z-50 flex items-center gap-3 border-b border-line bg-panel px-4 py-3 lg:hidden">
        <button
          type="button"
          aria-label="Toggle navigation"
          aria-expanded={navOpen}
          onClick={() => setNavOpen((o) => !o)}
          className="grid h-9 w-9 place-items-center rounded-lg border border-line2 text-tx2"
        >
          ☰
        </button>
        <Logo />
        <ThemeToggle mode={mode} onToggle={toggle} className="ml-auto" />
      </header>

      {navOpen && (
        <div className="animate-fade-in border-b border-line bg-panel px-4 py-3 lg:hidden">
          {nav}
          <div className="mt-3">{status}</div>
        </div>
      )}

      <main className="min-w-0 px-5 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  )
}

/** Page heading, used at the top of each route. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="m-0 text-[22px] font-bold tracking-[-0.4px] text-tx">{title}</h1>
        {subtitle && <p className="m-0 mt-0.5 text-[13px] text-tx2">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
