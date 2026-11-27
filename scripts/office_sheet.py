"""オフィスの在庫管理表 (VFF_Stock_*.xlsx) の 輸入・販売・発注の列を在庫ダッシュボード用に取り出す。

使い方:  python3 scripts/office_sheet.py data/VFF_Stock_08-10-26.xlsx   → public/office_sheet.json

取り出す列 (1 行目 = 商品 1 つ。B: モデル・カラー (縦に結合), C: サイズ):
  AY Import Total / AZ〜BC Sales 2023〜2026 / BI Sales Total / BJ Balance / BK Order Import
  CB〜CE: モデル×サイズの表 (Itmes, Size, Sales Total, %)。カラーに関係なく同じモデル・サイズの行に出す。
         値は Excel と同じ計算方法で計算し直す (CD = 全カラーの Sales Total の合計、CE = CD ÷ モデルの M / W ごとの合計 × 100)
2026 年の Sales は Excel の値ではなく、ダッシュボードの販売実績 (data/sales_rate.json: 全拠点の 2026 年の販売足数) を使い、
Sales Total (= 2023〜2026 の合計) と Balance (= Import Total − Sales Total) も計算し直す。
販売実績を更新したら (scripts/sales_rate_update.py build のあと) このスクリプトも実行し直す。
"""
import json
import re
import sys
from pathlib import Path

import openpyxl
from openpyxl.utils import column_index_from_string as ci

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "office_sheet.json"
RATE = ROOT / "data" / "sales_rate.json"
STOCK = ROOT / "public" / "stock.json"
NAMES = ROOT / "data" / "sku_names.json"  # Zort の商品名から作った SKU → [モデル, カラー, サイズ] (在庫表にない SKU 用)
SIZE_MODEL_ALIAS = {"V-Train": "V-Train 2.0"}
# 販売実績のモデル名 → Excel のモデル名 (Excel は V-Soul Black を 1 行にまとめている。2026 年モデル BK26 も同じ行に数える)
SALES_MODEL_ALIAS = {"VFF V-Soul 26": "VFF V-Soul"}  # CB 列のモデル名 → ダッシュボードのモデル名
COL = {k: ci(v) for k, v in {"item": "B", "size": "C", "imp": "AY", "s2023": "AZ", "s2024": "BA", "s2025": "BB",
                              "s2026x": "BC", "st": "BI", "bal": "BJ", "oi": "BK",
                              "zm": "CB", "zs": "CC", "zt": "CD", "zp": "CE"}.items()}
nk = lambda s: re.sub(r"[^a-z0-9]", "", str(s or "").lower().replace("balck", "black"))
num = lambda v: v if isinstance(v, (int, float)) else None


def model_of(head):
    """'V-Run M' -> ('VFF V-Run', 'M')"""
    head = head.strip()
    m = re.match(r"^(.*?)\s+([MWU])$", head)
    return ("VFF " + (m.group(1) if m else head)), (m.group(2) if m else "")


def sales2026_by_item():
    """ダッシュボードの販売実績: SKU ごとの 2026 年の販売足数 (全拠点) を モデル|カラー|サイズ で返す。"""
    rate = json.loads(RATE.read_text(encoding="utf-8"))
    months = {s: len(v) for s, v in rate["months"].items()}
    by_code = {c: round(sum(r * months[s] for s, r in per.items())) for c, per in rate["rate"].items()}
    names = {c: tuple(v) for c, v in json.loads(NAMES.read_text(encoding="utf-8")).items()}
    for it in json.loads(STOCK.read_text(encoding="utf-8"))["items"]:
        if it.get("code"):
            names[it["code"]] = (it["model"], it["color"], it["size"])
    out = {}
    for code, q in by_code.items():
        if code in names:
            m, c, s = names[code]
        else:  # 在庫表にない SKU はコードの並びから モデル番号・サイズだけ分かるので後で照合しない
            continue
        k = f"{nk(SALES_MODEL_ALIAS.get(m, m))}|{nk(c)}|{s}"
        out[k] = out.get(k, 0) + q
    return out, set(by_code) - set(names)


