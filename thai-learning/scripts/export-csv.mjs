// 全フレーズを CSV に出力（ネイティブチェック用）: npm run content:csv [out.csv]
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const phrases = JSON.parse(readFileSync(join(root, 'src/content/phrases.json'), 'utf8'))
const scenes = JSON.parse(readFileSync(join(root, 'src/content/scenes.json'), 'utf8'))
const sceneTitle = Object.fromEntries(scenes.map((s) => [s.id, s.title]))
const esc = (v) => {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const header = ['id', 'scene', 'scene_title', 'thai', 'roman_paiboon', 'kana', 'ja', 'register', 'variant_polite_thai', 'variant_polite_roman', 'variant_casual_thai', 'variant_casual_roman', 'note', 'tags', 'needs_review', 'reviewer_comment']
const rows = phrases.map((p) => {
  const polite = (p.variants ?? []).find((v) => v.register === 'polite')
  const casual = (p.variants ?? []).find((v) => v.register === 'casual')
  return [p.id, p.scene, sceneTitle[p.scene] ?? '', p.thai, p.roman, p.kana ?? '', p.ja, p.register, polite?.thai ?? '', polite?.roman ?? '', casual?.thai ?? '', casual?.roman ?? '', p.note ?? '', (p.tags ?? []).join(' '), p.needs_review ? 'TRUE' : '', ''].map(esc).join(',')
})
const out = process.argv[2] ?? join(root, 'phrases-for-review.csv')
writeFileSync(out, '﻿' + [header.join(','), ...rows].join('\r\n'))
console.log(`wrote ${rows.length} rows to ${out}`)
