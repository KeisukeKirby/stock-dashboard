import { useEffect, useMemo, useState } from 'react'
import { pairById } from '@/lib/content'
import { updateLog } from '@/lib/db'
import { useAudio } from '@/hooks/useAudio'
import { AudioButton } from '../AudioButton'
import { Button, Card, Pill } from '../ui'
import { ChoiceButton } from '../Tabs'

export interface SoundStats {
  correct: number
  total: number
  results: Record<string, boolean>
}

/** 最小対クイズ：1 語が再生される → どちらか選ぶ。 */
export function SoundRunner({ pairIds, onDone, autoplay = true, log = true }: { pairIds: string[]; onDone: (s: SoundStats) => void; autoplay?: boolean; log?: boolean }) {
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [stats, setStats] = useState<SoundStats>({ correct: 0, total: 0, results: {} })
  const { speak } = useAudio()
  const pair = pairById.get(pairIds[i] ?? '')
  // 出題する語は問題ごとに固定（再レンダリングで変わらないように）
  const targets = useMemo(() => pairIds.map((id) => Math.floor(Math.random() * (pairById.get(id)?.items.length ?? 2))), [pairIds])
  const target = pair ? pair.items[targets[i]] : undefined

  useEffect(() => {
    setPicked(null)
    if (target && autoplay) {
      const t = setTimeout(() => void speak(target.word), 350)
      return () => clearTimeout(t)
    }
  }, [i, target, speak, autoplay])

  if (!pair || !target) return null

  async function choose(idx: number) {
    if (picked !== null) return
    setPicked(idx)
    const ok = idx === targets[i]
    const s: SoundStats = { correct: stats.correct + (ok ? 1 : 0), total: stats.total + 1, results: { ...stats.results, [pair!.id]: ok } }
    setStats(s)
    if (log) {
      await updateLog((l) => {
        l.soundQuizTotal += 1
        if (ok) l.soundQuizCorrect += 1
      })
    }
  }

  function next() {
    if (i + 1 >= pairIds.length) onDone(stats)
    else setI(i + 1)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          問題 {i + 1} / {pairIds.length}　正解 {stats.correct}
        </span>
        <Pill>👂 {pair.feature}</Pill>
      </div>
      <Card className="text-center">
        <p className="text-sm text-slate-400">音を聞いて、どちらの単語か選ぶ</p>
        <AudioButton item={target.word} size="lg" className="mx-auto mt-3" />
        <div className="mt-2">
          <AudioButton item={target.word} size="sm" rate={0.7} className="bg-slate-700 text-slate-100 hover:bg-slate-600" label="ゆっくり" />
          <span className="ml-2 text-xs text-slate-400">ゆっくり</span>
        </div>
      </Card>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {pair.items.map((it, idx) => (
          <ChoiceButton key={it.word} state={picked === null ? 'idle' : idx === targets[i] ? 'correct' : idx === picked ? 'wrong' : 'dim'} onClick={() => void choose(idx)} className="text-center">
            <p className="font-en text-2xl font-semibold">{it.word}</p>
            <p className="font-ipa text-sm text-amber-200/90">{it.ipa}</p>
            <p className="text-xs text-slate-400">{it.ja}</p>
          </ChoiceButton>
        ))}
      </div>
      {picked !== null && (
        <div className="mt-3">
          {pair.note && <p className="mb-3 rounded-xl bg-slate-800/60 p-3 text-sm text-slate-300">💡 {pair.note}</p>}
          <div className="mb-3 flex justify-center gap-2">
            {pair.items.map((it) => (
              <Button key={it.word} variant="secondary" size="sm" onClick={() => void speak(it.word)}>
                ▶ {it.word}
              </Button>
            ))}
          </div>
          <Button size="lg" className="w-full" onClick={next}>
            {i + 1 >= pairIds.length ? '結果を見る' : '次へ'}
          </Button>
        </div>
      )}
    </div>
  )
}
