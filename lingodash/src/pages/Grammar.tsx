import { Link, useNavigate, useParams } from 'react-router-dom'
import { grammarById, grammarUnits } from '@/lib/content'
import { useKvList } from '@/hooks/useProgress'
import type { GrammarState } from '@/lib/types'
import { PHASE_JA } from '@/lib/types'
import { GrammarRunner } from '@/components/learn/GrammarRunner'
import { Button, Card, Empty, PageTitle, Pill, ProgressBar } from '@/components/ui'

export default function Grammar() {
  const { unitId } = useParams()
  const nav = useNavigate()
  const { rows } = useKvList<GrammarState>('grammar:')
  const stateById = new Map(rows.map((r) => [r.value.unitId, r.value]))

  if (unitId) {
    const unit = grammarById.get(unitId)
    if (!unit) return <Empty>ユニットが見つかりません</Empty>
    return (
      <div>
        <PageTitle
          title={`Unit ${unit.order}`}
          subtitle={unit.titleEn}
          right={
            <Link to="/grammar" className="text-xs text-slate-400 underline">
              ← 一覧
            </Link>
          }
        />
        <GrammarRunner key={unit.id} unitId={unit.id} onDone={() => nav('/grammar')} />
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="文法" subtitle="非ネイティブである限り、構造を正確に。例文は声に出して言えるまで" />
      <Card className="mb-4">
        <p className="text-sm text-slate-300">
          各ユニット：① 要点（日本語で短く）→ ② 例文 5 文を日本語から声に出す（録音可）→ ③ ミニクイズ 3 問。
          <br />
          教材：Basic Grammar in Use / 一億人の英文法 の該当章を併読。
        </p>
      </Card>
      <div className="space-y-2">
        {grammarUnits.map((u) => {
          const st = stateById.get(u.id)
          return (
            <Link key={u.id} to={`/grammar/${u.id}`}>
              <Card className="transition hover:border-amber-500/50">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-bold">
                      Unit {u.order}: {u.title}
                    </p>
                    <p className="font-en text-xs text-slate-400">{u.titleEn}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill>{PHASE_JA[u.phase]}</Pill>
                    {st && (
                      <Pill className={st.quizBest === st.quizTotal ? 'bg-emerald-900/60 text-emerald-200' : ''}>
                        クイズ {st.quizBest}/{st.quizTotal}
                      </Pill>
                    )}
                  </div>
                </div>
                <ProgressBar value={st?.drilled ?? 0} max={u.drills.length} className="mt-2" color="bg-slate-500" />
              </Card>
            </Link>
          )
        })}
      </div>
      <div className="mt-4">
        <Button variant="secondary" onClick={() => nav('/plan/resources')}>
          📚 文法の教材を見る
        </Button>
      </div>
    </div>
  )
}
