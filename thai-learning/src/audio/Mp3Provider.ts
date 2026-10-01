import type { AudioCheck, AudioItem, AudioProvider, SpeakOptions } from './AudioProvider'

/** 事前生成 mp3（/audio/<id>.mp3 または item.audio）を再生する。
 *  Phase 2 でクラウド TTS により一括生成したファイルを public/audio/ に置けば差し替わる。 */
export class Mp3Provider implements AudioProvider {
  readonly name = '事前生成 mp3'
  private current: HTMLAudioElement | null = null

  resolveUrl(item: AudioItem): string | null {
    if (item.audio) return item.audio.startsWith('/') ? item.audio : `/audio/${item.audio}`
    return null
  }

  async check(): Promise<AudioCheck> {
    return { ok: typeof Audio !== 'undefined' }
  }

  speak(item: AudioItem, opts: SpeakOptions): Promise<void> {
    const url = this.resolveUrl(item)
    if (!url) return Promise.reject(new Error('mp3 がありません'))
    this.stop()
    const a = new Audio(url)
    a.playbackRate = opts.rate
    a.preservesPitch = true
    this.current = a
    return new Promise((resolve, reject) => {
      a.onended = () => {
        if (this.current === a) this.current = null
        resolve()
      }
      a.onerror = () => reject(new Error('mp3 を再生できませんでした'))
      a.play().catch(reject)
    })
  }

  stop(): void {
    if (this.current) {
      this.current.pause()
      this.current.src = ''
      this.current = null
    }
  }
}
