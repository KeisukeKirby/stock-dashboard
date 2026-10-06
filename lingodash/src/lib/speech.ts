/** SpeechRecognition (en) — 対応ブラウザのみの補助機能 */

type SRResult = { transcript: string; confidence: number }

interface SRInstance {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((ev: { results: ArrayLike<ArrayLike<SRResult>> }) => void) | null
  onerror: ((ev: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

function getCtor(): (new () => SRInstance) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SRInstance; webkitSpeechRecognition?: new () => SRInstance }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function recognitionSupported(): boolean {
  return typeof window !== 'undefined' && getCtor() !== null
}

export function recognizeEnglish(lang = 'en-US', timeoutMs = 10000): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getCtor()
    if (!Ctor) return reject(new Error('音声認識に対応していません'))
    const r = new Ctor()
    r.lang = lang
    r.interimResults = false
    r.maxAlternatives = 3
    r.continuous = false
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        r.abort()
        reject(new Error('時間内に認識できませんでした'))
      }
    }, timeoutMs)
    r.onresult = (ev) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(ev.results[0]?.[0]?.transcript ?? '')
    }
    r.onerror = (ev) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error(ev.error === 'not-allowed' ? 'マイクの使用が許可されていません' : `認識エラー: ${ev.error}`))
    }
    r.onend = () => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve('')
      }
    }
    r.start()
  })
}

/** 比較用に正規化：小文字・記号除去・数字はそのまま */
export function normalizeEn(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordsOf(s: string): string[] {
  return normalizeEn(s).split(' ').filter(Boolean)
}

/** 単語レベルの一致度（0〜1）。ディクテーション・認識チェック共用。 */
export function wordSimilarity(a: string, b: string): number {
  const x = wordsOf(a)
  const y = wordsOf(b)
  if (x.length === 0 || y.length === 0) return 0
  // LCS ベース
  const dp: number[][] = Array.from({ length: x.length + 1 }, () => new Array<number>(y.length + 1).fill(0))
  for (let i = 1; i <= x.length; i++) {
    for (let j = 1; j <= y.length; j++) {
      dp[i][j] = x[i - 1] === y[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const lcs = dp[x.length][y.length]
  return (2 * lcs) / (x.length + y.length)
}

/** 正解文の各単語が、入力に含まれるか（表示用の採点） */
export function diffWords(answer: string, typed: string): { word: string; ok: boolean }[] {
  const typedSet = new Set(wordsOf(typed))
  return answer
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => ({ word: w, ok: typedSet.has(normalizeEn(w)) }))
}
