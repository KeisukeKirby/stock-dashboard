export type Skill = 'pronunciation' | 'vocabulary' | 'grammar' | 'reading' | 'listening' | 'speaking' | 'writing'
export type Mode = 'input' | 'output'
export type CEFR = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
export type Phase = 'pronunciation' | 'grammar' | 'input' | 'output'
export type Mood = 'good' | 'neutral' | 'declined'

export const SKILLS: Skill[] = ['pronunciation', 'vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing']
export const SKILL_JA: Record<Skill, string> = {
  pronunciation: '発音',
  vocabulary: '語彙',
  grammar: '文法',
  reading: 'リーディング',
  listening: 'リスニング',
  speaking: 'スピーキング',
  writing: 'ライティング',
}
export const SKILL_MODE: Record<Skill, Mode> = {
  pronunciation: 'input',
  vocabulary: 'input',
  grammar: 'input',
  reading: 'input',
  listening: 'input',
  speaking: 'output',
  writing: 'output',
}
export const PHASE_JA: Record<Phase, string> = {
  pronunciation: '発音',
  grammar: '文法',
  input: 'インプット',
  output: 'アウトプット',
}

// ---------- content ----------

export interface Scene {
  id: string
  order: number
  icon: string
  title: string
  kind: 'phrase' | 'word' | 'preposition' | 'root'
  description?: string
}

export interface Item {
  id: string
  scene: string
  en: string
  ja: string
  ipa?: string
  pos?: string
  example?: string
  exampleJa?: string
  note?: string
  tags?: string[]
  replies?: string[]
  image?: string
  parts?: { prefix?: string; root?: string; suffix?: string; meaning: string }
  audio?: string
}

export interface Sound {
  id: string
  symbol: string
  type: 'vowel' | 'consonant'
  nameJa: string
  hint: string
  spelling: string[]
  examples: { word: string; ipa: string }[]
}
export interface MinimalPair {
  id: string
  feature: string
  note?: string
  items: { word: string; ipa: string; ja: string }[]
}
export interface PhonicsPattern {
  id: string
  pattern: string
  sound: string
  examples: string[]
  note: string
}
export interface PhonicsContent {
  sounds: Sound[]
  minimalPairs: MinimalPair[]
  patterns: PhonicsPattern[]
}

export interface GrammarQuiz {
  q: string
  choices: string[]
  answer: number
  why: string
}
export interface GrammarUnit {
  id: string
  order: number
  phase: Phase
  title: string
  titleEn: string
  summary: string
  points: string[]
  patterns: { pattern: string; en: string; ja: string }[]
  drills: { en: string; ja: string }[]
  quiz: GrammarQuiz[]
}

export type RoleplayNode =
  | { kind: 'partner'; en: string; ja: string; next?: string }
  | { kind: 'you'; hintJa: string; en: string; ja: string; itemId?: string; next?: string }
  | { kind: 'branch'; promptJa: string; options: { mood: Mood; label: string; en: string; ja: string; next?: string }[] }
  | { kind: 'end'; messageJa: string; mood?: Mood }

export interface Roleplay {
  id: string
  title: string
  scene: string
  estMinutes: number
  description: string
  start: string
  nodes: Record<string, RoleplayNode>
}

export interface CurriculumTask {
  id: string
  text: string
  skill: Skill
}
export interface CurriculumWeek {
  week: number
  phase: Phase
  title: string
  focus: string
  grammarUnits: string[]
  scenes: string[]
  newItems: string[]
  materials: string[]
  tasks: CurriculumTask[]
  tips?: string
}
export interface Curriculum {
  weeks: CurriculumWeek[]
}

export interface Resource {
  id: string
  category: string
  title: string
  author?: string
  url?: string
  phase: Phase[]
  skill: Skill[]
  lang: 'en' | 'ja'
  howTo: string
}

export interface Prompt {
  id: string
  en: string
  ja: string
  hints?: string[]
  minutes?: number
}
export interface PromptsContent {
  aboutMe: Prompt[]
  speaking: Prompt[]
  writing: Prompt[]
}

export interface ShadowMaterial {
  id: string
  title: string
  source: string
  url?: string
  kind: 'video' | 'audio' | 'news' | 'book'
  level: CEFR
  note: string
}
export interface DictationItem {
  id: string
  en: string
  ja: string
  level: CEFR
}
export interface MaterialsContent {
  shadowing: ShadowMaterial[]
  dictation: DictationItem[]
}

