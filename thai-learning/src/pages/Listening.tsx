import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useCards } from '@/hooks/useProgress'
import { buildQuiz, makeQuestion, type QuizQuestion } from '@/lib/session'
import { phrases, phrasesByScene, sceneById, shuffle } from '@/lib/content'
import { QuizRunner, type QuizStats } from '@/components/learn/QuizRunner'
import { Button, Card, PageTitle } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { cn } from '@/lib/cn'

export default function Listening() {
  const nav = useNavigate()
  const loc = useLocation() as { state?: { sceneId?: string } }
  const { cards, loaded } = useCards()
  const [qs, setQs] = useState<QuizQuestion[] | null>(null)
  const [result, setResult] = useState<QuizStats | null>(null)
  const [count, setCount] = useState(10)
  const [source, setSource] = useState<'learned' | 'all' | 'scene'>(loc.state?.sceneId ? 'scene' : 'learned')
  const sceneId = loc.state?.sceneId

  function start() {
    const introduced = new Set(cards.map((c) => c.phraseId))
    let questions: QuizQuestion[]
    if (source === 'scene' && sceneId) {
      questions = shuffle(phrasesByScene.get(sceneId) ?? [])
        .slice(0, count)
        .map((p) => makeQuestion(p, (p.tags ?? []).includes('reply') ? 'reply' : 'meaning'))
    } else if (source === 'all' || introduced.size < 4) {
      questions = buildQuiz(new Set(phrases.map((p) => p.id)), count, 3)
    } else {
      questions = buildQuiz(introduced, count, 3)
    }
    setQs(questions)
    setResult(null)
  }

  if (result) {
    return (
      <div>
        <PageTitle title="リスニングクイズ 結果" />
        <Card>
          <p className="text-3xl font-bold">
            {result.correct} / {result.total}
          </p>
          <p className="mt-1 text-sm text-slate-400">{result.correct / Math.max(1, result.total) >= 0.8 ? 'いい耳です。速度を 1.0x にして挑戦してみましょう。' : '間違えたフレーズは「フレーズ学習」で聞き直すと定着します。'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => nav('/')}>
              ホームへ
            </Button>
            <Button onClick={start}>もう一回</Button>
          </div>
        </Card>
      </div>
    )
  }

  if (qs) {
    return (
      <div>
        <PageTitle title="リスニングクイズ" right={<Button variant="ghost" size="sm" onClick={() => setQs(null)}>やめる</Button>} />
        <QuizRunner questions={qs} onDone={setResult} />
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="リスニングクイズ" subtitle="音声だけを聞いて意味を 4 択。相手が返しそうなフレーズも出ます" />
      <VoiceBanner />
      <Card>
        <p className="text-sm font-semibold">出題範囲</p>
        <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
          {(
            [
              ['learned', '学習済みから'],
              ['all', '全フレーズから'],
              ['scene', sceneId ? `${sceneById.get(sceneId)?.title}` : '場面指定なし'],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              disabled={k === 'scene' && !sceneId}
              onClick={() => setSource(k)}
              className={cn('rounded-xl border px-2 py-2 disabled:opacity-40', source === k ? 'border-amber-400 bg-amber-400/15' : 'border-slate-700 bg-slate-900')}
            >
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
    </div>
  )
}
