import { cn } from '@/lib/cn'

export function Tabs<T extends string>({ value, onChange, tabs, className }: { value: T; onChange: (v: T) => void; tabs: [T, string][]; className?: string }) {
  return (
    <div className={cn('mb-4 grid gap-1 rounded-xl bg-slate-900 p-1 text-sm', className)} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
      {tabs.map(([k, label]) => (
        <button key={k} type="button" onClick={() => onChange(k)} className={cn('rounded-lg px-1 py-2', value === k ? 'bg-amber-400 font-semibold text-slate-950' : 'text-slate-300')}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function ChoiceButton({ state, onClick, children, className }: { state: 'idle' | 'correct' | 'wrong' | 'dim'; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border px-4 py-3 text-left text-base transition',
        state === 'idle' && 'border-slate-700 bg-slate-900 hover:bg-slate-800',
        state === 'correct' && 'border-emerald-500 bg-emerald-500/20',
        state === 'wrong' && 'border-rose-500 bg-rose-500/20',
        state === 'dim' && 'border-slate-800 bg-slate-900/40 text-slate-500',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function choiceState(picked: number | null, idx: number, answer: number): 'idle' | 'correct' | 'wrong' | 'dim' {
  if (picked === null) return 'idle'
  if (idx === answer) return 'correct'
  if (idx === picked) return 'wrong'
  return 'dim'
}