export interface MethodContent {
  ratio: { input: number; output: number; note: string }
  order: string[]
  sections: { id: string; title: string; icon: string; items: string[] }[]
}

export interface LevelCheckContent {
  vocab: { id: string; band: number; word: string; choices: string[]; answer: number }[]
  grammar: { id: string; level: CEFR; q: string; choices: string[]; answer: number }[]
  reading: { id: string; level: CEFR; title: string; text: string; questions: { q: string; choices: string[]; answer: number }[] }[]
  listening: { id: string; level: CEFR; en: string; choices: string[]; answer: number }[]
  dictation: string[]
  sounds: string[]
  speaking: { id: string; en: string; ja: string; seconds: number }[]
  speakingRubric: { id: string; text: string }[]
  writing: { id: string; en: string; ja: string; minutes: number }
  writingRubric: { id: string; text: string }[]
}

// ---------- progress (IndexedDB) ----------

export type CardType = 'listen' | 'speak'
export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type Grade = 1 | 2 | 3

export interface Card {
  id: string // `${itemId}:${type}`
  itemId: string
  type: CardType
  state: CardState
  step: number
  due: number
  interval: number
  ease: number
  reps: number
  lapses: number
  lastGrade?: Grade
  lastReviewed?: number
  introducedAt: number
}

export type StepKind = 'sound' | 'review' | 'new' | 'grammar' | 'shadow' | 'listen' | 'speak' | 'write' | 'roleplay'

export interface DailyLog {
  date: string
  reviews: number
  newItems: number
  quizCorrect: number
  quizTotal: number
  soundQuizCorrect: number
  soundQuizTotal: number
  grammarQuizCorrect: number
  grammarQuizTotal: number
  dictationCorrect: number
  dictationTotal: number
  shadowReps: number
  speakingPrompts: number
  recordings: number
  writingWords: number
  roleplays: number
  minutes: number
  inputMinutes: number
  outputMinutes: number
  menuCompleted: boolean
  steps: Partial<Record<StepKind, boolean>>
}

export type Rate = 0.7 | 0.85 | 1.0
export type Accent = 'en-US' | 'en-GB' | 'en-AU'
export type MenuSize = 'short' | 'standard' | 'long'

export interface Settings {
  rate: Rate
  accent: Accent
  voiceURI?: string
  hideJa: boolean
  dailyNewLimit: number
  reviewLimit: number
  quickMinutes: number
  quickCards: number
  menuSize: MenuSize
}

export const DEFAULT_SETTINGS: Settings = {
  rate: 0.85,
  accent: 'en-US',
  hideJa: false,
  dailyNewLimit: 10,
  reviewLimit: 30,
  quickMinutes: 5,
  quickCards: 15,
  menuSize: 'standard',
}

export interface JournalEntry {
  id: string
  date: string
  kind: 'writing' | 'dictation'
  promptId?: string
  prompt: string
  text: string
  summary?: string
  words: number
  seconds: number
  createdAt: number
}

export interface AboutMeAnswer {
  promptId: string
  text: string
  reflex: boolean
  recordedAt?: number
  updatedAt: number
}

export interface ShadowLog {
  materialId: string
  title: string
  count: number
  lastAt?: number
  note?: string
  custom?: boolean
  url?: string
}

export type ResourceStatus = 'none' | 'have' | 'using' | 'done'

export interface GrammarState {
  unitId: string
  drilled: number
  quizBest: number
  quizTotal: number
  lastAt: number
}

export interface SkillScore {
  raw: number
  max: number
  pct: number
  cefr: CEFR
}
export interface LevelResult {
  at: number
  scores: Record<Skill, SkillScore>
  overall: CEFR
  vocabEstimate: number
  recommendedWeek: number
  notes: string[]
  detail: {
    vocabByBand: Record<number, { correct: number; total: number }>
    grammarByLevel: Record<string, { correct: number; total: number }>
    listeningByLevel: Record<string, { correct: number; total: number }>
    dictationScores: number[]
    speakingSelf: Record<string, boolean>
    writingSelf: Record<string, boolean>
    writingWords: number
    writingText: string
  }
}

export interface ProgressExport {
  app: 'lingodash'
  schemaVersion: number
  exportedAt: string
  cards: Card[]
  dailyLog: DailyLog[]
  settings: Settings
  journal: JournalEntry[]
  kv: { key: string; value: unknown }[]
  meta: { key: string; value: unknown }[]
}
