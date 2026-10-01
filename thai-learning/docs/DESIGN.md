# タイ語学習ダッシュボード 設計書（Phase 1）

> 対象：日本語ネイティブ・バンコク在住・タイ語ゼロからのスタート。
> 10/1〜10/17 の 16 日間で「HipHop イベントで声をかけ、会話を続け、連絡先交換・次の約束までできる」を最優先ゴールにする。
> 一人称は ผม、文末は ครับ を基本。カジュアル形は併記して使い分けメモを付ける。

---

## 1. 全体設計

### 1.1 技術スタック

| 項目 | 採用 | 理由 |
| --- | --- | --- |
| ビルド | Vite 7 + React 19 + TypeScript 5.9 | 要件どおり。軽量・高速 |
| スタイル | Tailwind CSS v4（`@tailwindcss/vite`） | 設定ファイル不要、スマホファーストが書きやすい |
| PWA | `vite-plugin-pwa`（Workbox, autoUpdate） | ホーム画面追加・オフライン動作・将来の mp3 キャッシュ |
| ルーティング | react-router-dom v7 | 画面遷移。`/` 配下を SPA として Vercel で rewrite |
| 永続化 | IndexedDB（`idb` ラッパー） | 進捗・学習ログ・設定。JSON エクスポート／インポート対応 |
| 音声出力 | `AudioProvider` 抽象 → 初期実装は Web Speech API (th-TH) | 後から事前生成 mp3（クラウド TTS）に差し替え可能 |
| 録音 | MediaRecorder | お手本と自分の声の聞き比べ |
| 音声認識 | SpeechRecognition (th-TH)、対応ブラウザのみ | 補助機能。非対応でも学習は成立する |
| デプロイ | Vercel（Root Directory = `thai-learning`） | 既存の在庫ダッシュボードとは別プロジェクトとして運用 |

### 1.2 ディレクトリ構成

```
thai-learning/
  docs/DESIGN.md              # この文書
  public/
    icons/                    # PWA アイコン
    audio/                    # (Phase 1 では空) 事前生成 mp3 の置き場。<phraseId>.mp3
  scripts/
    validate-content.mjs      # コンテンツ JSON の整合性チェック（ID 重複・参照切れ・必須項目）
    export-csv.mjs            # 全フレーズを CSV に出力（ネイティブチェック用）
  src/
    content/                  # 学習コンテンツ（JSON。後から追加・修正しやすい）
      scenes.json             #   場面の定義（順序・名前・アイコン）
      phrases.json            #   フレーズ約 200 件
      tones.json              #   5 声調の例・最小対・聞き分けクイズ素材
      roleplays.json          #   分岐つき台本ロールプレイ
      curriculum.json         #   16 日間カリキュラム（日 → 場面・フレーズ ID・ロールプレイ）
    audio/                    # AudioProvider 抽象と実装
      AudioProvider.ts        #   インターフェース
      WebSpeechProvider.ts    #   Web Speech API (th-TH)
      Mp3Provider.ts          #   事前生成 mp3（/audio/<id>.mp3）
      CompositeProvider.ts    #   mp3 があれば mp3、無ければ Web Speech
    lib/
      types.ts                # 型定義（Phrase, Card, Progress など）
      content.ts              # JSON の読み込み・索引
      srs.ts                  # 間隔反復（SM-2 改）
      db.ts                   # IndexedDB アクセス（idb）
      progress.ts             # 進捗集計（連続日数・習得数・場面別達成度）
      curriculum.ts           # 今日の日付 → カリキュラムの日を解決
      session.ts              # 「今日のメニュー」のステップ生成
      recorder.ts             # MediaRecorder ラッパー
      speech.ts               # SpeechRecognition ラッパー
      exportImport.ts         # 進捗 JSON の出力・取込、CSV 生成
      date.ts                 # 日付ユーティリティ（Asia/Bangkok 基準）
    components/               # 共有 UI（PhraseCard, AudioButton, Recorder, ProgressBar, BottomNav …）
    pages/                    # 画面（下記 2 章）
    hooks/                    # useSettings, useAudio, useProgress など
    App.tsx / main.tsx / index.css
```

### 1.3 データの流れ

