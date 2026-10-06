import { useState } from 'react'
import { prompts, shuffle } from '@/lib/content'
import { useJournal } from '@/hooks/useProgress'
import { deleteJournal } from '@/lib/db'
import { WriteRunner } from '@/components/learn/WriteRunner'
import { Button, Card, Empty, PageTitle, Pill } from '@/components/ui'
import { formatMD } from '@/lib/date'
import { cn } from '@/lib/cn'

export default function Writing() {
  const journal = useJournal().filter((j) => j.kind === 'writing')
  const [promptId, setPromptId] = useState<string | null>(null)
  const [minutes, setMinutes] = useState<number | undefined>(undefined)
  const [open, setOpen] = useState<string | null>(null)
  const totalWords = journal.reduce((s, j) => s + j.words, 0)

  if (promptId) {
    return (
      <div>
        <PageTitle
          title="クイックライティング"
          right={
            <Button variant="ghost" size="sm" onClick={() => setPromptId(null)}>
              やめる
            </Button>
          }
        />
        <WriteRunner key={promptId} promptId={promptId} minutesOverride={minutes} onDone={() => setPromptId(null)} />
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="ライティング" subtitle="スピーキングの次に重要。口に出すような感覚で反射的に書き、主題を 1 文でまとめる" />
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">今日のお題</p>
          <div className="flex gap-1 text-xs">
            {[3, 5, 7].map((m) => (
              <button key={m} type="button" onClick={() => setMinutes(m)} className={cn('rounded-full px-2.5 py-1', (minutes ?? 0) === m ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
                {m} 分
              </button>
            ))}
          </div>
        </div>
        <Button size="lg" className="mt-3 w-full" onClick={() => setPromptId(shuffle(prompts.writing)[0].id)}>
          ▶ ランダムなお題で書く
        </Button>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs text-slate-400">お題を選ぶ（{prompts.writing.length}）</summary>
          <div className="mt-2 space-y-1">
            {prompts.writing.map((p) => (
              <button key={p.id} type="button" onClick={() => setPromptId(p.id)} className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-800">
                <span className="font-en">{p.en}</span>
                <span className="ml-2 text-xs text-slate-500">{p.ja}</span>
              </button>
            ))}
          </div>
        </details>
        <p className="mt-3 text-xs text-slate-500">読んだ記事で気に入った表現・論の運び方を真似て使う（読解と作文の相乗効果）。書いた後に Fundamentals of Academic Writing の「主題文 → 支持文 → 結論」で並べ直すとなお良い。</p>
      </Card>

      <div className="mt-4 flex items-baseline justify-between">
        <h2 className="font-bold">記録</h2>
        <span className="text-xs text-slate-400">
          {journal.length} 本 ・ 累計 {totalWords.toLocaleString()} 語
        </span>
      </div>
      {journal.length === 0 ? (
        <Empty>まだ記録がありません。まず 5 分書いてみましょう。</Empty>
      ) : (
        <div className="mt-2 space-y-2">
          {journal.map((j) => (
            <Card key={j.id}>
              <button type="button" className="flex w-full items-start justify-between gap-2 text-left" onClick={() => setOpen(open === j.id ? null : j.id)}>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400">
                    {formatMD(j.date)} ・ {j.words} 語 ・ {Math.round(j.seconds / 60)} 分
                  </p>
                  <p className="font-en text-sm font-semibold">{j.prompt}</p>
                  {j.summary && <p className="font-en text-xs text-amber-200/90">“{j.summary}”</p>}
                </div>
                <Pill>{open === j.id ? '閉じる' : '開く'}</Pill>
              </button>
              {open === j.id && (
                <div className="mt-2">
                  <p className="font-en whitespace-pre-wrap rounded-xl bg-slate-800/50 p-3 text-sm leading-relaxed">{j.text}</p>
                  <Button size="sm" variant="ghost" className="mt-2 text-rose-300" onClick={() => confirm('この記録を削除しますか？') && void deleteJournal(j.id)}>
                    削除
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
