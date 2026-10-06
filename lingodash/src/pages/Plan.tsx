import { useNavigate, useParams } from 'react-router-dom'
import { curriculum, grammarById, materialById, method, resources, sceneById } from '@/lib/content'
import { useCards, useKvList, usePlan } from '@/hooks/useProgress'
import { currentWeekNumber, weekCompletion, TOTAL_WEEKS } from '@/lib/curriculum'
import { kvSet, setMeta } from '@/lib/db'
import { PHASE_JA, SKILL_JA, type Phase, type ResourceStatus } from '@/lib/types'
import { Tabs } from '@/components/Tabs'
import { Button, Card, PageTitle, Pill, ProgressBar } from '@/components/ui'
import { dateKey, formatMD, addDays } from '@/lib/date'
import { cn } from '@/lib/cn'

type Tab = 'curriculum' | 'resources' | 'method'

export default function Plan() {
  const { tab = 'curriculum' } = useParams<{ tab: Tab }>()
  const nav = useNavigate()
  return (
    <div>
      <PageTitle title="計画" subtitle="12 週カリキュラム・教材・学習法" />
      <Tabs
        value={tab as Tab}
        onChange={(t) => nav(`/plan/${t}`)}
        tabs={[
          ['curriculum', '🗓 12 週'],
          ['resources', '📚 教材'],
          ['method', '🧭 学習法'],
        ]}
      />
      {tab === 'curriculum' && <CurriculumView />}
      {tab === 'resources' && <ResourcesView />}
      {tab === 'method' && <MethodView />}
    </div>
  )
}

const phaseColor: Record<Phase, string> = {
  pronunciation: 'bg-rose-900/60 text-rose-200',
  grammar: 'bg-sky-900/60 text-sky-200',
  input: 'bg-emerald-900/60 text-emerald-200',
  output: 'bg-amber-900/60 text-amber-200',
}

