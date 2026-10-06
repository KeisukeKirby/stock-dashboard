import { useEffect, useState } from 'react'
import { grammarById } from '@/lib/content'
import { kvGet, kvSet, updateLog } from '@/lib/db'
import type { GrammarState } from '@/lib/types'
import { textToAudio, useAudio } from '@/hooks/useAudio'
import { AudioButton } from '../AudioButton'
import { RecorderPanel } from '../RecorderPanel'
import { Button, Card, Pill } from '../ui'
import { ChoiceButton, choiceState } from '../Tabs'

type Stage = 'learn' | 'drill' | 'quiz'

/**
 * 文法ユニット：① 要点を読む → ② 例文を日本語から声に出す（録音可）→ ③ ミニクイズ。
 */
export function GrammarRunner({ unitId, onDone, startStage = 'learn' }: { unitId: string; onDone: (r: { correct: number; total: number }) => void; startStage?: Stage }) {
  const unit = grammarById.get(unitId)
  const [stage, setStage] = useState<Stage>(startStage)
  const [di, setDi] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [qi, setQi] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const { speak } = useAudio()

  useEffect(() => {
    setRevealed(false)
  }, [di])

  if (!unit) return null
  const drill = unit.drills[di]
  const q = unit.quiz[qi]

  async function saveState(patch: Partial<GrammarState>) {
    const cur = (await kvGet<GrammarState>(`grammar:${unit!.id}`)) ?? { unitId: unit!.id, drilled: 0, quizBest: 0, quizTotal: unit!.quiz.length, lastAt: 0 }
    await kvSet(`grammar:${unit!.id}`, { ...cur, ...patch, lastAt: Date.now() })
  }

  async function choose(idx: number) {
    if (picked !== null) return
    setPicked(idx)
    const ok = idx === q.answer
    if (ok) setCorrect((c) => c + 1)
    await updateLog((l) => {
      l.grammarQuizTotal += 1
      if (ok) l.grammarQuizCorrect += 1
    })
  }

  async function nextQuiz() {
    if (qi + 1 >= unit!.quiz.length) {
      const cur = await kvGet<GrammarState>(`grammar:${unit!.id}`)
      await saveState({ quizBest: Math.max(cur?.quizBest ?? 0, correct), quizTotal: unit!.quiz.length })
      onDone({ correct, total: unit!.quiz.length })
    } else {
      setQi(qi + 1)
      setPicked(null)
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          Unit {unit.order}: {unit.title}
        </span>
        <Pill>{stage === 'learn' ? '① 要点' : stage === 'drill' ? `② 声に出す ${di + 1}/${unit.drills.length}` : `③ クイズ ${qi + 1}/${unit.quiz.length}`}</Pill>
      </div>

      {stage === 'learn' && (
        <>
          <Card>
            <p className="font-en text-sm text-slate-400">{unit.titleEn}</p>
            <p className="mt-1 text-sm leading-relaxed">{unit.summary}</p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-300">
              {unit.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </Card>
          <div className="mt-3 space-y-2">
            {unit.patterns.map((p) => (
              <div key={p.pattern} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
                <AudioButton item={textToAudio(p.en)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-xs text-amber-200/90">{p.pattern}</p>
                  <p className="font-en text-lg">{p.en}</p>
                  <p className="text-xs text-slate-400">{p.ja}</p>
                </div>
              </div>
            ))}
          </div>
          <Button size="lg" className="mt-4 w-full" onClick={() => setStage('drill')}>
            例文を声に出す →
          </Button>
        </>
      )}

      {stage === 'drill' && drill && (
        <>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <p className="mb-2 text-sm text-slate-400">日本語を見て、英語で言ってから正解を聞く。見ずに言えるまで繰り返す</p>
            <p className="text-2xl font-semibold">{drill.ja}</p>
            {revealed && (
              <div className="mt-4 border-t border-slate-800 pt-4">
                <div className="flex items-start gap-3">
                  <AudioButton item={textToAudio(drill.en)} />
                  <p className="font-en text-xl leading-snug">{drill.en}</p>
                </div>
                <RecorderPanel target={drill.en} className="mt-3" compact />
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {!revealed ? (
              <Button
                size="lg"
                className="col-span-2"
                onClick={() => {
                  setRevealed(true)
                  void speak(drill.en)
                }}
              >
                正解を聞く
              </Button>
            ) : (
              <>
                <Button variant="secondary" size="lg" onClick={() => setRevealed(false)}>
                  もう一度
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    void saveState({ drilled: di + 1 })
                    if (di + 1 >= unit.drills.length) setStage('quiz')
                    else setDi(di + 1)
                  }}
                >
                  {di + 1 >= unit.drills.length ? 'クイズへ' : '言えた → 次'}
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {stage === 'quiz' && q && (
        <>
          <Card>
            <p className="font-en text-xl leading-snug">{q.q}</p>
          </Card>
          <div className="mt-3 grid gap-2">
            {q.choices.map((c, idx) => (
              <ChoiceButton key={c} state={choiceState(picked, idx, q.answer)} onClick={() => void choose(idx)}>
                <span className="font-en">{c}</span>
              </ChoiceButton>
            ))}
          </div>
          {picked !== null && (
            <div className="mt-3">
              <p className="mb-3 rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">💡 {q.why}</p>
              <Button size="lg" className="w-full" onClick={() => void nextQuiz()}>
                {qi + 1 >= unit.quiz.length ? '完了' : '次へ'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
