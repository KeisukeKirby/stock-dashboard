import { Link } from 'react-router-dom'
import { useAudioCheck } from '@/hooks/useAudio'

export function VoiceBanner() {
  const { check } = useAudioCheck()
  if (!check || check.ok) return null
  return (
    <div className="mb-4 rounded-2xl border border-rose-800/60 bg-rose-950/40 p-3 text-sm text-rose-100">
      <p className="font-semibold">🔇 タイ語の音声が使えません</p>
      <p className="mt-1 text-rose-200/90">{check.reason}</p>
      <p className="mt-1 text-xs text-rose-200/80">
        <Link to="/settings" className="underline">
          設定
        </Link>
        に端末ごとの追加手順があります。音声なしでもローマ字・録音で学習は続けられます。
      </p>
    </div>
  )
}
