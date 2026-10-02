import type { AudioCheck, AudioItem, AudioProvider, SpeakOptions } from './AudioProvider'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

/** getVoices() は非同期に埋まることがあるので voiceschanged を少し待つ */
export function loadVoices(timeoutMs = 1500): Promise<SpeechSynthesisVoice[]> {
  const s = synth()
  if (!s) return Promise.resolve([])
  const now = s.getVoices()
  if (now.length > 0) return Promise.resolve(now)
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve(s.getVoices())
    }
    s.addEventListener('voiceschanged', finish, { once: true })
    setTimeout(finish, timeoutMs)
  })
}

export function thaiVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('th'))
}

export class WebSpeechProvider implements AudioProvider {
  readonly name = 'Web Speech API (th-TH)'
  private current: SpeechSynthesisUtterance | null = null

  async check(): Promise<AudioCheck> {
    const s = synth()
    if (!s) return { ok: false, reason: 'このブラウザは音声合成 (speechSynthesis) に対応していません。' }
    const voices = thaiVoices(await loadVoices())
    if (voices.length === 0) {
      return {
        ok: false,
        reason: 'タイ語 (th-TH) の音声が端末にありません。',
        voices: [],
      }
    }
    return { ok: true, voices: voices.map((v) => ({ name: v.name, voiceURI: v.voiceURI, lang: v.lang })) }
  }

  async speak(item: AudioItem, opts: SpeakOptions): Promise<void> {
    const s = synth()
    if (!s) throw new Error('音声合成に対応していません')
    this.stop()
    const voices = thaiVoices(await loadVoices())
    const voice = voices.find((v) => v.voiceURI === opts.voiceURI) ?? voices[0]
    const u = new SpeechSynthesisUtterance(item.text)
    u.lang = voice?.lang ?? 'th-TH'
    if (voice) u.voice = voice
    u.rate = opts.rate
    u.pitch = 1
    this.current = u
    return new Promise((resolve, reject) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        if (this.current === u) this.current = null
        resolve()
      }
      u.onend = finish
      u.onerror = (e) => {
        if (settled) return
        settled = true
        if (this.current === u) this.current = null
        if (e.error === 'interrupted' || e.error === 'canceled') resolve()
        else reject(new Error(`音声再生エラー: ${e.error}`))
      }
      // Safari/Chrome で稀に onend が来ない対策
      const guard = Math.max(4000, (item.text.length * 450) / opts.rate)
      setTimeout(finish, guard)
      s.speak(u)
    })
  }

  stop(): void {
    const s = synth()
    if (s && (s.speaking || s.pending)) s.cancel()
    this.current = null
  }
}