```
content/*.json ──(ビルド時に import)──▶ content.ts（索引: phraseById, phrasesByScene …）
                                              │
                                              ▼
IndexedDB ◀──── db.ts ◀──── srs.ts / progress.ts / session.ts ◀──── pages/*
   │ cards（カード別 SRS 状態）
   │ dailyLog（日別の学習実績）
   │ settings（カナ表示・速度・音声など）
   └ meta（データ版、初回起動日 など）
```

- コンテンツは **読み取り専用**（アプリに同梱）。進捗だけが IndexedDB に入る。
- コンテンツを更新しても、進捗はフレーズ ID で結び付くので保持される。
- 進捗の JSON エクスポートは IndexedDB 全ストアのダンプ。インポートは **マージ**（カードは「より進んでいる方」を採用）。

---

## 2. 画面構成

スマホ縦持ちを基準。下部タブ 5 つ（ホーム / 学ぶ / 声調 / フレーズ / 設定）。PC では中央 `max-w-xl` のカラムで同じ UI を使う（タブは上部に移る）。

| ルート | 画面 | 内容 |
| --- | --- | --- |
| `/` | ホーム | 10/17 までのカウントダウン、今日のメニュー開始ボタン（1 タップ）、連続日数、習得フレーズ数、場面別達成度バー、今日の学習時間 |
| `/today` | 今日のメニュー | 5 ステップを順番に進めるセッションランナー。復習(SRS) → 新フレーズ → シャドーイング → リスニングクイズ → ミニロールプレイ。上部に進捗バーと残り目安分。15〜20 分で終わる量 |
| `/quick` | スキマ時間モード | 復習だけを 5 分（または 15 枚）で回す。終わったら「もう 5 分」か「終了」 |
| `/tones` | 声調トレーナー | ① 5 声調の説明と例（再生）② 聞き分けクイズ（音を聞いて声調を選ぶ）③ 最小対クイズ（2 択・意味も表示）④ 録音して聞き比べ。最初の 2 日間はホームから強く誘導する |
| `/phrases` | フレーズ学習（場面一覧） | 場面カード（達成度付き） |
| `/phrases/:sceneId` | 場面のフレーズ一覧 | 1 フレーズ 1 行。タップで詳細（タイ文字 / Paiboon / 日本語 / 音声 / 丁寧・カジュアル / メモ）。「この場面を学習」で学習フロー（音声 → 意味 → 自分で言う → 自己評価）へ |
| `/listening` | リスニングクイズ | 音声だけ → 意味を 4 択。相手が返しそうな返答パターンも出題（`tags: reply`） |
| `/roleplay` | ロールプレイ一覧 | 台本一覧（場面・所要時間） |
| `/roleplay/:id` | 台本ロールプレイ | 相手のセリフが音声で流れ、自分の番で日本語ヒント → 声に出す → 「正解を見る」→ 相手の反応を選ぶ（良い / 普通 / 断られた）で分岐 |
| `/curriculum` | 16 日間カリキュラム | 日ごとの場面・新フレーズ数・完了状況。今日の行をハイライト。過去日の未消化分は「今日のメニュー」の新フレーズに繰り越す |
| `/settings` | 設定 | カナ表示 ON/OFF（既定 OFF）、再生速度 0.6/0.8/1.0、音声選択と th-TH 音声の有無診断、進捗 JSON エクスポート／インポート、フレーズ CSV 出力、進捗リセット |

### 2.1 フレーズの表示ルール（共通コンポーネント `PhraseCard`）

```
┌──────────────────────────────┐
│ สวัสดีครับ                 ▶ 0.8x │  ← タイ文字（大）＋再生ボタン＋速度
│ sà-wàt-dii kráp                   │  ← Paiboon 式（声調記号付き）
│ (サワッディー クラップ)            │  ← カナ：設定 ON のときのみ
│ こんにちは／さようなら            │  ← 日本語
│ ─────────────────────────        │
│ 丁寧: สวัสดีครับ   カジュアル: หวัดดี │  ← 両方を載せる
│ 💡 初対面・年上・店員には ครับ 付き… │  ← 使い分けメモ
│ ⚠ 要確認                          │  ← needs_review のときだけ
└──────────────────────────────┘
```

---

## 3. データ構造

### 3.1 コンテンツ（`src/content/*.json`）

