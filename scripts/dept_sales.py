"""Central CL・Siam Discovery の売上表から、VFF の靴以外 (VFF の靴下・Barefoot Japan・Oleno) の販売足数を品番別に数える。

  python3 scripts/dept_sales.py <Central CL の売上ファイル> <Siam Discovery の売上ファイル>
  → public/dept_sales.json  { stores: { 拠点: { from, to, sales: { 品番: 足数 } } }, unmatched: [...] }

百貨店の売上表は品番がない (または独自の書き方) ので、品名から Zort の品番に読み替える。
  例: "OLENO ULTIMATE SHR (RD/PP,23-25)" → OLN0003(RD/PP,25)、"BFJ SOCKS(M, BLACK)" → BFJ0001(BK,M)
月別のシート (01-26, 02-26 …) を読む。Central CL は Store Name 列があれば CHIDLOM の行だけ (VFF の販売と同じ決まり)。
"""
import collections
import datetime
import json
import re
import sys
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "dept_sales.json"

# 品番の一覧 (色・サイズ)。Zort の商品マスタと同じ
CATALOG = {
    "BFJ0001": [f"{c},{s}" for c in ["BK", "BL", "GY", "PK", "YL"] for s in "SML"],
    "BFJ0002": ["BK,S", "BK,M", "BK,L", "GY,S", "GY,M", "GY,L"],
    "VFF0027": [f"{c},{s}" for c in ["BK", "FI", "IV", "LI"] for s in ["S", "M", "L", "XL"]],
    "VFF0028": [f"BK,{s}" for s in ["S", "M", "L", "XL"]],
    "VFF0029": [f"BK,{s}" for s in ["S", "M", "L", "XL"]],
    "OLN0001": [f"BK,{s}" for s in [25, 27, 29]],
    "OLN0002": [f"BK,{s}" for s in [25, 27, 29]],
    "OLN0003": [f"{c},{s}" for c in ["BL/M", "KK/M", "RD/PP"] for s in [25, 27, 29]],
    "OLN0004": [f"BK/M,{s}" for s in [25, 27, 29]],
    "OLN0005": [f"{c},{s}" for c in ["BK/BL", "BK/GY", "BK/RD"] for s in [25, 27, 29]],
    "OLN0006": [f"BK,{s}" for s in [25, 27, 29]],
    "OLN0007": ["DN,25", "DN,27", "DN,29", "W/M,25", "W/M,27"],
    "OLN0009": [f"DN,{s}" for s in [25, 27, 29]],
    "OLN0016": [f"{c},{s}" for c in ["BK/GO", "BK/TQ"] for s in [25, 27, 29]],
}
COLOR_WORDS = {
    "BLACK": "BK", "BLAC": "BK", "GRAY": "GY", "GREY": "GY", "BLUE": "BL", "PINK": "PK", "YELLOW": "YL",
    "FIG": "FI", "F": "FI", "IVORY": "IV", "LIME": "LI", "DENIM": "DN", "RED": "RD", "WINE": "W", "MIX": "M",
    "KHAKI": "KK", "PURPLE": "PP", "GOLD": "GO", "TURQUOISE": "TQ",
}
SIZE_NUM = {"23-25": "25", "25-27": "27", "27-29": "29"}
SML_NUM = {"S": "25", "M": "27", "L": "29"}


def family(name):
    n = name.upper()
    if "BFJ" in n:
        return "BFJ0002" if "FREE" in n else "BFJ0001"
    if re.search(r"OLENO|OLN|HADASHI|ULTIMATE|S-70", n):
        if "OPENFINGER" in n:
            return "OLN0009"
        if "HADASHI" in n:
            return "OLN0007"
        if "S-70" in n:
            return "OLN0016"
        if "SHR" in n:
            return "OLN0004" if "ROUND" in n else "OLN0003"
        if "TNG" in n:
            return "OLN0005"
        if "ASO" in n:
            return "OLN0006" if "LONG" in n else "OLN0002"
        if "ULTIMATE" in n:
            return "OLN0001"
        return None
    if "SOCK" in n or re.match(r"^\s*(HIGH |MINI )?CREW", n):
        if "HIGH CREW" in n:
            return "VFF0029"
        if "MINI CREW" in n:
            return "VFF0027"
        if "CREW" in n:
            return "VFF0028"
    return None


def norm_color(tok):
    parts = [p for p in re.split(r"[/\s]+", tok.upper().strip()) if p]
    return "/".join(COLOR_WORDS.get(p, p) for p in parts)


