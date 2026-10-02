// コンテンツ JSON の整合性チェック（npm run content:check）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')
const load = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'))
const scenes = load('scenes.json')
const phrases = load('phrases.json')
const tones = load('tones.json')
const roleplays = load('roleplays.json')
const curriculum = load('curriculum.json')

const errors = []
const warn = []
const sceneIds = new Set(scenes.map((s) => s.id))
const ids = new Set()
const TONES = new Set(['mid', 'low', 'falling', 'high', 'rising'])
const REG = new Set(['polite', 'casual', 'neutral'])

for (const p of phrases) {
  if (!p.id) errors.push(`phrase without id: ${JSON.stringify(p).slice(0, 60)}`)
  if (ids.has(p.id)) errors.push(`duplicate phrase id: ${p.id}`)
  ids.add(p.id)
  for (const k of ['scene', 'thai', 'roman', 'ja', 'register']) if (!p[k]) errors.push(`${p.id}: missing ${k}`)
  if (!sceneIds.has(p.scene)) errors.push(`${p.id}: unknown scene ${p.scene}`)
  if (!REG.has(p.register)) errors.push(`${p.id}: bad register ${p.register}`)
  if (!/[฀-๿]/.test(p.thai)) errors.push(`${p.id}: thai has no Thai characters`)
  for (const v of p.variants ?? []) {
    if (!v.thai || !v.roman) errors.push(`${p.id}: variant missing thai/roman`)
    if (!['polite', 'casual'].includes(v.register)) errors.push(`${p.id}: bad variant register`)
  }
  if (!p.kana) warn.push(`${p.id}: no kana`)
}
for (const p of phrases) for (const r of p.replies ?? []) if (!ids.has(r)) errors.push(`${p.id}: reply ref ${r} not found`)

for (const t of tones.tones) {
  if (!TONES.has(t.id)) errors.push(`tone ${t.id} unknown`)
  for (const ex of t.examples) if (ex.tone !== t.id) errors.push(`tone example ${ex.thai} tone mismatch`)
}
for (const q of tones.quiz) if (!TONES.has(q.tone)) errors.push(`tone quiz ${q.thai}: bad tone`)
for (const mp of tones.minimalPairs) for (const it of mp.items) if (!TONES.has(it.tone)) errors.push(`minimal pair ${mp.id}: bad tone`)

const rpIds = new Set()
for (const rp of roleplays) {
  if (rpIds.has(rp.id)) errors.push(`duplicate roleplay id ${rp.id}`)
  rpIds.add(rp.id)
  if (!sceneIds.has(rp.scene)) errors.push(`${rp.id}: unknown scene`)
  if (!rp.nodes[rp.start]) errors.push(`${rp.id}: start node missing`)
  const reachable = new Set()
  const stack = [rp.start]
  while (stack.length) {
    const k = stack.pop()
    if (reachable.has(k)) continue
    reachable.add(k)
    const n = rp.nodes[k]
    if (!n) {
      errors.push(`${rp.id}: node ${k} missing`)
      continue
    }
    if (n.kind === 'you' && n.phraseId && !ids.has(n.phraseId)) errors.push(`${rp.id}/${k}: phraseId ${n.phraseId} not found`)
    if (n.next) stack.push(n.next)
    if (n.kind === 'branch') for (const o of n.options) o.next && stack.push(o.next)
    if (['partner', 'you'].includes(n.kind) && !n.next) errors.push(`${rp.id}/${k}: ${n.kind} node has no next`)
  }
  for (const k of Object.keys(rp.nodes)) if (!reachable.has(k)) warn.push(`${rp.id}: node ${k} unreachable`)
  if (![...reachable].some((k) => rp.nodes[k]?.kind === 'end')) errors.push(`${rp.id}: no reachable end node`)
}

const used = new Set()
let total = 0
for (const d of curriculum.days) {
  for (const id of d.newPhrases) {
    if (!ids.has(id)) errors.push(`day ${d.day}: phrase ${id} not found`)
    if (used.has(id)) errors.push(`day ${d.day}: phrase ${id} assigned twice`)
    used.add(id)
  }
  total += d.newPhrases.length
  if (d.roleplay && !rpIds.has(d.roleplay)) errors.push(`day ${d.day}: roleplay ${d.roleplay} not found`)
  for (const s of d.scenes) if (!sceneIds.has(s)) errors.push(`day ${d.day}: scene ${s} unknown`)
  if (d.newPhrases.length > 15) warn.push(`day ${d.day}: ${d.newPhrases.length} new phrases (>15)`)
}

const needsReview = phrases.filter((p) => p.needs_review).length
console.log(`scenes ${scenes.length} / phrases ${phrases.length} (needs_review ${needsReview}) / roleplays ${roleplays.length} / curriculum days ${curriculum.days.length}, scheduled ${total}, unscheduled ${phrases.length - used.size}`)
for (const w of warn) console.log('warn:', w)
for (const e of errors) console.error('ERROR:', e)
process.exit(errors.length ? 1 : 0)
