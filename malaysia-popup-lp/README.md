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

添付画像に含まれるモデルのみ使用しています。

| ファイル | 元データ（Drive） |
| --- | --- |
| `vrun-black-lime.jpg` | BAREFOOTINC THAILAND › V-RUN › V-Run_26M7004_Black Lime_Black › 26M7004_V-RUN_Black_Lime_Black_01_.jpg |
| `vrun-total-black.jpg` / `vrun-pair-top.jpg` / `bg-vrun-detail.jpg` | V-RUN_26M7001_Total Black › V-RUN_Total Black 1.jpg、Marketing › V-Run › Total Black › V-RUN_26M7001_0929 / 0449.jpg |
| `trailope-black.jpg` | TRAILOPE › TRAILLOPE_25M7501_Black › TRAILLOPE_Black_1.jpg |
| `spidrwalk-total-black.jpg` | SPIDRWALK › SPIDRWALK_26M5001_Total Black › SPIDRWALK_Total Black 2.jpg |
| `breezandal-black.jpg` | BREEZANDAL › BREEZANDAL_25M4301_Black › BREEZANDAL_25M4301_BLACK_01.jpg |
| `breezandal-ivory-green.jpg` / `groundsplay-ls-total-black.jpg` / `hero-vrun.png` | VFF_PRODUCT_SHOPEE & LAZ › VFF_BreezandalL_Ivory_Green_W.jpg / VFF_GROUNDSPLAY LS_Total Black_M.jpg / VFF_V-RUN_Black_Lime_Black_.jpg（ロゴ・文字部分をトリミング） |
| `groundsplay-ls-ivory-deep-lake.jpg` | 26W3202_Groundsplay_LS_Ivory-Deep Lake_01.jpg |
| `vsoul-black.jpg` / `vsoul-brown.jpg` / `vsoul-baby-blue.jpg` | V-SOUL › V-SOUL_18W7201_Black / 26W7202_Brown / 26W7205_Baby Blue の `_01_` 画像 |
| `logo-vff-white.png` / `logo-vff-color.png` | Latest VFF logo and Guideline › LOGO 4 colours › vff_logo_4col_horiz(_white).pdf |
| `logo-barefoot-malaysia.png` | Barefootinc Malaysia › Design, Artwork › BFM logo › Logo › LOGO_BAREFOOT MALAYSIA.png |

## 公開手順（Vercel）

1. Vercel で新規プロジェクトを作成し、このリポジトリを選択
2. Root Directory を `malaysia-popup-lp` に設定（Framework Preset: Other、Build Command なし）
3. 以降はこのフォルダを変更して push すると自動で再デプロイされます

ローカル確認:

```bash
cd malaysia-popup-lp && python3 -m http.server 8080   # http://localhost:8080/
```
