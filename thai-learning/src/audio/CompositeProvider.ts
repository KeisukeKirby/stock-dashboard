import type { AudioCheck, AudioItem, AudioProvider, SpeakOptions } from './AudioProvider'
import { Mp3Provider } from './Mp3Provider'
import { WebSpeechProvider } from './WebSpeechProvider'

/** mp3 があれば mp3、無ければ Web Speech。 */
export class CompositeProvider implements AudioProvider {
  readonly name = 'auto'
  readonly mp3 = new Mp3Provider()
  readonly tts = new WebSpeechProvider()

  check(): Promise<AudioCheck> {
    return this.tts.check()
  }

  async speak(item: AudioItem, opts: SpeakOptions): Promise<void> {
    this.stop()
    if (this.mp3.resolveUrl(item)) {
      try {
        await this.mp3.speak(item, opts)
        return
      } catch {
        // mp3 が無い／壊れている → TTS にフォールバック
      }
    }
    await this.tts.speak(item, opts)
  }

  stop(): void {
    this.mp3.stop()
    this.tts.stop()
  }
}

export const audioProvider: AudioProvider = new CompositeProvider()
