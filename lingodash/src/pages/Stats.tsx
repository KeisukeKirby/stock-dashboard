import { useMemo } from 'react'
import { useJournal, useLogs, usePlan, useProgressSummary } from '@/hooks/useProgress'
import { computeXp, levelFromXp, logHasActivity } from '@/lib/progress'
import { SKILLS, SKILL_JA, type Skill } from '@/lib/types'
import { SkillRadar } from '@/components/SkillRadar'
import { Card, PageTitle, Pill } from '@/components/ui'
import { addDays, dateKey, formatMD, weekdayJa } from '@/lib/date'
import { cn } from '@/lib/cn'

export default function Stats() {
  const logs = useLogs()
  const { summary } = useProgressSummary()
  const { level } = usePlan()
  const journal = useJournal()
  const today = dateKey()
  const days = useMemo(() => {
    const byDate = new Map(logs.map((l) => [l.date, l]))
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i - 13)
      return { date: d, log: byDate.get(d) }
    })
  }, [logs, today])
  const maxMin = Math.max(10, ...days.map((d) => d.log?.minutes ?? 0))
  const totals = useMemo(() => {
    const t = { minutes: 0, input: 0, output: 0, reviews: 0, newItems: 0, quizC: 0, quizT: 0, soundC: 0, soundT: 0, gramC: 0, gramT: 0, dictC: 0, dictT: 0, shadow: 0, speak: 0, rec: 0, words: 0, rp: 0, days: 0 }
    for (const l of logs) {
      t.minutes += l.minutes
      t.input += l.inputMinutes
      t.output += l.outputMinutes
      t.reviews += l.reviews
      t.newItems += l.newItems
      t.quizC += l.quizCorrect
      t.quizT += l.quizTotal
      t.soundC += l.soundQuizCorrect
      t.soundT += l.soundQuizTotal
      t.gramC += l.grammarQuizCorrect
      t.gramT += l.grammarQuizTotal
      t.dictC += l.dictationCorrect
      t.dictT += l.dictationTotal
      t.shadow += l.shadowReps
      t.speak += l.speakingPrompts
      t.rec += l.recordings
      t.words += l.writingWords
      t.rp += l.roleplays
      if (logHasActivity(l)) t.days += 1
    }
    return t
  }, [logs])
  const xp = computeXp(logs)
  const lv = levelFromXp(xp)
  const pct = (c: number, t: number) => (t > 0 ? `${Math.round((c / t) * 100)}%` : '—')
  const activity: Record<Skill, number> = useMemo(() => {
    const a = summary?.skillActivity
    const norm = (v: number, cap: number) => Math.min(1, v / cap)
    return {
      pronunciation: norm(a?.pronunciation ?? 0, 40),
      vocabulary: norm(a?.vocabulary ?? 0, 150),
      grammar: norm(a?.grammar ?? 0, 20),
      reading: 0,
      listening: norm(a?.listening ?? 0, 60),
      speaking: norm(a?.speaking ?? 0, 25),
      writing: norm(a?.writing ?? 0, 15),
    }
  }, [summary])

  return (
    <div>
      <PageTitle title="記録" subtitle="学習時間・正答率・配分。数字は IndexedDB の日別ログから" />

      <Card>
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">直近 14 日の学習時間（分）</h2>
          <span className="text-xs text-slate-400">
            連続 {summary?.streak ?? 0} 日 ・ Lv.{lv.level} ・ {xp} XP
          </span>
        </div>
        <svg viewBox="0 0 560 150" className="mt-3 w-full" role="img" aria-label="日別の学習時間">
          {days.map((d, i) => {
            const inM = d.log?.inputMinutes ?? 0
            const outM = d.log?.outputMinutes ?? 0
            const other = Math.max(0, (d.log?.minutes ?? 0) - inM - outM)
            const scale = 110 / maxMin
            const x = 14 + i * 39
            const w = 26
            const hIn = inM * scale
            const hOut = outM * scale
            const hOther = other * scale
            let y = 120
            const bars = [
              { h: hOther, cls: 'fill-slate-600' },
              { h: hIn, cls: 'fill-blue-400' },
              { h: hOut, cls: 'fill-amber-400' },
            ]
            return (
              <g key={d.date}>
                {bars.map((b, k) => {
                  if (b.h <= 0) return null
                  y -= b.h
                  const el = <rect key={k} x={x} y={y} width={w} height={Math.max(1, b.h - 2)} rx="2" className={b.cls} />
                  return el
                })}
                {(d.log?.minutes ?? 0) > 0 && (
                  <text x={x + w / 2} y={Math.max(10, y - 4)} textAnchor="middle" fontSize="10" className="fill-slate-300">
                    {d.log?.minutes}
                  </text>
                )}
                <text x={x + w / 2} y={136} textAnchor="middle" fontSize="10" className={cn(d.date === today ? 'fill-amber-300' : 'fill-slate-500')}>
                  {formatMD(d.date).split('/')[1]}
                  {weekdayJa(d.date)}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="flex gap-3 text-xs text-slate-400">
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-blue-400" />
            インプット
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-amber-400" />
            アウトプット
          </span>
          <span>
            <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-slate-600" />
            その他（ホーム・設定など）
          </span>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">累計</h2>
        <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="学習日数" value={totals.days} />
          <Stat label="合計時間" value={`${Math.round(totals.minutes / 60)}h ${totals.minutes % 60}m`} />
          <Stat label="配分 IN:OUT" value={totals.input + totals.output > 0 ? `${Math.round((totals.input / (totals.input + totals.output)) * 100)}:${Math.round((totals.output / (totals.input + totals.output)) * 100)}` : '—'} />
          <Stat label="復習カード" value={totals.reviews} />
          <Stat label="新アイテム" value={totals.newItems} />
          <Stat label="シャドーイング" value={`${totals.shadow} 回`} />
          <Stat label="スピーキング" value={`${totals.speak} 問`} />
          <Stat label="録音" value={`${totals.rec} 本`} />
          <Stat label="ライティング" value={`${totals.words.toLocaleString()} 語`} />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">正答率（累計）</h2>
        <table className="mt-2 w-full text-sm">
          <tbody>
            <Row label="リスニングクイズ" v={pct(totals.quizC, totals.quizT)} n={totals.quizT} />
            <Row label="最小対の聞き分け" v={pct(totals.soundC, totals.soundT)} n={totals.soundT} />
            <Row label="文法クイズ" v={pct(totals.gramC, totals.gramT)} n={totals.gramT} />
            <Row label="ディクテーション（80% 以上）" v={pct(totals.dictC, totals.dictT)} n={totals.dictT} />
            <Row label="ロールプレイ完走" v={`${totals.rp} 回`} n={totals.rp} />
          </tbody>
        </table>
      </Card>

      <Card className="mt-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-bold">スキルの現在地と今週の活動</h2>
          {level && <Pill>測定 {formatMD(dateKey(new Date(level.at)))}</Pill>}
        </div>
        <div className="mt-2 flex justify-center">
          <SkillRadar scores={level ? (Object.fromEntries(SKILLS.map((s) => [s, level.scores[s].pct])) as Record<Skill, number>) : activity} compare={level ? activity : undefined} />
        </div>
        <p className="text-center text-[11px] text-slate-500">{level ? '実線：レベルチェック（正答率）／ 点線：この 7 日間の活動量' : 'この 7 日間の活動量（レベルチェック未受験）'}</p>
        {level && (
          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] text-slate-400">
            {SKILLS.map((s) => (
              <div key={s} className="rounded-lg bg-slate-800/60 p-1">
                <p className="text-sm font-bold text-slate-100">{level.scores[s].cefr}</p>
                <p>{SKILL_JA[s]}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">ライティング・ディクテーションの記録</h2>
        <p className="mt-1 text-xs text-slate-400">
          ライティング {journal.filter((j) => j.kind === 'writing').length} 本 ・ ディクテーション {journal.filter((j) => j.kind === 'dictation').length} 文
        </p>
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-800/60 p-2">
      <p className="text-base font-bold tabular-nums">{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  )
}
function Row({ label, v, n }: { label: string; v: string; n: number }) {
  return (
    <tr className="border-t border-slate-800">
      <td className="py-1.5">{label}</td>
      <td className="py-1.5 text-right font-bold tabular-nums">{v}</td>
      <td className="py-1.5 pl-3 text-right text-xs tabular-nums text-slate-400">{n} 問</td>
    </tr>
  )
}
