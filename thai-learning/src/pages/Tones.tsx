import { useEffect, useMemo, useState } from 'react'
import { tones, shuffle } from '@/lib/content'
import type { ToneExample, ToneId } from '@/lib/types'
import { updateLog } from '@/lib/db'
import { AudioButton } from '@/components/AudioButton'
import { RecorderPanel } from '@/components/RecorderPanel'
import { SpeedToggle } from '@/components/SpeedToggle'
import { Button, Card, PageTitle, Pill } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { useAudio } from '@/hooks/useAudio'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/cn'

type Tab = 'learn' | 'quiz' | 'pairs' | 'record'

const toneName: Record<ToneId, string> = Object.fromEntries(tones.tones.map((t) => [t.id, t.nameJa])) as Record<ToneId, string>
const toneColor: Record<ToneId, string> = {
  mid: 'bg-slate-500',
  low: 'bg-sky-600',
  falling: 'bg-rose-500',
  high: 'bg-amber-400',
  rising: 'bg-emerald-500',
}
const TONE_ORDER: ToneId[] = ['mid', 'low', 'falling', 'high', 'rising']

export default function Tones() {
  const [tab, setTab] = useState<Tab>('learn')
  return (
    <div>
      <PageTitle title="声調トレーナー" subtitle="5 つの声調を耳と口で。最初の 2 日間は毎日 15〜20 分" right={<SpeedToggle />} />
      <VoiceBanner />
      <div className="mb-4 grid grid-cols-4 gap-1 rounded-xl bg-slate-900 p-1 text-sm">
        {(
          [
            ['learn', '① 学ぶ'],
            ['quiz', '② 聞き分け'],
            ['pairs', '③ 最小対'],
            ['record', '④ 録音'],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cn('rounded-lg px-2 py-2', tab === k ? 'bg-amber-400 font-semibold text-slate-950' : 'text-slate-300')}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'learn' && <Learn />}
      {tab === 'quiz' && <ToneQuiz />}
      {tab === 'pairs' && <Pairs />}
      {tab === 'record' && <Record />}
    </div>
  )
}

function ToneGlyph({ tone }: { tone: ToneId }) {
  // 簡易ピッチ曲線
  const d: Record<ToneId, string> = {
    mid: 'M2 16 L30 16',
    low: 'M2 22 L30 23',
    falling: 'M2 8 Q16 10 30 26',
    high: 'M2 14 Q16 12 30 6',
    rising: 'M2 22 Q14 22 30 6',
  }
  return (
    <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden>
      <path d={d[tone]} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

function Learn() {
  const { settings } = useSettings()
  return (
    <div className="space-y-3">
      {tones.tones.map((t) => (
        <Card key={t.id}>
          <div className="flex items-center gap-3">
            <span className={cn('inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-950', toneColor[t.id])}>
              <ToneGlyph tone={t.id} />
            </span>
            <div className="flex-1">
              <p className="font-bold">
                {t.nameJa} <span className="ml-1 font-mono text-amber-200">{t.mark}</span>
                <span className="ml-2 font-thai text-sm text-slate-400">{t.nameTh}</span>
              </p>
              <p className="text-xs text-slate-400">{t.hint}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {t.examples.map((ex) => (
              <div key={ex.thai} className="rounded-xl bg-slate-800/60 p-2 text-center">
                <p lang="th" className="font-thai text-xl">
                  {ex.thai}
                </p>
                <p className="font-mono text-xs text-amber-200/90">{ex.roman}</p>
                {settings.showKana && ex.kana && <p className="text-[10px] text-slate-400">{ex.kana}</p>}
                <p className="text-[11px] text-slate-400">{ex.ja}</p>
                <AudioButton item={{ text: ex.thai }} size="sm" className="mt-1" />
              </div>
            ))}
          </div>
        </Card>
      ))}
      <Card>
        <p className="text-sm font-semibold">コツ</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>声調は「音の高さの動き」。日本語のアクセント（高低）より幅を大げさに。</li>
          <li>下降声は「えぇ〜↓」とがっかりする声、上昇声は「ん？↗」と聞き返す声。</li>
          <li>ローマ字の記号（à â á ǎ）を見たら必ず声調を意識して読む。</li>
          <li>ครับ は高声。語尾を軽く上げて張る。</li>
        </ul>
      </Card>
    </div>
  )
}

function ToneQuiz() {
  const [items, setItems] = useState<ToneExample[]>(() => shuffle(tones.quiz).slice(0, 10))
  const [i, setI] = useState(0)
  const [picked, setPicked] = useState<ToneId | null>(null)
  const [score, setScore] = useState(0)
  const { speak } = useAudio()
  const cur = items[i]

  useEffect(() => {
    setPicked(null)
    if (cur) {
      const t = setTimeout(() => void speak(cur.thai), 300)
      return () => clearTimeout(t)
    }
  }, [i, cur, speak])

  if (!cur) {
    return (
      <Card>
        <p className="text-2xl font-bold">
          {score} / {items.length} 正解
        </p>
        <p className="mt-1 text-sm text-slate-400">7 割を超えたら最小対へ。間違えた声調は「学ぶ」で例を聞き直す。</p>
        <Button
          className="mt-3"
          onClick={() => {
            setItems(shuffle(tones.quiz).slice(0, 10))
            setI(0)
            setScore(0)
          }}
        >
          もう 10 問
        </Button>
      </Card>
    )
  }

  async function choose(t: ToneId) {
    if (picked) return
    setPicked(t)
    const ok = t === cur.tone
    if (ok) setScore((s) => s + 1)
    await updateLog((l) => {
      l.toneQuizTotal = (l.toneQuizTotal ?? 0) + 1
      if (ok) l.toneQuizCorrect = (l.toneQuizCorrect ?? 0) + 1
    })
  }

  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        問題 {i + 1} / {items.length}　正解 {score}
      </p>
      <Card className="text-center">
        <p className="text-sm text-slate-400">音を聞いて、声調を選んでください</p>
        <AudioButton item={{ text: cur.thai }} size="lg" className="mx-auto mt-3" />
        <div className="mt-2">
          <AudioButton item={{ text: cur.thai }} size="sm" rate={0.6} className="bg-slate-700 text-slate-100 hover:bg-slate-600" label="ゆっくり" />
          <span className="ml-2 text-xs text-slate-400">ゆっくり 0.6x</span>
        </div>
        {picked && (
          <div className="mt-3 border-t border-slate-800 pt-3">
            <p lang="th" className="font-thai text-3xl">
              {cur.thai}
            </p>
            <p className="font-mono text-amber-200/90">{cur.roman}</p>
            <p className="text-sm text-slate-300">
              {cur.ja} — <span className="font-semibold">{toneName[cur.tone]}</span>
            </p>
          </div>
        )}
      </Card>
      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {TONE_ORDER.map((t) => {
          const state = !picked ? 'idle' : t === cur.tone ? 'correct' : t === picked ? 'wrong' : 'dim'
          return (
            <button
              key={t}
              type="button"
              onClick={() => void choose(t)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] transition',
                state === 'idle' && 'border-slate-700 bg-slate-900 hover:bg-slate-800',
                state === 'correct' && 'border-emerald-500 bg-emerald-500/20',
                state === 'wrong' && 'border-rose-500 bg-rose-500/20',
                state === 'dim' && 'border-slate-800 opacity-50',
              )}
            >
              <span className={cn('inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-950', toneColor[t])}>
                <ToneGlyph tone={t} />
              </span>
              {toneName[t].replace('（中）', '')}
            </button>
          )
        })}
      </div>
      {picked && (
        <Button size="lg" className="mt-4 w-full" onClick={() => setI(i + 1)}>
          次へ
        </Button>
      )}
    </div>
  )
}

