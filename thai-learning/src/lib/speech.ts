/** SpeechRecognition (th-TH) — 対応ブラウザのみの補助機能 */

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

export function recognizeThai(timeoutMs = 8000): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = getCtor()
    if (!Ctor) return reject(new Error('音声認識に対応していません'))
    const r = new Ctor()
    r.lang = 'th-TH'
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
      const first = ev.results[0]?.[0]
      resolve(first?.transcript ?? '')
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

/** タイ文字だけ残して比較用に正規化（空白・記号・「...」を除く） */
export function normalizeThai(s: string): string {
  return s.replace(/[^฀-๿]/g, '')
}

/** 0〜1 の素朴な一致度（文字 bigram の Dice 係数） */
export function similarity(a: string, b: string): number {
  const x = normalizeThai(a)
  const y = normalizeThai(b)
  if (!x || !y) return 0
  if (x === y) return 1
  const grams = (s: string) => {
    const m = new Map<string, number>()
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2)
      m.set(g, (m.get(g) ?? 0) + 1)
    }
    return m
  }
  const ga = grams(x)
  const gb = grams(y)
  let inter = 0
  for (const [g, n] of ga) inter += Math.min(n, gb.get(g) ?? 0)
  const total = [...ga.values()].reduce((s, n) => s + n, 0) + [...gb.values()].reduce((s, n) => s + n, 0)
  return total === 0 ? 0 : (2 * inter) / total
}
