import { Link } from 'react-router-dom'
import { scenes, phrasesByScene } from '@/lib/content'
import { useProgressSummary } from '@/hooks/useProgress'
import { Card, PageTitle, ProgressBar } from '@/components/ui'

export default function Phrases() {
  const { summary } = useProgressSummary()
  const byScene = new Map(summary?.scenes.map((s) => [s.sceneId, s]))
  return (
    <div>
      <PageTitle title="フレーズ学習" subtitle="場面を選ぶ → 音声 → 意味 → 自分で言う → 自己評価" />
      <div className="grid gap-3 sm:grid-cols-2">
        {scenes.map((s) => {
          const p = byScene.get(s.id)
          const total = phrasesByScene.get(s.id)?.length ?? 0
          return (
            <Link key={s.id} to={`/phrases/${s.id}`}>
              <Card className="h-full transition hover:border-amber-500/50">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{s.title}</p>
                    <p className="text-xs text-slate-400">{s.description}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                      <ProgressBar value={p?.introduced ?? 0} max={total} className="flex-1" color="bg-slate-500" />
                      <span className="tabular-nums">
                        {p?.introduced ?? 0}/{total}
                      </span>
                    </div>
                    <ProgressBar value={p?.mastered ?? 0} max={total} className="mt-1" />
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
