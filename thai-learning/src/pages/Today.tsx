import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCards } from '@/hooks/useProgress'
import { useSettings } from '@/hooks/useSettings'
import { buildDailySession, type SessionPlan, type SessionStep } from '@/lib/session'
import { updateLog } from '@/lib/db'
import { roleplayById } from '@/lib/content'
import { StepHeader } from '@/components/StepHeader'
import { ReviewRunner } from '@/components/learn/ReviewRunner'
import { LearnPhraseFlow } from '@/components/learn/LearnPhraseFlow'
import { ShadowRunner } from '@/components/learn/ShadowRunner'
import { QuizRunner } from '@/components/learn/QuizRunner'
import { RoleplayPlayer } from '@/components/learn/RoleplayPlayer'
import { Button, Card, Empty, PageTitle } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'

const STEP_TITLE: Record<SessionStep['kind'], string> = {
  review: '① 復習（SRS）',
  new: '② 新フレーズ',
  shadow: '③ シャドーイング',
  quiz: '④ リスニングクイズ',
  roleplay: '⑤ ミニロールプレイ',
}

export default function Today() {
  const nav = useNavigate()
  const { cards, loaded } = useCards()
  const { settings, loaded: settingsLoaded } = useSettings()
  const [plan, setPlan] = useState<SessionPlan | null>(null)
  const [idx, setIdx] = useState(0)
  const [results, setResults] = useState<Record<string, string>>({})
  const [finished, setFinished] = useState(false)

  // 開始時に一度だけプランを固定する（途中でカードが変わっても揺れない）
  useEffect(() => {
    if (loaded && settingsLoaded && !plan) setPlan(buildDailySession(cards, settings))
  }, [loaded, settingsLoaded, cards, settings, plan])

  const step = plan?.steps[idx]
  const total = plan?.steps.length ?? 0

  const stepSub = useMemo(() => {
    if (!step) return undefined
    switch (step.kind) {
      case 'review':
        return `${step.cards.length} 枚。聞いて分かる／日本語を見て言える の 2 種類`
      case 'new':
        return `${step.phraseIds.length} 個${step.carriedOver ? `（前日からの繰越 ${step.carriedOver}）` : ''}`
      case 'shadow':
        return `${step.phraseIds.length} 文。お手本 → 録音 → 聞き比べ`
      case 'quiz':
        return `${step.questions.length} 問。音声だけで意味を選ぶ`
      case 'roleplay':
        return roleplayById.get(step.roleplayId)?.title
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
            <Button onClick={() => nav('/phrases')}>フレーズを自由に学ぶ</Button>
          </div>
        </Empty>
      </div>
    )
  }

  if (finished) {
    return (
      <div>
        <PageTitle title="今日のメニュー 完了 🎉" subtitle={`Day ${plan.dayNumber}`} />
        <Card>
          <ul className="space-y-1 text-sm">
            {plan.steps.map((s) => (
              <li key={s.kind} className="flex justify-between">
                <span>{STEP_TITLE[s.kind]}</span>
                <span className="text-slate-400">{results[s.kind] ?? '✓'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-300">お疲れさまでした。昼のスキマ時間に 5 分復習を回すと定着が段違いです。</p>
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
        subtitle={`Day ${plan.dayNumber} ・ 目安 ${plan.estMinutes} 分`}
        right={
          <Button variant="ghost" size="sm" onClick={() => void completeStep(step!.kind, 'スキップ')}>
            スキップ →
          </Button>
        }
      />
      <VoiceBanner />
      {step && <StepHeader title={STEP_TITLE[step.kind]} index={idx} total={total} sub={stepSub} />}

      {step?.kind === 'review' && (
        <ReviewRunner key={`review-${idx}`} cards={step.cards} onDone={(s) => void completeStep('review', `${s.done} 枚（言えない ${s.again}）`)} />
      )}
      {step?.kind === 'new' && (
        <LearnPhraseFlow key={`new-${idx}`} phraseIds={step.phraseIds} onDone={(n) => void completeStep('new', `${n} 個`)} />
      )}
      {step?.kind === 'shadow' && <ShadowRunner key={`shadow-${idx}`} phraseIds={step.phraseIds} onDone={() => void completeStep('shadow', '✓')} />}
      {step?.kind === 'quiz' && (
        <QuizRunner key={`quiz-${idx}`} questions={step.questions} onDone={(s) => void completeStep('quiz', `${s.correct} / ${s.total} 正解`)} />
      )}
      {step?.kind === 'roleplay' && roleplayById.get(step.roleplayId) && (
        <RoleplayPlayer
          key={`rp-${idx}`}
          roleplay={roleplayById.get(step.roleplayId)!}
          onDone={(mood) => void completeStep('roleplay', mood === 'good' ? '良い流れ' : mood === 'declined' ? '爽やかに引けた' : '✓')}
        />
      )}
    </div>
  )
}
