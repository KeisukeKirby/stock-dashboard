import { useEffect, useMemo, useState } from 'react'
import type { Grade, Phrase } from '@/lib/types'
import { phraseById } from '@/lib/content'
import { newCard, schedule } from '@/lib/srs'
import { getCard, putCards, updateLog } from '@/lib/db'
import { PhraseCard } from '../PhraseCard'
import { GradeButtons } from '../GradeButtons'
import { Button, Pill } from '../ui'
import { RecorderPanel } from '../RecorderPanel'
import { phraseToItem, useAudio } from '@/hooks/useAudio'

type Stage = 'listen' | 'meaning' | 'say'

/**
 * 新フレーズ導入フロー（Pimsleur 風）：
 *  1. 音声だけ聞く（タイ文字・ローマ字は見える、意味は隠す）
 *  2. 意味・メモ・丁寧/カジュアルを表示
 *  3. 日本語だけを見て自分で言う → 正解音声 → 自己評価（SRS に反映）
 */
export function LearnPhraseFlow({
  phraseIds,
  onDone,
  onProgress,
}: {
  phraseIds: string[]
  onDone: (learned: number) => void
  onProgress?: (done: number, total: number) => void
}) {
  const [i, setI] = useState(0)
  const [stage, setStage] = useState<Stage>('listen')
  const [revealed, setRevealed] = useState(false)
  const { speak } = useAudio()
  const phrase: Phrase | undefined = useMemo(() => phraseById.get(phraseIds[i] ?? ''), [phraseIds, i])

  useEffect(() => {
    setStage('listen')
    setRevealed(false)
    if (phrase) {
      const t = setTimeout(() => void speak(phraseToItem(phrase)), 300)
      return () => clearTimeout(t)
    }
  }, [i, phrase, speak])

  useEffect(() => {
    if (i >= phraseIds.length) onDone(phraseIds.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  if (!phrase) return null

  async function finish(g: Grade) {
    const now = Date.now()
    const existingSpeak = await getCard(`${phrase!.id}:speak`)
    const existingListen = await getCard(`${phrase!.id}:listen`)
    const speakCard = schedule(existingSpeak ?? newCard(phrase!.id, 'speak', now), g, now)
    const listenCard = existingListen ?? newCard(phrase!.id, 'listen', now)
    await putCards([speakCard, listenCard])
    if (!existingSpeak) {
      await updateLog((l) => {
        l.newPhrases += 1
      })
    }
    onProgress?.(i + 1, phraseIds.length)
    setI((n) => n + 1)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          新フレーズ {i + 1} / {phraseIds.length}
        </span>
        <Pill>{stage === 'listen' ? '① 聞く' : stage === 'meaning' ? '② 意味を知る' : '③ 自分で言う'}</Pill>
      </div>

      {stage === 'listen' && (
        <>
          <PhraseCard phrase={phrase} hideJa showVariants={false} showNote={false} />
          <p className="mt-3 text-center text-sm text-slate-400">何度か聞いて、口の形を真似してみてください</p>
          <Button size="lg" className="mt-3 w-full" onClick={() => setStage('meaning')}>
            意味を見る
          </Button>
        </>
      )}

      {stage === 'meaning' && (
        <>
          <PhraseCard phrase={phrase} />
          <RecorderPanel thai={phrase.thai} item={phraseToItem(phrase)} className="mt-3" />
          <Button size="lg" className="mt-3 w-full" onClick={() => setStage('say')}>
            自分で言ってみる
          </Button>
        </>
      )}

      {stage === 'say' && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="mb-2 text-sm text-slate-400">日本語を見て、タイ語で声に出してください</p>
            <p className="text-2xl font-semibold">{phrase.ja}</p>
            {revealed && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <PhraseCard phrase={phrase} compact showVariants={false} showNote={false} className="border-0 bg-transparent p-0" />
              </div>
            )}
          </div>
          <div className="mt-4">
            {!revealed ? (
              <Button size="lg" className="w-full" onClick={() => { setRevealed(true); void speak(phraseToItem(phrase)) }}>
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
