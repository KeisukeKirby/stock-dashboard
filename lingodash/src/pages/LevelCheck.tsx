import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { levelcheck, countWords, dictationById } from '@/lib/content'
import { emptyAnswers, scoreLevelCheck, CEFR_JA, type LevelAnswers } from '@/lib/levelcheck'
import { getMeta, setMeta } from '@/lib/db'
import { usePlan } from '@/hooks/useProgress'
import { textToAudio, useAudio } from '@/hooks/useAudio'
import { wordSimilarity, diffWords } from '@/lib/speech'
import { SKILLS, SKILL_JA, type LevelResult, type Skill } from '@/lib/types'
import { AudioButton } from '@/components/AudioButton'
import { RecorderPanel } from '@/components/RecorderPanel'
import { SoundRunner } from '@/components/learn/SoundRunner'
import { Button, Card, PageTitle, Pill, ProgressBar } from '@/components/ui'
import { VoiceBanner } from '@/components/VoiceBanner'
import { ChoiceButton } from '@/components/Tabs'
import { SkillRadar } from '@/components/SkillRadar'
import { dateKey, formatMD } from '@/lib/date'
import { cn } from '@/lib/cn'

type Section = 'intro' | 'vocab' | 'grammar' | 'reading' | 'listening' | 'dictation' | 'sounds' | 'speaking' | 'writing' | 'result'
const ORDER: Section[] = ['intro', 'vocab', 'grammar', 'reading', 'listening', 'dictation', 'sounds', 'speaking', 'writing', 'result']
const TITLE: Record<Section, string> = {
  intro: 'レベルチェック',
  vocab: '① 語彙（30 問）',
  grammar: '② 文法（15 問）',
  reading: '③ リーディング（2 本）',
  listening: '④ リスニング（10 問）',
  dictation: '⑤ ディクテーション（4 文）',
  sounds: '⑥ 発音の聞き分け（10 問）',
  speaking: '⑦ スピーキング（3 問・録音）',
  writing: '⑧ ライティング（5 分）',
  result: '結果',
}

export default function LevelCheck() {
  const nav = useNavigate()
  const { level } = usePlan()
  const [sec, setSec] = useState<Section>('intro')
  const [ans, setAns] = useState<LevelAnswers>(emptyAnswers)
  const [result, setResult] = useState<LevelResult | null>(null)
  const idx = ORDER.indexOf(sec)

  function next() {
    setSec(ORDER[Math.min(ORDER.length - 1, idx + 1)])
    window.scrollTo({ top: 0 })
  }

  async function finish(final: LevelAnswers) {
    const r = scoreLevelCheck(final)
    const history = (await getMeta<LevelResult[]>('levelHistory')) ?? []
    await setMeta('levelHistory', [...history, r])
    await setMeta('level', r)
    const prevPlan = await getMeta<{ startDate: string; startWeek: number }>('plan')
    if (!prevPlan || !level) await setMeta('plan', { startDate: dateKey(), startWeek: r.recommendedWeek })
    setResult(r)
    setSec('result')
    window.scrollTo({ top: 0 })
  }

  if (sec === 'intro') {
    return (
      <div>
        <PageTitle title="レベルチェック" subtitle="現在地をはっきりさせる。約 25 分、途中でやめると最初から" />
        <VoiceBanner />
        <Card>
          <ul className="space-y-1.5 text-sm text-slate-300">
            <li>① 語彙 30 問：頻度帯別の単語の意味（推定語彙数を算出）</li>
            <li>② 文法 15 問：A1 → C1 の順に難しくなる</li>
            <li>③ リーディング 2 本：店舗の掲示と小売の記事</li>
            <li>④ リスニング 10 問：音声だけで意味を選ぶ</li>
            <li>⑤ ディクテーション 4 文：聞いて書き取る</li>
            <li>⑥ 発音の聞き分け 10 問：r/l・th・母音など最小対</li>
            <li>⑦ スピーキング 3 問：録音して自己評価</li>
            <li>⑧ ライティング 5 分：語数と自己評価</li>
          </ul>
          <p className="mt-3 text-xs text-slate-400">辞書を使わない・音声は何回聞いても OK（回数は記録しません）・分からなければ勘で選ぶ。結果から 7 スキルの CEFR 目安と、12 週カリキュラムの開始週を提案します。</p>
          {level && (
            <p className="mt-2 rounded-xl bg-slate-800/60 p-2 text-xs text-slate-300">
              前回：{level.overall}（{formatMD(dateKey(new Date(level.at)))}）。再受験しても開始週は変わりません（設定から調整可）。
            </p>
          )}
          <Button size="lg" className="mt-4 w-full" onClick={next}>
            ▶ 始める
          </Button>
        </Card>
      </div>
    )
  }

  if (sec === 'result' && result) return <Result r={result} onHome={() => nav('/')} />

  return (
    <div>
      <PageTitle title={TITLE[sec]} subtitle={`セクション ${idx} / 8`} />
      <ProgressBar value={idx} max={8} className="mb-4" />
      {sec === 'vocab' && <McqList items={levelcheck.vocab.map((q) => ({ id: q.id, prompt: q.word, choices: q.choices, tag: `帯域 ${q.band}` }))} answers={ans.vocab} onChange={(v) => setAns({ ...ans, vocab: v })} onDone={next} promptClass="font-en text-2xl font-semibold" />}
      {sec === 'grammar' && <McqList items={levelcheck.grammar.map((q) => ({ id: q.id, prompt: q.q, choices: q.choices, tag: q.level }))} answers={ans.grammar} onChange={(v) => setAns({ ...ans, grammar: v })} onDone={next} promptClass="font-en text-lg" choiceClass="font-en" />}
      {sec === 'reading' && <Reading answers={ans.reading} onChange={(v) => setAns({ ...ans, reading: v })} onDone={next} />}
      {sec === 'listening' && <ListeningSec answers={ans.listening} onChange={(v) => setAns({ ...ans, listening: v })} onDone={next} />}
      {sec === 'dictation' && <DictationSec onDone={(scores) => { setAns({ ...ans, dictation: scores }); next() }} />}
      {sec === 'sounds' && (
        <SoundRunner
          pairIds={levelcheck.sounds}
          log={false}
          onDone={(s) => {
            setAns({ ...ans, sounds: s.results })
            next()
          }}
        />
      )}
      {sec === 'speaking' && <SpeakingSec onDone={(self) => { setAns({ ...ans, speakingSelf: self }); next() }} />}
      {sec === 'writing' && (
        <WritingSec
          onDone={(text, self) => {
            const final = { ...ans, writingText: text, writingWords: countWords(text), writingSelf: self }
            setAns(final)
            void finish(final)
          }}
        />
      )}
    </div>
  )
}

