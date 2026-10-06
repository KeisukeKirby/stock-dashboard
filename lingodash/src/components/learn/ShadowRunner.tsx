import { useMemo, useState } from 'react'
import { itemById } from '@/lib/content'
import { updateLog } from '@/lib/db'
import { ItemCard } from '../ItemCard'
import { RecorderPanel } from '../RecorderPanel'
import { Button, Pill } from '../ui'

/** 音読 → シャドーイング（録音）。フルセンテンスで読み切ってから、お手本に重ねる。 */
export function ShadowRunner({ itemIds, onDone }: { itemIds: string[]; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [reps, setReps] = useState(0)
  const item = useMemo(() => itemById.get(itemIds[i] ?? ''), [itemIds, i])
  if (!item) {
    onDone()
    return null
  }
  const last = i >= itemIds.length - 1
  const target = item.example && item.en.split(' ').length <= 3 ? item.example : item.en
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          シャドーイング {i + 1} / {itemIds.length}
        </span>
        <Pill>🔁 今日 {reps} 回</Pill>
      </div>
      <ItemCard item={item} showNote={false} revealJa />
      <div className="mt-3 rounded-2xl border border-amber-900/50 bg-amber-950/20 p-3 text-sm text-amber-100/90">
        <p className="font-semibold">手順</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs">
          <li>お手本を 2 回聞く（イントネーション・息継ぎ・スピード）</li>
          <li>テキストを見てフルセンテンスで音読（3 回）</li>
          <li>お手本に 0.5 秒遅れて重ねて言う → 録音 → 聞き比べ</li>
        </ol>
      </div>
      <RecorderPanel
        target={target}
        className="mt-3"
        onRecorded={() => {
          setReps((r) => r + 1)
          void updateLog((l) => {
            l.shadowReps += 1
          })
        }}
      />
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={i === 0} onClick={() => setI((n) => n - 1)}>
          ← 前
        </Button>
        <Button className="flex-1" onClick={() => (last ? onDone() : setI((n) => n + 1))}>
          {last ? '完了' : '次 →'}
        </Button>
      </div>
    </div>
  )
}
