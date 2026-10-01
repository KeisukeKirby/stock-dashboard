import { Link } from 'react-router-dom'
import { roleplays, sceneById } from '@/lib/content'
import { Card, PageTitle, Pill } from '@/components/ui'

export default function Roleplays() {
  return (
    <div>
      <PageTitle title="台本ロールプレイ" subtitle="相手のセリフは音声。自分の番は声に出す。分岐あり" />
      <div className="space-y-2">
        {roleplays.map((r) => {
          const sc = sceneById.get(r.scene)
          const hasBranch = Object.values(r.nodes).some((n) => n.kind === 'branch')
          return (
            <Link key={r.id} to={`/roleplay/${r.id}`}>
              <Card className="transition hover:border-amber-500/50">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold">
                      {sc?.icon} {r.title}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{r.description}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Pill>約 {r.estMinutes} 分</Pill>
                    {hasBranch && <Pill className="bg-amber-900/50 text-amber-200">分岐</Pill>}
                  </div>
                </div>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