```ts
// scenes.json
interface Scene {
  id: string;            // "greetings"
  title: string;         // "挨拶"
  order: number;
  icon: string;          // 絵文字
  description?: string;
}

// phrases.json
interface Phrase {
  id: string;            // "grt-01"（場面プレフィックス + 連番）
  scene: string;         // Scene.id
  thai: string;          // タイ文字（基本形。男性形 ผม / ครับ）
  roman: string;         // Paiboon 式ローマ字（声調記号付き）
  kana?: string;         // カタカナ読み（補助）
  ja: string;            // 日本語訳
  literal?: string;      // 直訳・語構成メモ
  register: 'polite' | 'casual' | 'neutral';
  variants?: {           // 丁寧／カジュアルの別形
    register: 'polite' | 'casual';
    thai: string; roman: string; kana?: string; ja?: string;
  }[];
  note?: string;         // 使い分け・文化メモ
  tags?: string[];       // "reply"(相手が返す側), "question", "core", "number" …
  replies?: string[];    // この発話に相手が返しそうなフレーズ ID
  audio?: string;        // 事前生成 mp3 のパス（無ければ TTS）
  needs_review?: boolean;// 自信がない項目。CSV にも出力
}

// tones.json
interface ToneSet {
  tones: { id: 'mid'|'low'|'falling'|'high'|'rising'; nameJa: string; mark: string; hint: string; examples: ToneExample[] }[];
  quiz: ToneExample[];           // 聞き分けクイズ用（1 音節・声調ラベル付き）
  minimalPairs: { id: string; items: ToneExample[]; note?: string }[];
}
interface ToneExample { thai: string; roman: string; ja: string; tone: ToneId; kana?: string }

// roleplays.json
interface Roleplay {
  id: string; title: string; scene: string; estMinutes: number; description: string;
  start: string;                 // 最初のノード ID
  nodes: Record<string, RoleplayNode>;
}
type RoleplayNode =
  | { kind: 'partner'; thai: string; roman: string; ja: string; kana?: string; next?: string }
  | { kind: 'you'; hintJa: string; thai: string; roman: string; ja: string; kana?: string; phraseId?: string; next?: string }
  | { kind: 'branch'; promptJa: string;         // 「相手の反応は？」
      options: { mood: 'good'|'neutral'|'declined'; label: string; thai: string; roman: string; ja: string; next?: string }[] }
  | { kind: 'end'; messageJa: string; mood?: 'good'|'neutral'|'declined' };

// curriculum.json
interface Curriculum {
  startDate: string;             // "2026-10-01"
  targetDate: string;            // "2026-10-17"
  days: {
    day: number; date: string; title: string; focus: string;
    scenes: string[];            // 主に扱う場面
    newPhrases: string[];        // この日に導入するフレーズ ID
    roleplay?: string;           // この日のミニロールプレイ
    toneTraining?: boolean;      // 声調トレーナーを強く推す日
    tips?: string;
  }[];
}
```

### 3.2 進捗（IndexedDB `thai-learning` v1）

```ts
// store: cards  (key: id)   ─ 1 フレーズ = 2 カード
interface Card {
  id: string;                  // `${phraseId}:listen` | `${phraseId}:speak`
  phraseId: string;
  type: 'listen' | 'speak';    // listen=聞いて意味が分かる / speak=日本語を見てタイ語を言える
  state: 'new' | 'learning' | 'review' | 'relearning';
  due: number;                 // epoch ms
  interval: number;            // 日
  ease: number;                // 1.3〜（SM-2 の EF。初期 2.5）
  reps: number; lapses: number;
  lastGrade?: 1 | 2 | 3;       // 1=言えない 2=あやしい 3=言えた
  lastReviewed?: number; introducedAt: number;
}

// store: dailyLog (key: date "YYYY-MM-DD", Asia/Bangkok)
interface DailyLog {
  date: string;
  reviews: number; newPhrases: number; quizCorrect: number; quizTotal: number;
  minutes: number;             // 画面にいた分（セッション単位で加算）
  menuCompleted: boolean;      // 今日のメニューを完走したか
  steps: Partial<Record<'review'|'new'|'shadow'|'quiz'|'roleplay', boolean>>;
}

// store: settings (key: 'settings')
interface Settings {
  showKana: boolean;           // 既定 false
  rate: 0.6 | 0.8 | 1.0;       // 既定 0.8
  voiceURI?: string;           // 選んだ th-TH 音声
  dailyNewLimit: number;       // 既定 12
  reviewLimit: number;         // 既定 30
  quickMinutes: number;        // 既定 5
}

// store: meta (key: string)   ─ { key: 'schemaVersion', value: 1 } など
```

