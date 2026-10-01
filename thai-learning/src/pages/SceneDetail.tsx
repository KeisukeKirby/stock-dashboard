import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { phrasesByScene, sceneById } from '@/lib/content'
import { useCards } from '@/hooks/useProgress'
import { PhraseCard } from '@/components/PhraseCard'
import { LearnPhraseFlow } from '@/components/learn/LearnPhraseFlow'
import { Button, Card, Empty, PageTitle, Pill } from '@/components/ui'
import { AudioButton } from '@/components/AudioButton'
import { phraseToItem } from '@/hooks/useAudio'
import { describeInterval } from '@/lib/srs'
import { cn } from '@/lib/cn'

export default function SceneDetail() {
  const { sceneId = '' } = useParams()
  const nav = useNavigate()
  const scene = sceneById.get(sceneId)
  const list = phrasesByScene.get(sceneId) ?? []
  const { cards } = useCards()
  const [open, setOpen] = useState<string | null>(null)
  const [learning, setLearning] = useState<string[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'learned'>('all')

  const cardByPhrase = useMemo(() => {
    const m = new Map<string, { speak?: (typeof cards)[number]; listen?: (typeof cards)[number] }>()
    for (const c of cards) {
      const e = m.get(c.phraseId) ?? {}
      e[c.type] = c
      m.set(c.phraseId, e)
    }
    return m
  }, [cards])

  if (!scene) return <Empty>場面が見つかりません</Empty>

  const unlearned = list.filter((p) => !cardByPhrase.has(p.id)).map((p) => p.id)
  const shown = list.filter((p) => (filter === 'all' ? true : filter === 'new' ? !cardByPhrase.has(p.id) : cardByPhrase.has(p.id)))

  if (learning) {
    return (
      <div>
        <PageTitle title={`${scene.icon} ${scene.title}`} subtitle="新フレーズ学習" right={<Button variant="ghost" size="sm" onClick={() => setLearning(null)}>やめる</Button>} />
        <LearnPhraseFlow phraseIds={learning} onDone={() => setLearning(null)} />
      </div>
    )
  }

  return (
    <div>
      <PageTitle
        title={`${scene.icon} ${scene.title}`}
        subtitle={scene.description}
        right={
          <Link to="/phrases" className="text-xs text-slate-400 underline">
            ← 場面一覧
          </Link>
        }
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            {list.length} フレーズ・未学習 {unlearned.length}
          </p>
          <div className="flex gap-1 text-xs whitespace-nowrap">
            {(['all', 'new', 'learned'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setFilter(f)} className={cn('rounded-full px-2.5 py-1', filter === f ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
                {f === 'all' ? 'すべて' : f === 'new' ? '未学習' : '学習済み'}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button disabled={unlearned.length === 0} onClick={() => setLearning(unlearned.slice(0, 10))}>
            未学習を学ぶ（最大 10）
          </Button>
          <Button variant="secondary" onClick={() => nav('/listening', { state: { sceneId } })}>
            この場面でクイズ
          </Button>
        </div>
      </Card>

      <div className="space-y-2">
        {shown.map((p) => {
          const c = cardByPhrase.get(p.id)
          const isOpen = open === p.id
          return (
            <div key={p.id}>
              {isOpen ? (
                <div>
                  <PhraseCard phrase={p} />
                  <div className="mt-1 flex items-center justify-between px-1 text-xs text-slate-400">
                    <span>
                      {c ? `次の復習: 言う ${c.speak ? describeInterval(c.speak) : '-'} / 聞く ${c.listen ? describeInterval(c.listen) : '-'}` : '未学習'}
                    </span>
                    <div className="flex gap-2">
                      {!c && (
                        <button type="button" className="underline" onClick={() => setLearning([p.id])}>
                          これを学ぶ
                        </button>
                      )}
                      <button type="button" className="underline" onClick={() => setOpen(null)}>
                        閉じる
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(p.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-left hover:bg-slate-800/60"
                >
                  <AudioButton item={phraseToItem(p)} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p lang="th" className="truncate font-thai text-lg leading-tight">
                      {p.thai}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      <span className="font-mono text-amber-200/80">{p.roman}</span> ・ {p.ja}
                    </p>
                  </div>
                  {c ? <Pill className="bg-emerald-900/50 text-emerald-200">済</Pill> : <Pill>新</Pill>}
                  {p.needs_review && <Pill className="bg-rose-900/60 text-rose-200">⚠</Pill>}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
