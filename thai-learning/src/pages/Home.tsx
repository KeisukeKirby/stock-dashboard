import { Link, useNavigate } from 'react-router-dom'
import { useProgressSummary } from '@/hooks/useProgress'
import { countdown, resolveDay, dayCompletion, newPhrasesForToday } from '@/lib/curriculum'
import { curriculum, sceneById } from '@/lib/content'
import { dateKey, formatMD, weekdayJa } from '@/lib/date'
import { Button, Card, Pill, ProgressBar } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { useSettings } from '@/hooks/useSettings'
import { useCards } from '@/hooks/useProgress'

export default function Home() {
  const nav = useNavigate()
  const { summary } = useProgressSummary()
  const { settings } = useSettings()
  const { cards } = useCards()
  const today = dateKey()
  const days = countdown(today)
  const day = resolveDay(today)
  const introduced = new Set(cards.map((c) => c.phraseId))
  const comp = dayCompletion(day, introduced)
  const fresh = newPhrasesForToday(introduced, settings, today)
  const log = summary?.today
  const menuDone = log?.menuCompleted ?? false

  return (
    <div>
      <VoiceBanner />

      {/* カウントダウン */}
      <Card className="bg-gradient-to-br from-amber-500/20 via-slate-900 to-slate-900">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-amber-300">{curriculum.targetLabel} まで</p>
            {days > 0 ? (
              <p className="mt-1 text-5xl font-black tabular-nums">
                {days}
                <span className="ml-1 text-lg font-semibold text-slate-300">日</span>
              </p>
            ) : days === 0 ? (
              <p className="mt-1 text-4xl font-black">今日が本番 🎤</p>
            ) : (
              <p className="mt-1 text-2xl font-black">本番から {-days} 日 — 次の目標へ</p>
            )}
            <p className="mt-1 text-xs text-slate-400">
              {formatMD(curriculum.targetDate)}（{weekdayJa(curriculum.targetDate)}） / 今日 {formatMD(today)}（{weekdayJa(today)}）
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">連続</p>
            <p className="text-3xl font-bold tabular-nums">
              {summary?.streak ?? 0}
              <span className="ml-1 text-sm text-slate-300">日 🔥</span>
            </p>
          </div>
        </div>
      </Card>

      {/* 今日のメニュー */}
      <Card className="mt-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs text-slate-400">
              Day {day.day} — {day.title}
            </p>
            <p className="mt-0.5 text-sm text-slate-300">{day.focus}</p>
          </div>
          {menuDone && <Pill className="bg-emerald-900/60 text-emerald-200">今日のメニュー完了 ✓</Pill>}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="復習カード" value={summary?.dueNow ?? 0} />
          <Stat label="新フレーズ" value={fresh.ids.length} hint={fresh.carriedOver > 0 ? `繰越 ${fresh.carriedOver}` : undefined} />
          <Stat label="今日の学習" value={`${log?.minutes ?? 0}分`} />
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">復習 → 新フレーズ → シャドーイング → クイズ → ロールプレイ（15〜20分）</p>
        <Button size="lg" className="mt-2 w-full" onClick={() => nav('/today')}>
          {menuDone ? '▶ もう一回（復習中心）' : '▶ 今日のメニューを始める'}
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => nav('/quick')}>
            ⏱ スキマ {settings.quickMinutes} 分
          </Button>
          <Button variant={day.toneTraining ? 'primary' : 'secondary'} onClick={() => nav('/tones')}>
            🎵 声調{day.toneTraining ? '（今日の重点）' : 'トレーナー'}
          </Button>
        </div>
        {day.tips && <p className="mt-3 rounded-xl bg-slate-800/60 p-3 text-xs text-slate-300">💡 {day.tips}</p>}
      </Card>

      {/* 習得状況 */}
      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">習得フレーズ</h2>
          <Link to="/curriculum" className="text-xs text-amber-300 underline">
            16 日間カリキュラム
          </Link>
        </div>
        <div className="mt-2 flex items-end gap-4">
          <div>
            <p className="text-3xl font-bold tabular-nums">
              {summary?.masteredPhrases ?? 0}
              <span className="text-base text-slate-400"> / {summary?.totalPhrases ?? 0}</span>
            </p>
            <p className="text-xs text-slate-400">習得（4 日以上の間隔で言える）</p>
          </div>
          <div>
            <p className="text-xl font-semibold tabular-nums">{summary?.introducedPhrases ?? 0}</p>
            <p className="text-xs text-slate-400">学習済み</p>
          </div>
        </div>
        <ProgressBar value={summary?.introducedPhrases ?? 0} max={summary?.totalPhrases ?? 1} className="mt-3" color="bg-slate-500" />
        <ProgressBar value={summary?.masteredPhrases ?? 0} max={summary?.totalPhrases ?? 1} className="mt-1" />
        <p className="mt-2 text-xs text-slate-400">
          今日のカリキュラム: {comp.done} / {comp.total} 導入済み
        </p>
      </Card>

      {/* 場面別 */}
      <Card className="mt-4">
        <h2 className="font-bold">場面別の達成度</h2>
        <div className="mt-3 space-y-2.5">
          {summary?.scenes.map((s) => {
            const sc = sceneById.get(s.sceneId)!
            return (
              <Link key={s.sceneId} to={`/phrases/${s.sceneId}`} className="block">
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

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={() => nav('/listening')}>
          🎧 リスニングクイズ
        </Button>
        <Button variant="secondary" onClick={() => nav('/roleplay')}>
          🎭 ロールプレイ
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
