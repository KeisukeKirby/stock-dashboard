import { exportAll, importAll } from './db'
import { phrases, sceneById } from './content'
import type { ProgressExport } from './types'
import { dateKey } from './date'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadProgressJson(): Promise<void> {
  const data = await exportAll()
  download(`thai-progress-${dateKey()}.json`, JSON.stringify(data, null, 2), 'application/json')
}

export async function importProgressFile(file: File, mode: 'merge' | 'replace'): Promise<{ cards: number; logs: number }> {
  const text = await file.text()
  const data = JSON.parse(text) as ProgressExport
  return importAll(data, mode)
}

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** ネイティブチェック用 CSV（UTF-8 BOM 付き・Excel でそのまま開ける） */
export function buildPhrasesCsv(): string {
  const header = [
    'id',
    'scene',
    'scene_title',
    'thai',
    'roman_paiboon',
    'kana',
    'ja',
    'register',
    'variant_polite_thai',
    'variant_polite_roman',
    'variant_casual_thai',
    'variant_casual_roman',
    'note',
    'tags',
    'needs_review',
    'reviewer_comment',
  ]
  const rows = phrases.map((p) => {
    const polite = p.variants?.find((v) => v.register === 'polite')
    const casual = p.variants?.find((v) => v.register === 'casual')
    return [
      p.id,
      p.scene,
      sceneById.get(p.scene)?.title ?? '',
      p.thai,
      p.roman,
      p.kana ?? '',
      p.ja,
      p.register,
      polite?.thai ?? '',
      polite?.roman ?? '',
      casual?.thai ?? '',
      casual?.roman ?? '',
      p.note ?? '',
      (p.tags ?? []).join(' '),
      p.needs_review ? 'TRUE' : '',
      '',
    ]
      .map(csvEscape)
      .join(',')
  })
  return '﻿' + [header.join(','), ...rows].join('\r\n')
}

export function downloadPhrasesCsv(): void {
  download(`thai-phrases-${dateKey()}.csv`, buildPhrasesCsv(), 'text/csv;charset=utf-8')
}
