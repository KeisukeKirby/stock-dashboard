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
| `images/` | ヒーロー写真・ブランドロゴ・サイズチャート・会場ロゴ（写真は WebP も同梱） |
| `og-image.jpg` | 1200×630 の SNS シェア用画像（`og:image` / `twitter:image`） |
| `vercel.json` | このフォルダをそのまま配信する設定 |

## v3 で追加したもの（本番実装前）

- 「Why barefoot?」（ヒーロー直後、明るい背景）: 線画イラスト付きの 4 枚のカード（悩み + その裏にある靴の構造）→ 普通の靴 vs ベアフットを左右 2 列の短い言葉で → ブランドへの導線。医療的な断定は避けた表現にし、注意書きを添付
- ブランド紹介の下にモデルカード各 4 つ（VFF: V-Run / V-Train 2.0 / V-Soul / Trailope、Vivo: Primus Lite IV / Motus Strength II / Gobi III Sneaker Leather / Primus Trail FG 3.5）。定価は在庫シート・ラインナップデータの値、ポップアップ価格は `[TODO]`
- 「Start slowly」4 週間の慣らしガイド、FAQ（アコーディオン、FAQPage の JSON-LD 付き。店舗ポリシーの回答は `[TODO]`）
- アクセスにフロアマップ枠（`images/floor-map-rama3.png` はプレースホルダー、タップで拡大）
- 「Add to calendar」は `popup-terminal21-rama3.ics` の静的ファイルに変更
- ページ内の `[TODO]` は黄色のラベルで表示されるので、本番前にすべて差し替えること

## v2 の構成

- ヒーロー（PC は 2 ブランドの写真を左右に並べ、左半分に収まる巨大タイポが行ごとに立ち上がる。マウス追従のパララックス付き。スマホは上に FiveFingers、見出し、下に Vivobarefoot の縦積みで、写真はシューズが見える位置で切り抜き）
- ヒーロー下の会期・時間・フロアは、文字が縦にロールして確定する表示（出発案内板のイメージ）
- スクロール速度で傾くマーキー、ブランド 2 セクション（写真はタップで拡大）、比較表、ブースでできること
- アクセスは会場ロゴ + 住所・会期・時間・交通の一覧 + Google Maps 埋め込み。「Add to calendar」で `.ics` をダウンロード
- PC はマグネットボタン、スマホは下部の固定バーから「Getting there」へ。ヘッダーはスクロールし始めるとすぐ半透明の明るい背景になる
- フォントは Oswald（見出し）/ DM Serif Display（タグライン・サブコピー）/ Noto Sans Thai（本文・タイ語）の 3 種類
- `prefers-reduced-motion` ではすべての動きを止めます

## 文言の編集

表示する文言はすべて `index.html` 末尾の `I18N` オブジェクト（`en` / `th`）にあります。
HTML 側は同じキーの `data-i18n` 属性を持っています。タイ語環境のブラウザでは自動でタイ語になり、ナビの EN / ไทย で切り替えられます。

会期・時間・会場を変えるときは `I18N` の `hero.*` / `strip.*` / `access.*` と、`<head>` の `<title>` / `description` / `og:*` を合わせて直してください。

## 地図

Google Maps の埋め込み（API キー不要）を使っています。Asok 版にあったフロアマップ（ブース位置図）は Rama 3 の図面がまだないため入れていません。
図面ができたら `images/floor-map.png` を置き、ヒーローの CTA と地図の枠を Asok 版と同じライトボックスに戻してください。

## デプロイ

Vercel プロジェクト `terminal21-rama3-lp`（このリポジトリに接続、**Root Directory: `terminal21-rama3-lp`**、Framework Preset: Other）。
`main` に push すると本番 https://terminal21-rama3-lp.vercel.app/ に自動デプロイされます。
