import { useCallback, useEffect, useRef, useState } from 'react'
import { audioProvider } from '@/audio/CompositeProvider'
import type { AudioCheck, AudioItem } from '@/audio/AudioProvider'
import { useSettings } from './useSettings'
import { speakText } from '@/lib/content'
import type { Phrase } from '@/lib/types'

let cachedCheck: AudioCheck | null = null
let checkPromise: Promise<AudioCheck> | null = null

// ---- 直近の再生結果（診断用）----
export interface AudioStatus {
  ok: boolean
  message: string
  at: number
}
let lastStatus: AudioStatus | null = null
const statusListeners = new Set<(s: AudioStatus | null) => void>()
function setStatus(s: AudioStatus | null) {
  lastStatus = s
  for (const fn of statusListeners) fn(s)
}
export function useAudioStatus(): AudioStatus | null {
  const [st, setSt] = useState<AudioStatus | null>(lastStatus)
  useEffect(() => {
    statusListeners.add(setSt)
    return () => {
      statusListeners.delete(setSt)
    }
  }, [])
  return st
}

/** 成功した結果だけキャッシュする。失敗（音声未検出）は毎回やり直す。 */
export function runAudioCheck(force = false): Promise<AudioCheck> {
  if (cachedCheck?.ok && !force) return Promise.resolve(cachedCheck)
  if (!checkPromise || force) {
    checkPromise = audioProvider
      .check()
      .then((r) => {
        cachedCheck = r
        return r
      })
      .finally(() => {
        checkPromise = null
      })
  }
  return checkPromise
}

export function useAudioCheck(): { check: AudioCheck | null; recheck: () => void } {
  const [check, setCheck] = useState<AudioCheck | null>(cachedCheck)
  useEffect(() => {
    let alive = true
    runAudioCheck().then((r) => alive && setCheck(r))
    // 音声一覧が後から増えたら（Windows の Chrome/Edge でよくある）自動で再判定
    const onVoices = () => {
      runAudioCheck(true).then((r) => alive && setCheck(r))
    }
    const s = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
    s?.addEventListener('voiceschanged', onVoices)
    return () => {
      alive = false
      s?.removeEventListener('voiceschanged', onVoices)
    }
  }, [])
  const recheck = useCallback(() => {
    runAudioCheck(true).then(setCheck)
  }, [])
  return { check, recheck }
}

export function phraseToItem(p: Phrase | { thai: string; id?: string; audio?: string }): AudioItem {
  return { id: p.id, text: speakText(p.thai), audio: p.audio }
}

export function useAudio() {
  const { settings } = useSettings()
  const [speaking, setSpeaking] = useState(false)
  const token = useRef(0)
  // speak の identity を安定させる（速度変更で各ランナーの effect が再実行されないように）
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const stop = useCallback(() => {
    token.current += 1
    audioProvider.stop()
    setSpeaking(false)
  }, [])

  const speak = useCallback(
    async (item: AudioItem | string, rateOverride?: number) => {
      const it: AudioItem = typeof item === 'string' ? { text: speakText(item) } : item
      const my = ++token.current
      setSpeaking(true)
      try {
        const s = settingsRef.current
        await audioProvider.speak(it, { rate: rateOverride ?? s.rate, voiceURI: s.voiceURI })
        const used = (audioProvider as unknown as { tts?: { lastVoiceName?: string | null } }).tts?.lastVoiceName
        setStatus({ ok: true, message: used ? `再生しました（${used}）` : '再生しました', at: Date.now() })
      } catch (e) {
        console.warn(e)
        setStatus({ ok: false, message: `再生エラー: ${(e as Error).message}`, at: Date.now() })
      } finally {
        if (token.current === my) setSpeaking(false)
      }
    },
    [],
  )

  useEffect(() => () => audioProvider.stop(), [])

  return { speak, stop, speaking, rate: settings.rate }
}
