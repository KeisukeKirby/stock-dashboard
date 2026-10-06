import { useMemo, useState } from 'react'
import { phonics, shuffle } from '@/lib/content'
import { AudioButton } from '@/components/AudioButton'
import { RecorderPanel } from '@/components/RecorderPanel'
import { SpeedToggle } from '@/components/SpeedToggle'
import { Tabs } from '@/components/Tabs'
import { SoundRunner, type SoundStats } from '@/components/learn/SoundRunner'
import { Button, Card, PageTitle, Pill } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { useAudio } from '@/hooks/useAudio'
import { cn } from '@/lib/cn'

type Tab = 'ipa' | 'phonics' | 'pairs' | 'record'

export default function Pronunciation() {
  const [tab, setTab] = useState<Tab>('ipa')
  return (
    <div>
      <PageTitle title="発音トレーナー" subtitle="音を区別して発音できなければ、聞き取れない。まず発音から" right={<SpeedToggle />} />
      <VoiceBanner />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ['ipa', '① 発音記号'],
          ['phonics', '② フォニックス'],
          ['pairs', '③ 最小対'],
          ['record', '④ 録音'],
        ]}
      />
      {tab === 'ipa' && <IpaChart />}
      {tab === 'phonics' && <Phonics />}
      {tab === 'pairs' && <Pairs />}
      {tab === 'record' && <Record />}
    </div>
  )
}

function IpaChart() {
  const [type, setType] = useState<'vowel' | 'consonant'>('vowel')
  const list = phonics.sounds.filter((s) => s.type === type)
  const { speak } = useAudio()
  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {(['vowel', 'consonant'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setType(t)} className={cn('rounded-full px-3 py-1 text-xs', type === t ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
            {t === 'vowel' ? `母音 ${phonics.sounds.filter((s) => s.type === 'vowel').length}` : `子音 ${phonics.sounds.filter((s) => s.type === 'consonant').length}`}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {list.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => void speak(s.examples.map((e) => e.word).join('. '))}
                className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-700 font-ipa text-2xl text-white hover:bg-blue-600"
                aria-label={`${s.symbol} を再生`}
              >
                {s.symbol}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{s.nameJa}</p>
                <p className="text-xs text-slate-400">{s.hint}</p>
                <p className="mt-1 text-[11px] text-slate-500">綴り: {s.spelling.join(', ')}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {s.examples.map((ex) => (
                <button key={ex.word} type="button" onClick={() => void speak(ex.word)} className="rounded-xl bg-slate-800/60 p-2 text-center hover:bg-slate-700/60">
                  <p className="font-en text-lg">{ex.word}</p>
                  <p className="font-ipa text-xs text-amber-200/90">{ex.ipa}</p>
                </button>
              ))}
            </div>
          </Card>
        ))}
        <Card>
          <p className="text-sm font-semibold">コツ</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-300">
            <li>辞書を引いたら必ず発音記号を見る。綴りで読まない。</li>
            <li>ˈ の直後の音節を強く長く。それ以外の母音は ə に潰す。</li>
            <li>鏡で口の形を確認。r は舌をどこにも付けない、th は舌を噛む、v/f は下唇を噛む。</li>
            <li>録音して聞き比べる。自分の耳は自分に甘い。</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Phonics() {
  const { speak } = useAudio()
  return (
    <div className="space-y-3">
      {phonics.patterns.map((p) => (
        <Card key={p.id}>
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono text-base font-bold text-amber-200">{p.pattern}</p>
            <Pill className="font-ipa">{p.sound}</Pill>
          </div>
          <p className="mt-1 text-sm text-slate-300">{p.note}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.examples.map((ex) => (
              <button key={ex} type="button" onClick={() => void speak(ex.replace(/[/→].*$/, '').replace(/\(.*\)/, ''))} className="rounded-lg bg-slate-800/60 px-2.5 py-1 font-en text-sm hover:bg-slate-700/60">
                ▶ {ex}
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}

function Pairs() {
  const [key, setKey] = useState(0)
  const [result, setResult] = useState<SoundStats | null>(null)
  const [count, setCount] = useState(10)
  const ids = useMemo(() => shuffle(phonics.minimalPairs).slice(0, count).map((p) => p.id), [key, count])
  if (result) {
    const pct = result.total ? result.correct / result.total : 0
    return (
      <Card>
        <p className="text-2xl font-bold">
          {result.correct} / {result.total} 正解
        </p>
        <p className="mt-1 text-sm text-slate-400">{pct >= 0.8 ? '8 割超え。速度を 1.0x にして、④ 録音で自分の口で作る。' : '間違えた音は ① 発音記号で口の形を確認してから、もう一度。'}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {Object.entries(result.results).map(([id, ok]) => {
            const p = phonics.minimalPairs.find((x) => x.id === id)
            return (
              <Pill key={id} className={ok ? 'bg-emerald-900/60 text-emerald-200' : 'bg-rose-900/60 text-rose-200'}>
                {p?.feature}
              </Pill>
            )
          })}
        </div>
        <Button
          className="mt-3"
          onClick={() => {
            setResult(null)
            setKey((k) => k + 1)
          }}
        >
          もう {count} 問
        </Button>
      </Card>
    )
  }
  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-xs text-slate-400">
        問題数
        {[10, 15, 22].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => {
              setCount(n)
              setKey((k) => k + 1)
            }}
            className={cn('rounded-full px-3 py-1', count === n ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}
          >
            {n}
          </button>
        ))}
      </div>
      <SoundRunner key={`${key}-${count}`} pairIds={ids} onDone={setResult} />
    </div>
  )
}

function Record() {
  const all = useMemo(() => phonics.minimalPairs.flatMap((p) => p.items.map((it) => ({ ...it, feature: p.feature }))), [])
  const [i, setI] = useState(0)
  const cur = all[i]
  return (
    <div>
      <Card>
        <p className="text-sm text-slate-400">お手本を聞いて録音し、自分の口が同じ音を作れているか聞き比べる。鏡で口の形も見る。</p>
        <div className="mt-3 text-center">
          <p className="font-en text-4xl font-semibold">{cur.word}</p>
          <p className="font-ipa text-lg text-amber-200/90">{cur.ipa}</p>
          <p className="text-sm text-slate-300">
            {cur.ja} <Pill className="ml-1">{cur.feature}</Pill>
          </p>
        </div>
        <div className="mt-2 flex justify-center">
          <AudioButton item={cur.word} size="sm" rate={0.7} className="bg-slate-700 text-slate-100" label="ゆっくり" />
        </div>
        <RecorderPanel target={cur.word} className="mt-3" compact />
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
