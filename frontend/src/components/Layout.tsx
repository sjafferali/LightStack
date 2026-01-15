import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { StatusIndicator } from './ui';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await axios.get('/api/health');
      return data;
    },
    refetchInterval: 30000,
  });

  const tabs = [
    { path: '/', label: 'dashboard' },
    { path: '/alerts', label: 'alerts' },
    { path: '/history', label: 'history' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-[100] border-b border-[#2c2c2e] bg-[rgba(28,28,30,0.8)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#ff9500] to-[#ff3b30] text-xl shadow-[0_4px_20px_rgba(255,149,0,0.3)]">
              &#9889;
            </div>
            <div>
              <h1 className="m-0 text-[22px] font-bold tracking-tight">LightStack</h1>
              <p className="m-0 text-[11px] tracking-wider text-[#8e8e93] font-mono">
                ALERT PRIORITY MANAGER
              </p>
            </div>
          </div>

          <nav className="flex gap-2">
            {tabs.map((tab) => {
              const isActive =
                tab.path === '/' ? currentPath === '/' : currentPath.startsWith(tab.path);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`rounded-lg px-5 py-2.5 text-[13px] font-semibold capitalize transition-all duration-200 ${
                    isActive
                      ? 'border border-[#3a3a3c] bg-[#2c2c2e] text-white'
                      : 'border border-transparent text-[#8e8e93] hover:text-white'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-lg bg-[#2c2c2e] px-4 py-2 text-xs font-mono">
              <StatusIndicator active={!!health?.status} />
              <span className="text-[#8e8e93]">
                {health?.status ? 'HA Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] p-8">{children}</main>
    </div>
  );
}
