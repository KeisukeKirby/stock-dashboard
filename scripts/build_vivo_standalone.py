"""Vivo 販売ダッシュボードを 1 つの HTML ファイル (データ・CSS・JS を埋め込み) にまとめる。

在庫ダッシュボードとは別の URL で公開する単体版に使う。

使い方:
    python scripts/build_vivo_standalone.py OUT.html

public/vivo.html・style.css・vivo.css・vivo.js・vivo.json を読み、
在庫ダッシュボードへのリンク・テーマ切り替え (閲覧画面のテーマに従う)・CSV 保存ボタン (公開ページではダウンロード不可) を外す。
"""
import re
import sys
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    html = (PUB / "vivo.html").read_text(encoding="utf-8")
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    body = re.sub(r"\s*<script[^>]*></script>", "", body)
    body = re.sub(r'\s*<a class="ghost" href="\./"[^>]*></a>', "", body)
    body = re.sub(r'\s*<button id="themeToggle".*?</button>', "", body, flags=re.S)
    body = re.sub(r'\s*<button id="dlCsv"[^>]*></button>', "", body)
    css = (PUB / "style.css").read_text(encoding="utf-8") + "\n" + (PUB / "vivo.css").read_text(encoding="utf-8")
    data = (PUB / "vivo.json").read_text(encoding="utf-8").replace("</", "<\\/")
    js = (PUB / "vivo.js").read_text(encoding="utf-8")
    out = (
        "<title>Vivo Sales Dashboard</title>\n"
        f"<style>\n{css}\n</style>\n"
        f"{body.strip()}\n"
        f"<script>window.VIVO_DATA = {data};</script>\n"
        f"<script>\n{js}\n</script>\n"
    )
    Path(sys.argv[1]).write_text(out, encoding="utf-8")
    print(f"{sys.argv[1]} ({len(out.encode()) // 1024} KB)")


if __name__ == "__main__":
    main()
