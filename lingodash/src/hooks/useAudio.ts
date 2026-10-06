import { useCallback, useEffect, useRef, useState } from 'react'
import { audioProvider } from '@/audio/CompositeProvider'
import type { AudioCheck, AudioItem } from '@/audio/AudioProvider'
import { useSettings } from './useSettings'
import { itemSpeakText, speakText } from '@/lib/content'
import type { Item } from '@/lib/types'

let cachedCheck: AudioCheck | null = null
let checkPromise: Promise<AudioCheck> | null = null

export function runAudioCheck(force = false): Promise<AudioCheck> {
  if (cachedCheck && !force) return Promise.resolve(cachedCheck)
  if (!checkPromise || force) {
    checkPromise = audioProvider.check().then((r) => {
      cachedCheck = r
      return r
    })
  }
  return checkPromise
}

export function useAudioCheck(): { check: AudioCheck | null; recheck: () => void } {
  const [check, setCheck] = useState<AudioCheck | null>(cachedCheck)
  useEffect(() => {
    let alive = true
    runAudioCheck().then((r) => alive && setCheck(r))
    return () => {
      alive = false
    }
  }, [])
  const recheck = useCallback(() => {
    runAudioCheck(true).then(setCheck)
  }, [])
  return { check, recheck }
}

/** アイテム → 読み上げ（単語カードは例文も続けて読む） */
export function itemToAudio(p: Item): AudioItem {
  return { id: p.id, text: itemSpeakText(p), audio: p.audio }
}
/** 英文 → 読み上げ */
export function textToAudio(en: string): AudioItem {
  return { text: speakText(en) }
}

export function useAudio() {
  const { settings } = useSettings()
  const [speaking, setSpeaking] = useState(false)
  const token = useRef(0)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const stop = useCallback(() => {
    token.current += 1
    audioProvider.stop()
    setSpeaking(false)
  }, [])

  const speak = useCallback(async (item: AudioItem | string, rateOverride?: number) => {
    const it: AudioItem = typeof item === 'string' ? { text: speakText(item) } : item
    const my = ++token.current
    setSpeaking(true)
    try {
      const s = settingsRef.current
      await audioProvider.speak(it, { rate: rateOverride ?? s.rate, voiceURI: s.voiceURI, lang: s.accent })
    } catch (e) {
      console.warn(e)
    } finally {
      if (token.current === my) setSpeaking(false)
    }
  }, [])

  useEffect(() => () => audioProvider.stop(), [])

  return { speak, stop, speaking, rate: settings.rate }
}