def main(path):
    ws = openpyxl.load_workbook(path, data_only=True).worksheets[0]
    s2026, unknown_codes = sales2026_by_item()
    rows, item, prefix = [], None, ""
    for r in range(4, ws.max_row + 1):
        name, size = ws.cell(r, COL["item"]).value, ws.cell(r, COL["size"]).value
        if name:
            item = str(name)
        if item is None or size is None or str(size).strip().upper() == "TOTAL" or "\n" not in item:
            continue
        head, color = item.split("\n", 1)
        model, mw = model_of(head)
        color = color.strip().strip("()").strip().replace("Balck", "Black")
        size = str(size).strip()
        if mw == "U" and size.isdigit():
            size = "U" + size
        v = {k: num(ws.cell(r, COL[k]).value) for k in ("imp", "s2023", "s2024", "s2025", "s2026x", "st", "bal", "oi")}
        if not any(x for x in v.values()):
            pass
        k = f"{nk(model)}|{nk(color)}|{size}"
        new26 = s2026.get(k, 0)
        st = sum(x or 0 for x in (v["s2023"], v["s2024"], v["s2025"])) + new26
        rows.append({"model": model, "color": color, "size": size, "key": k,
                     "imp": v["imp"], "s2023": v["s2023"], "s2024": v["s2024"], "s2025": v["s2025"],
                     "s2026": new26, "s2026excel": v["s2026x"], "st": st,
                     "bal": (v["imp"] or 0) - st, "oi": v["oi"]})
    # モデル×サイズの表 (CB〜CE)。CB はモデルの最初の行だけ。同じモデル名が M と W の 2 つの表になっている
    size_tbl, cur = {}, None
    for r in range(4, ws.max_row + 1):
        zm, zs = ws.cell(r, COL["zm"]).value, ws.cell(r, COL["zs"]).value
        if zm:
            cur = SIZE_MODEL_ALIAS.get(str(zm).strip(), str(zm).strip())
        if cur is None or zs in (None, 0) or str(zs).strip().upper() == "TOTAL":
            continue
        zs = str(zs).strip()
        if re.fullmatch(r"\d+", zs) and cur.lower() == "scramkey":
            zs = "U" + zs
        size_tbl[f"{nk('VFF ' + cur)}|{zs}"] = {"t": num(ws.cell(r, COL["zt"]).value), "p": num(ws.cell(r, COL["zp"]).value)}
    # サイズ別の Sales Total・% は Excel と同じ計算方法で計算し直す (2026 年をダッシュボードの販売実績にした Sales Total を使う):
    #   CD = 同じモデル・サイズの全カラーの Sales Total (BI) の合計、CE = CD ÷ そのモデルの M / W ごとの合計 × 100
    #   (Excel の CD は全カラーの BI の合計と一致することを確認済み)
    zt = {}
    for x in rows:
        k = f"{nk(x['model'])}|{x['size']}"
        zt[k] = zt.get(k, 0) + x["st"]
    block = lambda k: (k.split("|")[0], re.match(r"[A-Z]*", k.split("|")[1]).group(0))
    btot = {}
    for k, v in zt.items():
        btot[block(k)] = btot.get(block(k), 0) + v
    excel_tbl = size_tbl
    size_tbl = {k: {"t": v, "p": (v / btot[block(k)] * 100) if btot[block(k)] else None} for k, v in zt.items()}
    data = {"source": Path(path).name, "rows": rows, "sizeTable": size_tbl, "sizeTableExcel": excel_tbl}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=0), encoding="utf-8")
    print(f"{len(rows)} rows, {len(size_tbl)} model-size rows -> {OUT}")
    print(f"2026 sales: {sum(x['s2026'] for x in rows)} pairs on sheet rows "
          f"(dashboard SKUs not on the stock list: {len(unknown_codes)})")


if __name__ == "__main__":
    main(sys.argv[1])
