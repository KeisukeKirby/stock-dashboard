/* Zort の在庫 (api/zort) を読み込み、ダッシュボードの拠点に振り分ける。
   window.ZORT_CACHED = 前回読み込んだ Zort の在庫 (このブラウザに保存。なければ null)。すぐ表示するために使う
   window.ZORT        = Promise<最新の Zort の在庫 | null>
     どちらも { fetchedAt, locations: [ { name, kind, stock: { SKU: 数量 } } ], byLocation, names }
     kind: "office" | "store" | "event" | "other"  (store は Store Total に入る。other・event は Company Total のみ)
   Zort が未設定・失敗のときは null (stock.json の数のまま表示する)。 */
(() => {
  // Zort の倉庫名 → [ダッシュボードの拠点名, 種類]。名前の空白・記号を除き小文字で比べ、上から順に最初に一致したもの。
  // どれにも当てはまらない倉庫は、Zort の倉庫名のまま「other」の列として追加する。
  const MAP = [
    [/คลังสินค้าหลัก|^main|headoffice|^office$/, "Office", "office"],
    [/^kvillage/, "K Village", "store"],
    [/chidlom|^centralcl/, "Central CL (Department)", "store"],
    [/siam/, "Siam Discovery", "store"],
    [/paradise/, "Paradise Park", "store"],
    [/coollabo.*lp|^centrallp|ladprao|lardprao/, "Central LP", "store"],
    [/thaniya/, "Thaniya", "store"],
    [/pathwild/, "Pathwild", "store"],
    [/^event/, null, "event"], // Event 1 など (名前はそのまま)
  ];
  // アカウントごとに使う拠点。ここに書いたアカウントは、その拠点の倉庫だけを使う。
  // ここに書いた拠点は、そのアカウントがつながっている間はほかのアカウントの倉庫を使わない。
  const ACCOUNT_ONLY = { EDV: ["K Village", "Central LP"] };

  const norm = (s) => String(s || "").toLowerCase().replace(/[\s._\-/()]/g, "");
  const classify = (name) => {
    const n = norm(name);
    const hit = MAP.find(([re]) => re.test(n));
    return hit ? { name: hit[1] || String(name).trim(), kind: hit[2] } : { name: String(name).trim(), kind: "other" };
  };

  function build(j) {
    if (!j || !j.configured || !j.stores) return null;
    const accounts = new Set(j.stores.map((s) => String(s.store).toUpperCase()));
    const owner = {}; // 拠点 → それを担当するアカウント
    Object.entries(ACCOUNT_ONLY).forEach(([acc, locs]) => { if (accounts.has(acc)) locs.forEach((l) => (owner[l] = acc)); });
    const locations = [];
    for (const st of j.stores) {
      const acc = String(st.store).toUpperCase();
      for (const wh of st.warehouses) {
        if (/^(รอ|ของเสีย|สินค้าตัวอย่าง)$/.test(String(wh.name).trim())) continue; // 仮の倉庫は使わない
        const c = classify(wh.name);
        if (ACCOUNT_ONLY[acc] && !ACCOUNT_ONLY[acc].includes(c.name)) continue;
        if (owner[c.name] && owner[c.name] !== acc) continue;
        let loc = locations.find((l) => l.name === c.name);
        if (!loc) locations.push((loc = { ...c, stock: {} }));
        for (const [sku, q] of Object.entries(wh.stock)) loc.stock[sku] = (loc.stock[sku] || 0) + q;
      }
    }
    // 拠点の並びは MAP の順 (アカウントが増えても列の順が変わらないように)
    const order = (l) => { const i = MAP.findIndex(([, name]) => name === l.name); return i < 0 ? 99 : i; };
    locations.sort((a, b) => order(a) - order(b));
    const byLocation = Object.fromEntries(locations.map((l) => [l.name, l.stock]));
    return { fetchedAt: j.fetchedAt, locations, byLocation, names: j.names || {} };
  }

  const KEY = "zortCache";
  let cached = null;
  try { cached = build(JSON.parse(localStorage.getItem(KEY) || "null")); } catch (_) {}
  window.ZORT_CACHED = cached;

  window.ZORT = fetch("api/zort")
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      const z = build(j);
      if (z) { try { localStorage.setItem(KEY, JSON.stringify(j)); } catch (_) {} }
      return z;
    })
    .catch(() => null);
})();
