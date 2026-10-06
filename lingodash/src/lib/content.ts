import scenesJson from '@/content/scenes.json'
import itemsJson from '@/content/items.json'
import phonicsJson from '@/content/phonics.json'
import grammarJson from '@/content/grammar.json'
import roleplaysJson from '@/content/roleplays.json'
import curriculumJson from '@/content/curriculum.json'
import resourcesJson from '@/content/resources.json'
import promptsJson from '@/content/prompts.json'
import materialsJson from '@/content/materials.json'
import methodJson from '@/content/method.json'
import levelcheckJson from '@/content/levelcheck.json'
import type {
  Curriculum,
  GrammarUnit,
  Item,
  LevelCheckContent,
  MaterialsContent,
  MethodContent,
  PhonicsContent,
  PromptsContent,
  Resource,
  Roleplay,
  Scene,
} from './types'

export const scenes: Scene[] = [...(scenesJson as Scene[])].sort((a, b) => a.order - b.order)
export const items: Item[] = itemsJson as unknown as Item[]
export const phonics: PhonicsContent = phonicsJson as unknown as PhonicsContent
export const grammarUnits: GrammarUnit[] = [...(grammarJson as unknown as GrammarUnit[])].sort((a, b) => a.order - b.order)
export const roleplays: Roleplay[] = roleplaysJson as unknown as Roleplay[]
export const curriculum: Curriculum = curriculumJson as unknown as Curriculum
export const resources: Resource[] = resourcesJson as unknown as Resource[]
export const prompts: PromptsContent = promptsJson as unknown as PromptsContent
export const materials: MaterialsContent = materialsJson as unknown as MaterialsContent
export const method: MethodContent = methodJson as unknown as MethodContent
export const levelcheck: LevelCheckContent = levelcheckJson as unknown as LevelCheckContent

export const itemById: Map<string, Item> = new Map(items.map((p) => [p.id, p]))
export const sceneById: Map<string, Scene> = new Map(scenes.map((s) => [s.id, s]))
export const roleplayById: Map<string, Roleplay> = new Map(roleplays.map((r) => [r.id, r]))
export const grammarById: Map<string, GrammarUnit> = new Map(grammarUnits.map((g) => [g.id, g]))
export const resourceById: Map<string, Resource> = new Map(resources.map((r) => [r.id, r]))
export const materialById = new Map(materials.shadowing.map((m) => [m.id, m]))
export const dictationById = new Map(materials.dictation.map((d) => [d.id, d]))
export const pairById = new Map(phonics.minimalPairs.map((p) => [p.id, p]))

export const itemsByScene: Map<string, Item[]> = new Map()
for (const s of scenes) itemsByScene.set(s.id, [])
for (const p of items) {
  const list = itemsByScene.get(p.scene)
  if (list) list.push(p)
  else itemsByScene.set(p.scene, [p])
}

export function getItem(id: string): Item {
  const p = itemById.get(id)
  if (!p) throw new Error(`Unknown item: ${id}`)
  return p
}

export function hasTag(p: Item, tag: string): boolean {
  return (p.tags ?? []).includes(tag)
}

/** 音声合成用テキスト。語源の "-port-" などはハイフンを除く。 */
export function speakText(en: string): string {
  return en
    .replace(/\.\.\./g, ', ')
    .replace(/\s*\/\s*/g, ', ')
    .replace(/^-|-$/g, '')
    .replace(/\(s\)/g, 's')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 単語カードの読み上げ：単語 → 例文 */
export function itemSpeakText(p: Item): string {
  const sc = sceneById.get(p.scene)
  if (sc && (sc.kind === 'word' || sc.kind === 'root' || sc.kind === 'preposition') && p.example) {
    return `${speakText(p.en)}. ${speakText(p.example)}`
  }
  return speakText(p.en)
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

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w)).length
}