function McqList({
  items,
  answers,
  onChange,
  onDone,
  promptClass,
  choiceClass,
}: {
  items: { id: string; prompt: string; choices: string[]; tag?: string }[]
  answers: Record<string, number>
  onChange: (v: Record<string, number>) => void
  onDone: () => void
  promptClass?: string
  choiceClass?: string
}) {
  const [i, setI] = useState(0)
  const q = items[i]
  const picked = answers[q.id]
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        {i + 1} / {items.length} {q.tag && <Pill className="ml-2">{q.tag}</Pill>}
      </p>
      <Card>
        <p className={promptClass}>{q.prompt}</p>
      </Card>
      <div className="mt-3 grid gap-2">
        {q.choices.map((c, idx) => (
          <ChoiceButton key={c} state="idle" onClick={() => onChange({ ...answers, [q.id]: idx })} className={cn(choiceClass, picked === idx && 'border-amber-400 bg-amber-400/15')}>
            {c}
          </ChoiceButton>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="secondary" className="flex-1" disabled={i === 0} onClick={() => setI(i - 1)}>
          ← 前
        </Button>
        <Button className="flex-1" disabled={picked === undefined} onClick={() => (i + 1 >= items.length ? onDone() : setI(i + 1))}>
          {i + 1 >= items.length ? '次のセクションへ' : '次 →'}
        </Button>
      </div>
    </div>
  )
}

function Reading({ answers, onChange, onDone }: { answers: Record<string, number>; onChange: (v: Record<string, number>) => void; onDone: () => void }) {
  const [pi, setPi] = useState(0)
  const p = levelcheck.reading[pi]
  const allAnswered = p.questions.every((_, qi) => answers[`${p.id}:${qi}`] !== undefined)
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        {pi + 1} / {levelcheck.reading.length} <Pill className="ml-2">{p.level}</Pill>
      </p>
      <Card>
        <p className="font-en text-sm font-bold text-slate-400">{p.title}</p>
        <p className="font-en mt-1 text-base leading-relaxed">{p.text}</p>
      </Card>
      {p.questions.map((q, qi) => (
        <div key={qi} className="mt-3">
          <p className="font-en mb-1 text-sm font-semibold">
            {qi + 1}. {q.q}
          </p>
          <div className="grid gap-1.5">
            {q.choices.map((c, ci) => (
              <ChoiceButton key={c} state="idle" onClick={() => onChange({ ...answers, [`${p.id}:${qi}`]: ci })} className={cn('font-en py-2 text-sm', answers[`${p.id}:${qi}`] === ci && 'border-amber-400 bg-amber-400/15')}>
                {c}
              </ChoiceButton>
            ))}
          </div>
        </div>
      ))}
      <Button size="lg" className="mt-4 w-full" disabled={!allAnswered} onClick={() => (pi + 1 >= levelcheck.reading.length ? onDone() : setPi(pi + 1))}>
        {pi + 1 >= levelcheck.reading.length ? '次のセクションへ' : '次の文章 →'}
      </Button>
    </div>
  )
}

function ListeningSec({ answers, onChange, onDone }: { answers: Record<string, number>; onChange: (v: Record<string, number>) => void; onDone: () => void }) {
  const [i, setI] = useState(0)
  const q = levelcheck.listening[i]
  const { speak } = useAudio()
  useEffect(() => {
    const t = setTimeout(() => void speak(textToAudio(q.en)), 400)
    return () => clearTimeout(t)
  }, [i, q.en, speak])
  const picked = answers[q.id]
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        {i + 1} / {levelcheck.listening.length} <Pill className="ml-2">{q.level}</Pill>
      </p>
      <Card className="text-center">
        <p className="text-sm text-slate-400">音声を聞いて、意味を選ぶ（テキストは表示されません）</p>
        <AudioButton item={textToAudio(q.en)} size="lg" className="mx-auto mt-3" />
      </Card>
      <div className="mt-3 grid gap-2">
        {q.choices.map((c, idx) => (
          <ChoiceButton key={c} state="idle" onClick={() => onChange({ ...answers, [q.id]: idx })} className={cn(picked === idx && 'border-amber-400 bg-amber-400/15')}>
            {c}
          </ChoiceButton>
        ))}
      </div>
      <Button size="lg" className="mt-4 w-full" disabled={picked === undefined} onClick={() => (i + 1 >= levelcheck.listening.length ? onDone() : setI(i + 1))}>
        {i + 1 >= levelcheck.listening.length ? '次のセクションへ' : '次 →'}
      </Button>
    </div>
  )
}

