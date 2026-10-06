// コンテンツ JSON の整合性チェック（npm run content:check）
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content')
const load = (f) => JSON.parse(readFileSync(join(root, f), 'utf8'))
const scenes = load('scenes.json')
const items = load('items.json')
const phonics = load('phonics.json')
const grammar = load('grammar.json')
const roleplays = load('roleplays.json')
const curriculum = load('curriculum.json')
const resources = load('resources.json')
const prompts = load('prompts.json')
const materials = load('materials.json')
const levelcheck = load('levelcheck.json')

const errors = []
const warn = []
const sceneIds = new Set(scenes.map((s) => s.id))
const ids = new Set()
const SKILLS = new Set(['pronunciation', 'vocabulary', 'grammar', 'reading', 'listening', 'speaking', 'writing'])
const PHASES = new Set(['pronunciation', 'grammar', 'input', 'output'])
const PREP_FIGS = new Set(['in', 'on', 'at', 'under', 'over', 'above', 'below', 'between', 'among', 'through', 'across', 'along', 'into', 'out_of', 'onto', 'off', 'from_to', 'toward', 'by', 'with', 'behind', 'around'])

for (const p of items) {
  if (!p.id) errors.push(`item without id: ${JSON.stringify(p).slice(0, 60)}`)
  if (ids.has(p.id)) errors.push(`duplicate item id: ${p.id}`)
  ids.add(p.id)
  for (const k of ['scene', 'en', 'ja']) if (!p[k]) errors.push(`${p.id}: missing ${k}`)
  if (!sceneIds.has(p.scene)) errors.push(`${p.id}: unknown scene ${p.scene}`)
  const sc = scenes.find((s) => s.id === p.scene)
  if (sc?.kind === 'preposition' && !PREP_FIGS.has(p.image ?? p.en)) errors.push(`${p.id}: no figure for ${p.image ?? p.en}`)
  if (sc?.kind === 'root' && !p.parts) errors.push(`${p.id}: root item without parts`)
  if (!p.ipa) warn.push(`${p.id}: no ipa`)
}
for (const p of items) for (const r of p.replies ?? []) if (!ids.has(r)) errors.push(`${p.id}: reply ref ${r} not found`)

const pairIds = new Set()
for (const mp of phonics.minimalPairs) {
  if (pairIds.has(mp.id)) errors.push(`duplicate pair id ${mp.id}`)
  pairIds.add(mp.id)
  if (mp.items.length < 2) errors.push(`pair ${mp.id}: needs 2 items`)
}
for (const s of phonics.sounds) if (!s.examples?.length) errors.push(`sound ${s.id}: no examples`)

const gIds = new Set()
for (const g of grammar) {
  if (gIds.has(g.id)) errors.push(`duplicate grammar id ${g.id}`)
  gIds.add(g.id)
  if (!PHASES.has(g.phase)) errors.push(`${g.id}: bad phase`)
  for (const q of g.quiz) if (q.answer < 0 || q.answer >= q.choices.length) errors.push(`${g.id}: quiz answer out of range`)
  if (g.drills.length < 3) warn.push(`${g.id}: only ${g.drills.length} drills`)
}

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
    if (n.kind === 'you' && n.itemId && !ids.has(n.itemId)) errors.push(`${rp.id}/${k}: itemId ${n.itemId} not found`)
    if (n.next) stack.push(n.next)
    if (n.kind === 'branch') for (const o of n.options) o.next && stack.push(o.next)
    if (['partner', 'you'].includes(n.kind) && !n.next) errors.push(`${rp.id}/${k}: ${n.kind} node has no next`)
  }
  for (const k of Object.keys(rp.nodes)) if (!reachable.has(k)) warn.push(`${rp.id}: node ${k} unreachable`)
  if (![...reachable].some((k) => rp.nodes[k]?.kind === 'end')) errors.push(`${rp.id}: no reachable end node`)
}

