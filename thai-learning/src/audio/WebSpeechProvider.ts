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
