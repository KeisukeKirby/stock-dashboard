// 取引条件・委託販売実績（社外秘）を合言葉つきで返す Vercel Function
//
//   GET /api/bd-secret?doc=terms          Authorization: Bearer <合言葉>
//   GET /api/bd-secret?doc=consignment
//   GET /api/bd-secret                    → { configured: true|false } （鍵が設定されているかだけ返す）
//
// 合言葉は Vercel の Environment Variables に BD_SECRET_KEY として設定する。
// データ本体は bd/private/*.json にあり、public/ には置かない（静的配信されない）。
// 鍵が未設定のときは中身を返さない（503）。URL を知っていても見られない。
const path = require("path");
const fs = require("fs");

const DOCS = { terms: "terms.json", consignment: "consignment.json" };

function timingSafeEqual(a, b) {
  const crypto = require("crypto");
  const ab = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");
  const key = process.env.BD_SECRET_KEY || "";
  const doc = (req.query && req.query.doc) || "";
  if (!doc) return res.status(200).json({ configured: Boolean(key) });
  if (!DOCS[doc]) return res.status(404).json({ error: "unknown doc" });
  if (!key) return res.status(503).json({ error: "not_configured", message: "BD_SECRET_KEY が未設定です。Vercel の Environment Variables に設定してください。" });
  const auth = String(req.headers.authorization || "");
  const given = auth.replace(/^Bearer\s+/i, "");
  if (!given || !timingSafeEqual(given, key)) return res.status(401).json({ error: "unauthorized" });
  try {
    const file = path.join(__dirname, "..", "private", DOCS[doc]);
    const data = fs.readFileSync(file, "utf8");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(200).send(data);
  } catch (e) {
    return res.status(500).json({ error: "read_failed" });
  }
};
