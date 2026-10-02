export type Register = 'polite' | 'casual' | 'neutral'
export type ToneId = 'mid' | 'low' | 'falling' | 'high' | 'rising'
export type Mood = 'good' | 'neutral' | 'declined'

export interface Scene {
  id: string
  order: number
  icon: string
  title: string
  description?: string
}

export interface PhraseVariant {
  register: 'polite' | 'casual'
  thai: string
  roman: string
  kana?: string
  ja?: string
}

export interface Phrase {
  id: string
  scene: string
  thai: string
  roman: string
  kana?: string
  ja: string
  literal?: string
  register: Register
  variants?: PhraseVariant[]
  note?: string
  tags?: string[]
  replies?: string[]
  audio?: string
  needs_review?: boolean
}

export interface ToneExample {
  thai: string
  roman: string
  ja: string
  tone: ToneId
  kana?: string
}

export interface ToneInfo {
  id: ToneId
  nameJa: string
  nameTh: string
  mark: string
  hint: string
  examples: ToneExample[]
}

export interface ToneContent {
  tones: ToneInfo[]
  quiz: ToneExample[]
  minimalPairs: { id: string; note?: string; items: ToneExample[] }[]
}

export type RoleplayNode =
  | { kind: 'partner'; thai: string; roman: string; ja: string; kana?: string; next?: string }
  | {
      kind: 'you'
      hintJa: string
      thai: string
      roman: string
      ja: string
      kana?: string
      phraseId?: string
      next?: string
    }
  | {
      kind: 'branch'
      promptJa: string
      options: { mood: Mood; label: string; thai: string; roman: string; ja: string; next?: string }[]
    }
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

export interface CurriculumDay {
  day: number
  date: string
  title: string
  focus: string
  scenes: string[]
  newPhrases: string[]
  roleplay?: string
  toneTraining?: boolean
  tips?: string
}

export interface Curriculum {
  startDate: string
  targetDate: string
  targetLabel: string
  days: CurriculumDay[]
}

// ---------- progress (IndexedDB) ----------

export type CardType = 'listen' | 'speak'
export type CardState = 'new' | 'learning' | 'review' | 'relearning'
export type Grade = 1 | 2 | 3 // 1=言えない 2=あやしい 3=言えた

export interface Card {
  id: string // `${phraseId}:${type}`
  phraseId: string
  type: CardType
  state: CardState
  step: number
  due: number
  interval: number // days
  ease: number
  reps: number
  lapses: number
  lastGrade?: Grade
  lastReviewed?: number
  introducedAt: number
}

export type StepKind = 'review' | 'new' | 'shadow' | 'quiz' | 'roleplay'

export interface DailyLog {
  date: string // YYYY-MM-DD (Asia/Bangkok)
  reviews: number
  newPhrases: number
  quizCorrect: number
  quizTotal: number
  toneQuizCorrect: number
  toneQuizTotal: number
  roleplays: number
  minutes: number
  menuCompleted: boolean
  steps: Partial<Record<StepKind, boolean>>
}

export type Rate = 0.6 | 0.8 | 1.0

export interface Settings {
  showKana: boolean
  rate: Rate
  voiceURI?: string
  dailyNewLimit: number
  weekendNewLimit: number
  reviewLimit: number
  quickMinutes: number
  quickCards: number
}

export const DEFAULT_SETTINGS: Settings = {
  showKana: false,
  rate: 0.8,
  dailyNewLimit: 12,
  weekendNewLimit: 15,
  reviewLimit: 30,
  quickMinutes: 5,
  quickCards: 15,
}

export interface ProgressExport {
  app: 'thai-learning-dashboard'
  schemaVersion: number
  exportedAt: string
  cards: Card[]
  dailyLog: DailyLog[]
  settings: Settings
}