def to_code(name, hint=""):
    fam = family(name)
    if not fam:
        return None, False
    m = re.search(r"\(([^()]*)\)\s*$", name.strip()) or re.search(r"\(([^()]*)", name)
    toks = [t.strip() for t in re.split(r"[,]|\s(?=\d)", m.group(1))] if m else []
    toks = [t for t in toks if t]
    numeric = fam.startswith("OLN") and fam not in ("OLN0010", "OLN0011", "OLN0012", "OLN0013", "OLN0014", "OLN0015")
    size, color = None, None
    for t in toks:
        u = t.upper().replace(" ", "")
        if u in SIZE_NUM:
            size = SIZE_NUM[u]
        elif u in ("S", "M", "L", "XL") and size is None:
            size = SML_NUM[u] if numeric and u in SML_NUM else u
        elif u.startswith("W") and fam == "OLN0007" and u in ("W", "WM", "W/M"):
            color = "W/M"
        else:
            # "M YELLOW" のようにサイズと色がつながっている書き方
            mm = re.match(r"^(XL|S|M|L)\s+(.+)$", t.strip().upper())
            if mm and size is None:
                size = SML_NUM.get(mm.group(1), mm.group(1)) if numeric else mm.group(1)
                color = norm_color(mm.group(2))
            else:
                color = norm_color(t)
    cands = [c for c in CATALOG[fam] if size is None or c.split(",")[1] == size]
    if color:
        exact = [c for c in cands if c.split(",")[0] == color]
        if exact:
            cands = exact
        else:
            first = color.split("/")
            cands = [c for c in cands if all(any(x.startswith(p) for x in c.split(",")[0].split("/")) for p in first)] or cands
    colors = {c.split(",")[0] for c in cands}
    if len(colors) > 1 and hint:  # 品名が途中で切れているときは、売上表の品番 (例 OLN5BKGY27) の色で決める
        h = hint.upper().replace("(", "").replace(",", "")
        hit = [c for c in cands if c.split(",")[0].replace("/", "") in h]
        if len({c.split(",")[0] for c in hit}) == 1:
            cands, colors = hit, {hit[0].split(",")[0]}
    if size is None or len(colors) != 1:
        return None, True
    return f"{fam}({cands[0]})", True


def month_sheets(wb):
    for ws in wb.worksheets:
        m = re.match(r"^(\d{2})-(\d{2})$", ws.title.strip())
        if m:
            yield f"20{m.group(2)}-{m.group(1)}", ws


def read(path, store):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    sales, unmatched, months = collections.Counter(), collections.Counter(), set()
    seen = {}
    for ym, ws in month_sheets(wb):
        if ym < "2026-01":
            continue
        rows = list(ws.iter_rows(values_only=True))
        head = next((r for r in rows[:5] if r and any(str(v or "").strip() == "Store Name" for v in r)), None)
        si = [str(v or "").strip() for v in head].index("Store Name") if head else None
        for r in rows:
            if not r or not any(isinstance(v, datetime.datetime) for v in r):  # 日付のある行だけ (見出し・合計の行は読まない)
                continue
            if si is not None and str(r[si] or "").strip().upper() != "CHIDLOM":
                continue
            strs = [v for v in r if isinstance(v, str) and v.strip()]
            nums = [v for v in r if isinstance(v, (int, float)) and not isinstance(v, bool)]
            if not strs or not nums:
                continue
            # 品名 = かっこのある文字列 (なければ最初の文字列)。ほかの文字列 (売上表の品番) は色の手がかりに使う
            name = next((x for x in reversed(strs) if "(" in x and x.strip().upper() != "CHIDLOM"), strs[0])
            qty = nums[0]
            code, ours = to_code(name, " ".join(x for x in strs if x is not name))
            if not ours:
                continue
            months.add(ym)
            if code:
                sales[code] += qty
                seen.setdefault(name, code)
            else:
                unmatched[name] += qty
    ms = sorted(months)
    if "-v" in sys.argv:
        for k, v in sorted(seen.items()):
            print(f"  {k!r:45} -> {v}")
    return {"from": ms[0] if ms else None, "to": ms[-1] if ms else None, "source": Path(path).name,
            "sales": {k: int(v) if v == int(v) else v for k, v in sorted(sales.items()) if v}}, unmatched


def main(cl, sd):
    out = {"stores": {}, "unmatched": {}}
    for store, path in [("Central CL (Department)", cl), ("Siam Discovery", sd)]:
        d, un = read(path, store)
        out["stores"][store] = d
        out["unmatched"][store] = {k: v for k, v in un.most_common()}
        print(store, d["from"], d["to"], sum(d["sales"].values()), "pairs,", len(d["sales"]), "SKUs; unmatched", sum(un.values()), dict(un.most_common(8)))
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(*[a for a in sys.argv[1:] if a != "-v"][:2])
