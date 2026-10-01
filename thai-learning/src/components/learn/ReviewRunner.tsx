import { useEffect, useMemo, useState } from 'react'
import type { Card, Grade } from '@/lib/types'
import { phraseById } from '@/lib/content'
import { schedule } from '@/lib/srs'
import { putCard, updateLog } from '@/lib/db'
import { PhraseCard } from '../PhraseCard'
import { GradeButtons } from '../GradeButtons'
import { Button, Pill } from '../ui'
import { AudioButton } from '../AudioButton'
import { phraseToItem, useAudio } from '@/hooks/useAudio'

export interface ReviewStats {
  done: number
  again: number
}

/**
 * SRS 復習ランナー。
 * listen カード：音声だけ → 意味を思い出す → 表示 → 自己評価
 * speak カード：日本語だけ → 声に出す → 正解表示（音声）→ 自己評価
 * 「言えない」のカードは同じセッションの最後にもう一度回す。
 */
export function ReviewRunner({
  cards,
  onDone,
  onProgress,
  deadline,
}: {
  cards: Card[]
  onDone: (stats: ReviewStats) => void
  onProgress?: (done: number, total: number) => void
  deadline?: number
}) {
  const [queue, setQueue] = useState<Card[]>(cards)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState<ReviewStats>({ done: 0, again: 0 })
  const { speak } = useAudio()
  const total = cards.length
  const current = queue[0]
  const phrase = useMemo(() => (current ? phraseById.get(current.phraseId) : undefined), [current])

  useEffect(() => {
    setRevealed(false)
    if (current?.type === 'listen' && phrase) {
      const t = setTimeout(() => void speak(phraseToItem(phrase)), 250)
      return () => clearTimeout(t)
    }
  }, [current?.id, current?.type, phrase, speak])

  useEffect(() => {
    if (!current) onDone(stats)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => {
      if (Date.now() >= deadline) {
        clearInterval(id)
        onDone(stats)
      }
    }, 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, stats])

  if (!current || !phrase) return null

  async function grade(g: Grade) {
    const next = schedule(current!, g, Date.now())
    await putCard(next)
    await updateLog((l) => {
      l.reviews += 1
    })
    const newStats = { done: stats.done + 1, again: stats.again + (g === 1 ? 1 : 0) }
    setStats(newStats)
    onProgress?.(newStats.done, total)
    setQueue((q) => {
      const rest = q.slice(1)
      // 言えない → 同セッション末尾でもう一度（ただし一度だけ）
      if (g === 1 && !rest.some((c) => c.id === next.id) && !q[0].id.endsWith('#retry')) {
        return [...rest, { ...next, id: `${next.id}#retry` }]
      }
      return rest
    })
    setRevealed(false)
  }

  const isListen = current.type === 'listen'
  const retry = current.id.endsWith('#retry')

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          残り {queue.length} 枚
          {retry && <Pill className="ml-2 bg-rose-900/60 text-rose-200">やり直し</Pill>}
        </span>
        <Pill>{isListen ? '🎧 聞いて意味が分かる' : '🗣 日本語 → タイ語で言う'}</Pill>
      </div>

      {isListen ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          {!revealed ? (
            <>
              <p className="mb-4 text-sm text-slate-400">音声を聞いて、意味を思い出してください</p>
              <AudioButton item={phraseToItem(phrase)} size="lg" className="mx-auto" />
              <div className="mt-3">
                <AudioButton item={phraseToItem(phrase)} size="sm" rate={0.6} label="ゆっくり" className="bg-slate-700 text-slate-100 hover:bg-slate-600" />
                <span className="ml-2 text-xs text-slate-400">ゆっくり 0.6x</span>
              </div>
            </>
          ) : (
            <PhraseCard phrase={phrase} compact showVariants={false} className="border-0 bg-transparent p-0 text-left" />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="mb-2 text-sm text-slate-400">タイ語で言ってみてください</p>
          <p className="text-2xl font-semibold">{phrase.ja}</p>
          {revealed && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <PhraseCard phrase={phrase} compact showVariants={false} showNote={false} className="border-0 bg-transparent p-0" />
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {!revealed ? (
          <Button size="lg" className="w-full" onClick={() => setRevealed(true)}>
            {isListen ? '意味を表示' : '正解を見る'}
          </Button>
        ) : (
          <GradeButtons onGrade={(g) => void grade(g)} />
        )}
      </div>
    </div>
  )
}
