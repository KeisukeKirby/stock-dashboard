import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { itemsByScene, sceneById } from '@/lib/content'
import { useCards } from '@/hooks/useProgress'
import { ItemCard } from '@/components/ItemCard'
import { PrepositionFigure } from '@/components/PrepositionFigure'
import { LearnItemFlow } from '@/components/learn/LearnItemFlow'
import { Button, Card, Empty, PageTitle, Pill } from '@/components/ui'
import { AudioButton } from '@/components/AudioButton'
import { itemToAudio } from '@/hooks/useAudio'
import { describeInterval } from '@/lib/srs'
import { cn } from '@/lib/cn'

export default function SceneDetail() {
  const { sceneId = '' } = useParams()
  const nav = useNavigate()
  const scene = sceneById.get(sceneId)
  const list = itemsByScene.get(sceneId) ?? []
  const { cards } = useCards()
  const [open, setOpen] = useState<string | null>(null)
  const [learning, setLearning] = useState<string[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'new' | 'learned'>('all')

  const cardByItem = useMemo(() => {
    const m = new Map<string, { speak?: (typeof cards)[number]; listen?: (typeof cards)[number] }>()
    for (const c of cards) {
      const e = m.get(c.itemId) ?? {}
      e[c.type] = c
      m.set(c.itemId, e)
    }
    return m
  }, [cards])

  if (!scene) return <Empty>テーマが見つかりません</Empty>

  const unlearned = list.filter((p) => !cardByItem.has(p.id)).map((p) => p.id)
  const shown = list.filter((p) => (filter === 'all' ? true : filter === 'new' ? !cardByItem.has(p.id) : cardByItem.has(p.id)))

  if (learning) {
    return (
      <div>
        <PageTitle
          title={`${scene.icon} ${scene.title}`}
          subtitle="新アイテム学習"
          right={
            <Button variant="ghost" size="sm" onClick={() => setLearning(null)}>
              やめる
            </Button>
          }
        />
        <LearnItemFlow itemIds={learning} onDone={() => setLearning(null)} />
      </div>
    )
  }

  return (
    <div>
      <PageTitle
        title={`${scene.icon} ${scene.title}`}
        subtitle={scene.description}
        right={
          <Link to="/vocab" className="text-xs text-slate-400 underline">
            ← テーマ一覧
          </Link>
        }
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm">
            {list.length} 件・未学習 {unlearned.length}
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
            このテーマでクイズ
          </Button>
        </div>
        {scene.kind === 'preposition' && <p className="mt-3 text-xs text-slate-400">図 → 英語 の順で思い出す。日本語訳は補助。例文ごと声に出す。</p>}
        {scene.kind === 'root' && <p className="mt-3 text-xs text-slate-400">部品の意味 → 例の単語を分解して意味を導く。知らない単語に出会ったら部品で推測する癖をつける。</p>}
      </Card>

      <div className="space-y-2">
        {shown.map((p) => {
          const c = cardByItem.get(p.id)
          const isOpen = open === p.id
          return (
            <div key={p.id}>
              {isOpen ? (
                <div>
                  <ItemCard item={p} revealJa />
                  <div className="mt-1 flex items-center justify-between px-1 text-xs text-slate-400">
                    <span>{c ? `次の復習: 言う ${c.speak ? describeInterval(c.speak) : '-'} / 聞く ${c.listen ? describeInterval(c.listen) : '-'}` : '未学習'}</span>
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
                <button type="button" onClick={() => setOpen(p.id)} className="flex w-full items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2.5 text-left hover:bg-slate-800/60">
                  {scene.kind === 'preposition' ? <PrepositionFigure kind={p.image ?? p.en} className="h-12 w-14 shrink-0" /> : <AudioButton item={itemToAudio(p)} size="sm" />}
                  <div className="min-w-0 flex-1">
                    <p lang="en" className="truncate font-en text-base leading-tight">
                      {p.en}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {p.ipa && <span className="font-ipa text-amber-200/80">{p.ipa} ・ </span>}
                      {p.ja}
                    </p>
                  </div>
                  {c ? <Pill className="bg-emerald-900/50 text-emerald-200">済</Pill> : <Pill>新</Pill>}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
