import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCards } from '@/hooks/useProgress'
import { useSettings } from '@/hooks/useSettings'
import { buildQuickSession } from '@/lib/session'
import type { Card as SrsCard } from '@/lib/types'
import { ReviewRunner, type ReviewStats } from '@/components/learn/ReviewRunner'
import { Button, Card, Empty, PageTitle } from '@/components/ui'

export default function Quick() {
  const nav = useNavigate()
  const { cards, loaded } = useCards()
  const { settings, loaded: sLoaded } = useSettings()
  const [queue, setQueue] = useState<SrsCard[] | null>(null)
  const [deadline, setDeadline] = useState<number>(0)
  const [result, setResult] = useState<ReviewStats | null>(null)
  const [left, setLeft] = useState('')

  function start() {
    setQueue(buildQuickSession(cards, settings))
    setDeadline(Date.now() + settings.quickMinutes * 60_000)
    setResult(null)
  }

  useEffect(() => {
    if (loaded && sLoaded && queue === null) start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, sLoaded])

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => {
      const ms = Math.max(0, deadline - Date.now())
      setLeft(`${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`)
    }, 500)
    return () => clearInterval(id)
  }, [deadline])

  if (queue === null) return <p className="text-slate-400">読み込み中…</p>

  if (queue.length === 0) {
    return (
      <div>
        <PageTitle title="スキマ時間モード" />
        <Empty>
          復習するカードがまだありません。まず「今日のメニュー」で新アイテムを学びましょう。
          <div className="mt-3">
            <Button onClick={() => nav('/today')}>今日のメニューへ</Button>
          </div>
        </Empty>
      </div>
    )
  }

  if (result) {
    return (
      <div>
        <PageTitle title="スキマ復習 完了 ✓" />
        <Card>
          <p className="text-2xl font-bold">
            {result.done} 枚 <span className="text-base text-slate-400">（言えない {result.again}）</span>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => nav('/')}>
              終了
            </Button>
            <Button onClick={start}>もう {settings.quickMinutes} 分</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div>
      <PageTitle title="スキマ時間モード" subtitle={`${settings.quickMinutes} 分または ${queue.length} 枚で終了`} right={<span className="font-mono text-lg tabular-nums">{left}</span>} />
      <ReviewRunner cards={queue} deadline={deadline} onDone={setResult} />
    </div>
  )
}
