"""Vivo の在庫表 (public/vivo_stock.json) を作る。

data/vivo_counts/*.json (店舗ごとの棚卸) をまとめ、商品 × 拠点の数量にする。
棚卸のない拠点は null (画面では「未入力」)。

使い方:
    python scripts/vivo_stock.py
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
LOCATIONS = ["Office", "K Village", "Central CL (Department)", "Siam Discovery", "Paradise Park", "Central LP"]


def main():
    items, counts = {}, []
    for path in sorted((ROOT / "data" / "vivo_counts").glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        k = LOCATIONS.index(data["store"])
        for r in data["items"]:
            it = items.setdefault(r["code"], {"code": r["code"], "model": r["model"], "color": r["color"],
                                              "size": r["size"], "qty": [None] * len(LOCATIONS)})
            it["qty"][k] = int(r["count"])
        counts.append({"store": data["store"], "date": data["date"], "source": data["source"]})
    counted = {c["store"] for c in counts}
    out = {
        "title": "Vivo Shoe Inventory List (by Store)",
        "stores": LOCATIONS,
        "counted": [s in counted for s in LOCATIONS],
        "counts": counts,
        "items": list(items.values()),
        "generatedAt": datetime.now(timezone(timedelta(hours=7))).strftime("%Y-%m-%d %H:%M"),
    }
    dst = ROOT / "public" / "vivo_stock.json"
    dst.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(items)} items, counted: {sorted(counted)} -> {dst}")


if __name__ == "__main__":
    main()
