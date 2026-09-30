# 店舗・オフィス在庫ダッシュボード

`Store_Stock_*.xlsx`（VFF Shoes Stock シート）を、そのままの表構成でブラウザで見られるダッシュボードにしたものです。

画面の構成:

- （詳細タブ）**サマリー**: 総在庫数・SKU 数・全店在庫切れ・残りわずか（在庫切れ／残りわずかはクリックで一覧を絞り込み）
- （詳細タブ）**グラフ**: 店舗別（クリックでその店舗の在庫が多い順に並び替え）、モデル別（クリックでそのモデルに絞り込み）
- **在庫一覧タブ**: Excel と同じ表を全行表示（枠内スクロールなし・画面幅に合わせて自動縮小）。検索・絞り込み・並び替え、表示中の行を CSV で保存
- **見出しの ▼ フィルター**: Excel のオートフィルターと同じく、Code / Model / Color / Size は複数の値をチェックで選択、各 Quantity は「1 以上」「0」「範囲指定」で絞り込み。かかっているフィルターは表の上に一覧表示（× で個別解除）。上部のモデル・カラー・サイズも同じ複数選択のフィルター（どちらから選んでも同じ条件）
- **範囲選択で集計**: 表のマスをドラッグすると、選んだ範囲のデータの個数・行数を画面下に表示し、数量のマスがあれば合計・平均・数値の個数も表示（Excel のステータスバーと同じ）。Shift+クリックで範囲を広げる、Ctrl+C でタブ区切りコピー、Esc で解除
- **言語切り替え**: 右上のボタンで 日本語 / English / ไทย（選択はブラウザに記憶。初回は端末の言語設定で自動選択、該当なしは英語）。翻訳は public/i18n.js。在庫表の中は Excel と同じ英語のまま
- **Excel で出力**: Return の入力を反映した表示中の行を、元の Excel と同じ書式の .xlsx で出力（2 枚目のシート「Returns」に入力した返品の一覧）。ExcelJS を public/vendor に同梱
- **詳細タブ**: サマリーとグラフ（クリックすると条件を反映して在庫一覧タブへ移動）

在庫一覧の表は Excel の書式をそのまま再現しています。

