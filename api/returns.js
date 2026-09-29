// 返品 (Return) 入力の共有保存 API  —  Vercel Function
//
//   GET  /api/returns?key=returns:09/25/2026
//        → { shared: true, returns: { "<商品>@<店舗>": 数量, ... }, updatedAt }
//   POST /api/returns   body: { key, set: { "<商品>@<店舗>": 数量 }, del: ["<商品>@<店舗>"] }
//        → 変更したマスだけを書き込み、最新の全体を返す (同時に別のマスを入力しても消えない)
//
// 保存先: Upstash Redis (Vercel の Storage / Marketplace から作成してプロジェクトに接続)
//   環境変数 KV_REST_API_URL / KV_REST_API_TOKEN
//   (または UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const KEY_RE = /^returns:[\w\/\-.]{1,40}$/;
const MAX_FIELDS = 5000;
const MAX_FIELD_LEN = 200;
const MAX_QTY = 100000;

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

const toMap = (flat) => {
  const m = {};
  for (let i = 0; flat && i < flat.length; i += 2) m[flat[i]] = Number(flat[i + 1]);
  return m;
};

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body);
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!URL_ || !TOKEN) {
    res.status(503).json({ shared: false, error: "shared storage is not configured" });
    return;
  }
  try {
    if (req.method === "GET") {
      const key = String((req.query && req.query.key) || new URL(req.url, "http://x").searchParams.get("key") || "");
      if (!KEY_RE.test(key)) return res.status(400).json({ error: "bad key" });
      const [flat, updatedAt] = await redis([["HGETALL", key], ["GET", `${key}:updatedAt`]]);
      return res.status(200).json({ shared: true, returns: toMap(flat), updatedAt: updatedAt || null });
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const key = String(body.key || "");
      if (!KEY_RE.test(key)) return res.status(400).json({ error: "bad key" });
      const set = body.set && typeof body.set === "object" ? body.set : {};
      const del = Array.isArray(body.del) ? body.del : [];
      if (Object.keys(set).length + del.length > MAX_FIELDS) return res.status(400).json({ error: "too many changes" });

      const hset = ["HSET", key];
      for (const [f, v] of Object.entries(set)) {
        const n = Number(v);
        if (typeof f !== "string" || f.length > MAX_FIELD_LEN || !Number.isInteger(n) || n < 1 || n > MAX_QTY) {
          return res.status(400).json({ error: `bad value for ${String(f).slice(0, 60)}` });
        }
        hset.push(f, String(n));
      }
      const hdel = ["HDEL", key, ...del.filter((f) => typeof f === "string" && f.length <= MAX_FIELD_LEN)];

      const now = new Date().toISOString();
      const cmds = [];
      if (hset.length > 2) cmds.push(hset);
      if (hdel.length > 2) cmds.push(hdel);
      cmds.push(["SET", `${key}:updatedAt`, now], ["HGETALL", key]);
      const out = await redis(cmds);
      return res.status(200).json({ shared: true, returns: toMap(out[out.length - 1]), updatedAt: now });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method not allowed" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "storage error" });
  }
};
