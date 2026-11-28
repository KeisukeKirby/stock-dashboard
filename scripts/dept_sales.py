"""Central CL・Siam Discovery の売上表から、VFF の靴以外 (VFF の靴下・Barefoot Japan・Oleno) の販売足数を品番別に数える。

  python3 scripts/dept_sales.py "Central CL (Department)=<ファイル>" ... "Siam Discovery=<ファイル>" ... [-v]
  同じ拠点・同じ月が複数のファイルにあるときは、先に書いたファイルを使う
  → public/dept_sales.json  { stores: { 拠点: { from, to, sales: { 品番: 足数 } } }, unmatched: [...] }

百貨店の売上表は品番がない (または独自の書き方) ので、品名から Zort の品番に読み替える。
  例: "OLENO ULTIMATE SHR (RD/PP,23-25)" → OLN0003(RD/PP,25)、"BFJ SOCKS(M, BLACK)" → BFJ0001(BK,M)
月は 日付のマス / "Jan-2026" / シート名 (01-26) から決める。Central CL は Store Name 列があれば CHIDLOM の行だけ (VFF の販売と同じ決まり)。
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
    # Coolcore (CP): サイズのない品番 (",24" は品番の一部)
    "CP0002": ["BK", "GY,24", "WT", "CMNV,24", "CMGY,24", "CMF"],
    "CP0003": ["HBL", "SBL", "BL"],
    "CP0004": ["TQ,24", "FU,24", "YL,24", "BK", "DGY", "BL"],
}
CP_COLORS = {"BLACK": "BK", "GRAY": "GY", "GREY": "GY", "WHITE": "WT", "CAMO NAVY": "CMNV", "CAMO GRAY": "CMGY", "CAMOUFLAGE": "CMF",
             "HERITAGE BLUE": "HBL", "SKY BLUE": "SBL", "DIVA BLUE": "BL", "TURQUOISE": "TQ", "FUSCIA": "FU", "FUCHSIA": "FU",
             "YELLOW": "YL", "DARK GRAY": "DGY", "BL": "BL", "HBL": "HBL", "SBL": "SBL", "TQ": "TQ", "FU": "FU", "DGY": "DGY", "BK": "BK"}
COLOR_WORDS = {
    "BLACK": "BK", "BLAC": "BK", "GRAY": "GY", "GREY": "GY", "BLUE": "BL", "PINK": "PK", "YELLOW": "YL",
    "FIG": "FI", "F": "FI", "IVORY": "IV", "LIME": "LI", "DENIM": "DN", "RED": "RD", "WINE": "W", "MIX": "M",
    "KHAKI": "KK", "PURPLE": "PP", "GOLD": "GO", "TURQUOISE": "TQ",
}
SIZE_NUM = {"23-25": "25", "25-27": "27", "27-29": "29"}
SML_NUM = {"S": "25", "M": "27", "L": "29"}


def family(name):
    n = name.upper()
    if re.match(r"^\s*CP\b", n) or "CHILL" in n:
        return "CP0002" if "MULTI" in n else "CP0003" if "OUTDOOR" in n else "CP0004" if "SPORT" in n else None
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
    if fam.startswith("CP"):  # 色だけで決める
        m = re.search(r"\(([^()]*)\)", name)
        col = CP_COLORS.get(re.sub(r"\s+", " ", (m.group(1) if m else "").split(",")[0].strip().upper()))
        hit = [c for c in CATALOG[fam] if c.split(",")[0] == col]
        return (f"{fam}({hit[0]})" if len(hit) == 1 else None), True
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


MONTHS = {m: i + 1 for i, m in enumerate(["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


def row_month(r, sheet_ym):
    """行の月: 日付のマス → "Jan-2026" のような文字 → シート名 (01-26) の順で決める"""
    for v in r:
        if isinstance(v, (datetime.datetime, datetime.date)):
            return f"{v.year}-{v.month:02d}"
    for v in r:
        m = re.match(r"^([A-Z][a-z]{2})-(\d{4})$", str(v or "").strip())
        if m and m.group(1) in MONTHS:
            return f"{m.group(2)}-{MONTHS[m.group(1)]:02d}"
    return sheet_ym


def read_lines(path):
    """1 ファイルの販売の行を (月, 品番 or None, 品名, 数量) で返す。VFF の靴など対象外の品名は返さない"""
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    for ws in wb.worksheets:
        m = re.match(r"^(\d{2})-(\d{2})$", ws.title.strip())
        sheet_ym = f"20{m.group(2)}-{m.group(1)}" if m else None
        # 月別シートのあるファイル (2026, 2025 などのまとめシートもある) は月別シートだけ読む
        if not m and any(re.match(r"^\d{2}-\d{2}$", w.title.strip()) for w in wb.worksheets):
            continue
        rows = list(ws.iter_rows(values_only=True))
        head = next((r for r in rows[:5] if r and any(str(v or "").strip() == "Store Name" for v in r)), None)
        si = [str(v or "").strip() for v in head].index("Store Name") if head else None
        for r in rows:
            if not r:
                continue
            ym = row_month(r, sheet_ym)
            if not ym or not ym.startswith("2026"):
                continue
            # Central は CHIDLOM の行だけ (VFF の販売と同じ決まり。CHIDLOM ONLINE・ほかの Central の店は含めない)
            if si is not None and str(r[si] or "").strip().upper() != "CHIDLOM":
                continue
            strs = [v for v in r if isinstance(v, str) and v.strip()]
            nums = [v for v in r if isinstance(v, (int, float)) and not isinstance(v, bool)]
            if not strs or not nums:
                continue
            # 品名: かっこのある文字列のうち、品番に読み替えられるもの (売上表の品番の列より品名の列を優先)
            cands = [x for x in strs if "(" in x] or strs[:1]
            hint = " ".join(strs)
            scored = [(to_code(x, hint), x) for x in cands]
            (code, ours), name = max(scored, key=lambda t: (t[0][0] is not None, t[0][1], len(t[1])))
            if not ours:
                continue
            yield ym, code, name, nums[0]


def main(args):
    """args: "Central CL (Department)=ファイル" / "Siam Discovery=ファイル" を優先する順に。
    同じ拠点・同じ月が複数のファイルにあるときは、先に書いたファイルの数だけを使う (二重に数えない)"""
    out = {"stores": {}, "unmatched": {}}
    verbose = "-v" in args
    for store in dict.fromkeys(a.split("=", 1)[0] for a in args if "=" in a):
        files = [a.split("=", 1)[1] for a in args if a.startswith(store + "=")]
        taken = {}  # 月 → ファイル
        sales, un, seen = collections.Counter(), collections.Counter(), {}
        for f in files:
            lines = list(read_lines(f))
            months = {ym for ym, *_ in lines}
            use = {ym for ym in months if ym not in taken}
            for ym in use:
                taken[ym] = Path(f).name
            for ym, code, name, q in lines:
                if ym not in use:
                    continue
                if code:
                    sales[code] += q
                    seen.setdefault(name, code)
                else:
                    un[name] += q
        ms = sorted(taken)
        out["stores"][store] = {"from": ms[0] if ms else None, "to": ms[-1] if ms else None,
                                "months": {m: taken[m] for m in ms},
                                "sales": {k: int(v) if v == int(v) else v for k, v in sorted(sales.items()) if v}}
        out["unmatched"][store] = dict(un.most_common())
        if verbose:
            for k, v in sorted(seen.items()):
                print(f"  {k!r:45} -> {v}")
        print(store, ms[0] if ms else None, ms[-1] if ms else None, sum(sales.values()), "pairs,", len(sales), "SKUs; unmatched", sum(un.values()), dict(un.most_common(8)))
        for m in ms:
            print("   ", m, taken[m])
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])
