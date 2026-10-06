import { useEffect, useRef, useState } from 'react'
import { prompts } from '@/lib/content'
import { kvGet, kvSet, updateLog } from '@/lib/db'
import type { AboutMeAnswer, Prompt } from '@/lib/types'
import { textToAudio } from '@/hooks/useAudio'
import { AudioButton } from '../AudioButton'
import { RecorderPanel } from '../RecorderPanel'
import { Button, Card, Pill } from '../ui'
import { cn } from '@/lib/cn'

const allPrompts = new Map<string, Prompt & { kind: 'aboutMe' | 'speaking' }>([
  ...prompts.aboutMe.map((p) => [p.id, { ...p, kind: 'aboutMe' as const }] as const),
  ...prompts.speaking.map((p) => [p.id, { ...p, kind: 'speaking' as const }] as const),
])

/**
 * スピーキング：質問が出る → 3 秒以内に話し始める（反射）→ 録音 → 自己評価。
 * aboutMe の質問は答えをテキストでも保存（ストック）。
 */
export function SpeakRunner({ promptIds, onDone }: { promptIds: string[]; onDone: (n: number) => void }) {
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'think' | 'talk' | 'review'>('think')
  const [countdown, setCountdown] = useState(3)
  const [answerText, setAnswerText] = useState('')
  const [saved, setSaved] = useState<AboutMeAnswer | null>(null)
  const [reflex, setReflex] = useState<boolean | null>(null)
  const timerRef = useRef<number | null>(null)
  const p = allPrompts.get(promptIds[i] ?? '')

  useEffect(() => {
    setPhase('think')
    setCountdown(3)
    setReflex(null)
    setAnswerText('')
    setSaved(null)
    if (p?.kind === 'aboutMe') {
      void kvGet<AboutMeAnswer>(`aboutme:${p.id}`).then((a) => {
        if (a) {
          setSaved(a)
          setAnswerText(a.text)
        }
      })
    }
  }, [i, p])

  useEffect(() => {
    if (phase !== 'think') return
    timerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          setPhase('talk')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [phase, i])

  if (!p) return null

  async function finish(ok: boolean) {
    setReflex(ok)
    await updateLog((l) => {
      l.speakingPrompts += 1
    })
    if (p!.kind === 'aboutMe' && answerText.trim()) {
      await kvSet(`aboutme:${p!.id}`, { promptId: p!.id, text: answerText.trim(), reflex: ok, updatedAt: Date.now() } satisfies AboutMeAnswer)
    }
    setPhase('review')
  }

  function next() {
    if (i + 1 >= promptIds.length) onDone(promptIds.length)
    else setI(i + 1)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          スピーキング {i + 1} / {promptIds.length}
        </span>
        <Pill>{p.kind === 'aboutMe' ? '🙋 自分について' : '⚡ 反射ドリル'}</Pill>
      </div>
      <Card>
        <div className="flex items-start gap-3">
          <AudioButton item={textToAudio(p.en)} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="font-en text-xl leading-snug">{p.en}</p>
            <p className="text-xs text-slate-400">{p.ja}</p>
          </div>
        </div>
        {phase === 'think' && (
          <div className="mt-4 text-center">
            <p className="text-5xl font-black tabular-nums text-amber-300">{countdown}</p>
            <p className="mt-1 text-xs text-slate-400">3 秒以内に話し始める。完璧な文でなくていい。まず声を出す</p>
            <Button variant="secondary" size="sm" className="mt-2" onClick={() => setPhase('talk')}>
              もう話し始めた →
            </Button>
          </div>
        )}
        {phase !== 'think' && p.hints && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.hints.map((h) => (
              <Pill key={h} className="font-en">
                {h}
              </Pill>
            ))}
          </div>
        )}
      </Card>

      {phase !== 'think' && (
        <>
          <RecorderPanel className="mt-3" compact />
          {p.kind === 'aboutMe' && (
            <div className="mt-3">
              <p className="mb-1 text-xs text-slate-400">言った内容をテキストでもストック（次回はこれを見ずに言う）{saved && <span className="ml-2 text-emerald-300">保存済み</span>}</p>
              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                rows={3}
                lang="en"
                placeholder="I'm from Japan, and I've been living in Bangkok for..."
                className="font-en w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
              />
            </div>
          )}
          {phase === 'talk' ? (
            <div className="mt-3">
              <p className="mb-2 text-sm text-slate-300">3 秒以内に話し始めて、3 文以上言えた？</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="warn" size="lg" onClick={() => void finish(false)}>
                  詰まった
                </Button>
                <Button variant="success" size="lg" onClick={() => void finish(true)}>
                  言えた
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-3">
              <p className={cn('rounded-xl p-3 text-sm', reflex ? 'bg-emerald-950/40 text-emerald-200' : 'bg-slate-800/60 text-slate-300')}>
                {reflex ? '反射で出た。録音を聞いて、語尾の s・時制・r/l をチェック。' : '詰まった質問はストックの出番。答えを 3 文書いて、明日もう一度。'}
              </p>
              <Button size="lg" className="mt-3 w-full" onClick={next}>
                {i + 1 >= promptIds.length ? '完了' : '次へ'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
