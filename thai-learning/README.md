# Thai Learning Dashboard（個人用 PWA）

タイ語ゼロから、10/17 の HipHop イベントで「声をかけ、会話を続け、連絡先交換・次の約束」までを目標にした
スピーキング／リスニング特化の学習アプリ。Vite + React + TypeScript + Tailwind、PWA（オフライン可）、進捗は IndexedDB。

設計・画面構成・データ構造・16 日間カリキュラムは [`docs/DESIGN.md`](docs/DESIGN.md)。

## 使い方（ローカル）

```bash
cd thai-learning
npm install
npm run dev        # http://localhost:5173（LAN からスマホで開くなら表示される Network の URL）
```

- `npm run build` … 本番ビルド（`dist/`）。`npm run preview` で確認
- `npm run typecheck` … 型チェック
- `npm run content:check` … コンテンツ JSON の整合性チェック（ID 重複・参照切れ・必須項目）
- `npm run content:csv` … 全フレーズを `phrases-for-review.csv` に出力（ネイティブチェック用。アプリの設定画面からも出力可）

> Linux で `Cannot find module '@rollup/rollup-linux-x64-gnu'` が出たら `npm install --no-save @rollup/rollup-linux-x64-gnu`（npm の optional dependency の既知の問題）。

## 画面

| 画面 | 内容 |
| --- | --- |
| ホーム | 10/17 までのカウントダウン、今日のメニュー開始、連続日数、習得数、場面別達成度 |
| 今日のメニュー | 復習(SRS) → 新フレーズ → シャドーイング → リスニングクイズ → ミニロールプレイ（15〜20 分） |
| スキマ時間モード | 復習だけを 5 分（または 15 枚） |
| 声調トレーナー | 5 声調の説明・聞き分けクイズ・最小対・録音比較 |
| フレーズ学習 | 場面別一覧 → 音声 → 意味 → 自分で言う → 自己評価 |
| リスニングクイズ | 音声だけ → 意味 4 択（相手の返答パターンも出題） |
| ロールプレイ | 台本 11 本（分岐あり）。相手のセリフは音声、自分の番は声に出す |
| カリキュラム | 16 日間の日ごとの場面・新フレーズ・消化状況 |
| 設定 | カナ表示、速度、th-TH 音声の診断、JSON エクスポート／インポート、CSV 出力 |

## コンテンツの追加・修正

`src/content/*.json` を編集するだけ。

- `phrases.json` … フレーズ（`id` は変えない。進捗は id で紐付く）。自信がない項目は `"needs_review": true`
- `scenes.json` … 場面
- `tones.json` … 声調の例・クイズ・最小対
- `roleplays.json` … 台本（`kind: partner | you | branch | end`）
- `curriculum.json` … 日ごとの新フレーズ ID とロールプレイ

編集後に `npm run content:check` で整合性を確認。

## 音声

- 既定は端末の Web Speech API（th-TH）。音声が無い端末では設定画面に追加手順を表示
  - iPhone: 設定 → アクセシビリティ → 読み上げコンテンツ → 声 → タイ語
  - Android: テキスト読み上げ → Google 音声 → タイ語の音声データをインストール
- 事前生成 mp3 に差し替えるには `public/audio/<phraseId>.mp3` を置き、`phrases.json` の該当フレーズに `"audio": "<phraseId>.mp3"` を足す（`CompositeProvider` が mp3 を優先する）

## Vercel へのデプロイ

このフォルダはリポジトリのサブディレクトリなので、**別の Vercel プロジェクト**として作る。

1. Vercel ダッシュボード → Add New → Project → この GitHub リポジトリを選択
2. **Root Directory** を `thai-learning` に設定（Edit → `thai-learning`）
3. Framework Preset: **Vite**（自動検出）。Build Command `npm run build`、Output Directory `dist`（`thai-learning/vercel.json` に記載済み）
4. Deploy。発行された URL をスマホの Safari / Chrome で開き、「ホーム画面に追加」

CLI の場合：

```bash
cd thai-learning
npx vercel          # 初回：プロジェクト作成（Root Directory はこのフォルダ）
npx vercel --prod
```

更新は `git push` で自動デプロイ。PWA は `autoUpdate` なので次回起動時に新しい版に切り替わる。

## 進捗データ

- 端末の IndexedDB（`thai-learning`）に保存。設定画面から JSON でエクスポート／インポート（マージ or 置き換え）
- Phase 2 のクラウド同期は `src/lib/db.ts` の `exportAll()` / `importAll()` の上に載せる

## Phase 2 / 3 の拡張ポイント

`docs/DESIGN.md` の 6 章を参照（AI ロールプレイ用の `api/`、タイ文字 SRS、職場タイ語の場面追加）。
