import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCards, usePlan, setActiveMode } from '@/hooks/useProgress'
import { useSettings } from '@/hooks/useSettings'
import { buildDailySession, STEP_MODE, type SessionPlan, type SessionStep } from '@/lib/session'
import { updateLog } from '@/lib/db'
import { grammarById, roleplayById } from '@/lib/content'
import { PHASE_JA, type Phase, type StepKind } from '@/lib/types'
import { StepHeader } from '@/components/StepHeader'
import { SoundRunner } from '@/components/learn/SoundRunner'
import { ReviewRunner } from '@/components/learn/ReviewRunner'
import { LearnItemFlow } from '@/components/learn/LearnItemFlow'
import { GrammarRunner } from '@/components/learn/GrammarRunner'
import { ShadowRunner } from '@/components/learn/ShadowRunner'
import { QuizRunner } from '@/components/learn/QuizRunner'
import { DictationRunner } from '@/components/learn/DictationRunner'
import { SpeakRunner } from '@/components/learn/SpeakRunner'
import { WriteRunner } from '@/components/learn/WriteRunner'
import { RoleplayPlayer } from '@/components/learn/RoleplayPlayer'
import { Button, Card, Empty, PageTitle, Pill } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'

const STEP_TITLE: Record<StepKind, string> = {
  sound: '発音：最小対の聞き分け',
  review: '復習（SRS）',
  new: '新アイテム',
  grammar: '文法：例文を声に出す',
  shadow: '音読 → シャドーイング（録音）',
  listen: 'リスニング：クイズ＋ディクテーション',
  speak: 'スピーキング：3 秒で話し始める',
  roleplay: 'ロールプレイ',
  write: 'クイックライティング',
}
const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩']

