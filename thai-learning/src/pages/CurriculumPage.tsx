import { Link } from 'react-router-dom'
import { curriculum, roleplayById, sceneById } from '@/lib/content'
import { useCards } from '@/hooks/useProgress'
import { dayCompletion } from '@/lib/curriculum'
import { dateKey, formatMD, weekdayJa } from '@/lib/date'
import { Card, PageTitle, Pill, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/cn'

export default function CurriculumPage() {
  const { cards } = useCards()
  const introduced = new Set(cards.map((c) => c.phraseId))
  const today = dateKey()
  return (
    <div>
      <PageTitle title="16 日間カリキュラム" subtitle={`${formatMD(curriculum.startDate)} 開始 → ${formatMD(curriculum.targetDate)} 本番。消化できなかった分は翌日に繰り越し`} />
      <div className="space-y-2">
        {curriculum.days.map((d) => {
          const c = dayCompletion(d, introduced)
          const isToday = d.date === today
          const past = d.date < today
          return (
            <Card key={d.day} className={cn(isToday && 'border-amber-500/70 bg-amber-500/5', past && c.total > 0 && c.done < c.total && 'border-rose-900/60')}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-slate-400">
                    Day {d.day} ・ {formatMD(d.date)}（{weekdayJa(d.date)}）{isToday && <Pill className="ml-2 bg-amber-400 text-slate-950">今日</Pill>}
                  </p>
                  <p className="font-bold">{d.title}</p>
                  <p className="text-xs text-slate-400">{d.focus}</p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {c.total > 0 ? (
                    <span className={cn('tabular-nums', c.done === c.total && 'text-emerald-300')}>
                      {c.done}/{c.total}
                    </span>
                  ) : (
                    <span>復習のみ</span>
                  )}
                </div>
              </div>
              {c.total > 0 && <ProgressBar value={c.done} max={c.total} className="mt-2" color={c.done === c.total ? 'bg-emerald-500' : 'bg-amber-400'} />}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {d.scenes.map((s) => (
                  <Link key={s} to={`/phrases/${s}`}>
                    <Pill>
                      {sceneById.get(s)?.icon} {sceneById.get(s)?.title}
                    </Pill>
                  </Link>
                ))}
                {d.roleplay && (
                  <Link to={`/roleplay/${d.roleplay}`}>
                    <Pill className="bg-sky-900/50 text-sky-200">🎭 {roleplayById.get(d.roleplay)?.title}</Pill>
                  </Link>
                )}
                {d.toneTraining && (
                  <Link to="/tones">
                    <Pill className="bg-emerald-900/50 text-emerald-200">🎵 声調トレーナー</Pill>
                  </Link>
                )}
              </div>
              {d.tips && <p className="mt-2 text-xs text-slate-400">💡 {d.tips}</p>}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
