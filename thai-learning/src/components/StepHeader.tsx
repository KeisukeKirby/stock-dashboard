import { ProgressBar } from './ui'

export function StepHeader({ title, index, total, sub }: { title: string; index: number; total: number; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className="text-xs text-slate-400">
          {index + 1} / {total}
        </span>
      </div>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
      <ProgressBar value={index + 1} max={total} className="mt-2" />
    </div>
  )
}
