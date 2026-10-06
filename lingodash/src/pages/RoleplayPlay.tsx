import { Link, useNavigate, useParams } from 'react-router-dom'
import { roleplayById } from '@/lib/content'
import { RoleplayPlayer } from '@/components/learn/RoleplayPlayer'
import { Empty } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { SpeedToggle } from '@/components/SpeedToggle'

export default function RoleplayPlay() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const rp = roleplayById.get(id)
  if (!rp) return <Empty>台本が見つかりません</Empty>
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <Link to="/speaking" className="text-xs text-slate-400 underline">
          ← スピーキング
        </Link>
        <SpeedToggle />
      </div>
      <VoiceBanner />
      <RoleplayPlayer roleplay={rp} onDone={() => nav('/speaking')} />
    </div>
  )
}
