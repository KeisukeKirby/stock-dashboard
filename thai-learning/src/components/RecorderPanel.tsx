import { useEffect, useRef, useState } from 'react'
import { Recorder, playUrl, recorderSupported, type Recording } from '@/lib/recorder'
import { recognitionSupported, recognizeThai, similarity } from '@/lib/speech'
import { useAudio, phraseToItem } from '@/hooks/useAudio'
import type { AudioItem } from '@/audio/AudioProvider'
import { Button } from './ui'
import { cn } from '@/lib/cn'

export function RecorderPanel({ thai, item, className }: { thai: string; item?: AudioItem; className?: string }) {
  const { speak, rate } = useAudio()
  const recRef = useRef<Recorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [rec, setRec] = useState<Recording | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [asr, setAsr] = useState<{ text: string; score: number } | null>(null)
  const [asrBusy, setAsrBusy] = useState(false)
  const supported = recorderSupported()
  const asrSupported = recognitionSupported()
  const audioItem = item ?? phraseToItem({ thai })

  useEffect(() => {
    setRec(null)
    setAsr(null)
    setErr(null)
  }, [thai])

  useEffect(
    () => () => {
      recRef.current?.cancel()
      if (rec) URL.revokeObjectURL(rec.url)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  async function toggleRecord() {
    setErr(null)
    if (recording) {
      try {
        const r = await recRef.current!.stop()
        if (rec) URL.revokeObjectURL(rec.url)
        setRec(r)
      } catch (e) {
        setErr((e as Error).message)
      } finally {
        setRecording(false)
      }
      return
    }
    try {
      recRef.current = new Recorder()
      await recRef.current.start()
      setRecording(true)
    } catch (e) {
      setErr((e as Error).message === 'Permission denied' ? 'マイクの使用が許可されていません' : (e as Error).message)
    }
  }

  async function compare() {
    if (!rec) return
    setBusy(true)
    try {
      await speak(audioItem)
      await new Promise((r) => setTimeout(r, 300))
      await playUrl(rec.url)
      await new Promise((r) => setTimeout(r, 300))
      await speak(audioItem)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function runAsr() {
    setAsrBusy(true)
    setAsr(null)
    setErr(null)
    try {
      const text = await recognizeThai()
      setAsr({ text, score: similarity(text, thai) })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setAsrBusy(false)
    }
  }

  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/60 p-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => void speak(audioItem)}>
          ▶ お手本 {rate.toFixed(1)}x
        </Button>
        {supported ? (
          <Button variant={recording ? 'danger' : 'primary'} size="sm" onClick={() => void toggleRecord()}>
            {recording ? '■ 停止' : '● 録音'}
          </Button>
        ) : (
          <span className="text-xs text-slate-400">この端末では録音に対応していません</span>
        )}
        {rec && (
          <>
            <Button variant="secondary" size="sm" onClick={() => void playUrl(rec.url)}>
              ▶ 自分の声
            </Button>
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => void compare()}>
              {busy ? '再生中…' : '聞き比べ'}
            </Button>
          </>
        )}
        {asrSupported && (
          <Button variant="ghost" size="sm" disabled={asrBusy} onClick={() => void runAsr()}>
            {asrBusy ? '聞き取り中…' : '🎙 認識チェック'}
          </Button>
        )}
      </div>
      {recording && <p className="mt-2 text-sm text-rose-300">● 録音中… 言い終わったら停止</p>}
      {asr && (
        <div className="mt-2 rounded-xl bg-slate-800/60 p-2 text-sm">
          <p>
            認識結果: <span lang="th" className="font-thai text-base">{asr.text || '（聞き取れませんでした）'}</span>
          </p>
          <p className="text-xs text-slate-400">
            一致度 {Math.round(asr.score * 100)}%（目安。声調は判定できません）
          </p>
        </div>
      )}
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
    </div>
  )
}
