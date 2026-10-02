import { useEffect, useState } from 'react'
import type { QuizQuestion } from '@/lib/session'
import { phraseById } from '@/lib/content'
import { updateLog } from '@/lib/db'
import { AudioButton } from '../AudioButton'
import { Button, Pill } from '../ui'
import { phraseToItem, useAudio } from '@/hooks/useAudio'
import { cn } from '@/lib/cn'
import { useSettings } from '@/hooks/useSettings'

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
  const { settings } = useSettings()
  const q = questions[i]
  const phrase = q ? phraseById.get(q.phraseId) : undefined

  useEffect(() => {
    setPicked(null)
    if (phrase) {
      const t = setTimeout(() => void speak(phraseToItem(phrase)), 300)
      return () => clearTimeout(t)
    }
  }, [i, phrase, speak])

  if (!q || !phrase) {
    return null
  }

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
        <Pill>{q.kind === 'reply' ? '💁‍♀️ 相手がこう返してきたら？' : '🎧 どういう意味？'}</Pill>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-center">
        <AudioButton item={phraseToItem(phrase)} size="lg" className="mx-auto" />
        <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-400">
          <AudioButton item={phraseToItem(phrase)} size="sm" rate={0.6} className="bg-slate-700 text-slate-100 hover:bg-slate-600" label="ゆっくり" />
          ゆっくり 0.6x
        </div>
        {picked !== null && (
          <div className="mt-4 border-t border-slate-800 pt-3">
            <p lang="th" className="font-thai text-2xl">
              {phrase.thai}
            </p>
            <p className="font-mono text-sm text-amber-200/90">{phrase.roman}</p>
            {settings.showKana && phrase.kana && <p className="text-xs text-slate-400">{phrase.kana}</p>}
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-2">
        {q.choices.map((id, idx) => {
          const p = phraseById.get(id)!
          const isAnswer = idx === q.answer
          const state = picked === null ? 'idle' : isAnswer ? 'correct' : idx === picked ? 'wrong' : 'dim'
          return (
            <button
              key={id}
              type="button"
              onClick={() => void choose(idx)}
              className={cn(
                'rounded-xl border px-4 py-3 text-left text-base transition',
                state === 'idle' && 'border-slate-700 bg-slate-900 hover:bg-slate-800',
                state === 'correct' && 'border-emerald-500 bg-emerald-500/20',
                state === 'wrong' && 'border-rose-500 bg-rose-500/20',
                state === 'dim' && 'border-slate-800 bg-slate-900/40 text-slate-500',
              )}
            >
              {p.ja}
            </button>
          )
        })}
      </div>
      {picked !== null && (
        <div className="mt-4">
          {phrase.note && <p className="mb-3 rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">💡 {phrase.note}</p>}
          <Button size="lg" className="w-full" onClick={next}>
            {i + 1 >= questions.length ? '結果を見る' : '次へ'}
          </Button>
        </div>
      )}
    </div>
  )
}
