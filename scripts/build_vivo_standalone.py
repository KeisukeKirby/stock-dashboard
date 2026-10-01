"""Vivo 販売ダッシュボードを 1 つの HTML ファイル (データ・CSS・JS を埋め込み) にまとめる。

在庫ダッシュボードとは別の URL で公開する単体版に使う。

使い方:
    python scripts/build_vivo_standalone.py vivo/index.html --full   # Vercel の Vivo 専用プロジェクト (Root Directory: vivo)
    python scripts/build_vivo_standalone.py OUT.html                 # claude.ai の Artifact 用 (<html>/<head> なし)

public/vivo.html・style.css・vivo.css・vivo.js・vivo.json を読み、
在庫ダッシュボードへのリンク・テーマ切り替え (閲覧画面のテーマに従う)・CSV 保存ボタン (公開ページではダウンロード不可) を外す。
"""
import re
import sys
from pathlib import Path

PUB = Path(__file__).resolve().parent.parent / "public"


def main():
    args = [a for a in sys.argv[1:] if a != "--full"]
    if len(args) != 1:
        sys.exit(__doc__)
    full = "--full" in sys.argv
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
    if full:
        # Vercel で配信する完全な HTML 文書 (<title> と <style> は <head> に入れる)
        head, rest = out.split("</style>\n", 1)
        out = (
            '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            f'<meta name="robots" content="noindex">\n{head}</style>\n</head>\n<body>\n{rest}</body>\n</html>\n'
        )
    Path(args[0]).parent.mkdir(parents=True, exist_ok=True)
    Path(args[0]).write_text(out, encoding="utf-8")
    print(f"{args[0]} ({len(out.encode()) // 1024} KB)")


if __name__ == "__main__":
    main()
