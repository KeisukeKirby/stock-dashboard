import { useEffect, useState } from 'react'
import { dictationById } from '@/lib/content'
import { addJournal, updateLog } from '@/lib/db'
import { diffWords, wordSimilarity } from '@/lib/speech'
import { textToAudio, useAudio } from '@/hooks/useAudio'
import { AudioButton } from '../AudioButton'
import { Button, Pill } from '../ui'
import { cn } from '@/lib/cn'
import { dateKey } from '@/lib/date'

export interface DictationStats {
  scores: number[]
}

/** ディクテーション：聞いて書き取る → 単語ごとに採点。ライティングにも効く。 */
export function DictationRunner({ ids, onDone, log = true, autoplay = true }: { ids: string[]; onDone: (s: DictationStats) => void; log?: boolean; autoplay?: boolean }) {
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [checked, setChecked] = useState<number | null>(null)
  const [plays, setPlays] = useState(0)
  const [scores, setScores] = useState<number[]>([])
  const { speak } = useAudio()
  const d = dictationById.get(ids[i] ?? '')

  useEffect(() => {
    setTyped('')
    setChecked(null)
    setPlays(0)
    if (d && autoplay) {
      const t = setTimeout(() => void speak(textToAudio(d.en)), 400)
      return () => clearTimeout(t)
    }
  }, [i, d, speak, autoplay])

  if (!d) return null

  async function check() {
    const s = wordSimilarity(typed, d!.en)
    setChecked(s)
    const next = [...scores, s]
    setScores(next)
    if (log) {
      await updateLog((l) => {
        l.dictationTotal += 1
        if (s >= 0.8) l.dictationCorrect += 1
      })
      await addJournal({
        id: `dict-${Date.now()}`,
        date: dateKey(),
        kind: 'dictation',
        promptId: d!.id,
        prompt: d!.en,
        text: typed,
        words: typed.trim().split(/\s+/).filter(Boolean).length,
        seconds: 0,
        createdAt: Date.now(),
      })
    }
  }

  function next() {
    if (i + 1 >= ids.length) onDone({ scores })
    else setI(i + 1)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          ディクテーション {i + 1} / {ids.length}
        </span>
        <Pill>✍️ {d.level}・再生 {plays} 回</Pill>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 text-center">
        <p className="text-sm text-slate-400">聞こえたとおりに英語で書く（何回聞いても OK。3 回以内が目標）</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <AudioButton
            item={textToAudio(d.en)}
            size="lg"
            label="再生"
            // onClick 側で回数を数える
          />
          <button
            type="button"
            className="rounded-full bg-slate-700 px-3 py-2 text-xs text-slate-100 hover:bg-slate-600"
            onClick={() => {
              setPlays((p) => p + 1)
              void speak(textToAudio(d.en), 0.7)
            }}
          >
            ゆっくり
          </button>
        </div>
      </div>
      <textarea
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        disabled={checked !== null}
        placeholder="Type what you hear..."
        rows={3}
        lang="en"
        autoCapitalize="sentences"
        className="font-en mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
      />
      {checked === null ? (
        <Button size="lg" className="mt-3 w-full" disabled={typed.trim().length === 0} onClick={() => void check()}>
          答え合わせ
        </Button>
      ) : (
        <div className="mt-3">
          <div className={cn('rounded-xl border p-3', checked >= 0.8 ? 'border-emerald-700 bg-emerald-950/40' : 'border-slate-700 bg-slate-900')}>
            <p className="text-sm font-semibold">一致度 {Math.round(checked * 100)}%</p>
            <p className="mt-1 font-en text-lg">
              {diffWords(d.en, typed).map((w, idx) => (
                <span key={idx} className={cn('mr-1', w.ok ? 'text-emerald-300' : 'text-rose-300 underline')}>
                  {w.word}
                </span>
              ))}
            </p>
            <p className="mt-1 text-xs text-slate-400">{d.ja}</p>
          </div>
          <p className="mt-2 text-xs text-slate-500">赤い語は聞き取れなかった音。もう一度聞いて、正解文を 3 回音読してから次へ。</p>
          <Button size="lg" className="mt-3 w-full" onClick={next}>
            {i + 1 >= ids.length ? '完了' : '次へ'}
          </Button>
        </div>
      )}
    </div>
  )
}