**SRS（SM-2 改）**
- 自己評価は 3 段階：言えた(3) / あやしい(2) / 言えない(1)。
- `new → learning`：学習ステップ 10 分 → 1 日。言えた で次のステップ、言えない で最初から。
- `review`：言えた → `interval × ease`、あやしい → `interval × 1.2`（ease −0.15）、言えない → `relearning`（interval = 1 日、ease −0.2、lapses +1）。ease 下限 1.3。
- 「聞いて分かる」は新フレーズ導入時に 1 日後、「言える」は 10 分後に初回復習。復習は due 順・`speak` 優先。

### 3.3 セッション（今日のメニュー）の生成ルール

| ステップ | 量 | 素材 |
| --- | --- | --- |
| 1 復習 | due カード最大 30（speak 優先） | cards |
| 2 新フレーズ | カリキュラムの当日分 + 未消化の繰り越し、合計 `dailyNewLimit` 以内 | curriculum → phrases |
| 3 シャドーイング | 今日の新フレーズから 5 件（足りなければ最近学んだもの） | phrases |
| 4 リスニングクイズ | 8 問（導入済みフレーズから。reply タグを 2 問以上混ぜる） | phrases |
| 5 ミニロールプレイ | 当日のロールプレイ 1 本（無い日は復習ロールプレイをランダム） | roleplays |

スキマ時間モードは「1 復習」だけを 5 分（タイマー）または 15 枚で区切る。

---

## 4. 16 日間カリキュラム案（10/1 木 〜 10/17 土）

1 日 10〜15 フレーズ。平日は朝 15 分（復習＋新フレーズ前半）・昼 5〜10 分（スキマ復習）・夜 20〜30 分（新フレーズ後半＋シャドーイング＋クイズ＋ロールプレイ）を想定。土日は長めに取れる前提で 15 件。

| Day | 日付 | テーマ | 新規 | 場面 / ロールプレイ | 備考 |
| --- | --- | --- | --- | --- | --- |
| 1 | 10/1 木 | 声調・発音の基礎①＋挨拶 | 10 | pronunciation, greetings | 声調トレーナーを 20 分。5 声調と ครับ の響きを体に入れる |
| 2 | 10/2 金 | 声調②＋自己紹介 | 12 | pronunciation, self_intro | 名前・日本人・バンコク在住・仕事。最小対クイズ |
| 3 | 10/3 土 | サバイバル表現 | 15 | survival ／ RP: 聞き返し | 「もう一度」「ゆっくり」「タイ語で何て言う？」を反射で言えるまで |
| 4 | 10/4 日 | 相づち・リアクション・つなぎ | 15 | reactions ／ RP: 自己紹介＋相づち | 会話を「続ける」側の武器。เหรอ / จริงเหรอ / เจ๋ง |
| 5 | 10/5 月 | 数字・時間・曜日・場所 | 12 | numbers_time | 1〜10・20・100、何時、今夜、土曜、どこ |
| 6 | 10/6 火 | 食事・飲み物の注文、おごる | 12 | food_drink ／ RP: バーで注文しておごる | ขอ…ครับ、ผมเลี้ยงเอง、ชนแก้ว |
| 7 | 10/7 水 | 雑談①（出身・仕事・住まい） | 12 | small_talk ／ RP: 初対面の雑談 | 質問 → 答える → 聞き返す（แล้วคุณล่ะ）の往復 |
| 8 | 10/8 木 | 雑談②（趣味・休日・食べ物） | 12 | small_talk | 「好き」「〜するのが好き」の型 |
| 9 | 10/9 金 | 音楽・HipHop の話 | 12 | music ／ RP: DJ の話から広げる | このDJいいね、ジャンル、アーティスト、よく来る？ |
| 10 | 10/10 土 | イベント①：声をかける・名前を聞く・一人？ | 15 | event_approach ／ RP: 声をかける（分岐） | 押しつけない入り方。断られたら爽やかに引く |
| 11 | 10/11 日 | イベント②：自然に褒める・一緒に飲む・踊る | 15 | event_connect ／ RP: 褒めて一緒に飲む（分岐） | 褒めは服・ダンス・雰囲気。外見に踏み込みすぎない |
| 12 | 10/12 月 | イベント③：LINE/IG 交換・次に誘う | 12 | event_close ／ RP: 連絡先交換（分岐） | ขอไลน์ได้ไหม → 次の約束（週末・食事） |
| 13 | 10/13 火 | 断られたときの返し＋聞き返し総復習 | 10 | event_close, survival ／ RP: 断られる練習 | 爽やかな返し 3 パターンを即答で |
| 14 | 10/14 水 | 総合ロールプレイ① | 6 | 全場面 ／ RP: 声かけ→会話→交換（通し） | 新規は少なく、復習とロールプレイ中心 |
| 15 | 10/15 木 | 総合ロールプレイ②＋弱点復習 | 5 | 全場面 ／ RP: 通し（別分岐） | lapses が多いカードを重点復習。リスニング 15 問 |
| 16 | 10/16 金 | 本番前の総仕上げ（軽め） | 0 | 全場面 | 復習のみ＋ロールプレイ 1 本。夜は早く寝る |
| 17 | 10/17 土 | 本番 | 0 | — | 朝にスキマ復習 5 分。挨拶・聞き返し・褒め・連絡先交換の 4 セットだけ確認 |

