# Barefootinc Warehouse Sale LP

オフィス（87/34 Modern Town, Sukhumvit 63）で開催する Warehouse Sale のランディングページです。
Terminal 21 Rama 3 版（`terminal21-rama3-lp`）と同じ CSS / JS / EN-TH 切り替えの仕組みを流用し、前半をセール用に差し替えています。

- **会期:** 2026 年 11 月 19 日（木）– 21 日（土）
- **時間:** 10:00 – 18:00
- **会場:** Barefootinc (Thailand) office, 87/34 Modern Town, Sukhumvit 63 (Ekkamai), Klongtan-nua, Wattana, Bangkok 10110

## 構成

ビルド不要の静的ページです。

| ファイル | 内容 |
| --- | --- |
| `index.html` | ページ本体（CSS・JS・EN/TH の文言をすべて含む） |
| `images/sale/tier-*.jpg` | 割引ティア 5 枚の画像枠（50 / 40 / 30 / 20 / socks）。**現在は仮画像**。本番画像に差し替える |
| `images/hero-warehouse.jpg` | トップ画像。**現在は Rama 3 版のヒーロー写真を仮置き**。差し替える |
| `images/logo-*.png` | Barefootinc / Vibram FiveFingers のロゴ（Rama 3 版から流用） |
| `images/why/`, `images/models/` | Why barefoot? の背景と「最大のセール」セクションの Scramkey 写真（流用） |
| `og-image.jpg` | 1200×630 の SNS シェア用画像（仮） |
| `vercel.json` | このフォルダをそのまま配信する設定（Rama 3 版と同じ） |

## セクション

1. ナビ（ロゴ・リンク・ไทย/EN・Getting there）
2. ヒーロー: トップ画像 1 枚 + 「WAREHOUSE SALE / Up to 50% off」+ 日付・時間・場所のロール表示
3. **Our biggest sale ever**: VFF ロゴ + コピー + 4 つの数字（50% off / 20+ models / 3 days / socks 20% off）
4. **Discount lineup**: 50 / 40 / 30 / 20% とソックスの 5 ティア。左が画像（タップで拡大）、右にモデル名のチップ（テキストはサブ）
5. Why barefoot?（Rama 3 版と同じ）
6. On the day（旧 At the booth。来場の 3 ステップ + Start slowly の注意書き）
7. FAQ（在庫・サイズ・ソックス・返品交換不可・支払い・オンライン不可）
8. Getting there（オフィス住所・会期・時間・BTS Ekkamai・車・Google Maps）
9. ロゴ付きフッター + SNS リンク + LINE ボタン

## 画像の差し替え

`images/sale/tier-50.jpg` … `tier-socks.jpg` を本番画像に置き換えてください（推奨 1600×1000、16:10。別比率でも `object-fit: cover` で収まります）。
`vercel.json` で `/images/` を 1 日キャッシュしているため、本番では**新しいファイル名**にして `index.html` の `src` / `data-lb-src` も直すのが安全です。

## 文言の編集

表示する文言はすべて `index.html` 末尾の `I18N` オブジェクト（`en` / `th`）にあります。デフォルトはタイ語です。
モデル一覧は `tier.l50` / `tier.l40` / `tier.l30` / `tier.l20` / `tier.lsocks`（`<span>` のチップ HTML）にあります。
会期・会場を変えるときは `hero.*` / `board.*` / `access.*` / `mbar.*` と `<head>` の `<title>` / `description` / `og:*` / JSON-LD を合わせて直してください。

## 要確認（本番前）

- 駐車場の案内（現在は「駐車スペースは限られているので公共交通・タクシー推奨」と記載）
- BTS Ekkamai からの行き方の表現（バイクタクシー推奨と記載）
- 郵便番号 10110（Klongtan-nua, Wattana として記載）
- 本番 URL（`<head>` の canonical / og:url は `https://warehouse-sale-lp.vercel.app/` を仮置き）

## デプロイ

Rama 3 版と同様、リポジトリにこのフォルダを追加し、Vercel で新規プロジェクト（Root Directory: `warehouse-sale-lp`、Framework Preset: Other）として接続すれば、push で自動デプロイされます。
