// 業務改善マニュアル (/kaizen) の本文の共有保存 API  —  Vercel Function
//
//   GET  /api/kaizen            → { shared: true, text, updatedAt }        本文（Markdown 風テキスト）
//   GET  /api/kaizen?history=1  → { shared: true, history: [{ at, size, head }] }  保存履歴（新しい順、最大 30 件）
//   GET  /api/kaizen?rev=<at>   → { shared: true, text, updatedAt: at }    履歴の 1 件を取り出す
//   PUT  /api/kaizen   body: { text, base }   → { shared: true, updatedAt }
//        base = 編集を始めたときの updatedAt。サーバー側がそれより新しければ 409（他の人が先に保存した）
//        環境変数 KAIZEN_EDIT_KEY を設定すると、保存には X-Edit-Key ヘッダー（同じ値）が必要になる
//
// 保存先: Upstash Redis（在庫ダッシュボードの返品入力と同じ接続。api/returns.js を参照）
//   kaizen:doc / kaizen:updatedAt / kaizen:history（LIST。各要素は JSON { at, text }）

const envBySuffix = (...suffixes) => {
  for (const suf of suffixes) {
    if (process.env[suf]) return process.env[suf];
    const key = Object.keys(process.env).find((k) => k.endsWith(`_${suf}`) && process.env[k]);
    if (key) return process.env[key];
  }
  return undefined;
};
const URL_ = envBySuffix("KV_REST_API_URL", "UPSTASH_REDIS_REST_URL", "REST_API_URL");
const TOKEN = envBySuffix("KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN", "REST_API_TOKEN");
const EDIT_KEY = process.env.KAIZEN_EDIT_KEY || "";

const DOC = "kaizen:doc", AT = "kaizen:updatedAt", HIST = "kaizen:history";
const MAX_TEXT = 1024 * 1024; // 1 MB
const MAX_HISTORY = 30;

async function redis(commands) {
  const r = await fetch(`${URL_.replace(/\/$/, "")}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  const out = await r.json();
  const err = out.find((x) => x && x.error);
  if (err) throw new Error(err.error);
  return out.map((x) => x.result);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

const safeEqual = (a, b) => {
  if (a.length !== b.length) return false;
  let x = 0;
  for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
};

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    res.status(503).json({ shared: false, error: "shared storage is not configured" });
    return;
  }
  const q = req.query || Object.fromEntries(new URL(req.url, "http://x").searchParams);
  try {
    if (req.method === "GET") {
      if (q.history) {
        const [list] = await redis([["LRANGE", HIST, 0, MAX_HISTORY - 1]]);
        const history = (list || []).map((s) => {
          try { const o = JSON.parse(s); return { at: o.at, size: (o.text || "").length, head: (o.text || "").split("\n").find((l) => /^version:/.test(l)) || "" }; }
          catch { return null; }
        }).filter(Boolean);
        return res.status(200).json({ shared: true, history, locked: !!EDIT_KEY });
      }
      if (q.rev) {
        const [list] = await redis([["LRANGE", HIST, 0, MAX_HISTORY - 1]]);
        for (const s of list || []) {
          try { const o = JSON.parse(s); if (o.at === q.rev) return res.status(200).json({ shared: true, text: o.text, updatedAt: o.at }); } catch {}
        }
        return res.status(404).json({ error: "revision not found" });
      }
      const [text, updatedAt] = await redis([["GET", DOC], ["GET", AT]]);
      return res.status(200).json({ shared: true, text: text || "", updatedAt: updatedAt || null, locked: !!EDIT_KEY });
    }

    if (req.method === "PUT" || req.method === "POST") {
      if (EDIT_KEY) {
        const given = String(req.headers["x-edit-key"] || "");
        if (!safeEqual(given, EDIT_KEY)) return res.status(401).json({ error: "edit key required" });
      }
      const body = await readBody(req);
      const text = typeof body.text === "string" ? body.text : null;
      if (text === null) return res.status(400).json({ error: "text required" });
      if (text.length > MAX_TEXT) return res.status(413).json({ error: "text too long" });
      const base = body.base == null ? null : String(body.base);

      const [current] = await redis([["GET", AT]]);
      if (base !== null && current && base !== current) {
        return res.status(409).json({ error: "conflict", updatedAt: current });
      }
      const now = new Date().toISOString();
      await redis([
        ["SET", DOC, text],
        ["SET", AT, now],
        ["LPUSH", HIST, JSON.stringify({ at: now, text })],
        ["LTRIM", HIST, 0, MAX_HISTORY - 1],
      ]);
      return res.status(200).json({ shared: true, updatedAt: now });
    }

    res.setHeader("Allow", "GET, PUT, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
