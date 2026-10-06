import { useEffect, useMemo, useState } from 'react'
import type { Card, Grade } from '@/lib/types'
import { itemById } from '@/lib/content'
import { schedule } from '@/lib/srs'
import { putCard, updateLog } from '@/lib/db'
import { ItemCard } from '../ItemCard'
import { GradeButtons } from '../GradeButtons'
import { Button, Pill } from '../ui'
import { AudioButton } from '../AudioButton'
import { itemToAudio, useAudio } from '@/hooks/useAudio'

export interface ReviewStats {
  done: number
  again: number
}

/**
 * SRS 復習：listen カード = 音声だけ → 意味 → 自己評価。speak カード = 日本語 → 英語で言う → 正解 → 自己評価。
 */
export function ReviewRunner({ cards, onDone, onProgress, deadline }: { cards: Card[]; onDone: (stats: ReviewStats) => void; onProgress?: (done: number, total: number) => void; deadline?: number }) {
  const [queue, setQueue] = useState<Card[]>(cards)
  const [revealed, setRevealed] = useState(false)
  const [stats, setStats] = useState<ReviewStats>({ done: 0, again: 0 })
  const { speak } = useAudio()
  const total = cards.length
  const current = queue[0]
  const item = useMemo(() => (current ? itemById.get(current.itemId) : undefined), [current])

  useEffect(() => {
    setRevealed(false)
    if (current?.type === 'listen' && item) {
      const t = setTimeout(() => void speak(itemToAudio(item)), 250)
      return () => clearTimeout(t)
    }
  }, [current?.id, current?.type, item, speak])

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

  if (!current || !item) return null

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
        <Pill>{isListen ? '🎧 聞いて意味が分かる' : '🗣 日本語 → 英語で言う'}</Pill>
      </div>

      {isListen ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
          {!revealed ? (
            <>
              <p className="mb-4 text-sm text-slate-400">音声を聞いて、意味を思い出してください</p>
              <AudioButton item={itemToAudio(item)} size="lg" className="mx-auto" />
              <div className="mt-3">
                <AudioButton item={itemToAudio(item)} size="sm" rate={0.7} label="ゆっくり" className="bg-slate-700 text-slate-100 hover:bg-slate-600" />
                <span className="ml-2 text-xs text-slate-400">ゆっくり</span>
              </div>
            </>
          ) : (
            <ItemCard item={item} compact className="border-0 bg-transparent p-0 text-left" revealJa />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="mb-2 text-sm text-slate-400">英語で声に出して言ってください</p>
          <p className="text-2xl font-semibold">{item.ja}</p>
          {item.exampleJa && <p className="mt-1 text-sm text-slate-400">例文: {item.exampleJa}</p>}
          {revealed && (
            <div className="mt-4 border-t border-slate-800 pt-4">
              <ItemCard item={item} compact showNote={false} className="border-0 bg-transparent p-0" revealJa />
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        {!revealed ? (
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setRevealed(true)
              if (!isListen) void speak(itemToAudio(item))
            }}
          >
            {isListen ? '意味を表示' : '正解を聞く'}
          </Button>
        ) : (
          <GradeButtons onGrade={(g) => void grade(g)} labels={isListen ? ['分からない', 'あやしい', '分かった'] : undefined} />
        )}
      </div>
    </div>
  )
}
