import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'success' | 'warn' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:bg-amber-500',
  secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-600 border border-slate-700',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800/60',
  success: 'bg-emerald-500 text-slate-950 hover:bg-emerald-400',
  warn: 'bg-yellow-500 text-slate-950 hover:bg-yellow-400',
  danger: 'bg-rose-500 text-white hover:bg-rose-400',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 select-none',
        size === 'sm' && 'px-3 py-1.5 text-sm',
        size === 'md' && 'px-4 py-2.5 text-base',
        size === 'lg' && 'px-5 py-3.5 text-lg',
        variants[variant],
        className,
      )}
    />
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-sm', className)}>{children}</div>
}

export function ProgressBar({ value, max, className, color = 'bg-amber-400' }: { value: number; max: number; className?: string; color?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-800', className)}>
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PageTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
  )
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-300', className)}>{children}</span>
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-800 p-6 text-center text-sm text-slate-400">{children}</div>
}
