import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { setActiveMode, useTimeTracker } from '@/hooks/useProgress'
import type { Mode } from '@/lib/types'

const tabs = [
  { to: '/', label: 'ホーム', icon: '🏠' },
  { to: '/today', label: '学ぶ', icon: '📚' },
  { to: '/practice', label: '練習', icon: '🎯' },
  { to: '/plan', label: '計画', icon: '🗺️' },
  { to: '/settings', label: '設定', icon: '⚙️' },
]

const desktopLinks = [
  { to: '/', label: 'ホーム' },
  { to: '/today', label: '今日のメニュー' },
  { to: '/pronunciation', label: '発音' },
  { to: '/vocab', label: '語彙' },
  { to: '/grammar', label: '文法' },
  { to: '/listening', label: 'リスニング' },
  { to: '/speaking', label: 'スピーキング' },
  { to: '/writing', label: 'ライティング' },
  { to: '/plan', label: '計画' },
  { to: '/stats', label: '記録' },
  { to: '/settings', label: '設定' },
]

/** 画面ごとのインプット／アウトプット分類（学習時間の内訳用） */
function modeOf(path: string): Mode | null {
  if (path.startsWith('/speaking') || path.startsWith('/writing') || path.startsWith('/roleplay')) return 'output'
  if (path.startsWith('/today')) return null // Today 側でステップごとに設定
  if (path === '/' || path.startsWith('/settings') || path.startsWith('/stats') || path.startsWith('/plan') || path.startsWith('/practice')) return null
  return 'input'
}

export function AppShell() {
  const loc = useLocation()
  useTimeTracker(true)
  useEffect(() => {
    const m = modeOf(loc.pathname)
    if (!loc.pathname.startsWith('/today')) setActiveMode(m)
  }, [loc.pathname])
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-20 hidden border-b border-slate-800 bg-slate-950/90 backdrop-blur md:block">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-2">
          <NavLink to="/" className="flex items-center gap-2 text-sm font-bold tracking-wide text-amber-300">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-blue-700 text-xs text-amber-300">L</span>
            LingoDash
          </NavLink>
          <nav className="flex flex-wrap justify-end gap-0.5">
            {desktopLinks.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) => cn('rounded-lg px-2.5 py-1.5 text-xs', isActive ? 'bg-slate-800 text-amber-300' : 'text-slate-300 hover:bg-slate-900')}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main key={loc.pathname} className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:pb-10">
        <Outlet />
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="mx-auto grid max-w-3xl grid-cols-5">
          {tabs.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} className={({ isActive }) => cn('flex flex-col items-center gap-0.5 py-2 text-[11px]', isActive ? 'text-amber-300' : 'text-slate-400')}>
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
