import { Link } from 'react-router-dom'
import { scenes, itemsByScene } from '@/lib/content'
import { useProgressSummary } from '@/hooks/useProgress'
import { Card, PageTitle, Pill, ProgressBar } from '@/components/ui'

const KIND_JA = { phrase: 'フレーズ', word: '単語', preposition: '前置詞（図）', root: '語源' }

export default function Vocab() {
  const { summary } = useProgressSummary()
  const byScene = new Map(summary?.scenes.map((s) => [s.sceneId, s]))
  return (
    <div>
      <PageTitle title="語彙・フレーズ" subtitle="テーマを選ぶ → 音声 → 意味 → 自分で言う → 自己評価（SRS）" />
      <div className="grid gap-3 sm:grid-cols-2">
        {scenes.map((s) => {
          const p = byScene.get(s.id)
          const total = itemsByScene.get(s.id)?.length ?? 0
          return (
            <Link key={s.id} to={`/vocab/${s.id}`}>
              <Card className="h-full transition hover:border-amber-500/50">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{s.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">
                      {s.title} <Pill className="ml-1">{KIND_JA[s.kind]}</Pill>
                    </p>
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
