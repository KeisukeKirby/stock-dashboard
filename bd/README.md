# BD オンボーディング・ダッシュボード（`bd/`）

新しく入社した Business Development 担当者が「ブランド・数字・取引先・ルール」を一箇所で確認するための社内ダッシュボード。
静的 HTML + JSON（ビルド不要）。Vercel チーム `barefootinc-th` のプロジェクト **`bd-dashboard`**（Root Directory = `bd`）として配信中。

- 本番 URL: https://bd-dashboard-mu.vercel.app （別名 https://bd-dashboard-barefootinc-th.vercel.app ）
- 現在の本番はブランチ `claude/laughing-pascal-1qck8z` の最新コミット。main に取り込んだあとは main が本番になる（Vercel の Production Branch 設定を確認）
- チーム既定で Vercel Authentication（ssoProtection）が有効。Vercel チームにログインしていない人が開けない場合は、Settings → Deployment Protection で Vercel Authentication を無効にするか Password Protection に切り替える

- 画面: ホーム／ブランド × 5（VFF・Vivobarefoot・OLENO・Coolcore・AQOS）／ガイドライン（VFF・Vivo）／月次売上／店舗一覧／委託販売／取引条件／SNS／未入力一覧
- 数字・文には出典バッジ `src` が付く（マウスを乗せると出典）。出典のない数字は載せていない。埋まらなかった項目は「未入力」と表示し、「未入力一覧」（情報リクエスト）に集約。
- 社外秘。全ページ `noindex`。取引条件・委託販売実績も含めて全員が見られる（GM 判断 2026-11-09）。アクセス制限が必要になったら Vercel の Deployment Protection（Password / Vercel Authentication）を使う。

## 構成

```
bd/
  vercel.json              # outputDirectory=public, cleanUrls, no-cache, X-Robots-Tag: noindex
  public/                  # 静的配信
    index.html  style.css  app.js
    data/
      company.json         # 会社概要・課題・注意事項・30日チェックリスト・社内ツール（pptx S2-S4, S12-S14）
      brands.json          # 5 ブランドの概要（pptx S4-S10 + Drive）
      stores.json          # 店舗・チャネル・卸先・委託先（pptx S11 + 会社プレゼン + README + 売上データ）
      guidelines.json      # VFF の要点・カラー・フォント・ローカルルール、Vivo は章構成と原本リンク
      sales_monthly.json   # 月次売上（scripts/bd/build_sales.py が生成）
      sales_record_sum.json# 経理ベース 店舗×月（Sales Record_Coollabo Shop の SUM シート）
      sns.json             # SNS アカウント（判明分のみ）
      requests.json        # 情報リクエスト（未入力一覧）
      terms.json           # 取引条件（観測値・全件掲載）
      consignment.json     # 委託販売実績（足数）
      products/{vff,vivo,oleno,coolcore,aqos}.json
    img/vivo/*.jpg         # Vivo 21 モデルの画像（t21-vivo-lineup から 1 モデル 1 枚）
scripts/bd/
  build_sales.py           # 2 つの販売ダッシュボードの JSON → sales_monthly.json
  build_vivo.py            # t21-vivo-lineup/data.json → products/vivo.json
  build_products.py        # イベント持出リストの抽出結果 → products/{vff,oleno,coolcore}.json
```

## Vercel の設定（初回）

1. 作成済み（2026-11-09、プロジェクト `bd-dashboard`、Root Directory = `bd`、Framework = Other、Output Directory = `public`）。作り直す場合は Add New Project → `KeisukeKirby/stock-dashboard` → Root Directory `bd`。
2. 環境変数は不要。
3. Settings → Git → Production Branch は `main`（このリポジトリの他プロジェクトと同じ運用）。
4. アクセス制限が必要なら Settings → Deployment Protection（Password Protection / Vercel Authentication）を有効にする。

## データの更新手順

### 月次売上（`public/data/sales_monthly.json`）
販売ダッシュボードの集計 JSON を再利用する（顧客情報は含まれない）。元のダッシュボードが更新されたら再実行。

```bash
git clone --depth 1 https://github.com/KeisukeKirby/sales-1st-half-26-dashboard /tmp/bft
git clone --depth 1 https://github.com/KeisukeKirby/edv-sales-dashboard /tmp/edv
python scripts/bd/build_sales.py /tmp/bft/data/dashboard_data.json /tmp/edv/data/dashboard_data.json
```

### 経理ベースの店舗×月（`public/data/sales_record_sum.json`）
Drive `Sales Record_Coollabo Shop 2026.xlsx` / `2025.xlsx`（acc.edvcoltd@）の `SUM` シートを読む。xlsx を `data/bd_raw/` にダウンロードし、`scripts/bd/` に抽出スクリプトを置いて JSON を作る（今回の抽出は Drive 連携の Claude で行った。元の xlsx はタイ語見出し・結合セル多数のため、openpyxl で読むときは SUM シートのブロック（EDV「Coollabo Shop N Branches」と BFT「Barefootinc (Thailand) – Sales 20xx」）を分けて処理する）。

