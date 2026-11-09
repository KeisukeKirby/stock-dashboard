#!/usr/bin/env python3
"""Vivobarefoot の取り扱い商品 JSON を、T21 Asok ラインアップ (KeisukeKirby/t21-vivo-lineup data.json) から作る。
  python scripts/bd/build_vivo.py /path/to/t21-vivo-lineup/data.json
画像は同リポジトリの img/ から 1 モデル 1 枚 (side) を bd/public/img/vivo/ にコピー済みのものを参照する。
"""
import json, sys, pathlib, datetime, os
src = json.load(open(sys.argv[1], encoding="utf-8"))
root = pathlib.Path(__file__).resolve().parents[2]
imgdir = root / "bd/public/img/vivo"
CAT = {"training": "トレーニング", "running": "ランニング", "trail": "トレイル", "everyday": "エブリデイ"}
items = []
for p in src:
    cws = p["cw"]
    prices = sorted({c["price"] for c in cws})
    colours = sorted({c["colour"] for c in cws})
    sizes = sorted({s["s"] for c in cws for s in c.get("sizes", [])}, key=lambda x: float(x) if x.replace('.', '', 1).isdigit() else 999)
    genders = sorted({c["g"] for c in cws})
    img = None
    for c in cws:
        for i in c.get("imgs", []):
            fn = os.path.basename(i)
            if (imgdir / fn).exists(): img = f"img/vivo/{fn}"; break
        if img: break
    items.append({
        "id": p["name"].lower().replace(" ", "-"), "name": p["name"], "nameJa": p.get("jp_title", "").replace(" (W)", "").replace(" (M)", ""),
        "category": CAT.get(p["cat"], p["cat"]), "priceThb": prices[0] if prices else None, "priceThbMax": prices[-1] if prices else None,
        "colours": colours, "sizes": sizes, "genders": [{"W": "Women", "M": "Men"}.get(g, g) for g in genders],
        "modelCodes": p.get("codes", {}), "tagline": p.get("tagline", ""), "intro": p.get("intro_ja", ""),
        "features": p.get("feats", []), "weight": p.get("weight_ja", ""), "image": img,
        "links": {"jp": p.get("jp_url")},
        "source": "t21-vivo-lineup data.json（T21 Asok イベント 2026-09 の定価・在庫、説明文は vivobarefoot.co.jp）",
    })
items.sort(key=lambda x: (x["category"], x["name"]))
out = root / "bd/public/data/products/vivo.json"
json.dump({"brand": "Vivo", "updatedAt": datetime.date.today().isoformat(), "asOf": "2026-09 (T21 Asok イベント時点の定価)",
           "source": "KeisukeKirby/t21-vivo-lineup (data.json) / Product Training Vivobarefoot.pdf (Drive) で要照合",
           "items": items}, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("wrote", out, len(items), "models")
