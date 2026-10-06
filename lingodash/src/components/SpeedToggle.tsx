import { useSettings } from '@/hooks/useSettings'
import type { Rate } from '@/lib/types'
import { cn } from '@/lib/cn'

const RATES: Rate[] = [0.7, 0.85, 1.0]

export function SpeedToggle({ className }: { className?: string }) {
  const { settings, update } = useSettings()
  return (
    <div className={cn('inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-xs', className)} role="group" aria-label="再生速度">
      {RATES.map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => void update({ rate: r })}
          className={cn('rounded-md px-2 py-1 font-mono transition', settings.rate === r ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:bg-slate-800')}
        >
          {r === 1 ? '1.0' : r}x
        </button>
      ))}
    </div>
  )
}
