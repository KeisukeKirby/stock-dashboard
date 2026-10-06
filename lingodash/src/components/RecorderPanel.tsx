import { useEffect, useRef, useState } from 'react'
import { Recorder, playUrl, recorderSupported, type Recording } from '@/lib/recorder'
import { recognitionSupported, recognizeEnglish, wordSimilarity, diffWords } from '@/lib/speech'
import { textToAudio, useAudio } from '@/hooks/useAudio'
import { useSettings } from '@/hooks/useSettings'
import type { AudioItem } from '@/audio/AudioProvider'
import { updateLog } from '@/lib/db'
import { Button } from './ui'
import { cn } from '@/lib/cn'

/**
 * 録音パネル：お手本 → 録音 → 自分の声 → 聞き比べ → 認識チェック。
 * target を渡すとお手本再生と認識チェックの照合に使う。渡さなければ自由録音（スピーキング用）。
 */
export function RecorderPanel({
  target,
  item,
  className,
  compact = false,
  onRecorded,
}: {
  target?: string
  item?: AudioItem
  className?: string
  compact?: boolean
  onRecorded?: (rec: Recording) => void
}) {
  const { speak, rate } = useAudio()
  const { settings } = useSettings()
  const recRef = useRef<Recorder | null>(null)
  const [recording, setRecording] = useState(false)
  const [rec, setRec] = useState<Recording | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [asr, setAsr] = useState<{ text: string; score: number } | null>(null)
  const [asrBusy, setAsrBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const supported = recorderSupported()
  const asrSupported = recognitionSupported()
  const audioItem = item ?? (target ? textToAudio(target) : undefined)

  useEffect(() => {
    setRec(null)
    setAsr(null)
    setErr(null)
  }, [target])

  useEffect(
    () => () => {
      recRef.current?.cancel()
      if (rec) URL.revokeObjectURL(rec.url)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    if (!recording) return
    const start = Date.now()
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500)
    return () => clearInterval(id)
  }, [recording])

  async function toggleRecord() {
    setErr(null)
    if (recording) {
      try {
        const r = await recRef.current!.stop()
        if (rec) URL.revokeObjectURL(rec.url)
        setRec(r)
        onRecorded?.(r)
        await updateLog((l) => {
          l.recordings += 1
        })
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
      setElapsed(0)
      setRecording(true)
    } catch (e) {
      setErr((e as Error).message === 'Permission denied' ? 'マイクの使用が許可されていません' : (e as Error).message)
    }
  }

  async function compare() {
    if (!rec || !audioItem) return
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
      const text = await recognizeEnglish(settings.accent)
      setAsr({ text, score: target ? wordSimilarity(text, target) : 1 })
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setAsrBusy(false)
    }
  }

  return (
    <div className={cn('rounded-2xl border border-slate-800 bg-slate-900/60 p-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        {audioItem && (
          <Button variant="secondary" size="sm" onClick={() => void speak(audioItem)}>
            ▶ お手本 {rate}x
          </Button>
        )}
        {supported ? (
          <Button variant={recording ? 'danger' : 'primary'} size="sm" onClick={() => void toggleRecord()}>
            {recording ? `■ 停止 ${elapsed}s` : '● 録音'}
          </Button>
        ) : (
          <span className="text-xs text-slate-400">この端末では録音に対応していません</span>
        )}
        {rec && (
          <>
            <Button variant="secondary" size="sm" onClick={() => void playUrl(rec.url)}>
              ▶ 自分の声
            </Button>
            {audioItem && (
              <Button variant="secondary" size="sm" disabled={busy} onClick={() => void compare()}>
                {busy ? '再生中…' : '聞き比べ'}
              </Button>
            )}
          </>
        )}
        {asrSupported && (
          <Button variant="ghost" size="sm" disabled={asrBusy} onClick={() => void runAsr()}>
            {asrBusy ? '聞き取り中…' : '🎙 認識チェック'}
          </Button>
        )}
      </div>
      {recording && <p className="mt-2 text-sm text-rose-300">● 録音中… 言い終わったら停止</p>}
      {!compact && !recording && !rec && <p className="mt-2 text-xs text-slate-500">お手本の直後に、同じリズム・イントネーションで重ねて言う。録音して聞き比べる。</p>}
      {asr && (
        <div className="mt-2 rounded-xl bg-slate-800/60 p-2 text-sm">
          <p>
            認識結果: <span className="font-en text-base">{asr.text || '（聞き取れませんでした）'}</span>
          </p>
          {target && (
            <>
              <p className="mt-1 font-en text-xs">
                {diffWords(target, asr.text).map((w, i) => (
                  <span key={i} className={cn('mr-1', w.ok ? 'text-emerald-300' : 'text-rose-300 underline')}>
                    {w.word}
                  </span>
                ))}
              </p>
              <p className="text-xs text-slate-400">一致度 {Math.round(asr.score * 100)}%（目安。認識エンジンの癖もあるので録音の聞き比べを優先）</p>
            </>
          )}
        </div>
      )}
      {err && <p className="mt-2 text-xs text-rose-300">{err}</p>}
    </div>
  )
}
