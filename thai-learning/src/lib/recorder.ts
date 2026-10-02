export interface Recording {
  blob: Blob
  url: string
  durationMs: number
}

export function recorderSupported(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined'
}

function pickMimeType(): string | undefined {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus']
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported?.(c)) return c
  }
  return undefined
}

export class Recorder {
  private stream: MediaStream | null = null
  private rec: MediaRecorder | null = null
  private chunks: BlobPart[] = []
  private startedAt = 0

  async start(): Promise<void> {
    if (!recorderSupported()) throw new Error('この端末では録音に対応していません')
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = pickMimeType()
    this.rec = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined)
    this.chunks = []
    this.rec.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data)
    }
    this.startedAt = Date.now()
    this.rec.start()
  }

  stop(): Promise<Recording> {
    return new Promise((resolve, reject) => {
      const rec = this.rec
      if (!rec) return reject(new Error('録音が開始されていません'))
      rec.onstop = () => {
        const blob = new Blob(this.chunks, { type: rec.mimeType || 'audio/webm' })
        this.cleanup()
        resolve({ blob, url: URL.createObjectURL(blob), durationMs: Date.now() - this.startedAt })
      }
      rec.onerror = () => {
        this.cleanup()
        reject(new Error('録音中にエラーが発生しました'))
      }
      rec.stop()
    })
  }

  cancel(): void {
    try {
      this.rec?.stop()
    } catch {
      /* noop */
    }
    this.cleanup()
  }

  private cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop())
    this.stream = null
    this.rec = null
  }
}

export function playUrl(url: string, rate = 1): Promise<void> {
  return new Promise((resolve, reject) => {
    const a = new Audio(url)
    a.playbackRate = rate
    a.onended = () => resolve()
    a.onerror = () => reject(new Error('再生できませんでした'))
    a.play().catch(reject)
  })
}
