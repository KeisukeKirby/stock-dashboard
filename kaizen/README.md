# 業務改善マニュアル

各スタッフ・セクションの既存の業務プロセスを最適化・効率化して生産性を上げるための改善マニュアル。
ページ上で内容を書き足して全員に共有でき、A4 縦でそのまま PDF 化できます。

在庫ダッシュボードとは独立した Vercel プロジェクトです（**Root Directory を `kaizen` に設定**）。

## 使い方

- **閲覧**: URL を開くだけ。他の人が保存した内容は、画面に戻ったときに自動で取り込まれます
- **編集**: 右上「編集」→ 左にテキスト、右にプレビュー。「保存して共有」（Ctrl+S）で同じ URL を開いている全員に反映。書き方は編集画面の「書き方」に一覧
- **PDF 化**: 右上「PDF にする」→ ブラウザの印刷で「PDF に保存」（用紙 A4・背景のグラフィックをオン）。編集中に押すと、いま書いている内容で PDF になります
- **控え**: 「.md を保存」でテキストをダウンロード、「.md を開く」で戻す。「保存履歴」から直近 30 回の保存を呼び戻せます

## Vercel の設定

1. 新しいプロジェクトを作り、このリポジトリを選んで **Root Directory = `kaizen`**（Framework Preset は Other、ビルドコマンドなし）
2. **Storage → Upstash for Redis** を作成（または既存のものを）このプロジェクトに接続（環境変数 `KV_REST_API_URL` / `KV_REST_API_TOKEN` が入ります）。未接続のときは共有保存にならず、各自のブラウザにだけ保存されます
3. 編集を制限する場合は環境変数 `KAIZEN_EDIT_KEY` に任意の文字列を設定して再デプロイ。保存時にその編集キーを求められます（閲覧は誰でも可）

## ファイル

```
index.html      ページ（閲覧・編集・PDF）
kaizen.css      画面と A4 印刷のスタイル
kaizen-md.js    本文テキスト（Markdown 風）の解析
kaizen.js       読み込み・描画・編集・保存
kaizen.md       共有保存が空のときに表示する初期本文（提案版 v0.1）
api/kaizen.js   共有保存 API（Upstash Redis）
vercel.json
```

配布用の PDF をコマンドで作る（Playwright の Chromium を使用）:

```bash
node ../scripts/build_kaizen_pdf.mjs ../out/kaizen.pdf https://<公開 URL>/   # 公開中の内容から
node ../scripts/build_kaizen_pdf.mjs ../out/kaizen.pdf                        # この kaizen.md から
```
