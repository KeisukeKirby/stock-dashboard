import { exportAll, importAll } from './db'
import type { ProgressExport } from './types'
import { dateKey } from './date'

export function download(filename: string, content: string, mime: string) {
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
  download(`lingodash-progress-${dateKey()}.json`, JSON.stringify(data, null, 2), 'application/json')
}

export async function importProgressFile(file: File, mode: 'merge' | 'replace'): Promise<{ cards: number; logs: number }> {
  const text = await file.text()
  const data = JSON.parse(text) as ProgressExport
  return importAll(data, mode)
}
