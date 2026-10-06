"""ビジネスメモ帳を 1 つの HTML ファイル (データ・CSS・JS を埋め込み) にまとめる。

在庫ダッシュボードとは別の URL で公開する単体版に使う。

使い方:
    python scripts/build_memo_standalone.py memo/index.html --full   # Vercel のメモ帳専用プロジェクト (Root Directory: memo)
    python scripts/build_memo_standalone.py OUT.html                 # claude.ai の Artifact 用 (<html>/<head> なし)

public/memo.html・memo.css・memo.js・memo.json を読み、在庫・Vivo ダッシュボードへのリンクを外す
(単体版は別の URL なので相対リンクが使えない)。
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
    html = (PUB / "memo.html").read_text(encoding="utf-8")
    head = re.search(r"<head>(.*)</head>", html, re.S).group(1)
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    body = re.sub(r"\s*<script[^>]*></script>", "", body)
    body = re.sub(r'\s*<a href="\./">Stock</a>\s*<a href="vivo">Vivo Sales</a>', "", body)
    fonts = "\n".join(re.findall(r'<link rel="preconnect"[^>]*>|<link href="https://fonts\.googleapis\.com[^>]*>', head))
    css = (PUB / "memo.css").read_text(encoding="utf-8")
    data = (PUB / "memo.json").read_text(encoding="utf-8").replace("</", "<\\/")
    js = (PUB / "memo.js").read_text(encoding="utf-8")
    out = (
        "<title>ビジネスメモ帳</title>\n"
        f"{fonts}\n"
        f"<style>\n{css}\n</style>\n"
        f"{body.strip()}\n"
        f"<script>window.MEMO_DATA = {data};</script>\n"
        f"<script>\n{js}\n</script>\n"
    )
    if full:
        # Vercel で配信する完全な HTML 文書 (<title>・フォント・<style> は <head> に入れる)
        top, rest = out.split("</style>\n", 1)
        metas = "\n".join(re.findall(r'<meta name="(?:description|theme-color)"[^>]*>|<link rel="icon"[^>]*>', head))
        out = (
            '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<meta name="robots" content="noindex">\n{metas}\n{top}</style>\n</head>\n<body>\n{rest}</body>\n</html>\n'
        )
    Path(args[0]).parent.mkdir(parents=True, exist_ok=True)
    Path(args[0]).write_text(out, encoding="utf-8")
    print(f"{args[0]} ({len(out.encode()) // 1024} KB)")


if __name__ == "__main__":
    main()
