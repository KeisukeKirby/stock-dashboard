import type { CEFR, LevelResult, Skill, SkillScore } from './types'
import { SKILL_JA } from './types'
import { levelcheck } from './content'

export const CEFR_ORDER: CEFR[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const CEFR_JA: Record<CEFR, string> = {
  A1: 'A1 入門：決まり文句と単語で何とか',
  A2: 'A2 初級：身近な話題を短い文で',
  B1: 'B1 中級：仕事・旅行の大半を自力で',
  B2: 'B2 中上級：議論・交渉ができる',
  C1: 'C1 上級：ネイティブ環境で不自由しない',
  C2: 'C2 熟達：ほぼネイティブ',
}

export function cefrIndex(c: CEFR): number {
  return CEFR_ORDER.indexOf(c)
}

/** 正答率 → CEFR（スキル共通の粗い換算） */
export function pctToCefr(pct: number): CEFR {
  if (pct >= 0.92) return 'C1'
  if (pct >= 0.8) return 'B2'
  if (pct >= 0.62) return 'B1'
  if (pct >= 0.42) return 'A2'
  return 'A1'
}

function score(raw: number, max: number, cefr?: CEFR): SkillScore {
  const pct = max > 0 ? raw / max : 0
  return { raw, max, pct, cefr: cefr ?? pctToCefr(pct) }
}

/** 帯域別の正答から語彙サイズを推定（帯域 1=〜1,000 語 … 6=10,000 語超）。
 *  下の帯域から順に見て、正答率 60% を割った帯域で打ち切る（上位帯域のまぐれ当たりで膨らまないように）。 */
export function estimateVocab(byBand: Record<number, { correct: number; total: number }>): { size: number; cefr: CEFR } {
  const bandSize = [0, 1000, 2000, 3500, 5500, 8000, 11000]
  let size = 0
  for (let b = 1; b <= 6; b++) {
    const r = byBand[b]
    if (!r || r.total === 0) break
    const acc = r.correct / r.total
    const prev = bandSize[b - 1]
    const span = bandSize[b] - prev
    if (acc >= 0.6) {
      size = prev + Math.round(span * Math.min(1, acc / 0.8))
    } else {
      // 4 択なので 25% は当て推量。それを差し引いた分だけ部分的に加算して終了
      size = prev + Math.round(span * Math.max(0, (acc - 0.25) / 0.75) * 0.5)
      break
    }
  }
  const cefr: CEFR = size >= 9000 ? 'C1' : size >= 5500 ? 'B2' : size >= 3000 ? 'B1' : size >= 1800 ? 'A2' : 'A1'
  return { size, cefr }
}

export interface LevelAnswers {
  vocab: Record<string, number> // questionId -> choice index
  grammar: Record<string, number>
  reading: Record<string, number> // `${passageId}:${qIndex}`
  listening: Record<string, number>
  dictation: Record<string, number> // dictationId -> similarity 0..1
  sounds: Record<string, boolean> // pairId -> correct
  speakingSelf: Record<string, boolean>
  writingSelf: Record<string, boolean>
  writingText: string
  writingWords: number
}

export function emptyAnswers(): LevelAnswers {
  return { vocab: {}, grammar: {}, reading: {}, listening: {}, dictation: {}, sounds: {}, speakingSelf: {}, writingSelf: {}, writingText: '', writingWords: 0 }
}

function byLevel<T extends { level: CEFR }>(qs: T[], ok: (q: T) => boolean): Record<string, { correct: number; total: number }> {
  const out: Record<string, { correct: number; total: number }> = {}
  for (const q of qs) {
    const r = (out[q.level] ??= { correct: 0, total: 0 })
    r.total += 1
    if (ok(q)) r.correct += 1
  }
  return out
}

/** 段階的な問題（A1→C1）から CEFR を推定：各レベルで 2/3 以上正解した最上位 */
function laddered(by: Record<string, { correct: number; total: number }>): CEFR {
  let best: CEFR = 'A1'
  for (const lv of CEFR_ORDER) {
    const r = by[lv]
    if (!r || r.total === 0) continue
    if (r.correct / r.total >= 0.66) best = lv
    else break
  }
  return best
}

export function scoreLevelCheck(a: LevelAnswers, at: number = Date.now()): LevelResult {
  const lc = levelcheck

  // 語彙
  const vocabByBand: Record<number, { correct: number; total: number }> = {}
  let vRaw = 0
  for (const q of lc.vocab) {
    const r = (vocabByBand[q.band] ??= { correct: 0, total: 0 })
    r.total += 1
    if (a.vocab[q.id] === q.answer) {
      r.correct += 1
      vRaw += 1
    }
  }
  const vocabEst = estimateVocab(vocabByBand)

  // 文法
  const grammarByLevel = byLevel(lc.grammar, (q) => a.grammar[q.id] === q.answer)
  const gRaw = lc.grammar.filter((q) => a.grammar[q.id] === q.answer).length

  // リーディング
  let rRaw = 0
  let rMax = 0
  for (const p of lc.reading) {
    p.questions.forEach((q, i) => {
      rMax += 1
      if (a.reading[`${p.id}:${i}`] === q.answer) rRaw += 1
    })
  }

  // リスニング（4 択 + ディクテーション）
  const listeningByLevel = byLevel(lc.listening, (q) => a.listening[q.id] === q.answer)
  const lRaw = lc.listening.filter((q) => a.listening[q.id] === q.answer).length
  const dictationScores = lc.dictation.map((id) => a.dictation[id] ?? 0)
  const dictAvg = dictationScores.length ? dictationScores.reduce((s, x) => s + x, 0) / dictationScores.length : 0
  const listenPct = (lRaw / lc.listening.length) * 0.6 + dictAvg * 0.4

  // 発音（聞き分け）
  const sRaw = lc.sounds.filter((id) => a.sounds[id]).length

  // スピーキング・ライティング（自己評価 + 語数）
  const spRaw = lc.speakingRubric.filter((r) => a.speakingSelf[r.id]).length
  const wrRaw = lc.writingRubric.filter((r) => a.writingSelf[r.id]).length

  const wordsBonus = a.writingWords >= 150 ? 1 : a.writingWords >= 100 ? 0.5 : 0
  const writingPct = Math.min(1, (wrRaw + wordsBonus) / (lc.writingRubric.length + 1))

  const scores: Record<Skill, SkillScore> = {
    vocabulary: score(vRaw, lc.vocab.length, vocabEst.cefr),
    grammar: score(gRaw, lc.grammar.length, laddered(grammarByLevel)),
    reading: score(rRaw, rMax),
    listening: { raw: Math.round(listenPct * 100), max: 100, pct: listenPct, cefr: pctToCefr(listenPct) },
    pronunciation: score(sRaw, lc.sounds.length, sRaw >= 9 ? 'B2' : sRaw >= 7 ? 'B1' : sRaw >= 5 ? 'A2' : 'A1'),
    speaking: score(spRaw, lc.speakingRubric.length),
    writing: { raw: wrRaw, max: lc.writingRubric.length, pct: writingPct, cefr: pctToCefr(writingPct) },
  }

  // 総合：客観スキル（語彙・文法・リーディング・リスニング）の平均を基準に、発音・自己評価を加味
  const objective = (['vocabulary', 'grammar', 'reading', 'listening'] as Skill[]).map((s) => cefrIndex(scores[s].cefr))
  const subjective = (['speaking', 'writing', 'pronunciation'] as Skill[]).map((s) => cefrIndex(scores[s].cefr))
  const avg = (objective.reduce((s, x) => s + x, 0) * 0.7) / objective.length + (subjective.reduce((s, x) => s + x, 0) * 0.3) / subjective.length
  const overall = CEFR_ORDER[Math.max(0, Math.min(CEFR_ORDER.length - 1, Math.round(avg)))]

  // 開始週の推薦
  let recommendedWeek = 1
  const notes: string[] = []
  if (scores.pronunciation.pct < 0.7) {
    recommendedWeek = 1
    notes.push('最小対の聞き分けが 7 割未満。発音記号と口の形から（週 1〜2）。聞き分けられない音は話せないし聞き取れない。')
  } else if (cefrIndex(scores.grammar.cefr) < cefrIndex('B1')) {
    recommendedWeek = 3
    notes.push('発音の土台はある。時制・助動詞の正確さが次の壁なので文法フェーズ（週 3〜4）から。')
  } else if (listenPct < 0.7 || scores.reading.pct < 0.7) {
    recommendedWeek = 5
    notes.push('文法は使える。インプット量が不足しているので週 5〜8（動画・ニュース・多読）を厚めに。')
  } else {
    recommendedWeek = 7
    notes.push('インプットの土台あり。文化・雑談と長文構造（週 7〜8）を経て、アウトプット強化へ。')
  }
  if (scores.vocabulary.cefr !== 'C1' && vocabEst.size < 5500) notes.push(`推定語彙 約 ${vocabEst.size.toLocaleString()} 語。語源ユニット（接頭辞・語幹）で一気に増やす。`)
  if (spRaw <= 2) notes.push('スピーキングは「3 秒以内に話し始める」反射ドリルと、自分について語るストック作りを毎日。')
  if (a.writingWords > 0 && a.writingWords < 60) notes.push('ライティングは 5 分で 60 語が最初の目標。口に出す感覚で書く。')
  const weakest = [...(Object.keys(scores) as Skill[])].sort((x, y) => scores[x].pct - scores[y].pct)[0]
  notes.push(`いちばん伸びしろがあるのは「${SKILL_JA[weakest]}」。今日のメニューの該当ステップは飛ばさない。`)

  return {
    at,
    scores,
    overall,
    vocabEstimate: vocabEst.size,
    recommendedWeek,
    notes,
    detail: {
      vocabByBand,
      grammarByLevel,
      listeningByLevel,
      dictationScores,
      speakingSelf: a.speakingSelf,
      writingSelf: a.writingSelf,
      writingWords: a.writingWords,
      writingText: a.writingText,
    },
  }
}
