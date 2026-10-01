import { useEffect, useRef, useState } from 'react'
import { useSettings } from '@/hooks/useSettings'
import { useAudioCheck, useAudio, useAudioStatus } from '@/hooks/useAudio'
import { downloadPhrasesCsv, downloadProgressJson, importProgressFile } from '@/lib/exportImport'
import { resetAll } from '@/lib/db'
import { phrases } from '@/lib/content'
import { Button, Card, PageTitle } from '@/components/ui'
import { SpeedToggle } from '@/components/SpeedToggle'
import { recorderSupported } from '@/lib/recorder'
import { recognitionSupported } from '@/lib/speech'
import type { Rate } from '@/lib/types'

export default function Settings() {
  const { settings, update } = useSettings()
  const { check, recheck } = useAudioCheck()
  const { speak } = useAudio()
  const status = useAudioStatus()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge')
  const [installEvt, setInstallEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null)
  const needsReview = phrases.filter((p) => p.needs_review).length

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
        <h2 className="font-bold">表示</h2>
        <label className="mt-3 flex items-center justify-between">
          <span>
            カタカナ読みを表示
            <span className="block text-xs text-slate-400">既定 OFF。発音は音声とローマ字で覚える</span>
          </span>
          <input type="checkbox" className="h-5 w-5 accent-amber-400" checked={settings.showKana} onChange={(e) => void update({ showKana: e.target.checked })} />
        </label>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">音声</h2>
        <div className="mt-3 flex items-center justify-between">
          <span>再生速度</span>
          <SpeedToggle />
        </div>
        <div className="mt-3">
          <p className="text-sm">タイ語音声の診断</p>
          {check === null ? (
            <p className="text-xs text-slate-400">確認中…</p>
          ) : check.ok ? (
            <div className="mt-1 text-sm text-emerald-300">
              ✓ th-TH の音声が使えます（{check.voices?.length} 件 / 全 {check.allVoices ?? '?'} 件）
              {check.voices && check.voices.length > 1 && (
                <select
                  className="mt-2 block w-full rounded-lg border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100"
                  value={settings.voiceURI ?? ''}
                  onChange={(e) => void update({ voiceURI: e.target.value || undefined })}
                >
                  <option value="">自動</option>
                  {check.voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              )}
              <ul className="mt-1 list-disc pl-5 text-xs text-emerald-200/80">
                {check.voices?.map((v) => (
                  <li key={v.voiceURI}>
                    {v.name} <span className="text-slate-400">({v.lang})</span>
                  </li>
                ))}
              </ul>
              <Button variant="secondary" size="sm" className="mt-2" onClick={() => void speak('สวัสดีครับ ยินดีที่ได้รู้จัก')}>
                ▶ テスト再生
              </Button>
              {status && (
                <p className={status.ok ? 'mt-2 text-xs text-emerald-300' : 'mt-2 text-xs text-rose-300'}>
                  {status.ok ? '✓ ' : '✗ '}
                  {status.message}
                </p>
              )}
              {status && !status.ok && (
                <div className="mt-2 rounded-xl bg-slate-800/60 p-2 text-xs text-slate-300">
                  <p className="font-semibold">音声はあるのに聞こえないとき</p>
                  <ul className="mt-1 list-disc space-y-1 pl-5">
                    <li>タブのミュート：ブラウザのタブを右クリック → 「サイトのミュートを解除」。アドレスバー左の 🔒 → サイトの設定 → 「音声」が許可か</li>
                    <li>Windows の音量ミキサー：タスクバーのスピーカー → 音量ミキサー → ブラウザの音量が 0 になっていないか</li>
                    <li>Edge のオンライン音声はネットワーク経由で生成されます。会社のプロキシ／VPN で止まることがあるので、スマホのテザリングなど別回線で試す</li>
                    <li>ブラウザを完全に終了して開き直す</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1 rounded-xl border border-rose-800/60 bg-rose-950/40 p-3 text-sm text-rose-100">
              <p className="font-semibold">✗ {check.reason}</p>
              <p className="mt-2 text-xs font-semibold text-rose-100">いちばん早い解決策</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-rose-100/90">
                <li>
                  <b>Windows PC</b>：このページを <b>Microsoft Edge</b> で開く。Edge にはオンラインのタイ語音声（Premwadee / Niwat）が最初から入っていて、追加設定なしで使えます
                </li>
                <li>
                  <b>iPhone / iPad</b>：Safari で開く。設定 → アクセシビリティ → 読み上げコンテンツ → 声 → タイ語 → 「Kanya」をダウンロードしてから Safari を開き直す
                </li>
                <li>
                  <b>Android</b>：Chrome で開く。設定 → システム → 言語と入力 → テキスト読み上げ → Google 音声認識と合成 → 音声データをインストール → タイ語
                </li>
              </ul>
              <p className="mt-2 text-xs font-semibold text-rose-100">Chrome のまま使いたい場合（Windows）</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-xs text-rose-100/90">
                <li>設定 → 時刻と言語 → 言語と地域 → 「ไทย」の右の「…」→ 言語のオプション</li>
                <li>「音声」の中の <b>テキスト読み上げ</b> をインストール（言語パックとは別の項目。タイ語がグレーアウトして追加できないのは、言語自体は追加済みだが読み上げ機能が未インストールのため）</li>
                <li>Chrome を右上の × ではなく <b>完全に終了</b>（タスクバーのアイコンを右クリック → 終了）してから開き直す。Windows の音声はブラウザ起動時にしか読み込まれません</li>
                <li>この画面の「再チェック」を押す</li>
              </ol>
              {check.languages && check.languages.length > 0 && (
                <p className="mt-2 text-[11px] text-rose-200/70">
                  このブラウザが検出した言語: {check.languages.join(', ')}
                </p>
              )}
              <Button variant="secondary" size="sm" className="mt-2" onClick={recheck}>
                再チェック
              </Button>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          録音: {recorderSupported() ? '対応' : '非対応'} ／ 音声認識 (th-TH): {recognitionSupported() ? '対応（補助機能）' : '非対応（学習には影響なし）'}
        </p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">学習量</h2>
        <NumberRow label="1 日の新フレーズ上限（平日）" value={settings.dailyNewLimit} min={5} max={25} onChange={(v) => void update({ dailyNewLimit: v })} />
        <NumberRow label="1 日の新フレーズ上限（土日）" value={settings.weekendNewLimit} min={5} max={30} onChange={(v) => void update({ weekendNewLimit: v })} />
        <NumberRow label="1 回の復習上限（今日のメニュー）" value={settings.reviewLimit} min={10} max={100} step={5} onChange={(v) => void update({ reviewLimit: v })} />
        <NumberRow label="スキマ時間モードの分数" value={settings.quickMinutes} min={2} max={15} onChange={(v) => void update({ quickMinutes: v })} />
        <NumberRow label="スキマ時間モードの枚数" value={settings.quickCards} min={5} max={40} step={5} onChange={(v) => void update({ quickCards: v })} />
        <p className="mt-2 text-xs text-slate-500">再生速度の既定: {(settings.rate as Rate).toFixed(1)}x</p>
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
            <input type="radio" className="accent-amber-400" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} /> マージ（進んでいる方を採用）
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
        <h2 className="font-bold">コンテンツ</h2>
        <p className="mt-1 text-xs text-slate-400">
          全 {phrases.length} フレーズ。要確認（needs_review）: {needsReview} 件。ネイティブチェック用に CSV を出力できます（Excel でそのまま開けます）。
        </p>
        <Button variant="secondary" className="mt-3" onClick={downloadPhrasesCsv}>
          ⬇ フレーズ CSV（ネイティブチェック用）
        </Button>
      </Card>

      <Card className="mt-4">
        <h2 className="font-bold">アプリ</h2>
        {installEvt ? (
          <Button className="mt-2" onClick={() => void installEvt.prompt()}>
            📲 ホーム画面に追加
          </Button>
        ) : (
          <p className="mt-1 text-xs text-slate-400">
            iPhone: Safari の共有ボタン → 「ホーム画面に追加」。Android: ブラウザのメニュー → 「アプリをインストール」。オフラインでも動きます。
          </p>
        )}
        <Button
          variant="danger"
          size="sm"
          className="mt-4"
          onClick={() => {
            if (confirm('すべての進捗（カード・日別ログ）を削除します。元に戻せません。先に JSON エクスポートをおすすめします。続けますか？')) {
              void resetAll().then(() => setMsg('進捗をリセットしました'))
            }
          }}
        >
          進捗をリセット
        </Button>
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
