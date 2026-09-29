"""Excel (Store_Stock_*.xlsx) の「VFF Shoes Stock」シートを public/stock.json に変換する。
オフィス在庫の Excel (VFF_Stock_*.xlsx) を渡すと「Office」列として追加する。

使い方:
    pip install openpyxl
    python scripts/convert.py data/Store_Stock_092526.xlsx data/VFF_Stock_25-09-26.xlsx

Excel 側で保存時に計算済みの値 (data_only) を読み込むため、
Excel で一度保存したファイルを使ってください。
"""
import json
import re
import shutil
import sys
from pathlib import Path

import openpyxl

SHEET = "VFF Shoes Stock"
PUBLIC = Path(__file__).resolve().parent.parent / "public"
OUT = PUBLIC / "stock.json"
XLSX_COPY = PUBLIC / "source.xlsx"  # 画面の「元の Excel をダウンロード」用
OFFICE_XLSX_COPY = PUBLIC / "source_office.xlsx"

# オフィス在庫シートの列 (1 始まり)
OFFICE_COL_ITEM = 2    # B: ITMES  例) "V-Run M\n(Black/Yellow)" (縦に結合)
OFFICE_COL_SIZE = 3    # C: Size
OFFICE_COL_STOCK = 66  # BN: Stock > Office
OFFICE_NAME = "Office"


def num(v):
    return int(v) if isinstance(v, (int, float)) else 0


def cell(v):
    """空セルは None (表示も空欄) のまま残す。"""
    return int(v) if isinstance(v, (int, float)) else None


def norm_color(s):
    """表記ゆれ (空白・ピリオド・大文字小文字・Balck) を吸収して比較する。"""
    return re.sub(r"[\s.]", "", s.lower().replace("balck", "black"))


def read_office(path):
    """オフィス在庫を [(model, color, size, qty)] で返す (表示順のまま)。"""
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    out = []
    item = None
    for r in range(4, ws.max_row + 1):
        name = ws.cell(r, OFFICE_COL_ITEM).value
        size = ws.cell(r, OFFICE_COL_SIZE).value
        if name:
            item = str(name)
        if item is None or size is None or str(size).strip().upper() == "TOTAL" or "\n" not in item:
            continue
        head, color = item.split("\n", 1)
        model = "VFF " + re.sub(r"\s+[MWU]$", "", head.strip())  # "V-Run M" -> "VFF V-Run"
        color = color.strip().strip("()").strip().replace("Balck", "Black")
        size = str(size).strip()
        if head.strip().endswith(" U") and size.isdigit():  # Scramkey U: 40 -> U40
            size = "U" + size
        out.append((model, color, size, cell(ws.cell(r, OFFICE_COL_STOCK).value)))
    return out


def add_office(items, office):
    """店舗の行に Office 在庫を追加。店舗にない商品は、在庫がある場合のみ行を追加する。"""
    index = {(i["model"], norm_color(i["color"]), i["size"]): i for i in items}
    for i in items:
        i["qty"].append(0)
        i["ret"].append(None)
    matched, added = 0, 0
    for model, color, size, qty in office:
        it = index.get((model, norm_color(color), size))
        if it:
            it["qty"][-1] = qty or 0
            matched += 1
        elif qty:
            new = {"code": "", "model": model, "color": color, "size": size,
                   "qty": [0] * (len(items[0]["qty"]) - 1) + [qty],
                   "ret": [None] * len(items[0]["ret"]), "office_only": True}
            # 同じモデル・カラーの行の後ろ (なければ同じモデルの後ろ、それもなければ末尾) に入れる
            same = [n for n, x in enumerate(items) if x["model"] == model]
            same_color = [n for n in same if norm_color(items[n]["color"]) == norm_color(color)]
            pos = (same_color or same or [len(items) - 1])[-1] + 1
            items.insert(pos, new)
            index[(model, norm_color(color), size)] = new
            added += 1
    for i in items:
        i["totalQty"] = sum(i["qty"])
        i["totalRet"] = sum(v or 0 for v in i["ret"])
        i.pop("office_only", None)
    return matched, added


def main(path, office_path=None):
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb[SHEET] if SHEET in wb.sheetnames else wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))

    title = rows[0][0] or "Inventory"
    as_of = rows[1][0] or ""
    header = rows[2]

    # 店舗は E 列から 2 列ずつ (Quantity / Return)。"Total" 列の手前まで。
    stores = []
    col = 4
    while col < len(header) and header[col] and str(header[col]).strip() != "Total":
        stores.append({"name": str(header[col]).strip(), "col": col})
        col += 2

    total_col = col  # "Total" 列 (Quantity, Return)
    items = []
    total_row = None
    for r in rows[4:]:
        code = r[0]
        if not code:
            continue
        if str(code).strip() == "Total":
            total_row = {
                "qty": [cell(r[s["col"]]) for s in stores] + [cell(r[total_col])],
                "ret": [cell(r[s["col"] + 1]) for s in stores] + [cell(r[total_col + 1])],
            }
            continue
        qty = [num(r[s["col"]]) for s in stores]
        ret = [cell(r[s["col"] + 1]) for s in stores]
        items.append({
            "code": str(code).strip(),
            "model": (r[1] or "").strip(),
            "color": (r[2] or "").strip(),
            "size": str(r[3] or "").strip(),
            "qty": qty,
            "ret": ret,
            "totalQty": cell(r[total_col]),
            "totalRet": cell(r[total_col + 1]),
        })

    store_names = [s["name"] for s in stores]
    office_src = None
    if office_path:
        matched, added = add_office(items, read_office(office_path))
        store_names.append(OFFICE_NAME)
        n = len(store_names)
        qty = [sum(i["qty"][k] for i in items) for k in range(n)]
        ret = [sum(i["ret"][k] or 0 for i in items) for k in range(n)]
        total_row = {"qty": qty + [sum(qty)], "ret": ret + [sum(ret)]}
        office_src = Path(office_path).name
        shutil.copyfile(office_path, OFFICE_XLSX_COPY)
        print(f"office: {matched} rows matched, {added} rows added (office only)")

    m = re.search(r"(\d{2}/\d{2}/\d{4})", str(as_of))
    data = {
        "title": title,
        "asOf": as_of,
        "asOfDate": m.group(1) if m else "",
        "source": Path(path).name,
        "officeSource": office_src,
        "stores": store_names,
        "items": items,
        "totalRow": total_row,
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    shutil.copyfile(path, XLSX_COPY)
    total = sum(sum(i["qty"]) for i in items)
    print(f"{len(items)} rows, {len(store_names)} locations, total qty {total} -> {OUT}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "data/Store_Stock_092526.xlsx",
         sys.argv[2] if len(sys.argv) > 2 else None)
