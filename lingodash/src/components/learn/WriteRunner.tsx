import { useEffect, useState } from 'react'
import { prompts, countWords } from '@/lib/content'
import { addJournal, updateLog } from '@/lib/db'
import { textToAudio } from '@/hooks/useAudio'
import { dateKey } from '@/lib/date'
import { AudioButton } from '../AudioButton'
import { Button, Card, Pill } from '../ui'
import { cn } from '@/lib/cn'

/**
 * クイックライティング：タイマー付きで反射的に書く → 1 文で主題をまとめる → 保存。
 */
export function WriteRunner({ promptId, onDone, minutesOverride }: { promptId: string; onDone: (words: number) => void; minutesOverride?: number }) {
  const p = prompts.writing.find((w) => w.id === promptId)
  const minutes = minutesOverride ?? p?.minutes ?? 5
  const [text, setText] = useState('')
  const [summary, setSummary] = useState('')
  const [started, setStarted] = useState<number | null>(null)
  const [left, setLeft] = useState(minutes * 60)
  const [stage, setStage] = useState<'write' | 'summary' | 'done'>('write')
  const words = countWords(text)

  useEffect(() => {
    if (!started || stage !== 'write') return
    const id = setInterval(() => {
      const l = Math.max(0, minutes * 60 - Math.floor((Date.now() - started) / 1000))
      setLeft(l)
      if (l === 0) {
        clearInterval(id)
        setStage('summary')
      }
    }, 500)
    return () => clearInterval(id)
  }, [started, minutes, stage])

  if (!p) return null

  async function save() {
    const seconds = started ? Math.round((Date.now() - started) / 1000) : 0
    await addJournal({
      id: `wr-${Date.now()}`,
      date: dateKey(),
      kind: 'writing',
      promptId: p!.id,
      prompt: p!.en,
      text,
      summary: summary.trim() || undefined,
      words,
      seconds,
      createdAt: Date.now(),
    })
    await updateLog((l) => {
      l.writingWords += words
    })
    setStage('done')
    onDone(words)
  }

  const mm = Math.floor(left / 60)
  const ss = String(left % 60).padStart(2, '0')

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>クイックライティング</span>
        <Pill>
          ⏱ {mm}:{ss}　{words} 語
        </Pill>
      </div>
      <Card>
        <div className="flex items-start gap-3">
          <AudioButton item={textToAudio(p.en)} size="sm" />
          <div>
            <p className="font-en text-lg leading-snug">{p.en}</p>
            <p className="text-xs text-slate-400">{p.ja}</p>
          </div>
        </div>
        {!started && (
          <>
            <p className="mt-3 text-xs text-slate-400">辞書を引かない・消さない・止まらない。口に出すような感覚で、思ったまま英語で書く。{minutes} 分。</p>
            <Button size="lg" className="mt-3 w-full" onClick={() => setStarted(Date.now())}>
              ▶ 書き始める
            </Button>
          </>
        )}
      </Card>
      {started && stage === 'write' && (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={9}
            lang="en"
            autoFocus
            placeholder="Start writing..."
            className="font-en mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
          />
          <Button size="lg" className="mt-3 w-full" variant="secondary" onClick={() => setStage('summary')}>
            書き終えた → 主題を 1 文で
          </Button>
        </>
      )}
      {stage === 'summary' && (
        <>
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="font-en whitespace-pre-wrap text-sm leading-relaxed text-slate-200">{text || '（本文なし）'}</p>
          </div>
          <p className="mt-3 text-sm text-slate-300">書いたことの主題を 1 文で要約する（Topic sentence の練習）</p>
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            lang="en"
            placeholder="In short, ..."
            className="font-en mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
          />
          <div className="mt-2 flex flex-wrap gap-1.5 text-xs text-slate-400">
            <span>チェック：</span>
            <Pill className={cn(words >= 60 && 'bg-emerald-900/60 text-emerald-200')}>60 語以上</Pill>
            <Pill className={cn(/\b(because|so|but|although|however)\b/i.test(text) && 'bg-emerald-900/60 text-emerald-200')}>接続詞を使った</Pill>
            <Pill className={cn(/\b(was|were|did|went|had|-ed)\b|ed\b/i.test(text) && 'bg-emerald-900/60 text-emerald-200')}>過去形がある</Pill>
          </div>
          <Button size="lg" className="mt-3 w-full" onClick={() => void save()}>
            保存して完了
          </Button>
        </>
      )}
    </div>
  )
}
