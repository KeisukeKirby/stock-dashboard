import { useEffect, useState } from 'react'
import type { QuizQuestion } from '@/lib/session'
import { itemById } from '@/lib/content'
import { updateLog } from '@/lib/db'
import { AudioButton } from '../AudioButton'
import { Button, Pill } from '../ui'
import { ChoiceButton, choiceState } from '../Tabs'
import { itemToAudio, useAudio } from '@/hooks/useAudio'

export interface QuizStats {
  correct: number
  total: number
}

/** リスニングクイズ：音声だけ → 意味を 4 択 */
export function QuizRunner({ questions, onDone }: { questions: QuizQuestion[]; onDone: (s: QuizStats) => void }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [stats, setStats] = useState<QuizStats>({ correct: 0, total: 0 })
  const { speak } = useAudio()
  const q = questions[i]
  const item = q ? itemById.get(q.itemId) : undefined

  useEffect(() => {
    setPicked(null)
    if (item) {
      const t = setTimeout(() => void speak(itemToAudio(item)), 300)
      return () => clearTimeout(t)
    }
  }, [i, item, speak])

  if (!q || !item) return null

  async function choose(idx: number) {
    if (picked !== null) return
    setPicked(idx)
    const ok = idx === q.answer
    const s = { correct: stats.correct + (ok ? 1 : 0), total: stats.total + 1 }
    setStats(s)
    await updateLog((l) => {
      l.quizTotal += 1
      if (ok) l.quizCorrect += 1
    })
  }

  function next() {
    if (i + 1 >= questions.length) onDone(stats)
    else setI(i + 1)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          問題 {i + 1} / {questions.length}　正解 {stats.correct}
        </span>
        <Pill>{q.kind === 'reply' ? '💁 相手がこう言ってきたら？' : '🎧 どういう意味？'}</Pill>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
        <AudioButton item={itemToAudio(item)} size="lg" className="mx-auto" />
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
          <AudioButton item={itemToAudio(item)} size="sm" rate={0.7} className="bg-slate-700 text-slate-100 hover:bg-slate-600" label="ゆっくり" />
          ゆっくり
        </div>
        {picked !== null && (
          <div className="mt-4 border-t border-slate-800 pt-3">
            <p className="font-en text-xl">{item.en}</p>
            {item.ipa && <p className="font-ipa text-sm text-amber-200/90">{item.ipa}</p>}
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-2">
        {q.choices.map((id, idx) => {
          const p = itemById.get(id)!
          return (
            <ChoiceButton key={id} state={choiceState(picked, idx, q.answer)} onClick={() => void choose(idx)}>
              {p.ja}
            </ChoiceButton>
          )
        })}
      </div>
      {picked !== null && (
        <div className="mt-4">
          {item.note && <p className="mb-3 rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">💡 {item.note}</p>}
          <Button size="lg" className="w-full" onClick={next}>
            {i + 1 >= questions.length ? '結果を見る' : '次へ'}
          </Button>
        </div>
      )}
    </div>
  )
}
