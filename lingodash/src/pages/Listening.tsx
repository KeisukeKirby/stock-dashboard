import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCards, useKvList } from '@/hooks/useProgress'
import { buildQuiz, makeQuestion, type QuizQuestion } from '@/lib/session'
import { items, itemsByScene, materials, sceneById, shuffle } from '@/lib/content'
import { kvDelete, kvSet, updateLog } from '@/lib/db'
import type { ShadowLog } from '@/lib/types'
import { QuizRunner, type QuizStats } from '@/components/learn/QuizRunner'
import { DictationRunner, type DictationStats } from '@/components/learn/DictationRunner'
import { RecorderPanel } from '@/components/RecorderPanel'
import { Tabs } from '@/components/Tabs'
import { Button, Card, PageTitle, Pill, ProgressBar } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { cn } from '@/lib/cn'

type Tab = 'quiz' | 'dictation' | 'shadow'

export default function Listening() {
  const loc = useLocation() as { state?: { sceneId?: string } }
  const [tab, setTab] = useState<Tab>('quiz')
  return (
    <div>
      <PageTitle title="リスニング" subtitle="最難関。発音記号 → 英語字幕 → 字幕なし。相当な量の聞き込みが必要" />
      <VoiceBanner />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ['quiz', '🎧 クイズ'],
          ['dictation', '✍️ ディクテーション'],
          ['shadow', '🔁 500 回'],
        ]}
      />
      {tab === 'quiz' && <Quiz sceneId={loc.state?.sceneId} />}
      {tab === 'dictation' && <Dictation />}
      {tab === 'shadow' && <ShadowLogPanel />}
    </div>
  )
}

