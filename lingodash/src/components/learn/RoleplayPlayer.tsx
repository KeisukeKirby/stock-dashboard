import { useEffect, useMemo, useRef, useState } from 'react'
import type { Mood, Roleplay, RoleplayNode } from '@/lib/types'
import { updateLog } from '@/lib/db'
import { textToAudio, useAudio } from '@/hooks/useAudio'
import { AudioButton } from '../AudioButton'
import { RecorderPanel } from '../RecorderPanel'
import { Button, Pill } from '../ui'
import { cn } from '@/lib/cn'

interface HistoryItem {
  speaker: 'partner' | 'you'
  en: string
  ja: string
  mood?: Mood
}

const moodStyle: Record<Mood, string> = {
  good: 'border-emerald-600 bg-emerald-500/15 hover:bg-emerald-500/25',
  neutral: 'border-slate-600 bg-slate-800/60 hover:bg-slate-700',
  declined: 'border-rose-600 bg-rose-500/15 hover:bg-rose-500/25',
}

/** 台本ロールプレイ：相手は音声（英語のみ）、自分の番は日本語ヒント → 声に出す → 正解 → 録音。 */
export function RoleplayPlayer({ roleplay, onDone, hidePartnerJa = true }: { roleplay: Roleplay; onDone?: (mood?: Mood) => void; hidePartnerJa?: boolean }) {
  const [nodeId, setNodeId] = useState(roleplay.start)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [revealed, setRevealed] = useState(false)
  const [showJa, setShowJa] = useState(!hidePartnerJa)
  const { speak } = useAudio()
  const node: RoleplayNode | undefined = roleplay.nodes[nodeId]
  const bottomRef = useRef<HTMLDivElement>(null)
  const logged = useRef(false)

  useEffect(() => {
    setRevealed(false)
    setShowJa(!hidePartnerJa)
    if (node?.kind === 'partner') {
      const t = setTimeout(() => void speak(textToAudio(node.en)), 350)
      return () => clearTimeout(t)
    }
    if (node?.kind === 'end' && !logged.current) {
      logged.current = true
      void updateLog((l) => {
        l.roleplays += 1
      })
    }
  }, [nodeId, node, speak, hidePartnerJa])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [history.length, nodeId, revealed])

  const steps = useMemo(() => Object.keys(roleplay.nodes).length, [roleplay])

  function restart() {
    setHistory([])
    setNodeId(roleplay.start)
    logged.current = false
  }

  if (!node) return <p className="text-rose-300">台本のノードが見つかりません: {nodeId}</p>

  function advancePartner(n: Extract<RoleplayNode, { kind: 'partner' }>) {
    setHistory((h) => [...h, { speaker: 'partner', en: n.en, ja: n.ja }])
    if (n.next) setNodeId(n.next)
  }
  function advanceYou(n: Extract<RoleplayNode, { kind: 'you' }>) {
    setHistory((h) => [...h, { speaker: 'you', en: n.en, ja: n.ja }])
    if (n.next) setNodeId(n.next)
  }
  function chooseBranch(opt: Extract<RoleplayNode, { kind: 'branch' }>['options'][number]) {
    setHistory((h) => [...h, { speaker: 'partner', en: opt.en, ja: opt.ja, mood: opt.mood }])
    void speak(textToAudio(opt.en))
    if (opt.next) setNodeId(opt.next)
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">{roleplay.title}</h2>
          <p className="text-xs text-slate-400">{roleplay.description}</p>
        </div>
        <Pill>約 {roleplay.estMinutes} 分</Pill>
      </div>

      <div className="space-y-2">
        {history.map((h, idx) => (
          <Bubble key={idx} item={h} />
        ))}

        {node.kind === 'partner' && (
          <div className="rounded-2xl border border-sky-800/60 bg-sky-950/40 p-4">
            <p className="mb-1 text-xs text-sky-300">💁 相手（まず音だけで理解する）</p>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p lang="en" className="font-en text-xl leading-snug">
                  {node.en}
                </p>
                {showJa ? (
                  <p className="mt-1 text-sm text-slate-300">{node.ja}</p>
                ) : (
                  <button type="button" className="mt-1 text-xs text-slate-400 underline" onClick={() => setShowJa(true)}>
                    意味を表示
                  </button>
                )}
              </div>
              <AudioButton item={textToAudio(node.en)} />
            </div>
            <Button size="lg" className="mt-3 w-full" onClick={() => advancePartner(node)}>
              分かった → 自分の番
            </Button>
          </div>
        )}

        {node.kind === 'you' && (
          <div className="rounded-2xl border border-amber-800/60 bg-amber-950/30 p-4">
            <p className="mb-1 text-xs text-amber-300">🧑 あなたの番 — 3 秒以内に声に出す</p>
            <p className="text-lg font-semibold">{node.hintJa}</p>
            {revealed && (
              <div className="mt-3 border-t border-amber-900/50 pt-3">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p lang="en" className="font-en text-xl leading-snug">
                      {node.en}
                    </p>
                    <p className="text-xs text-slate-400">{node.ja}</p>
                  </div>
                  <AudioButton item={textToAudio(node.en)} />
                </div>
                <RecorderPanel target={node.en} className="mt-3" compact />
              </div>
            )}
            {!revealed ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setRevealed(true)}>
                  正解を見る
                </Button>
                <Button
                  onClick={() => {
                    setRevealed(true)
                    void speak(textToAudio(node.en))
                  }}
                >
                  正解を聞く
                </Button>
              </div>
            ) : (
              <Button size="lg" className="mt-3 w-full" onClick={() => advanceYou(node)}>
                言えた → 次へ
              </Button>
            )}
          </div>
        )}

        {node.kind === 'branch' && (
          <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-4">
            <p className="mb-2 text-sm text-slate-300">{node.promptJa}</p>
            <div className="grid gap-2">
              {node.options.map((o) => (
                <button key={o.label} type="button" onClick={() => chooseBranch(o)} className={cn('rounded-xl border px-4 py-3 text-left transition', moodStyle[o.mood])}>
                  <p className="text-xs text-slate-300">{o.label}</p>
                  <p lang="en" className="font-en text-base">
                    {o.en}
                  </p>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              <button type="button" className="underline" onClick={() => chooseBranch(node.options[Math.floor(Math.random() * node.options.length)])}>
                ランダムに決める
              </button>
            </p>
          </div>
        )}

        {node.kind === 'end' && (
          <div
            className={cn(
              'rounded-2xl border p-4',
              node.mood === 'good' && 'border-emerald-700 bg-emerald-950/40',
              node.mood === 'declined' && 'border-rose-700 bg-rose-950/40',
              (!node.mood || node.mood === 'neutral') && 'border-slate-700 bg-slate-900/80',
            )}
          >
            <p className="text-sm font-semibold">{node.mood === 'good' ? '🎉 いい流れ！' : node.mood === 'declined' ? '🙂 きれいに引けた' : '👌 ここまで OK'}</p>
            <p className="mt-1 text-sm text-slate-200">{node.messageJa}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={restart}>
                もう一度（別の分岐）
              </Button>
              <Button onClick={() => onDone?.(node.mood)}>完了</Button>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <p className="mt-3 text-right text-[11px] text-slate-500">{steps} ノード</p>
    </div>
  )
}

function Bubble({ item }: { item: HistoryItem }) {
  const you = item.speaker === 'you'
  return (
    <div className={cn('flex', you ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[88%] rounded-2xl px-3 py-2', you ? 'bg-amber-400/15 text-right' : 'bg-slate-800/70', item.mood === 'good' && 'ring-1 ring-emerald-600/60', item.mood === 'declined' && 'ring-1 ring-rose-600/60')}>
        <div className={cn('flex items-center gap-2', you && 'flex-row-reverse')}>
          <AudioButton item={textToAudio(item.en)} size="sm" className="bg-slate-700 text-slate-100 hover:bg-slate-600" />
          <div>
            <p lang="en" className="font-en text-base leading-tight">
              {item.en}
            </p>
            <p className="text-xs text-slate-400">{item.ja}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
