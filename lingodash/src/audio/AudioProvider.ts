export interface AudioItem {
  /** フレーズ ID（mp3 のファイル名に使う） */
  id?: string
  /** 読み上げる英語テキスト */
  text: string
  /** 事前生成 mp3 のパス（あれば優先） */
  audio?: string
}

export interface SpeakOptions {
  rate: number
  voiceURI?: string
  /** 'en-US' | 'en-GB' | 'en-AU' */
  lang?: string
}

export interface AudioCheck {
  ok: boolean
  reason?: string
  voices?: { name: string; voiceURI: string; lang: string }[]
}

export interface AudioProvider {
  readonly name: string
  check(): Promise<AudioCheck>
  speak(item: AudioItem, opts: SpeakOptions): Promise<void>
  stop(): void
}
