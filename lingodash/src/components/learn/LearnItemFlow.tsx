import { useEffect, useMemo, useState } from 'react'
import type { Grade, Item } from '@/lib/types'
import { itemById } from '@/lib/content'
import { newCard, schedule } from '@/lib/srs'
import { getCard, putCards, updateLog } from '@/lib/db'
import { ItemCard } from '../ItemCard'
import { GradeButtons } from '../GradeButtons'
import { Button, Pill } from '../ui'
import { RecorderPanel } from '../RecorderPanel'
import { itemToAudio, useAudio } from '@/hooks/useAudio'

type Stage = 'listen' | 'meaning' | 'say'

/**
 * 新アイテム導入：① 音声＋英語だけ（意味は隠す）→ ② 意味・メモ → 録音 → ③ 日本語だけ見て言う → 自己評価（SRS へ）
 */
export function LearnItemFlow({ itemIds, onDone, onProgress }: { itemIds: string[]; onDone: (learned: number) => void; onProgress?: (done: number, total: number) => void }) {
  const [i, setI] = useState(0)
  const [stage, setStage] = useState<Stage>('listen')
  const [revealed, setRevealed] = useState(false)
  const { speak } = useAudio()
  const item: Item | undefined = useMemo(() => itemById.get(itemIds[i] ?? ''), [itemIds, i])

  useEffect(() => {
    setStage('listen')
    setRevealed(false)
    if (item) {
      const t = setTimeout(() => void speak(itemToAudio(item)), 300)
      return () => clearTimeout(t)
    }
  }, [i, item, speak])

  useEffect(() => {
    if (i >= itemIds.length) onDone(itemIds.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  if (!item) return null

  async function finish(g: Grade) {
    const now = Date.now()
    const existingSpeak = await getCard(`${item!.id}:speak`)
    const existingListen = await getCard(`${item!.id}:listen`)
    const speakCard = schedule(existingSpeak ?? newCard(item!.id, 'speak', now), g, now)
    const listenCard = existingListen ?? newCard(item!.id, 'listen', now)
    await putCards([speakCard, listenCard])
    if (!existingSpeak) {
      await updateLog((l) => {
        l.newItems += 1
      })
    }
    onProgress?.(i + 1, itemIds.length)
    setI((n) => n + 1)
  }

  const target = item.example && item.en.split(' ').length <= 3 ? item.example : item.en

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          新アイテム {i + 1} / {itemIds.length}
        </span>
        <Pill>{stage === 'listen' ? '① 聞く' : stage === 'meaning' ? '② 意味を知る・録音' : '③ 自分で言う'}</Pill>
      </div>

      {stage === 'listen' && (
        <>
          <ItemCard item={item} hideJa showNote={false} />
          <p className="mt-3 text-center text-sm text-slate-400">何度か聞いて、発音記号を見ながら口の形を真似る。意味を推測してから次へ</p>
          <Button size="lg" className="mt-3 w-full" onClick={() => setStage('meaning')}>
            意味を見る
          </Button>
        </>
      )}

      {stage === 'meaning' && (
        <>
          <ItemCard item={item} revealJa />
          <RecorderPanel target={target} className="mt-3" compact />
          <Button size="lg" className="mt-3 w-full" onClick={() => setStage('say')}>
            自分で言ってみる
          </Button>
        </>
      )}

      {stage === 'say' && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="mb-2 text-sm text-slate-400">日本語を見て、英語で声に出してください</p>
            <p className="text-2xl font-semibold">{item.ja}</p>
            {item.exampleJa && <p className="mt-1 text-sm text-slate-400">例文: {item.exampleJa}</p>}
            {revealed && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <ItemCard item={item} compact showNote={false} className="border-0 bg-transparent p-0" revealJa />
              </div>
            )}
          </div>
          <div className="mt-4">
            {!revealed ? (
              <Button
                size="lg"
                className="w-full"
                onClick={() => {
                  setRevealed(true)
                  void speak(itemToAudio(item))
                }}
              >
                正解を聞く
              </Button>
            ) : (
              <GradeButtons onGrade={(g) => void finish(g)} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
