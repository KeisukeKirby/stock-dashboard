#!/usr/bin/env node
/* 業務改善マニュアル (public/kaizen.html) を A4 縦の PDF にする。
 *
 *   node scripts/build_kaizen_pdf.mjs                                  # ローカルの public/ から -> public/kaizen.pdf
 *   node scripts/build_kaizen_pdf.mjs out/manual.pdf                   # 出力先を指定
 *   node scripts/build_kaizen_pdf.mjs out/manual.pdf https://xxx.vercel.app/kaizen   # 公開中の（共有保存された）内容から
 *
 * Playwright の Chromium でページを開き、画面の「印刷 / PDF に保存」と同じ
 * レイアウト（kaizen.css の @page 設定）で PDF にします。
 * public/ を一時的な HTTP サーバーで配信するので、ローカルの kaizen.json を読めます。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

// playwright はグローバル (NODE_PATH) に入っていることがあるので require で解決する
const { chromium } = createRequire(import.meta.url)('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const out = path.resolve(process.argv[2] || path.join(root, 'kaizen.pdf'));
const liveUrl = process.argv[3] || '';

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const file = path.normalize(path.join(root, url === '/' ? 'index.html' : url));
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(liveUrl || `${base}/kaizen.html`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#doc[data-ready="1"]', { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
  const meta = await page.evaluate(() => ({ title: document.title, version: document.getElementById('tbVersion').textContent }));
  console.log(`${meta.title} ${meta.version} -> ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(0)} KB)`);
} finally {
  await browser.close();
  server.close();
}
