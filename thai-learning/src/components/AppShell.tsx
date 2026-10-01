import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useTimeTracker } from '@/hooks/useProgress'

const tabs = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/today', label: '学ぶ', icon: '📚' },
  { to: '/tones', label: '声調', icon: '🎵' },
  { to: '/phrases', label: 'フレーズ', icon: '💬' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

export function AppShell() {
  const loc = useLocation()
  useTimeTracker(true)
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 hidden border-b border-slate-800 bg-slate-950/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-2">
          <span className="text-sm font-bold tracking-wide text-amber-300">ThaiDash</span>
          <nav className="flex gap-1">
            {tabs.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  cn('rounded-lg px-3 py-1.5 text-sm', isActive ? 'bg-slate-800 text-amber-300' : 'text-slate-300 hover:bg-slate-900')
                }
              >
                {t.icon} {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main key={loc.pathname} className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 md:pb-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-2xl grid-cols-5">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                cn('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-amber-300' : 'text-slate-400')
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
