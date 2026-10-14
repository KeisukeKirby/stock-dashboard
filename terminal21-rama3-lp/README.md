# Terminal 21 Rama 3 ポップアップストア LP

Vibram FiveFingers × Vivobarefoot のポップアップストアのランディングページです。
Terminal 21 Asok 版（`barefootinc-t21-asok-event`）と同じ構成で、会場・会期・アクセスを Rama 3 に差し替えています。

- **会期:** 2026 年 10 月 16 日（金）– 11 月 1 日（日）
- **時間:** 10:00 – 22:00
- **会場:** Terminal 21 Rama 3, G Floor（356 Rama III Road, Bang Khlo, Bang Kho Laem, Bangkok 10120）

## 構成

ビルド不要の静的ページです。

| ファイル | 内容 |
| --- | --- |
| `index.html` | ページ本体 v2（CSS・JS・EN/TH の文言をすべて含む） |
| `v1/index.html` | 最初のバージョン（Asok 版と同じ構成）。`/v1` で見られる。noindex |
| `images/` | ヒーロー写真・ブランドロゴ・サイズチャート・会場ロゴ・フロアマップ・`models/` のモデル写真（写真は WebP も同梱）。差し替え時は新しいファイル名にする（1 日キャッシュ） |
| `og-image.jpg` | 1200×630 の SNS シェア用画像（`og:image` / `twitter:image`） |
| `vercel.json` | このフォルダをそのまま配信する設定 |

## v3 で追加したもの（本番実装前）

- 「Why barefoot?」（ヒーロー直後、明るい背景）: 4 つの悩み（インフォグラフィックを元に描き直したインライン SVG の丸いイラスト）→ 「Barefoot benefits」（元のインフォグラフィックを再現: 元画像の芝生から明るく均一に合成した芝生の上に、元画像の足だけを切り抜いて自然に合成した背景 `images/why/benefits-bg-4.jpg` に、見出しと 3 項目を HTML テキストで重ねる。スマホは写真の下にテキストを縦積み）→ 「Normal shoes vs Barefoot theory」（元画像どおりのグレー / 黄色の 2 列、破線区切り、元画像から切り出したアイコン `images/why/cmp-*.png`）。比較表の行には元画像から切り出したアイコン `images/why/cmp-*.png`
- ブランド紹介の下にモデルカード各 4 つ（VFF: V-Run / V-Soul / KSO EVO / Scramkey、Vivo: Primus Lite IV / Motus Strength II / Gobi III Sneaker Leather / Primus Flow）。通常価格とセール価格を表示（KSO EVO は *Selected color only）。写真は `images/models/`
- 「At the booth」の下に「Start slowly」の注意書き（少しずつ時間と日数を増やす・痛みがあれば休む、を 1 段落に）、FAQ（アコーディオン、FAQPage の JSON-LD 付き。返品・交換不可、支払いは現金・タイ銀行 QR・クレジットカード）
- アクセスにフロアマップ（`images/floor-map-rama3-g-2.jpg`、G Floor の図面。ブース位置は Gate 4 側・エスカレーター横。タップで拡大）
- `[TODO]` プレースホルダーは残っていません

## v2 の構成

- ヒーロー（PC は 2 ブランドの写真を左右に並べ、左半分に収まる巨大タイポが行ごとに立ち上がる。写真は下端揃えでシューズが必ず写る。マウス追従や拡大の動きはなし。スマホは上に FiveFingers、見出し、下に Vivobarefoot の縦積みで、写真はシューズが見える位置で切り抜き）
- ヒーロー下の会期・時間・フロアは、文字が縦にロールして確定する表示（出発案内板のイメージ）
- ブランド 2 セクション（写真はタップで拡大）、ブースでできること
- アクセスは会場ロゴ + 住所・会期・時間・交通の一覧 + Google Maps 埋め込み。「Add to calendar」ボタンは廃止
- PC はマグネットボタン、スマホは下部の固定バーから「Getting there」へ。ヘッダーはスクロールし始めるとすぐ半透明の明るい背景になる
- フォントは Oswald（見出し）/ DM Serif Display（タグライン・サブコピー）/ Noto Sans Thai（本文・タイ語）の 3 種類
- `prefers-reduced-motion` ではすべての動きを止めます

## 文言の編集

表示する文言はすべて `index.html` 末尾の `I18N` オブジェクト（`en` / `th`）にあります。
HTML 側は同じキーの `data-i18n` 属性を持っています。タイ語環境のブラウザでは自動でタイ語になり、ナビの EN / ไทย で切り替えられます。

会期・時間・会場を変えるときは `I18N` の `hero.*` / `strip.*` / `access.*` と、`<head>` の `<title>` / `description` / `og:*` を合わせて直してください。

## 地図

Google Maps の埋め込み（API キー不要）と、G Floor のフロアマップ（`images/floor-map-rama3-g-2.jpg`、ライトボックスで拡大）を使っています。
図面を差し替えるときは、`vercel.json` で `/images/` を 1 日キャッシュしているため、必ず新しいファイル名にして `index.html` の参照も直してください。

## デプロイ

Vercel プロジェクト `terminal21-rama3-lp`（このリポジトリに接続、**Root Directory: `terminal21-rama3-lp`**、Framework Preset: Other）。
`main` に push すると本番 https://terminal21-rama3-lp.vercel.app/ に自動デプロイされます。