export default function Today() {
  const nav = useNavigate()
  const { cards, loaded } = useCards()
  const { settings, loaded: settingsLoaded } = useSettings()
  const { plan: learnPlan, loaded: planLoaded } = usePlan()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<string, string>>({})
  const [finished, setFinished] = useState(false)
  const [listenPhase, setListenPhase] = useState<'quiz' | 'dictation'>('quiz')
  const [listenNote, setListenNote] = useState('')

  useEffect(() => {
    if (loaded && settingsLoaded && planLoaded && !plan) setPlan(buildDailySession(cards, settings, learnPlan))
  }, [loaded, settingsLoaded, planLoaded, cards, settings, learnPlan, plan])

  const step = plan?.steps[idx]
  const total = plan?.steps.length ?? 0

  useEffect(() => {
    setActiveMode(step ? STEP_MODE[step.kind] : null)
    return () => setActiveMode(null)
  }, [step])

  const stepSub = useMemo(() => {
    if (!step) return undefined
    switch (step.kind) {
      case 'sound':
        return `${step.pairIds.length} 問。聞き分けられない音は言えないし、聞き取れない`
      case 'review':
        return `${step.cards.length} 枚。聞いて分かる／日本語を見て言える の 2 種類`
      case 'new':
        return `${step.itemIds.length} 個${step.carriedOver ? `（繰越 ${step.carriedOver}）` : ''}`
      case 'grammar':
        return grammarById.get(step.unitId)?.title
      case 'shadow':
        return `${step.itemIds.length} 文。フルセンテンスで読み切る → お手本に重ねる → 録音`
      case 'listen':
        return `クイズ ${step.questions.length} 問 ＋ ディクテーション ${step.dictationIds.length} 文`
      case 'speak':
        return `${step.promptIds.length} 問。反射的に英語が出るまで`
      case 'roleplay':
        return roleplayById.get(step.roleplayId)?.title
      case 'write':
        return '口に出す感覚で、思ったまま書く'
    }
  }, [step])

  async function completeStep(kind: SessionStep['kind'], summary: string) {
    setResults((r) => ({ ...r, [kind]: summary }))
    await updateLog((l) => {
      l.steps[kind] = true
    })
    if (idx + 1 >= total) {
      await updateLog((l) => {
        l.menuCompleted = true
      })
      setFinished(true)
    } else {
      setIdx(idx + 1)
      setListenPhase('quiz')
      setListenNote('')
    }
  }

  if (!plan) return <p className="text-slate-400">読み込み中…</p>

  if (plan.steps.length === 0) {
    return (
      <div>
        <PageTitle title="今日のメニュー" />
        <Empty>
          今日やることはありません。
          <div className="mt-3">
            <Button onClick={() => nav('/vocab')}>語彙を自由に学ぶ</Button>
          </div>
        </Empty>
      </div>
    )
  }

  if (finished) {
    const inputSteps = plan.steps.filter((s) => STEP_MODE[s.kind] === 'input').length
    return (
      <div>
        <PageTitle title="今日のメニュー 完了 🎉" subtitle={`Week ${plan.week} ・ ${PHASE_JA[plan.phase as Phase]}フェーズ`} />
        <Card>
          <ul className="space-y-1 text-sm">
            {plan.steps.map((s, i) => (
              <li key={s.kind} className="flex justify-between gap-2">
                <span>
                  {CIRCLED[i]} {STEP_TITLE[s.kind]}
                  <Pill className="ml-2">{STEP_MODE[s.kind] === 'input' ? 'IN' : 'OUT'}</Pill>
                </span>
                <span className="text-right text-slate-400">{results[s.kind] ?? '✓'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-300">
            お疲れさまでした。インプット {inputSteps} ステップ／アウトプット {plan.steps.length - inputSteps} ステップ。あとは動画を 1 本、英語字幕で。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => nav('/')}>
              ホームへ
            </Button>
            <Button onClick={() => nav('/quick')}>もう 5 分復習</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageTitle
        title="今日のメニュー"
        subtitle={`Week ${plan.week} ・ ${PHASE_JA[plan.phase as Phase]} ・ 目安 ${plan.estMinutes} 分`}
        right={
          <Button variant="ghost" size="sm" onClick={() => void completeStep(step!.kind, 'スキップ')}>
            スキップ →
          </Button>
        }
      />
      <VoiceBanner />
      {step && <StepHeader title={`${CIRCLED[idx]} ${STEP_TITLE[step.kind]}`} index={idx} total={total} sub={stepSub} />}

      {step?.kind === 'sound' && <SoundRunner key={`sound-${idx}`} pairIds={step.pairIds} onDone={(s) => void completeStep('sound', `${s.correct} / ${s.total} 正解`)} />}
      {step?.kind === 'review' && <ReviewRunner key={`review-${idx}`} cards={step.cards} onDone={(s) => void completeStep('review', `${s.done} 枚（言えない ${s.again}）`)} />}
      {step?.kind === 'new' && <LearnItemFlow key={`new-${idx}`} itemIds={step.itemIds} onDone={(n) => void completeStep('new', `${n} 個`)} />}
      {step?.kind === 'grammar' && <GrammarRunner key={`grammar-${idx}`} unitId={step.unitId} onDone={(r) => void completeStep('grammar', `クイズ ${r.correct} / ${r.total}`)} />}
      {step?.kind === 'shadow' && <ShadowRunner key={`shadow-${idx}`} itemIds={step.itemIds} onDone={() => void completeStep('shadow', '✓')} />}
      {step?.kind === 'listen' &&
        (listenPhase === 'quiz' && step.questions.length > 0 ? (
          <QuizRunner
            key={`quiz-${idx}`}
            questions={step.questions}
            onDone={(s) => {
              setListenNote(`クイズ ${s.correct} / ${s.total}`)
              if (step.dictationIds.length > 0) setListenPhase('dictation')
              else void completeStep('listen', `クイズ ${s.correct} / ${s.total}`)
            }}
          />
        ) : (
          <DictationRunner
            key={`dict-${idx}`}
            ids={step.dictationIds}
            onDone={(d) => {
              const avg = d.scores.length ? Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 100) : 0
              void completeStep('listen', `${listenNote ? listenNote + '・' : ''}書き取り ${avg}%`)
            }}
          />
        ))}
      {step?.kind === 'speak' && <SpeakRunner key={`speak-${idx}`} promptIds={step.promptIds} onDone={(n) => void completeStep('speak', `${n} 問`)} />}
      {step?.kind === 'roleplay' && roleplayById.get(step.roleplayId) && (
        <RoleplayPlayer key={`rp-${idx}`} roleplay={roleplayById.get(step.roleplayId)!} onDone={(mood) => void completeStep('roleplay', mood === 'good' ? '良い流れ' : mood === 'declined' ? 'きれいに引けた' : '✓')} />
      )}
      {step?.kind === 'write' && <WriteRunner key={`write-${idx}`} promptId={step.promptId} onDone={(w) => void completeStep('write', `${w} 語`)} />}
    </div>
  )
}