- 見出し：紺 (#1F4E78)／Return 見出しは金 (#BF8F00)、白太字・中央揃え
- Return 列：薄黄 (#FFF2CC)・青字、Total 列は太字、Total 行は薄青 (#D9E1F2)
- 表示形式 `#,##0;(#,##0);-`（0 は「-」、空セルは空欄）
- 列幅・行高は Excel と同じ、1〜4 行目は固定（ウィンドウ枠の固定 A5 と同じ）
- 絞り込み中の Total 行は表示中の行の合計
- Office 列は一番左で、Return 欄なし
- 各店舗の黄色の Return 欄に返品数を入力でき、その数だけ店舗の Quantity が減り Office の Quantity が増える（Store Total は減り、Company Total は変わらない）。入力後「保存」ボタン（Ctrl+S）で保存するとウィンドウを閉じても残る（ブラウザの localStorage に基準日ごとに保存。他の人・他の端末とは共有されない）。未保存のまま閉じようとすると確認が出る

## 構成

```
public/          # Vercel が配信する静的ファイル（ビルド不要）
  index.html
  style.css
  app.js
  stock.json     # Excel から生成したデータ
  source.xlsx    # 店舗在庫の Excel（ダウンロード用、convert.py がコピー）
  source_office.xlsx  # オフィス在庫の Excel（同上）
scripts/convert.py  # Excel → public/stock.json 変換
data/            # 元の Excel ファイル
vercel.json
```

## データの更新手順

1. 新しい Excel を `data/` に置く（Excel で一度保存して、数式の計算結果が入った状態にしてください）
2. 変換を実行（2 つ目にオフィス在庫の Excel を渡すと「Office」列が追加されます）

   ```bash
   pip install openpyxl
   python scripts/convert.py data/Store_Stock_XXXXXX.xlsx data/VFF_Stock_XX-XX-XX.xlsx [data/配分表.xlsx] [data/import_X.XX_move_to_branch.xlsx]
   ```

   オフィス在庫は 1 枚目のシートの B 列（商品名・カラー）、C 列（サイズ）、BN 列（Stock > Office）を読み、
   モデル・カラー・サイズで店舗の行と照合します。店舗にない商品は、オフィス在庫がある場合だけ行を追加します。Code は同じモデル・カラーの商品コードがあればサイズ部分を差し替えて補完し、分からないもの（新しいモデル・カラー）は空欄のままにします。
   右端は Store Total（店舗のみの合計、Return あり）と Company Total（店舗 + オフィス、Return なし）です。Office 列は一番左に並べます。

   3 つ目に新入荷の店舗配分表（「配分表」シートのある Excel）を渡すと、各店舗の配分数を Office から各店舗へ移して反映します
   （新入荷はオフィス在庫に含まれている前提。Company Total は変わりません）。

   4 つ目に店舗移動表（import_*_move_to_branch.xlsx）を渡すと、その「Asok」列の数を **Event Asok** 列として追加し、Office から移します
   （Event Asok は Store Total に含めず、Company Total に含めます）。移動表のコードで空欄の Code も補完します。
   移動表の店舗列（Paradise / K-village / Ladprao 3F = Central LP / Chidlom = Central CL / Siamdis）も反映し、移動表にある SKU は配分表の配分を取り消して移動表の数を正とします（実際に店舗へ移動した数）。

3. `git add . && git commit -m "在庫データ更新" && git push` — Vercel が自動で再デプロイします

## ローカルで確認

```bash
cd public && python3 -m http.server 8000
# http://localhost:8000
```

## 返品入力の共有（全員が同じ画面になる設定）

返品（Return）の入力は `api/returns.js`（Vercel Function）を通して **Upstash Redis** に保存され、同じ URL を開いている全員に共有されます（15 秒ごと・画面に戻ったときに自動更新。保存時は変更したマスだけを送るので、別の人が別のマスを同時に入力しても消えません）。

初回だけ Vercel で保存先を用意してください。

1. Vercel のプロジェクト画面 → **Storage** → **Create Database**（または Marketplace）→ **Upstash for Redis** を作成
2. 作成したデータベースを **stock-dashboard プロジェクトに接続**（環境変数 `KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動で追加されます。`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` でも可）
3. **Redeploy**（再デプロイ）

設定されていない場合（ローカルで開いたときなど）は、これまでどおりブラウザの localStorage に保存され、画面に「このブラウザにのみ保存」と表示されます。

注意: 保存 API に認証はありません。URL を知っている人は誰でも返品を入力できます。

## イベント (Event Asok) の残り在庫

`scripts/event_stock.py` で「スタート在庫（EVENT_*.xlsx の「Event Asoke」列がある全シートの VFF シューズ）− 締め日までの販売数」を計算し、`data/event_asok_stock.json` に保存します。
convert.py の 5 つ目の引数に渡すと Event Asok 列に加算されます（Office は動かしません）。

```bash
python scripts/event_stock.py data/EVENT_SeP2026.xlsx 2026-09-25 data/event_orders/order_detail_202609300944_275z.xlsx
python scripts/convert.py data/Store_Stock_092526.xlsx data/VFF_Stock_25-09-26.xlsx \
    data/New_Arrival_Allocation.xlsx data/import_9.26_move_to_branch.xlsx data/event_asok_stock.json
```

POS の注文明細（data/event_orders/）は顧客情報を含むため Git には入れていません。注文明細は全期間・全系列（RC-12 / RC-15 / RB）を含む 1 ファイルを使います（複数ファイルを渡すと重複して数えるので注意）。

## 月平均販売・在庫月数

各店舗（K Village / Central CL / Siam Discovery / Paradise Park / Central LP）、Office（オンライン販売）、Store Total、Company Total（オンライン + イベント + 全店舗）の在庫数の左に「月平均販売」、右に「在庫月数（在庫 ÷ 月平均販売）」を表示します（フィルター欄のチェックで表示／非表示）。

`scripts/sales_rate.py` が 2026年1〜8月の VFF シューズの販売から SKU×店舗（店頭販売）・Online・Event の月平均販売足数を計算し `data/sales_rate.json` に保存、convert.py の 6 つ目の引数で在庫データに付けます。

```bash
python scripts/sales_rate.py        # data/sales_raw/ の販売明細を読む（顧客情報を含むため Git 管理外）
python scripts/convert.py data/Store_Stock_092526.xlsx data/VFF_Stock_25-09-26.xlsx data/New_Arrival_Allocation.xlsx \
    data/import_9.26_move_to_branch.xlsx data/event_asok_stock.json data/sales_rate.json data/returns_import.json
```

| 店舗 | 元データ | 対象月 |
|---|---|---|
| K Village / Central LP | EDV 受注明細 order_detail_*_7duk（倉庫 Kvillage / Coollabo Cen LP 3F） | 1〜8月 |
| Paradise Park | Barefoot 受注明細 order_detail_*_dint（倉庫 Paradise Park、店頭レジのみ） | 4〜8月（4月開店） |
| Central CL | BFT_Central_Total_Department（1〜6月・7月の Export、8月は Jul-Aug ファイルの Central シート。CHIDLOM のみ） | 1〜8月 |
| Siam Discovery | Sales_Siam_Dis（商品名から SKU を判定） | 1〜8月 |
| Office（Online） | dint のオンライン注文（Shopee / Lazada / LINE / Facebook / Instagram / Website、チャネル空欄の TX 注文、倉庫 Online。店舗から発送したものも含む） | 1〜8月（8ヶ月で割る） |
| Event（Company Total のみ） | 両受注明細の倉庫 Event 1 / 2 と CART Central LP のイベント分 | 1〜8月（8ヶ月で割る） |

照合: K Village・Central LP は EDV 販売ダッシュボードと SKU×月で一致。Paradise Park は販売ダッシュボードと 4・6・7・8 月一致（5 月は 2 台目レジ RC-14 系の 4 足がダッシュボード側に未計上）。Central CL は 1〜8 月一致。Online は販売ダッシュボード 1,508 足に対し 1,518 足（月ごとに ±7 以内）、Event は 587 + EDV 227 足（販売ダッシュボード 589、EDV ダッシュボード 227）。Siam Discovery は 1〜6 月一致、7 月は照合できない 1 足（LOT เก่า 表記）、8 月は今回のファイルが 6 足多い。

## 返品の受領（輸送中 → Office 在庫）

- Return 欄に入力した返品は、その店舗の在庫から引かれ「輸送中」になります（Office にはまだ足さない。Company Total には含む）。
- 商品がオフィスに届いたら「返品受領」ボタン → 店舗を選ぶ → モデルごとの明細（カラー・サイズ・数量）にチェック → 「受領完了」で Office の在庫に加算します。誤って受領した分は「受領済み」の一覧から「取り消し」で輸送中に戻せます。
- 共有データ: 輸送中 = Redis ハッシュ `returns:<基準日>`、受領済み = `returns:<基準日>:received`（api/returns.js の `receive` / `unreceive`）。

### Excel に直接入力された Return の取り込み

```bash
python scripts/import_returns.py data/VFF_Stock_with_returns_20260929_1620.xlsx   # -> data/returns_import.json
python scripts/convert.py ... data/sales_rate.json data/returns_import.json         # 7 つ目の引数 → stock.json の returnsSeed
```

ダッシュボードを最初に開いたときに「輸送中」として 1 度だけ共有データに登録します（同じ id では再登録しない。既に入力があるマスは上書きしない）。
現在の取り込み: VFF_Stock_with_returns_20260929_1620.xlsx の 78 件・102 足（K Village 33 / Central CL 18 / Siam Discovery 7 / Central LP 44）。

## イベント売上実績（event.html）

イベント会場の POS 注文明細から、日別売上・モデル別などの売上実績をまとめるページです（在庫ダッシュボード右上の「イベント売上 →」から開けます）。

### 構成（データの流れ）

```
data/event_orders/order_detail_*.xlsx    POS の注文明細（顧客情報を含むので Git に入れない）
        │  python scripts/event_sales.py
        │    - 注文番号・日付・状態・倉庫・支払方法を注文の 1 行目から下の行へ引き継ぐ
        │    - 取消 (Voided)・Sell 以外・対象倉庫以外・会期外を除く
        │    - 商品名をモデル / カラー / サイズに分け、商品コードの親コード (VV0004 など) を付ける
        │    - 顧客名・電話・住所などは捨てる
        ▼
public/events/<id>.json                  販売明細（1 行 = 商品 1 行：日付・決済時刻・注文番号・商品・数量・定価・売上）
public/events/index.json                 イベント一覧（複数イベントはページ右上で切り替え）
        │  ブラウザで集計（ビルド不要）
        ▼
public/event.html + event.js + event.css
```

画面:

- **KPI**: 売上（税込）・注文数（客数）・販売点数・客単価・1日平均売上（会期の日数で割る）・平均値引率（定価合計に対する値引き）
- **日別売上**: 売上 / 注文数 / 点数 / 累計売上 を切り替え。点線は 1 日平均（累計では目標）。棒をクリックでその日に絞り込み、土日は太字
- **カテゴリ別**（クリックで絞り込み）・**曜日別 1 日平均**・**時間帯別**（決済時刻）・**支払方法別**
- **モデル別売上**: 売上順 / 点数順。行をクリックでカラー別・サイズ別の内訳。CSV で保存
- **日別明細**: 注文数・点数・売上・客単価・累計。CSV で保存
- 絞り込み（カテゴリ・期間・日）はすべてのグラフと表に反映。日本語 / English / ไทย、ライト / ダーク（在庫ダッシュボードと共通の設定）

### データの更新手順（会期中は毎日でも可）

1. POS から注文明細（全期間）を Excel で出力し `data/event_orders/` に置く
2. 変換（同じ id なら上書き）

   ```bash
   python scripts/event_sales.py kvillage-2026-09 "K Village Event" \
       data/event_orders/order_detail_202609301507_mvtn.xlsx \
       --venue "K Village" --warehouse "Event 1" --from 2026-09-07 --to 2026-09-30 [--target 400000]
   ```

   `--warehouse` は POS の倉庫/支店（空文字で全件）、`--from` / `--to` は会期（販売のない日も 0 としてグラフに出す）、`--target` は売上目標（累計グラフに表示）。
   実行結果の「sales … (order Amount …)」で、明細の合計と注文金額の合計が一致しているか確認できます（不一致ならページ下部にも表示）。
3. `git add public/events && git commit && git push`

新しいイベントは別の id で実行すると一覧に追加されます。

現在のデータ: K Village Event（2026/9/7〜9/30、倉庫 Event 1）155 明細・103 注文・157 点・売上 ฿373,405.80（注文金額の合計・Excel の Daily sales 合計と一致）。
注文明細 34 件は決済時刻・支払方法が空欄のため、時間帯別には含めず、支払方法は「記録なし」として表示しています。