function DictationSec({ onDone }: { onDone: (scores: Record<string, number>) => void }) {
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [scores, setScores] = useState<Record<string, number>>({})
  const [checked, setChecked] = useState<number | null>(null)
  const id = levelcheck.dictation[i]
  const d = dictationById.get(id)!
  const { speak } = useAudio()
  useEffect(() => {
    setTyped('')
    setChecked(null)
    const t = setTimeout(() => void speak(textToAudio(d.en)), 400)
    return () => clearTimeout(t)
  }, [i, d.en, speak])
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        {i + 1} / {levelcheck.dictation.length} <Pill className="ml-2">{d.level}</Pill>
      </p>
      <Card className="text-center">
        <p className="text-sm text-slate-400">聞こえたとおりに書く（3 回まで再生）</p>
        <AudioButton item={textToAudio(d.en)} size="lg" className="mx-auto mt-3" />
      </Card>
      <textarea value={typed} onChange={(e) => setTyped(e.target.value)} disabled={checked !== null} rows={3} lang="en" placeholder="Type what you hear..." className="font-en mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base text-slate-100 focus:border-amber-400 focus:outline-none" />
      {checked === null ? (
        <Button
          size="lg"
          className="mt-3 w-full"
          onClick={() => {
            const s = wordSimilarity(typed, d.en)
            setChecked(s)
            setScores({ ...scores, [id]: s })
          }}
        >
          {typed.trim() ? '答え合わせ' : '分からない（0 点で次へ）'}
        </Button>
      ) : (
        <div className="mt-3">
          <div className="rounded-xl border border-slate-700 bg-slate-900 p-3">
            <p className="text-sm font-semibold">一致度 {Math.round(checked * 100)}%</p>
            <p className="font-en mt-1">
              {diffWords(d.en, typed).map((w, k) => (
                <span key={k} className={cn('mr-1', w.ok ? 'text-emerald-300' : 'text-rose-300 underline')}>
                  {w.word}
                </span>
              ))}
            </p>
          </div>
          <Button size="lg" className="mt-3 w-full" onClick={() => (i + 1 >= levelcheck.dictation.length ? onDone(scores) : setI(i + 1))}>
            {i + 1 >= levelcheck.dictation.length ? '次のセクションへ' : '次 →'}
          </Button>
        </div>
      )}
    </div>
  )
}

