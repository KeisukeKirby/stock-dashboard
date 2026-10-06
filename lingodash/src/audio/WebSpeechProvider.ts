import type { AudioCheck, AudioItem, AudioProvider, SpeakOptions } from './AudioProvider'

function synth(): SpeechSynthesis | null {
  return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null
}

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

export function englishVoices(voices: SpeechSynthesisVoice[], accent?: string): SpeechSynthesisVoice[] {
  const en = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('en'))
  if (!accent) return en
  const pref = en.filter((v) => v.lang.toLowerCase().replace('_', '-') === accent.toLowerCase())
  return pref.length > 0 ? [...pref, ...en.filter((v) => !pref.includes(v))] : en
}

export class WebSpeechProvider implements AudioProvider {
  readonly name = 'Web Speech API (en)'
  private current: SpeechSynthesisUtterance | null = null

  async check(): Promise<AudioCheck> {
    const s = synth()
    if (!s) return { ok: false, reason: 'このブラウザは音声合成 (speechSynthesis) に対応していません。' }
    const voices = englishVoices(await loadVoices())
    if (voices.length === 0) return { ok: false, reason: '英語の音声が端末にありません。', voices: [] }
    return { ok: true, voices: voices.map((v) => ({ name: v.name, voiceURI: v.voiceURI, lang: v.lang })) }
  }

  async speak(item: AudioItem, opts: SpeakOptions): Promise<void> {
    const s = synth()
    if (!s) throw new Error('音声合成に対応していません')
    this.stop()
    const voices = englishVoices(await loadVoices(), opts.lang)
    const voice = voices.find((v) => v.voiceURI === opts.voiceURI) ?? voices[0]
    const u = new SpeechSynthesisUtterance(item.text)
    u.lang = voice?.lang ?? opts.lang ?? 'en-US'
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
      const guard = Math.max(4000, (item.text.length * 120) / opts.rate)
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
