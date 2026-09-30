"""イベントの売上実績を集計用 JSON に変換する (POS 注文明細 → public/events/<id>.json)。

  データの流れ:
    data/event_orders/order_detail_*.xlsx   POS の注文明細 (顧客情報を含むので Git に入れない)
      → scripts/event_sales.py               注文単位の項目を引き継ぎ、取消・対象外倉庫を除き、顧客情報を捨てる
      → public/events/<id>.json              明細 1 行 = 販売 1 行 (日付・時刻・注文番号・商品・数量・金額のみ)
      → public/events/index.json             イベントの一覧 (event.html の切り替えメニュー)
      → public/event.html + event.js         日別売上・モデル別・カテゴリ別・サイズ別などをブラウザで集計して表示

使い方:
    python scripts/event_sales.py kvillage-2026-09 "K Village Event (Sep 2026)" \\
        data/event_orders/order_detail_202609301507_mvtn.xlsx [--warehouse "Event 1"] [--from 2026-09-07] [--to 2026-09-30]

  - 同じ id で再実行すると上書き (期間中に新しい注文明細を出力し直して毎日更新する想定)
  - 注文明細は全期間を含む 1 ファイルを渡す (複数ファイルを渡すと同じ注文番号の行は 1 回だけ数える)
  - 金額は税込。Total amount (= 数量 × 単価 − 値引き) を売上とし、注文の Amount の合計と一致するか確認する
"""
import argparse
import collections
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "public" / "events"

# 商品名 "Vivo Primus Trail FG 3.5(W38, Insignia Blue)" → モデル "Vivo Primus Trail FG 3.5"
# (括弧が 2 つある "TBO 072120038 (Racing Run Five-Toe Socks)(L, C51)" は最後の括弧をバリエーションとする)
NAME_RE = re.compile(r"^(.*?)\s*\(([^()]*)\)\s*$")
# サイズらしい値 (W38 / M44 / XS / L / 27-29 / 29 など)
SIZE_RE = re.compile(r"^(?:[MW]\d{2}(?:\.5)?|XXS|XS|S|M|L|XL|XXL|\d{2}(?:-\d{2})?|Free|FREE|F)$")
# 商品コード "VV0006(ISN/BL,W38)" → 親コード "VV0006"
CODE_RE = re.compile(r"^([A-Z]+\d+)")


def num(v):
    if v is None or v == "":
        return 0.0
    return float(v)


def parse_date(v):
    if isinstance(v, datetime.datetime):
        return v.date()
    if isinstance(v, str) and v.strip():
        d, m, y = v.split()[0].split("/")
        return datetime.date(int(y), int(m), int(d))
    return None


def parse_time(v):
    """Payment date "29/9/2026 14:42" → "14:42" (なければ None)"""
    if isinstance(v, datetime.datetime):
        return v.strftime("%H:%M")
    if isinstance(v, str) and " " in v.strip():
        hm = v.strip().split()[1]
        h, m = hm.split(":")[:2]
        return f"{int(h):02d}:{int(m):02d}"
    return None


def split_name(name):
    """商品名 → (モデル, カラー, サイズ)。括弧内の値のうちサイズらしいものをサイズ、残りをカラーとする。"""
    m = NAME_RE.match(name or "")
    if not m:
        return (name or "").strip(), "", ""
    model, inner = m.group(1).strip(), m.group(2)
    parts = [p.strip() for p in inner.split(",") if p.strip()]
    sizes = [p for p in parts if SIZE_RE.match(p)]
    colors = [p for p in parts if not SIZE_RE.match(p)]
    return model, ", ".join(colors), sizes[0] if sizes else ""


