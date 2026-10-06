export interface AudioItem {
  /** フレーズ ID（mp3 のファイル名に使う） */
  id?: string
  /** 読み上げるタイ語テキスト */
  text: string
  /** 事前生成 mp3 のパス（あれば優先） */
  audio?: string
}

export interface SpeakOptions {
  rate: number
  voiceURI?: string
}

export interface AudioCheck {
  ok: boolean
  reason?: string
  /** タイ語の音声 */
  voices?: { name: string; voiceURI: string; lang: string }[]
  /** ブラウザが検出した全音声の数（診断用） */
  allVoices?: number
  /** 検出した言語コード一覧（診断用） */
  languages?: string[]
}

export interface AudioProvider {
  readonly name: string
  check(): Promise<AudioCheck>
  speak(item: AudioItem, opts: SpeakOptions): Promise<void>
  stop(): void
}
