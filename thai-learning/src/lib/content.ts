import scenesJson from '@/content/scenes.json'
import phrasesJson from '@/content/phrases.json'
import tonesJson from '@/content/tones.json'
import roleplaysJson from '@/content/roleplays.json'
import curriculumJson from '@/content/curriculum.json'
import type { Curriculum, Phrase, Roleplay, Scene, ToneContent } from './types'

export const scenes: Scene[] = [...(scenesJson as Scene[])].sort((a, b) => a.order - b.order)
export const phrases: Phrase[] = phrasesJson as unknown as Phrase[]
export const tones: ToneContent = tonesJson as unknown as ToneContent
export const roleplays: Roleplay[] = roleplaysJson as unknown as Roleplay[]
export const curriculum: Curriculum = curriculumJson as Curriculum

export const phraseById: Map<string, Phrase> = new Map(phrases.map((p) => [p.id, p]))
export const sceneById: Map<string, Scene> = new Map(scenes.map((s) => [s.id, s]))
export const roleplayById: Map<string, Roleplay> = new Map(roleplays.map((r) => [r.id, r]))

export const phrasesByScene: Map<string, Phrase[]> = new Map()
for (const s of scenes) phrasesByScene.set(s.id, [])
for (const p of phrases) {
  const list = phrasesByScene.get(p.scene)
  if (list) list.push(p)
  else phrasesByScene.set(p.scene, [p])
}

export function getPhrase(id: string): Phrase {
  const p = phraseById.get(id)
  if (!p) throw new Error(`Unknown phrase: ${id}`)
  return p
}

export function hasTag(p: Phrase, tag: string): boolean {
  return (p.tags ?? []).includes(tag)
}

/** 発話テキスト（音声合成用）。「...」はそのまま読まれると不自然なので除く */
export function speakText(thai: string): string {
  return thai.replace(/\.\.\./g, ' ').replace(/\s+/g, ' ').trim()
}

export function shuffle<T>(arr: readonly T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function pick<T>(arr: readonly T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}