function CurriculumView() {
  const { plan } = usePlan()
  const { cards } = useCards()
  const { rows } = useKvList<boolean>('task:')
  const taskDone = new Map(rows.map((r) => [r.key.slice(5), r.value]))
  const introduced = new Set(cards.map((c) => c.itemId))
  const wk = currentWeekNumber(plan)
  const today = dateKey()

  return (
    <div>
      <Card className="mb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-sm">
              開始日 {formatMD(plan.startDate)} ・ 開始週 Week {plan.startWeek} ・ 今 <b>Week {wk}</b> / {TOTAL_WEEKS}
            </p>
            <p className="text-xs text-slate-400">発音（1–2）→ 文法（3–4）→ インプット（5–8）→ アウトプット・英語で学ぶ（9–12）</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const w = prompt('開始週を変更（1〜12）。今日をその週の 1 日目にします', String(wk))
              const n = Number(w)
              if (w && n >= 1 && n <= TOTAL_WEEKS) void setMeta('plan', { startDate: today, startWeek: n })
            }}
          >
            週を調整
          </Button>
        </div>
      </Card>
      <div className="space-y-2">
        {curriculum.weeks.map((w) => {
          const c = weekCompletion(w, introduced)
          const isNow = w.week === wk
          const past = w.week < wk
          const tasksDone = w.tasks.filter((t) => taskDone.get(t.id)).length
          const startOffset = (w.week - plan.startWeek) * 7
          const dateLabel = startOffset >= 0 ? `${formatMD(addDays(plan.startDate, startOffset))}〜` : ''
          return (
            <Card key={w.week} className={cn(isNow && 'border-amber-500/70 bg-amber-500/5', past && c.total > 0 && c.done < c.total && 'border-rose-900/60')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    Week {w.week} {dateLabel}
                    <Pill className={cn('ml-2', phaseColor[w.phase])}>{PHASE_JA[w.phase]}</Pill>
                    {isNow && <Pill className="ml-1 bg-amber-400 text-slate-950">今週</Pill>}
                  </p>
                  <p className="font-bold">{w.title}</p>
                  <p className="text-xs text-slate-400">{w.focus}</p>
                </div>
                <div className="shrink-0 text-right text-xs text-slate-400">
                  <p className={cn('tabular-nums', c.done === c.total && c.total > 0 && 'text-emerald-300')}>
                    語彙 {c.done}/{c.total}
                  </p>
                  <p className="tabular-nums">
                    タスク {tasksDone}/{w.tasks.length}
                  </p>
                </div>
              </div>
              <ProgressBar value={c.done} max={Math.max(1, c.total)} className="mt-2" />
              <details className="mt-2" open={isNow}>
                <summary className="cursor-pointer text-xs text-slate-400">内容を見る</summary>
                <div className="mt-2 space-y-2 text-sm">
                  <div className="flex flex-wrap gap-1.5">
                    {w.scenes.map((s) => (
                      <Pill key={s}>
                        {sceneById.get(s)?.icon} {sceneById.get(s)?.title}
                      </Pill>
                    ))}
                    {w.grammarUnits.map((g) => (
                      <Pill key={g} className="bg-sky-900/60 text-sky-200">
                        文法 U{grammarById.get(g)?.order} {grammarById.get(g)?.title}
                      </Pill>
                    ))}
                  </div>
                  <ul className="space-y-1">
                    {w.tasks.map((t) => {
                      const done = !!taskDone.get(t.id)
                      return (
                        <li key={t.id}>
                          <label className="flex items-start gap-2">
                            <input type="checkbox" className="mt-1 h-4 w-4 accent-amber-400" checked={done} onChange={(e) => void kvSet(`task:${t.id}`, e.target.checked)} />
                            <span className={cn(done && 'text-slate-500 line-through')}>
                              {t.text} <span className="text-[11px] text-slate-500">[{SKILL_JA[t.skill]}]</span>
                            </span>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="text-xs text-slate-400">素材: {w.materials.map((m) => materialById.get(m)?.title ?? m).join(' / ')}</p>
                  {w.tips && <p className="rounded-xl bg-slate-800/60 p-2 text-xs text-slate-300">💡 {w.tips}</p>}
                </div>
              </details>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

const STATUS_JA: Record<ResourceStatus, string> = { none: '未', have: '持っている', using: '使用中', done: '完了' }
const STATUS_NEXT: Record<ResourceStatus, ResourceStatus> = { none: 'have', have: 'using', using: 'done', done: 'none' }

function ResourcesView() {
  const { rows } = useKvList<ResourceStatus>('resource:')
  const status = new Map(rows.map((r) => [r.key.slice(9), r.value]))
  const categories = [...new Set(resources.map((r) => r.category))]
  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-400">タップで状態を切り替え：未 → 持っている → 使用中 → 完了。フェーズの色はカリキュラムと対応。</p>
      {categories.map((cat) => (
        <div key={cat}>
          <h2 className="mb-2 font-bold">{cat}</h2>
          <div className="space-y-2">
            {resources
              .filter((r) => r.category === cat)
              .map((r) => {
                const st = status.get(r.id) ?? 'none'
                return (
                  <Card key={r.id} className={cn(st === 'using' && 'border-amber-500/50', st === 'done' && 'opacity-70')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className={cn('font-semibold', r.lang === 'en' && 'font-en')}>
                          {r.title}
                          {r.author && <span className="ml-1 text-xs font-normal text-slate-400">— {r.author}</span>}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {r.phase.map((p) => (
                            <Pill key={p} className={phaseColor[p]}>
                              {PHASE_JA[p]}
                            </Pill>
                          ))}
                          {r.skill.map((s) => (
                            <Pill key={s}>{SKILL_JA[s]}</Pill>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-slate-300">{r.howTo}</p>
                        {r.url && (
                          <a href={r.url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-amber-300 underline">
                            開く ↗
                          </a>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => void kvSet(`resource:${r.id}`, STATUS_NEXT[st])}
                        className={cn(
                          'shrink-0 rounded-full px-3 py-1 text-xs',
                          st === 'none' && 'bg-slate-800 text-slate-300',
                          st === 'have' && 'bg-sky-900/60 text-sky-200',
                          st === 'using' && 'bg-amber-400 text-slate-950',
                          st === 'done' && 'bg-emerald-900/60 text-emerald-200',
                        )}
                      >
                        {STATUS_JA[st]}
                      </button>
                    </div>
                  </Card>
                )
              })}
          </div>
        </div>
      ))}
    </div>
  )
}

function MethodView() {
  return (
    <div className="space-y-3">
      <Card>
        <h2 className="font-bold">時間配分：インプット {method.ratio.input} : アウトプット {method.ratio.output}</h2>
        <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-blue-400" style={{ width: `${method.ratio.input}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${method.ratio.output}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-400" />
            インプット：単語・文法・リーディング・リスニング
          </span>
          <span>
            アウトプット：スピーキング・ライティング
            <span className="ml-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-300">{method.ratio.note}</p>
      </Card>
      <Card>
        <h2 className="font-bold">順序</h2>
        <ol className="mt-2 space-y-1.5">
          {method.order.map((o, i) => (
            <li key={o} className="flex items-start gap-2 text-sm">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-slate-950">{i + 1}</span>
              <span>{o}</span>
            </li>
          ))}
        </ol>
      </Card>
      {method.sections.map((s) => (
        <Card key={s.id}>
          <h2 className="font-bold">
            {s.icon} {s.title}
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
            {s.items.map((it) => (
              <li key={it}>{it}</li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}