function Quiz({ sceneId }: { sceneId?: string }) {
  const nav = useNavigate()
  const { cards, loaded } = useCards()
  const [qs, setQs] = useState<QuizQuestion[] | null>(null)
  const [result, setResult] = useState<QuizStats | null>(null)
  const [count, setCount] = useState(10)
  const [source, setSource] = useState<'learned' | 'all' | 'scene'>(sceneId ? 'scene' : 'learned')

  function start() {
    const introduced = new Set(cards.map((c) => c.itemId))
    let questions: QuizQuestion[]
    if (source === 'scene' && sceneId) {
      questions = shuffle(itemsByScene.get(sceneId) ?? [])
        .slice(0, count)
        .map((p) => makeQuestion(p, (p.tags ?? []).includes('reply') ? 'reply' : 'meaning'))
    } else if (source === 'all' || introduced.size < 4) {
      questions = buildQuiz(new Set(items.map((p) => p.id)), count, 3)
    } else {
      questions = buildQuiz(introduced, count, 3)
    }
    setQs(questions)
    setResult(null)
  }

  if (result) {
    return (
      <Card>
        <p className="text-3xl font-bold">
          {result.correct} / {result.total}
        </p>
        <p className="mt-1 text-sm text-slate-400">{result.correct / Math.max(1, result.total) >= 0.8 ? 'いい耳です。速度を 1.0x にして挑戦。' : '間違えたものは「語彙」で聞き直すと定着します。'}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => nav('/')}>
            ホームへ
          </Button>
          <Button onClick={start}>もう一回</Button>
        </div>
      </Card>
    )
  }
  if (qs) {
    return (
      <div>
        <div className="mb-2 text-right">
          <Button variant="ghost" size="sm" onClick={() => setQs(null)}>
            やめる
          </Button>
        </div>
        <QuizRunner questions={qs} onDone={setResult} />
      </div>
    )
  }
  return (
    <Card>
      <p className="text-sm font-semibold">出題範囲</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
        {(
          [
            ['learned', '学習済みから'],
            ['all', '全アイテムから'],
            ['scene', sceneId ? `${sceneById.get(sceneId)?.title}` : 'テーマ指定なし'],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" disabled={k === 'scene' && !sceneId} onClick={() => setSource(k)} className={cn('rounded-xl border px-2 py-2 disabled:opacity-40', source === k ? 'border-amber-400 bg-amber-400/15' : 'border-slate-700 bg-slate-900')}>
            {label}
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm font-semibold">問題数</p>
      <div className="mt-2 flex gap-2">
        {[5, 10, 15, 20].map((n) => (
          <button key={n} type="button" onClick={() => setCount(n)} className={cn('rounded-full px-3 py-1 text-sm', count === n ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
            {n}
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-4 w-full" disabled={!loaded} onClick={start}>
        ▶ 開始
      </Button>
    </Card>
  )
}

function Dictation() {
  const [level, setLevel] = useState<'all' | 'A' | 'B' | 'C'>('all')
  const [count, setCount] = useState(4)
  const [key, setKey] = useState(0)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<DictationStats | null>(null)
  const ids = useMemo(() => {
    const pool = materials.dictation.filter((d) => level === 'all' || d.level.startsWith(level))
    return shuffle(pool).slice(0, count).map((d) => d.id)
  }, [level, count, key])
  if (result) {
    const avg = Math.round((result.scores.reduce((a, b) => a + b, 0) / Math.max(1, result.scores.length)) * 100)
    return (
      <Card>
        <p className="text-3xl font-bold">平均 {avg}%</p>
        <p className="mt-1 text-sm text-slate-400">書き取りは「書いたもの」を音読して終わる。CBS Evening News の冒頭 1 分でも同じ手順で。</p>
        <Button
          className="mt-3"
          onClick={() => {
            setResult(null)
            setRunning(false)
            setKey((k) => k + 1)
          }}
        >
          もう一回
        </Button>
      </Card>
    )
  }
  if (running) return <DictationRunner key={key} ids={ids} onDone={setResult} />
  return (
    <Card>
      <p className="text-sm text-slate-300">文を聞いて書き取る。聞き取れなかった語＝自分が発音できていない音。ニュースのディクテーションはライティングにも効く。</p>
      <p className="mt-3 text-sm font-semibold">レベル</p>
      <div className="mt-2 flex gap-2">
        {(
          [
            ['all', 'すべて'],
            ['A', 'A1–A2'],
            ['B', 'B1–B2'],
            ['C', 'C1'],
          ] as const
        ).map(([k, l]) => (
          <button key={k} type="button" onClick={() => setLevel(k)} className={cn('rounded-full px-3 py-1 text-sm', level === k ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
            {l}
          </button>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold">文の数</p>
      <div className="mt-2 flex gap-2">
        {[2, 4, 6].map((n) => (
          <button key={n} type="button" onClick={() => setCount(n)} className={cn('rounded-full px-3 py-1 text-sm', count === n ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
            {n}
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-4 w-full" onClick={() => setRunning(true)}>
        ▶ 開始
      </Button>
    </Card>
  )
}

const GOAL = 500

function ShadowLogPanel() {
  const { rows } = useKvList<ShadowLog>('shadow:')
  const logs = new Map(rows.map((r) => [r.value.materialId, r.value]))
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [openRec, setOpenRec] = useState<string | null>(null)

  const presets = materials.shadowing
  const customs = rows.filter((r) => r.value.custom).map((r) => r.value)

  async function bump(m: ShadowLog, n: number) {
    await kvSet(`shadow:${m.materialId}`, { ...m, count: Math.max(0, m.count + n), lastAt: Date.now() })
    if (n > 0) {
      await updateLog((l) => {
        l.shadowReps += n
      })
    }
  }

  function logFor(id: string, titleFallback: string, u?: string): ShadowLog {
    return logs.get(id) ?? { materialId: id, title: titleFallback, count: 0, url: u }
  }

  const all = [...presets.map((p) => ({ id: p.id, title: p.title, source: p.source, url: p.url, note: p.note, level: p.level, custom: false })), ...customs.map((c) => ({ id: c.materialId, title: c.title, source: '自分の素材', url: c.url, note: c.note ?? '', level: '', custom: true }))]
  const sorted = [...all].sort((a, b) => (logs.get(b.id)?.count ?? 0) - (logs.get(a.id)?.count ?? 0))

  return (
    <div>
      <Card className="mb-3">
        <p className="text-sm text-slate-300">「これだ」という素材を 1 本決めて 500 回聞き直す。イントネーション・息継ぎ・スピードまで真似る。聞いたら 1 回ずつカウント。10 回ごとに録音してダブルチェック。</p>
        <div className="mt-2 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setAdding((a) => !a)}>
            ＋ 自分の素材を追加
          </Button>
        </div>
        {adding && (
          <div className="mt-3 space-y-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="タイトル（例：TED - The power of vulnerability）" className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm" />
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL（任意）" className="w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm" />
            <Button
              size="sm"
              disabled={!title.trim()}
              onClick={() => {
                const id = `custom-${Date.now()}`
                void kvSet(`shadow:${id}`, { materialId: id, title: title.trim(), count: 0, custom: true, url: url.trim() || undefined } satisfies ShadowLog)
                setTitle('')
                setUrl('')
                setAdding(false)
              }}
            >
              追加
            </Button>
          </div>
        )}
      </Card>
      <div className="space-y-2">
        {sorted.map((m) => {
          const lg = logFor(m.id, m.title, m.url)
          return (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {m.title}
                    {m.level && <Pill className="ml-2">{m.level}</Pill>}
                  </p>
                  <p className="text-xs text-slate-400">
                    {m.source}
                    {m.url && (
                      <>
                        {' ・ '}
                        <a href={m.url} target="_blank" rel="noreferrer" className="text-amber-300 underline">
                          開く
                        </a>
                      </>
                    )}
                  </p>
                  {m.note && <p className="mt-1 text-xs text-slate-500">{m.note}</p>}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold tabular-nums">
                    {lg.count}
                    <span className="text-xs text-slate-400"> / {GOAL}</span>
                  </p>
                </div>
              </div>
              <ProgressBar value={lg.count} max={GOAL} className="mt-2" />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void bump(lg, 1)}>
                  ＋1 回
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void bump(lg, 5)}>
                  ＋5
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void bump(lg, -1)}>
                  −1
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setOpenRec(openRec === m.id ? null : m.id)}>
                  🎙 録音チェック
                </Button>
                {m.custom && (
                  <Button size="sm" variant="ghost" className="text-rose-300" onClick={() => confirm('この素材を削除しますか？') && void kvDelete(`shadow:${m.id}`)}>
                    削除
                  </Button>
                )}
              </div>
              {openRec === m.id && <RecorderPanel className="mt-2" compact />}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