### 商品（`public/data/products/`）
- Vivo: `python scripts/bd/build_vivo.py /path/to/t21-vivo-lineup/data.json`（画像は同リポジトリ `img/` から `public/img/vivo/` に `*_side.jpg` を 1 モデル 1 枚コピー）
- VFF / OLENO / Coolcore: Drive `BAREFOOTINC THAILAND/Store・Event/List goods for event_2026/*.xlsx` から SKU・売価を抽出した `price_list_from_events.json` と `coolcore_products.json` を用意し `python scripts/bd/build_products.py <抽出フォルダ>`
- AQOS: 資料がないため `aqos.json` は手書きのプレースホルダー

### 委託販売（`public/data/consignment.json`）
Drive `Stock VFF Consignment.xlsx`（acc.bftcoltd@）。委託先ごとに 1 シート（Code / 納品伝票列 / 月別 Sale / Balance）。数量のみで金額はない。

### 取引条件（`public/data/terms.json`）
正式な条件表は存在しない。Sales Record の百貨店シートの GP 率、Crimson 発注シートの WSP/RRP 比、pptx の記載を「観測値」として手書き。GM から正式な条件が来たら `items` を書き換える。

### 情報リクエスト（`public/data/requests.json`）
回答が来たら該当 JSON を直し、`requests.json` の該当行を削除する。ヘッダーとホームの「未入力の項目数」は自動で減る。

### 反映
```bash
git add bd scripts/bd && git commit -m "BD ダッシュボード更新" && git push   # main に入ると Vercel が再デプロイ
```

## ソース一覧（フェーズ 1 の調査結果）

| ソース | 使ったセクション | 備考 |
|---|---|---|
| BD オンボーディング資料 pptx（14 枚、2026-10） | ホーム・ブランド・店舗・注意事項 | 一次情報。他ソースと食い違うときはこちらを優先 |
| `README.md`（このリポジトリ） | 店舗・Zort 倉庫名 | 店舗名の表記ゆれの対応表 |
| GitHub `sales-1st-half-26-dashboard` / `edv-sales-dashboard` | 月次売上 | 公開 JSON。BFT 2026 1〜10 月（2025 1〜7 月は全体のみ）、EDV 2026 1〜10 月（税抜） |
| GitHub `t21-vivo-lineup` | Vivo 商品 | 21 モデルの定価・色・サイズ・日本語説明・画像 |
| GitHub `dashboard-hub` | ホーム（社内ツール） | ツール一覧 |
| Drive `Sales Record_Coollabo Shop 2025/2026.xlsx` | 月次売上（経理ベース）・取引条件（GP 率） | 税込、店舗別、百貨店精算 |
| Drive `Sale 2026`（Sheet） | SNS（Shopee/Lazada 店舗の存在） | 顧客 PII を含むため数字は未使用 |
| Drive `Stock VFF Consignment.xlsx` | 委託販売 | 15 委託先、2023/8〜2026/10、数量のみ |
| Drive `Barefootinc_Vivo_TH`（Crimson） | 取引条件（WSP/RRP 比） | 売上ではなく発注シート |
| Drive `Event.*.xlsx`（Store・Event/List goods for event_2026） | VFF / OLENO / Coolcore 商品・売価、イベント一覧 | 10 本。店舗別数量・割引は使わない |
| Drive `Marketing Guidelines_Vibram FiveFingers.pdf`（EN/JP/TH）、`Logo Guidelines_Vibram FiveFingers.pdf` | ガイドライン VFF | 要点・カラー・フォント |
| Drive Vibram ブランド取り扱い会議 要旨（Doc） | ガイドライン VFF・ホーム | モノブランド店禁止の経緯 |
| Drive `Product Training Vivobarefoot.pdf`、`Vivo Brand Guidelines` フォルダ、`Barefootinc` フォルダ | ブランド Vivo | ガイドライン本体は 430MB で要点未抽出 |
| Drive `Barefootinc Thailand_Presetation.pdf`（Marketing/1.Company Profile） | 店舗・卸先・SNS ハンドル | 2026-05 時点 |
| Drive `Oleno Thailand 提供画像`、`LOA of OLENO` | ブランド OLENO | LOA はマレーシア向け |
| OLENO カタログ https://oleno-catalog.vercel.app/ | — | この環境から到達できず（情報リクエスト A-5） |

読まなかったもの: `VFF/Password info`、`Marketing/5.Account & Password`、受注明細の顧客列。

## ローカルで確認

```bash
cd bd/public && python3 -m http.server 8000     # http://localhost:8000
```
