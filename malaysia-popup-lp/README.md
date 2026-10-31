# Barefoot Malaysia — Vibram FiveFingers Pop-Up LP（Ativo Plaza）

> **2026-10-29 以降の公開元は https://github.com/BFT-Share/ativo-plaza-popup-lp です。** 代表の Vercel（SHIMA's projects）がそのリポジトリから自動デプロイしています。このフォルダはコピーなので、修正は BFT-Share 側のリポジトリに push してください。


Barefoot Malaysia が Ativo Plaza で開催する Vibram FiveFingers ポップアップイベント（2026/11/13–15、金・土 10AM–6PM / 日 10AM–5PM、最大 30% OFF）の英語ランディングページです。
ビルド不要の静的サイト（HTML / CSS / JS のみ）で、`vivo/` や `memo/` と同じく Vercel の別プロジェクト（Root Directory: `malaysia-popup-lp`）で配信する想定です。

## 構成

```
malaysia-popup-lp/
  index.html   # ページ本体（Hero / Event Overview / About VFF / Lineup / Benefits / At the Booth / FAQ / Event Details / CTA / Footer）
  style.css    # スタイル（Vibram の黄 #ffd100 × 黒、見出しは Barlow Condensed）
  i18n.js      # 英語 / 中国語（簡体字）切り替え。中国語の文言はこのファイルの ZH 辞書に集約
  main.js      # モバイルメニュー、開催までのカウントダウン、行き方動画モーダル、スクロール時のフェードイン
  img/         # 商品写真・ロゴ（Google Drive の素材を Web 用にリサイズ済み）
  video/       # ブースへの行き方動画（支給の mp4 を 720p に再エンコード）とポスター画像
  vercel.json  # cleanUrls、画像のみ 1 週間キャッシュ
```

## 掲載内容の変更

- **言語切り替え**: ヘッダー右の「中文 / EN」ボタンで切り替えます。英語は `index.html` に直書き、中国語は `i18n.js` の `ZH` に `data-i18n` キーごとに記載しています。英語の文言を変えたら対応するキーの中国語も更新してください。`?lang=zh` を付けた URL で中国語を初期表示できます。

- **画像の差し替え**: `img/` は 1 日キャッシュされるため、同じファイル名で上書きすると古い画像が表示され続けることがあります。差し替え時はファイル名を変えて（例: `-v2` を付ける）`index.html` の参照も更新してください。

- **日時・会場・割引率**: `index.html` 内に直書きです。カウントダウンの日時は `main.js` 冒頭の `EVENT_START` / `EVENT_END` も合わせて変更してください。
- **ブースへの行き方動画**: Event Details の「How to get to the booth」ボタンで `video/how-to-get-to-the-booth.mp4` をモーダル再生します。差し替える場合は同名で上書きし、ポスターは `ffmpeg -ss 1 -i 動画 -frames:v 1 ポスター.jpg` で作り直してください。
- **Google Maps**: 「Get Directions」系ボタンは `https://maps.app.goo.gl/J7KbaWQLKpgPjHMJ6`、地図の埋め込みは `index.html` の `<iframe>`（`maps?q=...&output=embed`）です。
- **ラインナップ**: Lineup セクションの各 `.life-card`（用途名・説明・右下のモデル名）。

## 使用している写真（Google Drive）

添付のカテゴリー POP に含まれるモデルのみ、モデル着用（ライフスタイル）写真を使用しています。Facebook 公式ページはこの環境から取得できなかったため未使用です。

| ファイル | 元データ |
| --- | --- |
| `hero-a.jpg` 〜 `hero-e.jpg` | 支給画像（V-Run / KSO / V-Soul / Trailope / Breezandal のモデル着用写真）をシューズ中心にトリミング |
| `about-model-b3.jpg` | VIBRAM › Marketing › VFF Global Q3 Assets › V-Run_September › 2nd part RUNNING › DSC06435.jpg |
| `life-vrun-p.jpg` | 同上 › 2nd part RUNNING › DSC06409.jpg |
| `life-trailope-deeplake.jpg` | 支給画像（Trailope Deep Lake 着用写真） |
| `life-scramkey.jpg` | VFF marketing items Apr 2026 › Carryover seasonal images + videos › 1. Scramkey › _11I1240.jpg |
| `life-spidrwalk-s5.jpg` | VFF Global Q3 Assets › Spidrwalk_August › More assets › DSCF9475.jpg |
| `life-vsoul-black.jpg` | 支給画像（V-Soul Black 着用写真） |
| `life-groundsplay.jpg` | VFF Global Q3 Assets › Groundsplay LS_September › Ivory Deep Lake › 181025_VIBRAM_FIVEFINGHERS_00156.jpg |
| `bg-feet-grass-d5.jpg` / `bg-feet-grass-m8.jpg` | Benefits 帯の背景（PC / スマホ）。インフォグラフィックの芝生と右足を切り出し、左右反転して合成 |
| `hero-m-f.jpg` | 支給画像（岩場の V-Trek 着用写真、スマホ版トップ左上） |
| `hero-m-a.jpg` 〜 `hero-m-e.jpg` | `hero-a` 〜 `hero-e` と同じ元画像をスマホ用に縦長でトリミング |
| `issue-1.png` 〜 `issue-4.png`、`vs-n1-c.png` 〜 `vs-n5-c.png`、`vs-b1-c.png` 〜 `vs-b5-c.png` | 支給の WHY BAREFOOT? インフォグラフィックから切り出したアイコン・背景 |
| `logo-vff-white-v3.png` | Latest VFF logo and Guideline › LOGO 4 colours › vff_logo_4col_horiz_white.pdf |
| `og-image.jpg` | SNS / メッセンジャーでリンクを貼ったときのプレビュー画像（1200×630）。`index.html` の `og:image` は公開ドメインの絶対 URL で指定 |
| `logo-barefootmy.png` | 支給の barefoot my ロゴ（PNG、透過） |

「Why Barefoot?」セクションは terminal21 の LP と同じ構成（お悩み 4 カード → Benefits of Barefoot → Normal Shoes vs Barefoot Theory）を HTML で組んでおり、テキストは `index.html` 内で編集できます。

## 公開手順（Vercel）

1. Vercel で新規プロジェクトを作成し、このリポジトリを選択
2. Root Directory を `malaysia-popup-lp` に設定（Framework Preset: Other、Build Command なし）
3. 以降はこのフォルダを変更して push すると自動で再デプロイされます

ローカル確認:

```bash
cd malaysia-popup-lp && python3 -m http.server 8080   # http://localhost:8080/
```