新規合計 ≒ 175 フレーズ。残り約 25 フレーズ（数字の続き・応用表現など）は「フレーズ学習」から任意で学べる。

**繰り越しルール**：消化できなかった日の新フレーズは翌日以降に繰り越し、1 日の新規上限（既定 12、土日は 15）を超えた分はさらに後ろへずれる。

---

## 5. 音声・録音・音声認識

```ts
interface AudioItem { id?: string; text: string; audio?: string }
interface AudioProvider {
  readonly name: string;
  check(): Promise<{ ok: boolean; reason?: string; voices?: string[] }>;
  speak(item: AudioItem, opts: { rate: number; voiceURI?: string }): Promise<void>;
  stop(): void;
}
```

- `WebSpeechProvider`：`speechSynthesis.getVoices()` から `lang` が `th` で始まる音声を探す。無ければ `check()` が `ok:false` を返し、設定画面とホームに案内（iOS: 設定 → アクセシビリティ → 読み上げコンテンツ → 声 → タイ語 を追加 / Android: Google TTS でタイ語をダウンロード / PC Chrome: OS のタイ語音声を追加）。
- `Mp3Provider`：`phrase.audio` があれば `/audio/<id>.mp3` を `HTMLAudioElement` で再生。`playbackRate` で速度対応。
- `CompositeProvider`：mp3 があれば mp3、無ければ Web Speech。Phase 2 でクラウド TTS を一括生成して `public/audio/` に置き、`phrases.json` に `audio` を足すだけで切り替わる。
- 録音：`MediaRecorder`（`audio/webm` または iOS の `audio/mp4`）。1 フレーズ分だけメモリに保持し、お手本 → 自分 → お手本の順で聞き比べられる。
- 音声認識：`webkitSpeechRecognition` があれば th-TH で認識し、正解との一致度（文字の重なり）を表示。無い環境ではボタン自体を出さない。

---

## 6. Phase 2 / 3 への拡張ポイント（実装しない。構造のみ）

- **クラウド同期**：`db.ts` は `exportAll() / importAll()` を公開しており、Supabase などへの同期はこの 2 関数の上に載せる。
- **AI 会話ロールプレイ**：`/api/chat` 用のディレクトリを `api/` に予約（Vercel Serverless）。モデル名・API キーは環境変数。UI は `/roleplay` の下に `ai` モードとして追加予定。
- **タイ文字**：`content/script/*.json`（子音・母音・声調規則）を追加し、`Card.type` に `'glyph'` を増やす想定。SRS はそのまま使える。
- **職場タイ語**：`scenes.json` に場面を追加し `phrases.json` に追記するだけで、フレーズ学習・クイズ・SRS に自動で乗る。
