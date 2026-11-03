/* Zort の在庫 (api/zort) を読み込み、ダッシュボードの拠点に振り分ける。
   window.ZORT = Promise<{ fetchedAt, byLocation: { 拠点名: { SKU: 数量 } }, unmapped: [ { store, name, total } ], names } | null>
   Zort が未設定・失敗のときは null (手書き棚卸などの数のまま表示する)。 */
(() => {
  // Zort の倉庫名 → ダッシュボードの拠点 (名前の空白・記号を除き小文字で比べる)。上から順に最初に一致したもの
  const MAP = [
    [/^kvillage$|^kvillage/, "K Village"],
    [/coollabo.*lp|centrallp|ladprao|lardprao/, "Central LP"],
    [/paradise/, "Paradise Park"],
    [/chidlom|centralcl/, "Central CL (Department)"],
    [/siam/, "Siam Discovery"],
    [/asok/, "Event Asok"],
    [/คลังสินค้าหลัก|^main|headoffice|^office/, "Office"],
  ];
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s._\-/()]/g, "");
  const locationOf = (name) => {
    const n = norm(name);
    const hit = MAP.find(([re]) => re.test(n));
    return hit ? hit[1] : null;
  };

  window.ZORT = fetch("api/zort", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.configured || !j.stores) return null;
      const byLocation = {};
      const unmapped = [];
      for (const st of j.stores) {
        for (const wh of st.warehouses) {
          const loc = locationOf(wh.name);
          const total = Object.values(wh.stock).reduce((a, v) => a + v, 0);
          if (!loc) { unmapped.push({ store: st.store, name: wh.name, total }); continue; }
          const m = (byLocation[loc] = byLocation[loc] || {});
          for (const [sku, q] of Object.entries(wh.stock)) m[sku] = (m[sku] || 0) + q;
        }
      }
      return { fetchedAt: j.fetchedAt, byLocation, unmapped, names: j.names || {} };
    })
    .catch(() => null);
})();