function SpeakingSec({ onDone }: { onDone: (self: Record<string, boolean>) => void }) {
  const [i, setI] = useState(0)
  const [done, setDone] = useState(false)
  const [phase, setPhase] = useState<'ready' | 'talk' | 'rubric'>('ready')
  const [count, setCount] = useState(3)
  const [self, setSelf] = useState<Record<string, boolean>>({})
  const p = levelcheck.speaking[i]
  useEffect(() => {
    setPhase('ready')
    setCount(3)
  }, [i])
  useEffect(() => {
    if (phase !== 'ready' || done) return
    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(id)
          setPhase('talk')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [phase, i, done])
  if (done) return <Rubric items={levelcheck.speakingRubric} values={self} onChange={setSelf} onDone={() => onDone(self)} title="3 問を通しての自己評価（録音を聞き直してから）" />
  return (
    <div>
      <p className="mb-2 text-xs text-slate-400">
        {i + 1} / {levelcheck.speaking.length}
      </p>
      <Card>
        <div className="flex items-start gap-3">
          <AudioButton item={textToAudio(p.en)} size="sm" />
          <div>
            <p className="font-en text-lg leading-snug">{p.en}</p>
            <p className="text-xs text-slate-400">{p.ja}</p>
          </div>
        </div>
        {phase === 'ready' && (
          <div className="mt-3 text-center">
            <p className="text-5xl font-black text-amber-300">{count}</p>
            <p className="text-xs text-slate-400">3 秒後に話し始める。録音ボタンを押して約 {p.seconds} 秒</p>
          </div>
        )}
      </Card>
      {phase !== 'ready' && (
        <>
          <RecorderPanel className="mt-3" compact />
          {phase === 'talk' ? (
            <Button size="lg" className="mt-3 w-full" onClick={() => setPhase('rubric')}>
              話し終えた
            </Button>
          ) : (
            <Button size="lg" className="mt-3 w-full" onClick={() => (i + 1 >= levelcheck.speaking.length ? setDone(true) : setI(i + 1))}>
              {i + 1 >= levelcheck.speaking.length ? '自己評価へ' : '次の質問 →'}
            </Button>
          )}
        </>
      )}
    </div>
  )
}

function Rubric({ items, values, onChange, onDone, title }: { items: { id: string; text: string }[]; values: Record<string, boolean>; onChange: (v: Record<string, boolean>) => void; onDone: () => void; title: string }) {
  return (
    <Card className="mt-3">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((r) => (
          <li key={r.id}>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-amber-400" checked={!!values[r.id]} onChange={(e) => onChange({ ...values, [r.id]: e.target.checked })} />
              <span>{r.text}</span>
            </label>
          </li>
        ))}
      </ul>
      <Button size="lg" className="mt-3 w-full" onClick={onDone}>
        次へ
      </Button>
    </Card>
  )
}

function WritingSec({ onDone }: { onDone: (text: string, self: Record<string, boolean>) => void }) {
  const w = levelcheck.writing
  const [text, setText] = useState('')
  const [started, setStarted] = useState<number | null>(null)
  const [left, setLeft] = useState(w.minutes * 60)
  const [stage, setStage] = useState<'write' | 'rubric'>('write')
  const [self, setSelf] = useState<Record<string, boolean>>({})
  const words = countWords(text)
  useEffect(() => {
    if (!started || stage !== 'write') return
    const id = setInterval(() => {
      const l = Math.max(0, w.minutes * 60 - Math.floor((Date.now() - started) / 1000))
      setLeft(l)
      if (l === 0) {
        clearInterval(id)
        setStage('rubric')
      }
    }, 500)
    return () => clearInterval(id)
  }, [started, stage, w.minutes])
  const auto = useMemo(() => ({ w60: words >= 60, w100: words >= 100, wlink: /\b(because|so|but|although|however|while)\b/i.test(text) }), [words, text])
  useEffect(() => {
    if (stage === 'rubric') setSelf((s) => ({ ...s, ...auto }))
  }, [stage, auto])
  return (
    <div>
      <Card>
        <p className="font-en text-lg">{w.en}</p>
        <p className="text-xs text-slate-400">{w.ja}</p>
        <div className="mt-2 flex justify-between text-xs text-slate-400">
          <span>
            ⏱ {Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}
          </span>
          <span>{words} 語</span>
        </div>
        {!started && (
          <Button size="lg" className="mt-3 w-full" onClick={() => setStarted(Date.now())}>
            ▶ 書き始める（{w.minutes} 分）
          </Button>
        )}
      </Card>
      {started && stage === 'write' && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} lang="en" autoFocus className="font-en mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-base leading-relaxed text-slate-100 focus:border-amber-400 focus:outline-none" />
          <Button size="lg" variant="secondary" className="mt-3 w-full" onClick={() => setStage('rubric')}>
            書き終えた
          </Button>
        </>
      )}
      {stage === 'rubric' && (
        <>
          <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <p className="font-en whitespace-pre-wrap text-sm leading-relaxed">{text || '（本文なし）'}</p>
          </div>
          <Rubric items={levelcheck.writingRubric} values={self} onChange={setSelf} onDone={() => onDone(text, self)} title="自己評価（語数と接続詞は自動チェック済み）" />
        </>
      )}
    </div>
  )
}