const matIds = new Set(materials.shadowing.map((m) => m.id))
const dictIds = new Set(materials.dictation.map((d) => d.id))
const used = new Set()
const taskIds = new Set()
for (const w of curriculum.weeks) {
  if (!PHASES.has(w.phase)) errors.push(`week ${w.week}: bad phase`)
  for (const id of w.newItems) {
    if (!ids.has(id)) errors.push(`week ${w.week}: item ${id} not found`)
    if (used.has(id)) errors.push(`week ${w.week}: item ${id} assigned twice`)
    used.add(id)
  }
  for (const g of w.grammarUnits) if (!gIds.has(g)) errors.push(`week ${w.week}: grammar ${g} not found`)
  for (const s of w.scenes) if (!sceneIds.has(s)) errors.push(`week ${w.week}: scene ${s} unknown`)
  for (const m of w.materials) if (!matIds.has(m)) errors.push(`week ${w.week}: material ${m} unknown`)
  for (const t of w.tasks) {
    if (taskIds.has(t.id)) errors.push(`week ${w.week}: duplicate task id ${t.id}`)
    taskIds.add(t.id)
    if (!SKILLS.has(t.skill)) errors.push(`week ${w.week}: task ${t.id} bad skill`)
  }
}
const unscheduled = items.filter((p) => !used.has(p.id)).map((p) => p.id)
if (unscheduled.length) warn.push(`unscheduled items: ${unscheduled.join(', ')}`)
const coveredGrammar = new Set(curriculum.weeks.flatMap((w) => w.grammarUnits))
for (const g of grammar) if (!coveredGrammar.has(g.id)) warn.push(`grammar ${g.id} not in curriculum`)

for (const r of resources) {
  for (const p of r.phase) if (!PHASES.has(p)) errors.push(`resource ${r.id}: bad phase ${p}`)
  for (const s of r.skill) if (!SKILLS.has(s)) errors.push(`resource ${r.id}: bad skill ${s}`)
}
for (const kind of ['aboutMe', 'speaking', 'writing']) {
  const seen = new Set()
  for (const p of prompts[kind]) {
    if (seen.has(p.id)) errors.push(`prompt ${kind}/${p.id} duplicate`)
    seen.add(p.id)
  }
}
for (const q of levelcheck.vocab) if (q.answer < 0 || q.answer >= q.choices.length) errors.push(`levelcheck vocab ${q.id}: answer out of range`)
for (const q of levelcheck.grammar) if (q.answer < 0 || q.answer >= q.choices.length) errors.push(`levelcheck grammar ${q.id}: answer out of range`)
for (const q of levelcheck.listening) if (q.answer < 0 || q.answer >= q.choices.length) errors.push(`levelcheck listening ${q.id}: answer out of range`)
for (const p of levelcheck.reading) for (const q of p.questions) if (q.answer < 0 || q.answer >= q.choices.length) errors.push(`levelcheck reading ${p.id}: answer out of range`)
for (const d of levelcheck.dictation) if (!dictIds.has(d)) errors.push(`levelcheck dictation ${d} not found`)
for (const s of levelcheck.sounds) if (!pairIds.has(s)) errors.push(`levelcheck sound pair ${s} not found`)

console.log(
  `scenes ${scenes.length} / items ${items.length} / sounds ${phonics.sounds.length} / pairs ${phonics.minimalPairs.length} / grammar ${grammar.length} / roleplays ${roleplays.length} / weeks ${curriculum.weeks.length} (scheduled ${used.size}) / resources ${resources.length} / prompts ${prompts.aboutMe.length}+${prompts.speaking.length}+${prompts.writing.length} / levelcheck vocab ${levelcheck.vocab.length} grammar ${levelcheck.grammar.length}`,
)
for (const w of warn) console.log('warn:', w)
for (const e of errors) console.error('ERROR:', e)
process.exit(errors.length ? 1 : 0)