function Pairs() {
  const [pi, setPi] = useState(0)
  const [target, setTarget] = useState<ToneExample | null>(null)
  const [picked, setPicked] = useState<string | null>(null)
  const { speak } = useAudio()
  const pair = tones.minimalPairs[pi]

  const newQuestion = () => {
    const t = pair.items[Math.floor(Math.random() * pair.items.length)]
    setTarget(t)
    setPicked(null)
    void speak(t.thai)
  }

  useEffect(() => {
    setTarget(null)
    setPicked(null)
  }, [pi])

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {tones.minimalPairs.map((p, idx) => (
          <button key={p.id} type="button" onClick={() => setPi(idx)} className={cn('rounded-full px-3 py-1 text-xs', idx === pi ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
            {p.items.map((x) => x.thai).join(' / ')}
          </button>
        ))}
      </div>
      <Card>
        {pair.note && <p className="mb-3 text-sm text-slate-300">💡 {pair.note}</p>}
        <div className={cn('grid gap-2', pair.items.length <= 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-5')}>
          {pair.items.map((it) => {
            const state = !picked || !target ? 'idle' : it.thai === target.thai ? 'correct' : it.thai === picked ? 'wrong' : 'dim'
            return (
              <button
                key={it.thai}
                type="button"
                onClick={() => {
                  if (target && !picked) setPicked(it.thai)
                  else void speak(it.thai)
                }}
                className={cn(
                  'rounded-xl border p-3 text-center transition',
                  state === 'idle' && 'border-slate-700 bg-slate-900 hover:bg-slate-800',
                  state === 'correct' && 'border-emerald-500 bg-emerald-500/20',
                  state === 'wrong' && 'border-rose-500 bg-rose-500/20',
                  state === 'dim' && 'border-slate-800 opacity-50',
                )}
              >
                <p lang="th" className="font-thai text-2xl">
                  {it.thai}
                </p>
                <p className="font-mono text-xs text-amber-200/90">{it.roman}</p>
                <p className="text-[11px] text-slate-400">{it.ja}</p>
                <Pill className={cn('mt-1 text-slate-950', toneColor[it.tone])}>{toneName[it.tone].replace('（中）', '')}</Pill>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs text-slate-400">タップで再生。「出題」を押すと 1 つがランダムに再生されるので、どれか当てる。</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={newQuestion}>
            🔊 出題{target && !picked ? '（もう一度）' : ''}
          </Button>
          <Button onClick={newQuestion} disabled={!picked}>
            次の問題
          </Button>
        </div>
        {picked && target && (
          <p className={cn('mt-2 text-center text-sm font-semibold', picked === target.thai ? 'text-emerald-300' : 'text-rose-300')}>
            {picked === target.thai ? '正解！' : `不正解… 正解は ${target.thai} (${target.roman})`}
          </p>
        )}
      </Card>
    </div>
  )
}

function Record() {
  const all = useMemo(() => tones.minimalPairs.flatMap((p) => p.items), [])
  const [i, setI] = useState(0)
  const cur = all[i]
  return (
    <div>
      <Card>
        <p className="text-sm text-slate-400">お手本を聞いて録音し、自分の声調が同じ「動き」になっているか聞き比べる</p>
        <div className="mt-3 text-center">
          <p lang="th" className="font-thai text-4xl">
            {cur.thai}
          </p>
          <p className="font-mono text-lg text-amber-200/90">{cur.roman}</p>
          <p className="text-sm text-slate-300">
            {cur.ja} — {toneName[cur.tone]}
          </p>
        </div>
        <RecorderPanel thai={cur.thai} className="mt-3" />
        <div className="mt-3 flex gap-2">
          <Button variant="secondary" className="flex-1" disabled={i === 0} onClick={() => setI(i - 1)}>
            ← 前
          </Button>
          <Button className="flex-1" disabled={i >= all.length - 1} onClick={() => setI(i + 1)}>
            次 →
          </Button>
        </div>
      </Card>
    </div>
  )
}