function Result({ r, onHome }: { r: LevelResult; onHome: () => void }) {
  const nav = useNavigate()
  return (
    <div>
      <PageTitle title="レベルチェック 結果" subtitle={`${formatMD(dateKey(new Date(r.at)))} 測定`} />
      <Card className="bg-gradient-to-br from-blue-600/20 via-slate-900 to-slate-900 text-center">
        <p className="text-xs uppercase tracking-wider text-amber-300">総合（CEFR 目安）</p>
        <p className="mt-1 text-6xl font-black">{r.overall}</p>
        <p className="mt-1 text-sm text-slate-300">{CEFR_JA[r.overall]}</p>
        <p className="mt-2 text-xs text-slate-400">推定語彙 約 {r.vocabEstimate.toLocaleString()} 語</p>
      </Card>
      <Card className="mt-4">
        <h2 className="font-bold">スキル別</h2>
        <div className="mt-2 flex justify-center">
          <SkillRadar scores={Object.fromEntries(SKILLS.map((s) => [s, r.scores[s].pct])) as Record<Skill, number>} />
        </div>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {SKILLS.map((s) => (
              <tr key={s} className="border-t border-slate-800">
                <td className="py-1.5">{SKILL_JA[s]}</td>
                <td className="py-1.5 text-right font-bold">{r.scores[s].cefr}</td>
                <td className="w-28 py-1.5 pl-3">
                  <ProgressBar value={Math.round(r.scores[s].pct * 100)} max={100} />
                </td>
                <td className="py-1.5 pl-2 text-right text-xs tabular-nums text-slate-400">
                  {s === 'listening' ? `${Math.round(r.scores[s].pct * 100)}%` : `${r.scores[s].raw}/${r.scores[s].max}`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[11px] text-slate-500">スピーキング・ライティングは自己評価、発音は聞き分けのみ。発話そのものの評価は録音を聞き直すか、ネイティブ／AI に見てもらう。</p>
      </Card>
      <Card className="mt-4">
        <h2 className="font-bold">語彙：帯域別</h2>
        <div className="mt-2 grid grid-cols-6 gap-1 text-center text-xs">
          {[1, 2, 3, 4, 5, 6].map((b) => {
            const v = r.detail.vocabByBand[b]
            const pct = v ? v.correct / v.total : 0
            return (
              <div key={b} className="rounded-lg bg-slate-800/60 p-1.5">
                <p className="text-[10px] text-slate-400">{['~1k', '~2k', '~3.5k', '~5.5k', '~8k', '10k+'][b - 1]}</p>
                <p className={cn('font-bold', pct >= 0.8 ? 'text-emerald-300' : pct >= 0.6 ? 'text-amber-300' : 'text-rose-300')}>
                  {v?.correct ?? 0}/{v?.total ?? 0}
                </p>
              </div>
            )
          })}
        </div>
      </Card>
      <Card className="mt-4 border-amber-500/50">
        <h2 className="font-bold">おすすめの開始位置：Week {r.recommendedWeek}</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-300">
          {r.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => nav('/plan/curriculum')}>
            カリキュラムを見る
          </Button>
          <Button onClick={onHome}>ホームへ（今日のメニューを開始）</Button>
        </div>
      </Card>
    </div>
  )
}