def read_orders(files, warehouse, d_from, d_to):
    lines, skipped = [], collections.Counter()
    order_amount, prev_orders = {}, set()  # prev_orders: 前のファイルで読んだ注文 (重複して数えない)
    for f in files:
        file_orders = set()
        ws = openpyxl.load_workbook(f, data_only=True, read_only=True).worksheets[0]
        rows = list(ws.iter_rows(values_only=True))
        head = [str(h).strip() if h else "" for h in rows[1]]

        def col(n):
            return head.index(n) if n in head else None  # "Date" は最初の列 (右端の日別集計欄ではない)

        c = {k: col(k) for k in ("Sales order No.", "Date", "Status", "Warehouse/Branch", "Sales channel",
                                  "Payment channel", "Payment date", "Amount", "Product code", "Product name",
                                  "Quantity", "Unit price", "Unit discount", "Total amount", "Category", "Type")}
        cur = None
        for r in rows[2:]:
            if c["Sales order No."] is not None and r[c["Sales order No."]]:
                no = str(r[c["Sales order No."]]).strip()
                cur = {
                    "no": no,
                    "date": parse_date(r[c["Date"]]),
                    "time": parse_time(r[c["Payment date"]]) if c["Payment date"] is not None else None,
                    "status": r[c["Status"]] if c["Status"] is not None else None,
                    "wh": r[c["Warehouse/Branch"]] if c["Warehouse/Branch"] is not None else None,
                    "type": r[c["Type"]] if c["Type"] is not None else None,
                    "pay": (r[c["Payment channel"]] or "").strip() if c["Payment channel"] is not None else "",
                    "amount": num(r[c["Amount"]]) if c["Amount"] is not None else None,
                }
                if cur["amount"] is not None and (cur["date"] and no not in order_amount):
                    order_amount[no] = cur["amount"]
            if cur is None:
                continue
            code = r[c["Product code"]]
            if not code:
                continue
            if cur["status"] == "Voided":
                skipped["voided"] += 1
                continue
            if cur["type"] not in (None, "Sell"):
                skipped[f"type {cur['type']}"] += 1
                continue
            if warehouse and cur["wh"] not in (None, warehouse):
                skipped[f"warehouse {cur['wh']}"] += 1
                continue
            if cur["date"] is None or (d_from and cur["date"] < d_from) or (d_to and cur["date"] > d_to):
                skipped["out of period"] += 1
                continue
            if cur["no"] in prev_orders:
                skipped["duplicate"] += 1
                continue
            file_orders.add(cur["no"])
            code = str(code).strip()
            name = str(r[c["Product name"]] or "").strip()
            qty = num(r[c["Quantity"]])
            price = num(r[c["Unit price"]])
            disc = num(r[c["Unit discount"]])
            total = num(r[c["Total amount"]])
            model, color, size = split_name(name)
            m = CODE_RE.match(code)
            lines.append({
                "d": cur["date"].isoformat(),
                "t": cur["time"],
                "o": cur["no"],
                "c": code,
                "p": m.group(1) if m else code,
                "n": name,
                "m": model,
                "col": color,
                "s": size,
                "cat": str(r[c["Category"]] or "").strip() if c["Category"] is not None else "",
                "q": qty,
                "list": round(price * qty, 2),        # 定価 × 数量
                "net": round(total, 2),               # 売上 (税込)
                "pay": cur["pay"],
            })
        prev_orders |= file_orders
    return lines, order_amount, skipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("id", help="イベント ID (ファイル名、例: kvillage-2026-09)")
    ap.add_argument("name", help="画面に出すイベント名")
    ap.add_argument("files", nargs="+", help="POS 注文明細 (order_detail_*.xlsx)")
    ap.add_argument("--warehouse", default="Event 1", help="対象の倉庫/支店 (空文字で全件)")
    ap.add_argument("--from", dest="d_from", help="開始日 YYYY-MM-DD (会期)")
    ap.add_argument("--to", dest="d_to", help="終了日 YYYY-MM-DD (会期)")
    ap.add_argument("--venue", default="", help="会場名 (任意)")
    ap.add_argument("--target", type=float, default=0, help="売上目標 (税込、任意)")
    a = ap.parse_args()

    d_from = datetime.date.fromisoformat(a.d_from) if a.d_from else None
    d_to = datetime.date.fromisoformat(a.d_to) if a.d_to else None
    lines, order_amount, skipped = read_orders(a.files, a.warehouse, d_from, d_to)
    if not lines:
        sys.exit("対象の販売行がありません (倉庫名・期間を確認してください)")
    lines.sort(key=lambda l: (l["d"], l["t"] or "", l["o"]))

    dates = sorted({l["d"] for l in lines})
    net = round(sum(l["net"] for l in lines), 2)
    orders = {l["o"] for l in lines}
    amount = round(sum(v for k, v in order_amount.items() if k in orders), 2)
    out = {
        "id": a.id,
        "name": a.name,
        "venue": a.venue,
        "warehouse": a.warehouse,
        "from": (d_from.isoformat() if d_from else dates[0]),
        "to": (d_to.isoformat() if d_to else dates[-1]),
        "target": a.target,
        "sources": [Path(f).name for f in a.files],
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "check": {"lineTotal": net, "orderAmount": amount, "match": abs(net - amount) < 0.5},
        "lines": lines,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / f"{a.id}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    idx_path = OUT_DIR / "index.json"
    idx = json.loads(idx_path.read_text(encoding="utf-8")) if idx_path.exists() else {"events": []}
    idx["events"] = [e for e in idx["events"] if e["id"] != a.id] + [{
        "id": a.id, "name": a.name, "venue": a.venue, "from": out["from"], "to": out["to"],
        "sales": net, "orders": len(orders), "units": sum(l["q"] for l in lines),
    }]
    idx["events"].sort(key=lambda e: e["from"], reverse=True)
    idx_path.write_text(json.dumps(idx, ensure_ascii=False, indent=1), encoding="utf-8")

    print(f"{a.name}: {len(lines)} lines / {len(orders)} orders / {sum(l['q'] for l in lines):g} units / "
          f"sales {net:,.2f} (order Amount {amount:,.2f}{'' if out['check']['match'] else '  ** MISMATCH **'})")
    print(f"period {out['from']} .. {out['to']}, selling days {len(dates)}; skipped {dict(skipped)}")
    print(f"-> {OUT_DIR / (a.id + '.json')}")


if __name__ == "__main__":
    main()
