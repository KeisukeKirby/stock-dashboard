# Barefoot Malaysia — Vibram FiveFingers Pop-Up LP（Ativo Plaza）

Barefoot Malaysia が Ativo Plaza で開催する Vibram FiveFingers ポップアップイベント（2026/11/13–15、12PM–8PM、最大 30% OFF）の英語ランディングページです。
ビルド不要の静的サイト（HTML / CSS / JS のみ）で、`vivo/` や `memo/` と同じく Vercel の別プロジェクト（Root Directory: `malaysia-popup-lp`）で配信する想定です。

## 構成

```
malaysia-popup-lp/
  index.html   # ページ本体（Hero / Event Overview / About VFF / Lineup / Benefits / At the Booth / FAQ / Event Details / CTA / Footer）
  style.css    # スタイル（Vibram の黄 #ffd100 × 黒、見出しは Barlow Condensed）
  main.js      # モバイルメニュー、開催までのカウントダウン、Add to Calendar (.ics)、スクロール時のフェードイン
  img/         # 商品写真・ロゴ（Google Drive の素材を Web 用にリサイズ済み）
  vercel.json  # cleanUrls、画像のみ 1 週間キャッシュ
```

## 掲載内容の変更

- **日時・会場・割引率**: `index.html` 内に直書きです。カウントダウンと .ics の日時は `main.js` 冒頭の `EVENT_START` / `EVENT_END` と `DTSTART` / `DTEND` も合わせて変更してください。
- **Google Maps**: 「Get Directions」系ボタンは `https://maps.app.goo.gl/J7KbaWQLKpgPjHMJ6`、地図の埋め込みは `index.html` の `<iframe>`（`maps?q=...&output=embed`）です。
- **価格・カラー**: Lineup セクションの各 `.product` カード。価格は添付のカテゴリー POP（RM）をそのまま掲載しています。

## 使用している写真（Google Drive）

添付のカテゴリー POP に含まれるモデルのみ、モデル着用（ライフスタイル）写真を使用しています。Facebook 公式ページはこの環境から取得できなかったため未使用です。

| ファイル | 元データ |
| --- | --- |
| `hero-t1.jpg` 〜 `hero-t5.jpg` | 支給画像（Breezandal / V-Run / トレーニング / V-Soul / Trailope のモデル着用写真） |
| `life-vrun.jpg` | VIBRAM › Marketing › VFF Global Q3 Assets › V-Run_September › 2nd part RUNNING › DSC06031.jpg |
| `life-trailope.jpg` | VFF marketing items Apr 2026 › Carryover seasonal images + videos › 3. Running › 1. Trailope › 4P2A7599.jpg |
| `life-spidrwalk.jpg` | VFF Global Q3 Assets › Spidrwalk_August › More assets › 4P2A4791.jpg |
| `life-vsoul.jpg` | VFF Global Q3 Assets › V-Soul_July › 1 (1).jpg |
| `life-groundsplay.jpg` / `about-model.jpg` | VFF Global Q3 Assets › Groundsplay LS_September › Ivory Deep Lake › 181025_VIBRAM_FIVEFINGHERS_00156.jpg / 00150.jpg |
| `why-barefoot.jpg` | 支給の WHY BAREFOOT? インフォグラフィック |
| `logo-vff-white.png` | Latest VFF logo and Guideline › LOGO 4 colours › vff_logo_4col_horiz_white.pdf |
| `logo-barefoot-malaysia.png` | Barefootinc Malaysia › Design, Artwork › BFM logo › Logo › LOGO_BAREFOOT MALAYSIA.png |

「Why Barefoot?」セクションは支給のインフォグラフィック画像をそのまま掲載しています。

## 公開手順（Vercel）

1. Vercel で新規プロジェクトを作成し、このリポジトリを選択
2. Root Directory を `malaysia-popup-lp` に設定（Framework Preset: Other、Build Command なし）
3. 以降はこのフォルダを変更して push すると自動で再デプロイされます

ローカル確認:

```bash
cd malaysia-popup-lp && python3 -m http.server 8080   # http://localhost:8080/
```
