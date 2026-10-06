import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSettings } from '@/hooks/useSettings'
import { useAudioCheck, useAudio } from '@/hooks/useAudio'
import { usePlan } from '@/hooks/useProgress'
import { downloadProgressJson, importProgressFile } from '@/lib/exportImport'
import { resetAll, setMeta } from '@/lib/db'
import { items } from '@/lib/content'
import { Button, Card, PageTitle } from '@/components/ui'
import { SpeedToggle } from '@/components/SpeedToggle'
import { recorderSupported } from '@/lib/recorder'
import { recognitionSupported } from '@/lib/speech'
import { formatMD, dateKey } from '@/lib/date'
import type { Accent, MenuSize } from '@/lib/types'
import { cn } from '@/lib/cn'

export default function Settings() {
  const nav = useNavigate()
  const { settings, update } = useSettings()
  const { check, recheck } = useAudioCheck()
  const { speak } = useAudio()
  const { plan, level } = usePlan()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [installEvt, setInstallEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null)

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as Event & { prompt: () => Promise<void> })
    }
    window.addEventListener('beforeinstallprompt', h)
    return () => window.removeEventListener('beforeinstallprompt', h)
  }, [])

  async function onImport(file: File) {
    try {
      const r = await importProgressFile(file, importMode)
      setMsg(`取り込みました：カード ${r.cards} 件、日別ログ ${r.logs} 件（${importMode === 'merge' ? 'マージ' : '置き換え'}）`)
    } catch (e) {
      setMsg(`取り込みに失敗: ${(e as Error).message}`)
    }
  }

  return (
    <div>
      <PageTitle title="設定" />

      <Card>
        <h2 className="font-bold">レベルと計画</h2>
        <p className="mt-1 text-sm text-slate-300">
          {level ? `現在地 ${level.overall}（${formatMD(dateKey(new Date(level.at)))} 測定）・推定語彙 約 ${level.vocabEstimate.toLocaleString()} 語` : 'レベル未測定'}
          <br />
          カリキュラム：開始 {formatMD(plan.startDate)}・Week {plan.startWeek} から
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button onClick={() => nav('/level-check')}>{level ? 'レベルチェックを再受験' : 'レベルチェックを受ける'}</Button>
          <Button variant="secondary" onClick={() => nav('/plan/curriculum')}>
            カリキュラムを見る
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">表示</h2>
        <label className="mt-3 flex items-center justify-between">
          <span>
            日本語訳を最初は隠す
            <span className="block text-xs text-slate-400">音と英語で意味を思い出してからタップで表示（日本語を介さない練習）</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={settings.hideJa} onChange={(e) => void update({ hideJa: e.target.checked })} />
        </label>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">音声</h2>
        <div className="mt-3 flex items-center justify-between">
          <span>再生速度</span>
          <SpeedToggle />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span>アクセント</span>
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-xs">
            {(['en-US', 'en-GB', 'en-AU'] as Accent[]).map((a) => (
              <button key={a} type="button" onClick={() => void update({ accent: a, voiceURI: undefined })} className={cn('rounded-md px-2 py-1 font-mono', settings.accent === a ? 'bg-amber-400 text-slate-950' : 'text-slate-300')}>
                {a.slice(3)}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <p className="text-sm">英語音声の診断</p>
          {check === null ? (
            <p className="text-xs text-slate-400">確認中…</p>
          ) : check.ok ? (
            <div className="mt-1 text-sm text-emerald-300">
              ✓ 英語の音声が使えます（{check.voices?.length} 件）
              {check.voices && check.voices.length > 1 && (
                <select className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100" value={settings.voiceURI ?? ''} onChange={(e) => void update({ voiceURI: e.target.value || undefined })}>
                  <option value="">自動（{settings.accent} を優先）</option>
                  {check.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              )}
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void speak('Hi there! Let me know if you need any help. These run a little small, so I would go half a size up.')}>
                ▶ テスト再生
              </Button>
              <p className="mt-2 text-xs text-slate-400">iPhone は「設定 → アクセシビリティ → 読み上げコンテンツ → 声 → 英語」で高品質（拡張）音声をダウンロードすると自然になります。</p>
            </div>
          ) : (
            <div className="mt-1 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <p className="font-semibold">✗ {check.reason}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-100/90">
                <li>
                  <b>iPhone / iPad</b>：設定 → アクセシビリティ → 読み上げコンテンツ → 声 → 英語 → 音声をダウンロード
                </li>
                <li>
                  <b>Android</b>：設定 → システム → 言語と入力 → テキスト読み上げ → 音声データをインストール → 英語
                </li>
                <li>
                  <b>Windows / macOS</b>：言語設定で英語の音声合成を追加
                </li>
              </ul>
              <Button variant="secondary" size="sm" className="mt-2" onClick={recheck}>
                再チェック
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          録音: {recorderSupported() ? '対応' : '非対応'} ／ 音声認識: {recognitionSupported() ? '対応（補助機能）' : '非対応（学習には影響なし）'}
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">学習量</h2>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm">今日のメニューの長さ</span>
          <div className="inline-flex rounded-lg border border-slate-700 bg-slate-900 p-0.5 text-xs">
            {(
              [
                ['short', '短め 15分'],
                ['standard', '標準 30分'],
                ['long', '長め 45分'],
              ] as [MenuSize, string][]
            ).map(([k, l]) => (
              <button key={k} type="button" onClick={() => void update({ menuSize: k })} className={cn('rounded-md px-2 py-1', settings.menuSize === k ? 'bg-amber-400 text-slate-950' : 'text-slate-300')}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <NumberRow label="1 日の新アイテム上限" value={settings.dailyNewLimit} min={3} max={25} onChange={(v) => void update({ dailyNewLimit: v })} />
        <NumberRow label="1 回の復習上限（今日のメニュー）" value={settings.reviewLimit} min={10} max={100} step={5} onChange={(v) => void update({ reviewLimit: v })} />
        <NumberRow label="スキマ時間モードの分数" value={settings.quickMinutes} min={2} max={15} onChange={(v) => void update({ quickMinutes: v })} />
        <NumberRow label="スキマ時間モードの枚数" value={settings.quickCards} min={5} max={40} step={5} onChange={(v) => void update({ quickCards: v })} />
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">進捗データ</h2>
        <p className="mt-1 text-xs text-slate-400">進捗はこの端末の IndexedDB に保存されます。別端末へ移すときは JSON を出力して取り込んでください。</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="secondary" onClick={() => void downloadProgressJson()}>
            ⬇ JSON エクスポート
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            ⬆ JSON インポート
          </Button>
        </div>
        <div className="mt-2 flex gap-3 text-xs text-slate-300">
          <label className="flex items-center gap-1">
            <input type="radio" className="accent-amber-400" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> マージ
          </label>
          <label className="flex items-center gap-1">
            <input type="radio" className="accent-amber-400" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /> 置き換え
          </label>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void onImport(f)
            e.target.value = ''
          }}
        />
        {msg && <p className="mt-2 text-xs text-amber-200">{msg}</p>}
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">アプリ</h2>
        <p className="mt-1 text-xs text-slate-400">全 {items.length} アイテム・文法 12 ユニット・ロールプレイ 5 本。コンテンツは src/content/*.json。</p>
        {installEvt ? (
          <Button className="mt-2" onClick={() => void installEvt.prompt()}>
            📲 ホーム画面に追加
          </Button>
        ) : (
          <p className="mt-2 text-xs text-slate-400">iPhone: Safari の共有ボタン → 「ホーム画面に追加」。Android: ブラウザのメニュー → 「アプリをインストール」。オフラインでも動きます。</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (confirm('カリキュラムを今日から Week 1 でやり直します（進捗は消えません）。')) void setMeta('plan', { startDate: dateKey(), startWeek: 1 })
            }}
          >
            計画をリセット
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('すべての進捗（カード・ログ・記録・レベル）を削除します。元に戻せません。先に JSON エクスポートをおすすめします。続けますか？')) {
                void resetAll().then(() => setMsg('進捗をリセットしました'))
              }
            }}
          >
            進捗を全削除
          </Button>
        </div>
      </Card>
    </div>
  )
}

function NumberRow({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => onChange(Math.max(min, value - step))}>
          −
        </Button>
        <span className="w-8 text-center tabular-nums">{value}</span>
        <Button variant="secondary" size="sm" onClick={() => onChange(Math.min(max, value + step))}>
          ＋
        </Button>
      </div>
    </div>
  )
}
