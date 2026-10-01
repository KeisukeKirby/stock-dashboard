"""Vivo の販売実績 (BFT / EDV の受注明細) を集計用データ public/vivo.json に変換する。

Vivo 販売ダッシュボード (public/vivo.html) が読むデータ。

使い方:
    python scripts/vivo_sales.py data/sales_raw/vivo_BFT.xlsx data/sales_raw/vivo_EDV.xlsx

    引数は「BFT の受注明細」「EDV の受注明細」の順 (POS の Orders シート、order_detail_*.xlsx と同じ形式)。
    受注明細は顧客情報を含むため data/sales_raw/ (Git 管理外) に置く。
    vivo.json には顧客情報を入れない (日付・会社・販売場所・注文番号・商品・数量・金額・状態のみ)。

集計ルール:
  - Category が Vivo の明細行のみ
  - 取消 (Voided) は除外。Pending は含め、ダッシュボードで除外できるように状態を残す
  - 販売場所 = Warehouse/Branch。会社ごとに別の場所として扱う (BFT の Event 1 と EDV の Event 1 は別のイベント)
      Event で始まる → イベント / 空欄・Online・คลังสินค้าหลัก (本社倉庫) → オンライン・その他 / それ以外 → 店舗
  - モデル・カラー・サイズは商品名「Vivo <モデル>(<サイズ>, <カラー>)」から取る
    (商品コードの番号は BFT と EDV で別のモデルを指すことがあるため使わない。表記ゆれは大文字小文字をそろえる)
  - 金額 = 明細の Total amount (明細ごとの値引き後、注文全体の値引きは含まない)
"""
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "vivo.json"

UPPER = {"ii", "iii", "iv", "fg", "ii", "v"}
SIZE_RE = re.compile(r"^[MW]\d+(?:\.\d+)?$")
ONLINE = {"", "online", "คลังสินค้าหลัก"}
WH_LABEL = {"Kvillage": "K Village", "คลังสินค้าหลัก": "Main warehouse"}


def title(s):
    words = []
    for w in s.split():
        if w.lower() in UPPER:
            words.append(w.upper())
        elif "/" in w:
            words.append("/".join(p[:1].upper() + p[1:].lower() for p in w.split("/")))
        else:
            words.append(w[:1].upper() + w[1:].lower())
    return " ".join(words)


def parse_name(name):
    m = re.match(r"^\s*(.*?)\s*\(([^()]*)\)\s*$", name)
    if not m:
        return title(re.sub(r"^vivo\s+", "", name, flags=re.I)), "", ""
    model = title(re.sub(r"^vivo\s+", "", m.group(1), flags=re.I))
    size, color = "", ""
    for p in (x.strip() for x in m.group(2).split(",")):
        if SIZE_RE.match(p):
            size = p
        elif p:
            color = title(p)
    return model, color, size


def loc_type(wh):
    if wh.lower().startswith("event"):
        return "event"
    if wh.lower() in ONLINE:
        return "online"
    return "store"


def num(v):
    if v in (None, ""):
        return 0.0
    return float(str(v).replace(",", ""))


def read(path, company, locs, out):
    ws = openpyxl.load_workbook(path, data_only=True, read_only=True).worksheets[0]
    rows = ws.iter_rows(values_only=True)
    next(rows)  # 1 行目はグループ見出し (Orders / Payments / Product data)
    head = next(rows)
    ix = {h: i for i, h in enumerate(head) if h}
    n = skipped = 0
    for r in rows:
        if (r[ix["Category"]] or "") != "Vivo":
            continue
        status = r[ix["Status"]] or ""
        if status == "Voided":
            skipped += 1
            continue
        wh = (r[ix["Warehouse/Branch"]] or "").strip()
        lid = f"{company}:{wh}"
        if lid not in locs:
            locs[lid] = {"id": lid, "company": company, "type": loc_type(wh), "wh": wh,
                         "name": WH_LABEL.get(wh, wh)}
        d = datetime.datetime.strptime(str(r[ix["Date"]]).strip(), "%d/%m/%Y").date().isoformat()
        model, color, size = parse_name(str(r[ix["Product name"]] or ""))
        out.append([d, lid, str(r[ix["Sales order No."]] or ""), model, color, size,
                    int(num(r[ix["Quantity"]])), round(num(r[ix["Total amount"]]), 2),
                    "pending" if status == "Pending" else ""])
        n += 1
    print(f"{company}: {n} 行 (取消 {skipped} 行を除外) ← {Path(path).name}")


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    locs, lines = {}, []
    read(sys.argv[1], "BFT", locs, lines)
    read(sys.argv[2], "EDV", locs, lines)
    lines.sort()
    order = {"store": 0, "event": 1, "online": 2}
    data = {
        "generated": datetime.datetime.now().isoformat(timespec="seconds"),
        "sources": {"BFT": Path(sys.argv[1]).name, "EDV": Path(sys.argv[2]).name},
        "from": lines[0][0],
        "to": lines[-1][0],
        "locations": sorted(locs.values(), key=lambda l: (l["company"], order[l["type"]], l["name"])),
        "fields": ["date", "loc", "order", "model", "color", "size", "qty", "amount", "status"],
        "lines": lines,
    }
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    for l in data["locations"]:
        q = sum(x[6] for x in lines if x[1] == l["id"])
        print(f"  {l['company']} {l['type']:6} {l['name'] or '(空欄)'}: {q} 足")
    print(f"合計 {sum(x[6] for x in lines)} 足 ({data['from']} 〜 {data['to']}) → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
