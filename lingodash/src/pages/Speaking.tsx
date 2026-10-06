import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { prompts, roleplays, sceneById, shuffle } from '@/lib/content'
import { useKvList } from '@/hooks/useProgress'
import { kvSet } from '@/lib/db'
import type { AboutMeAnswer } from '@/lib/types'
import { SpeakRunner } from '@/components/learn/SpeakRunner'
import { RecorderPanel } from '@/components/RecorderPanel'
import { AudioButton } from '@/components/AudioButton'
import { textToAudio } from '@/hooks/useAudio'
import { Tabs } from '@/components/Tabs'
import { Button, Card, PageTitle, Pill, ProgressBar } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { cn } from '@/lib/cn'

type Tab = 'aboutme' | 'reflex' | 'roleplay'

export default function Speaking() {
  const [tab, setTab] = useState<Tab>('aboutme')
  return (
    <div>
      <PageTitle title="スピーキング" subtitle="アウトプットで最重要。反射的に英語が出てくるまで。撮影してダブルチェック" />
      <VoiceBanner />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          ['aboutme', '🙋 自分のストック'],
          ['reflex', '⚡ 反射ドリル'],
          ['roleplay', '🎭 ロールプレイ'],
        ]}
      />
      {tab === 'aboutme' && <AboutMe />}
      {tab === 'reflex' && <Reflex />}
      {tab === 'roleplay' && <RoleplayList />}
    </div>
  )
}

function AboutMe() {
  const { rows } = useKvList<AboutMeAnswer>('aboutme:')
  const answers = new Map(rows.map((r) => [r.value.promptId, r.value]))
  const [open, setOpen] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [drill, setDrill] = useState<string[] | null>(null)
  const done = prompts.aboutMe.filter((p) => answers.has(p.id)).length
  const reflexReady = prompts.aboutMe.filter((p) => answers.get(p.id)?.reflex).length

  if (drill) {
    return (
      <div>
        <div className="mb-2 text-right">
          <Button variant="ghost" size="sm" onClick={() => setDrill(null)}>
            やめる
          </Button>
        </div>
        <SpeakRunner promptIds={drill} onDone={() => setDrill(null)} />
      </div>
    )
  }

  return (
    <div>
      <Card className="mb-3">
        <p className="text-sm text-slate-300">「自分について語れる情報」を 20 問分ストックする。書く → 録音 → 見ずに言える（反射）まで。初対面・面接・雑談の 8 割はここから出る。</p>
        <div className="mt-3 flex items-center gap-3 text-xs text-slate-400">
          <span>
            作成 {done}/{prompts.aboutMe.length}
          </span>
          <span>反射 OK {reflexReady}</span>
        </div>
        <ProgressBar value={done} max={prompts.aboutMe.length} className="mt-1" color="bg-slate-500" />
        <ProgressBar value={reflexReady} max={prompts.aboutMe.length} className="mt-1" />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => setDrill(shuffle(prompts.aboutMe).slice(0, 5).map((p) => p.id))}>▶ ランダム 5 問ドリル</Button>
          <Button variant="secondary" disabled={done === 0} onClick={() => setDrill(shuffle(prompts.aboutMe.filter((p) => answers.has(p.id) && !answers.get(p.id)?.reflex)).slice(0, 5).map((p) => p.id))}>
            詰まった質問だけ
          </Button>
        </div>
      </Card>
      <div className="space-y-2">
        {prompts.aboutMe.map((p) => {
          const a = answers.get(p.id)
          const isOpen = open === p.id
          return (
            <Card key={p.id} className={cn(isOpen && 'border-amber-500/50')}>
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 text-left"
                onClick={() => {
                  setOpen(isOpen ? null : p.id)
                  setDraft(a?.text ?? '')
                }}
              >
                <div className="min-w-0">
                  <p className="font-en font-semibold">{p.en}</p>
                  <p className="text-xs text-slate-400">{p.ja}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {a?.reflex && <Pill className="bg-emerald-900/60 text-emerald-200">反射 OK</Pill>}
                  {a && !a.reflex && <Pill className="bg-amber-900/60 text-amber-200">作成済み</Pill>}
                </div>
              </button>
              {isOpen && (
                <div className="mt-3">
                  <div className="flex items-center gap-2">
                    <AudioButton item={textToAudio(p.en)} size="sm" />
                    <div className="flex flex-wrap gap-1.5">
                      {p.hints?.map((h) => (
                        <Pill key={h} className="font-en">
                          {h}
                        </Pill>
                      ))}
                    </div>
                  </div>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    lang="en"
                    placeholder="Write your answer in 2-4 sentences..."
                    className="font-en mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base text-slate-100 placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                  {draft.trim() && <AudioButton item={textToAudio(draft)} size="sm" className="mt-2 bg-slate-700 text-slate-100" label="自分の答えを読み上げ" />}
                  <RecorderPanel target={draft.trim() || undefined} className="mt-2" compact />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Button size="sm" variant="secondary" onClick={() => void kvSet(`aboutme:${p.id}`, { promptId: p.id, text: draft.trim(), reflex: a?.reflex ?? false, updatedAt: Date.now() } satisfies AboutMeAnswer)}>
                      保存
                    </Button>
                    <Button size="sm" variant={a?.reflex ? 'success' : 'primary'} onClick={() => void kvSet(`aboutme:${p.id}`, { promptId: p.id, text: draft.trim(), reflex: !a?.reflex, updatedAt: Date.now() } satisfies AboutMeAnswer)}>
                      {a?.reflex ? '反射 OK を外す' : '見ずに言えた（反射 OK）'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Reflex() {
  const [n, setN] = useState(5)
  const [key, setKey] = useState(0)
  const [running, setRunning] = useState(false)
  const ids = useMemo(() => shuffle(prompts.speaking).slice(0, n).map((p) => p.id), [n, key])
  if (running) {
    return (
      <div>
        <div className="mb-2 text-right">
          <Button variant="ghost" size="sm" onClick={() => setRunning(false)}>
            やめる
          </Button>
        </div>
        <SpeakRunner
          key={key}
          promptIds={ids}
          onDone={() => {
            setRunning(false)
            setKey((k) => k + 1)
          }}
        />
      </div>
    )
  }
  return (
    <Card>
      <p className="text-sm text-slate-300">質問が出たら 3 秒以内に話し始める。正確さより反応速度。終わったら録音を聞いて、時制・語尾の s・r/l をチェック。スマホで撮影して表情・口の形も見る。</p>
      <p className="mt-3 text-sm font-semibold">問題数</p>
      <div className="mt-2 flex gap-2">
        {[3, 5, 10].map((k) => (
          <button key={k} type="button" onClick={() => setN(k)} className={cn('rounded-full px-3 py-1 text-sm', n === k ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300')}>
            {k}
          </button>
        ))}
      </div>
      <Button size="lg" className="mt-4 w-full" onClick={() => setRunning(true)}>
        ▶ 開始
      </Button>
    </Card>
  )
}

function RoleplayList() {
  return (
    <div className="space-y-2">
      {roleplays.map((r) => {
        const sc = sceneById.get(r.scene)
        const hasBranch = Object.values(r.nodes).some((n) => n.kind === 'branch')
        return (
          <Link key={r.id} to={`/roleplay/${r.id}`}>
            <Card className="transition hover:border-amber-500/50">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-bold">
                    {sc?.icon} {r.title}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{r.description}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Pill>約 {r.estMinutes} 分</Pill>
                  {hasBranch && <Pill className="bg-amber-900/50 text-amber-200">分岐</Pill>}
                </div>
              </div>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
