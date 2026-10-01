import type { AudioCheck, AudioItem, AudioProvider, SpeakOptions } from './AudioProvider'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

/**
 * getVoices() はブラウザ起動直後やページ読込直後は空のことが多い（特に Windows の Chrome/Edge）。
 * voiceschanged を待ちつつ、一定間隔でポーリングして最大 timeoutMs まで待つ。
 */
export function loadVoices(timeoutMs = 4000): Promise<SpeechSynthesisVoice[]> {
  const s = synth()
  if (!s) return Promise.resolve([])
  const now = s.getVoices()
  if (now.length > 0) return Promise.resolve(now)
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      clearInterval(poll)
      clearTimeout(timer)
      s.removeEventListener('voiceschanged', finish)
      resolve(s.getVoices())
    }
    const poll = setInterval(() => {
      if (s.getVoices().length > 0) finish()
    }, 250)
    const timer = setTimeout(finish, timeoutMs)
    s.addEventListener('voiceschanged', finish)
  })
}

export function isThaiVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || '').toLowerCase().replace('_', '-')
  return lang.startsWith('th') || /thai|ไทย/i.test(v.name)
}

export function thaiVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter(isThaiVoice)
}

export class WebSpeechProvider implements AudioProvider {
  readonly name = 'Web Speech API (th-TH)'
  private current: SpeechSynthesisUtterance | null = null

  async check(): Promise<AudioCheck> {
    const s = synth()
    if (!s) return { ok: false, reason: 'このブラウザは音声合成 (speechSynthesis) に対応していません。', allVoices: 0 }
    const all = await loadVoices()
    const voices = thaiVoices(all)
    const summary = {
      allVoices: all.length,
      languages: [...new Set(all.map((v) => v.lang))].sort(),
    }
    if (voices.length === 0) {
      return {
        ok: false,
        reason:
          all.length === 0
            ? 'ブラウザが音声を 1 件も読み込めていません。ページを再読み込みするか、ブラウザを完全に終了して開き直してください。'
            : `タイ語 (th-TH) の音声が端末にありません（ブラウザが検出した音声は ${all.length} 件、タイ語は 0 件）。`,
        voices: [],
        ...summary,
      }
    }
    return { ok: true, voices: voices.map((v) => ({ name: v.name, voiceURI: v.voiceURI, lang: v.lang })), ...summary }
  }

  /** 直近で実際に使った音声名（診断用） */
  lastVoiceName: string | null = null

  async speak(item: AudioItem, opts: SpeakOptions): Promise<void> {
    const s = synth()
    if (!s) throw new Error('音声合成に対応していません')
    this.stop()
    // cancel() 直後の speak() が無視される Chrome/Edge の既知の問題を避ける
    await new Promise((r) => setTimeout(r, 60))
    if (s.paused) s.resume()

    const voices = thaiVoices(await loadVoices())
    const preferred = voices.find((v) => v.voiceURI === opts.voiceURI)
    // 候補：選択した音声 → 他のタイ語音声 → 音声指定なし（lang だけ）
    const candidates: (SpeechSynthesisVoice | null)[] = [
      ...(preferred ? [preferred] : []),
      ...voices.filter((v) => v !== preferred),
      null,
    ]
    let lastErr: Error | null = null
    for (const voice of candidates) {
      try {
        await this.speakWith(s, item.text, voice, opts.rate)
        this.lastVoiceName = voice ? `${voice.name} (${voice.lang})` : 'lang=th-TH（音声指定なし）'
        return
      } catch (e) {
        lastErr = e as Error
        if (/interrupted|canceled/.test(lastErr.message)) return
      }
    }
    throw lastErr ?? new Error('音声を再生できませんでした')
  }

  private speakWith(s: SpeechSynthesis, text: string, voice: SpeechSynthesisVoice | null, rate: number): Promise<void> {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = voice?.lang ?? 'th-TH'
    if (voice) u.voice = voice
    u.rate = rate
    u.pitch = 1
    u.volume = 1
    this.current = u
    return new Promise((resolve, reject) => {
      let settled = false
      let started = false
      const finish = () => {
        if (settled) return
        settled = true
        if (this.current === u) this.current = null
        resolve()
      }
      u.onstart = () => {
        started = true
      }
      u.onend = finish
      u.onerror = (e) => {
        if (settled) return
        settled = true
        if (this.current === u) this.current = null
        reject(new Error(`${e.error}${voice ? ` [${voice.name}]` : ' [lang only]'}`))
      }
      // onend が来ないブラウザ対策。開始すらしなければ失敗扱いにして次の候補へ
      const guard = Math.max(4000, (text.length * 450) / rate)
      setTimeout(() => {
        if (settled) return
        if (started) finish()
        else {
          settled = true
          if (this.current === u) this.current = null
          try {
            s.cancel()
          } catch {
            /* noop */
          }
          reject(new Error(`timeout: 再生が始まりませんでした${voice ? ` [${voice.name}]` : ' [lang only]'}`))
        }
      }, guard)
      s.speak(u)
    })
  }

  stop(): void {
    const s = synth()
    if (s && (s.speaking || s.pending)) s.cancel()
    this.current = null
  }
}
