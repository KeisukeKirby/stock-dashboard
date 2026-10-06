import { Link, useNavigate } from 'react-router-dom'
import { useCards, usePlan, useProgressSummary } from '@/hooks/useProgress'
import { useSettings } from '@/hooks/useSettings'
import { currentWeek, currentWeekNumber, dayInWeek, newItemsForToday, TOTAL_WEEKS, weekCompletion } from '@/lib/curriculum'
import { levelFromXp } from '@/lib/progress'
import { CEFR_JA } from '@/lib/levelcheck'
import { sceneById, method } from '@/lib/content'
import { dateKey, formatMD, weekdayJa } from '@/lib/date'
import { PHASE_JA, SKILL_JA, type Skill } from '@/lib/types'
import { Button, Card, Pill, ProgressBar } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { cn } from '@/lib/cn'

export default function Home() {
  const nav = useNavigate()
  const { summary } = useProgressSummary()
  const { settings } = useSettings()
  const { cards } = useCards()
  const { plan, level, loaded } = usePlan()
  const today = dateKey()
  const week = currentWeek(plan, today)
  const wk = currentWeekNumber(plan, today)
  const introduced = new Set(cards.map((c) => c.itemId))
  const comp = weekCompletion(week, introduced)
  const fresh = newItemsForToday(introduced, settings, plan, today)
  const log = summary?.today
  const menuDone = log?.menuCompleted ?? false
  const xp = levelFromXp(summary?.xp ?? 0)
  const inMin = summary?.week.inputMinutes ?? 0
  const outMin = summary?.week.outputMinutes ?? 0
  const ratioTotal = inMin + outMin
  const inPct = ratioTotal > 0 ? Math.round((inMin / ratioTotal) * 100) : 0

  return (
    <div>
      <VoiceBanner />

      {/* レベルチェック誘導 */}
      {loaded && !level && (
        <Card className="mb-4 border-amber-500/60 bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900">
          <p className="text-xs uppercase tracking-wider text-amber-300">はじめに</p>
          <p className="mt-1 text-lg font-bold">今の英語力を測って、開始週を決める</p>
          <p className="mt-1 text-sm text-slate-300">語彙・文法・読解・リスニング・発音の聞き分け・スピーキング・ライティングを約 25 分でチェック。結果から 12 週カリキュラムのどこから始めるかを提案します。</p>
          <Button size="lg" className="mt-3 w-full" onClick={() => nav('/level-check')}>
            ▶ レベルチェックを受ける
          </Button>
        </Card>
      )}

      {/* 現在地 */}
      <Card className="bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-300">現在地</p>
            {level ? (
              <>
                <p className="mt-1 text-4xl font-black">
                  {level.overall}
                  <span className="ml-2 text-base font-semibold text-slate-300">{CEFR_JA[level.overall].split('：')[1]}</span>
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  推定語彙 約 {level.vocabEstimate.toLocaleString()} 語 ・ 測定 {formatMD(dateKey(new Date(level.at)))}
                </p>
              </>
            ) : (
              <p className="mt-1 text-2xl font-black text-slate-400">未測定</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">連続</p>
            <p className="text-3xl font-bold tabular-nums">
              {summary?.streak ?? 0}
              <span className="ml-1 text-sm text-slate-300">日 🔥</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Lv.{xp.level} ・ {summary?.xp ?? 0} XP
            </p>
            <ProgressBar value={xp.into} max={xp.next} className="mt-1 h-1.5 w-24" color="bg-blue-400" />
          </div>
        </div>
        {level && (
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
            {(Object.keys(level.scores) as Skill[]).map((s) => (
              <div key={s} className="rounded-lg bg-slate-800/60 p-1">
                <p className="text-sm font-bold text-slate-100">{level.scores[s].cefr}</p>
                <p>{SKILL_JA[s]}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 今日のメニュー */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">
              Week {wk} / {TOTAL_WEEKS} ・ Day {dayInWeek(plan, today)} ・ {formatMD(today)}（{weekdayJa(today)}）
            </p>
            <p className="font-bold">
              <Pill className="mr-2 bg-blue-900/60 text-blue-200">{PHASE_JA[week.phase]}</Pill>
              {week.title}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{week.focus}</p>
          </div>
          {menuDone && <Pill className="shrink-0 bg-emerald-900/60 text-emerald-200">完了 ✓</Pill>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="復習カード" value={summary?.dueNow ?? 0} />
          <Stat label="新アイテム" value={fresh.ids.length} hint={fresh.carriedOver > 0 ? `繰越 ${fresh.carriedOver}` : undefined} />
          <Stat label="今日の学習" value={`${log?.minutes ?? 0}分`} />
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">発音 → 復習 → 新アイテム → 文法 → 音読/シャドーイング → リスニング → スピーキング → ロールプレイ/ライティング</p>
        <Button size="lg" className="mt-2 w-full" onClick={() => nav('/today')}>
          {menuDone ? '▶ もう一回（復習中心）' : '▶ 今日のメニューを始める'}
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => nav('/quick')}>
            ⏱ スキマ {settings.quickMinutes} 分
          </Button>
          <Button variant={week.phase === 'pronunciation' ? 'primary' : 'secondary'} onClick={() => nav('/pronunciation')}>
            🔤 発音{week.phase === 'pronunciation' ? '（今週の重点）' : 'トレーナー'}
          </Button>
        </div>
        {week.tips && <p className="mt-3 rounded-xl bg-slate-800/60 p-3 text-xs text-slate-300">💡 {week.tips}</p>}
      </Card>

      {/* インプット：アウトプット */}
      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">この 7 日間の配分</h2>
          <Link to="/stats" className="text-xs text-amber-300 underline">
            記録を見る
          </Link>
        </div>
        <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-blue-400" style={{ width: `${inPct}%` }} />
          <div className="h-full bg-amber-400" style={{ width: `${ratioTotal > 0 ? 100 - inPct : 0}%` }} />
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-400" />
            インプット {inMin} 分（{inPct}%）
          </span>
          <span>
            アウトプット {outMin} 分（{ratioTotal > 0 ? 100 - inPct : 0}%）
            <span className="ml-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
          </span>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          目標 {method.ratio.input} : {method.ratio.output}。{ratioTotal === 0 ? '学習すると自動で記録されます。' : inPct > 90 ? 'アウトプット（スピーキング・ライティング）をもう少し。' : inPct < 65 ? 'インプット（動画・読書・リスニング）を増やす。' : 'いい配分です。'}
        </p>
      </Card>

      {/* 習得状況 */}
      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">習得アイテム</h2>
          <Link to="/plan/curriculum" className="text-xs text-amber-300 underline">
            12 週カリキュラム
          </Link>
        </div>
        <div className="mt-2 flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {summary?.masteredItems ?? 0}
              <span className="text-base text-slate-400"> / {summary?.totalItems ?? 0}</span>
            </p>
            <p className="text-xs text-slate-400">習得（4 日以上の間隔で言える）</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">{summary?.introducedItems ?? 0}</p>
            <p className="text-xs text-slate-400">学習済み</p>
          </div>
        </div>
        <ProgressBar value={summary?.introducedItems ?? 0} max={summary?.totalItems ?? 1} className="mt-3" color="bg-slate-500" />
        <ProgressBar value={summary?.masteredItems ?? 0} max={summary?.totalItems ?? 1} className="mt-1" />
        <p className="mt-2 text-xs text-slate-400">
          今週のカリキュラム: {comp.done} / {comp.total} 導入済み
        </p>
      </Card>

      {/* 場面別 */}
      <Card className="mt-4">
        <h2 className="font-bold">テーマ別の達成度</h2>
        <div className="mt-3 space-y-2.5">
          {summary?.scenes.map((s) => {
            const sc = sceneById.get(s.sceneId)!
            return (
              <Link key={s.sceneId} to={`/vocab/${s.sceneId}`} className="block">
                <div className="flex items-center justify-between text-sm">
                  <span>
                    {sc.icon} {sc.title}
                  </span>
                  <span className="text-xs tabular-nums text-slate-400">
                    {s.mastered}/{s.introduced}/{s.total}
                  </span>
                </div>
                <div className="relative mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div className="absolute inset-y-0 left-0 bg-slate-500" style={{ width: `${(s.introduced / s.total) * 100}%` }} />
                  <div className="absolute inset-y-0 left-0 bg-amber-400" style={{ width: `${(s.mastered / s.total) * 100}%` }} />
                </div>
              </Link>
            )
          })}
        </div>
        <p className="mt-2 text-[11px] text-slate-500">習得 / 学習済み / 全体</p>
      </Card>

      <div className={cn('mt-4 grid grid-cols-2 gap-2')}>
        <Button variant="secondary" onClick={() => nav('/listening')}>
          🎧 リスニング
        </Button>
        <Button variant="secondary" onClick={() => nav('/speaking')}>
          🗣 スピーキング
        </Button>
        <Button variant="secondary" onClick={() => nav('/grammar')}>
          📐 文法
        </Button>
        <Button variant="secondary" onClick={() => nav('/writing')}>
          ✍️ ライティング
        </Button>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-xl bg-slate-800/60 p-2">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
      {hint && <p className="text-[10px] text-amber-300">{hint}</p>}
    </div>
  )
}
