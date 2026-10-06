"""筋トレ・健康管理ダッシュボードを 1 つの HTML ファイル (CSS・JS を埋め込み) にまとめる。

在庫ダッシュボードとは別の URL で公開する単体版に使う。

使い方:
    python scripts/build_health_standalone.py health/index.html --full   # Vercel の健康専用プロジェクト (Root Directory: health)
    python scripts/build_health_standalone.py OUT.html                   # claude.ai の Artifact 用 (<html>/<head> なし)

public/health.html・style.css・health.css・health.js を読み、在庫ダッシュボードへのリンクを外す。
記録はどちらの版でも閲覧しているブラウザの localStorage に保存される。
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
    html = (PUB / "health.html").read_text(encoding="utf-8")
    body = re.search(r"<body>(.*)</body>", html, re.S).group(1)
    body = re.sub(r"\s*<script[^>]*></script>", "", body)
    body = re.sub(r'\s*<a class="ghost" href="\./">[^<]*</a>', "", body)
    icon = re.search(r'<link rel="icon" href="([^"]+)">', html).group(1)
    css = (PUB / "style.css").read_text(encoding="utf-8") + "\n" + (PUB / "health.css").read_text(encoding="utf-8")
    js = (PUB / "health.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
    out = (
        "<title>筋トレ・健康管理ダッシュボード</title>\n"
        f"<style>\n{css}\n</style>\n"
        f"{body.strip()}\n"
        + ("" if full else "<script>window.HEALTH_NO_DOWNLOAD = true;</script>\n")  # Artifact ではダウンロード不可
        + f"<script>\n{js}\n</script>\n"
    )
    if full:
        head, rest = out.split("</style>\n", 1)
        out = (
            '<!doctype html>\n<html lang="ja">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="description" content="週間トレーニング計画、食事・生活習慣のチェック、体重・トレーニング記録">\n'
            '<meta name="robots" content="noindex">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="Health">\n'
            f'<link rel="icon" href="{icon}">\n'
            f"{head}</style>\n</head>\n<body>\n{rest}</body>\n</html>\n"
        )
    Path(args[0]).parent.mkdir(parents=True, exist_ok=True)
    Path(args[0]).write_text(out, encoding="utf-8")
    print(f"{args[0]} ({len(out.encode()) // 1024} KB)")


if __name__ == "__main__":
    main()
