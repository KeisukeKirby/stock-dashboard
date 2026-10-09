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

## v2 の構成（空港の「出発案内」をモチーフにしたデザイン）

- ローダー（カウントアップ）→ ヒーロー（巨大タイポの行マスクリビール、写真のケンバーンズ、マウスパララックス）
- 出発案内板風のスプリットフラップ表示（会期・時間・ゲート = G Floor）
- スクロール速度で傾くマーキー、開店までのカウントダウン（会期中は閉店／開店までの時間に切り替わる）、`.ics` のカレンダー追加
- ブランド 2 セクション（クリップリビール、パララックス、写真はタップでズーム）、比較表、ブースでできること
- アクセスはボーディングパス型のカード（PC ではホバーで 3D チルト）+ Google Maps 埋め込み
- PC はカスタムカーソルとマグネットボタン、スマホは下部の固定バーから「Boarding pass」へ
- `prefers-reduced-motion` ではすべての動きを止め、ローダーも出しません

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
