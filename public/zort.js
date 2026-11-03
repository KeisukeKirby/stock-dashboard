/* Zort の在庫 (api/zort) を読み込み、ダッシュボードの拠点に振り分ける。
   window.ZORT = Promise<{ fetchedAt, locations: [ { name, kind, stock: { SKU: 数量 } } ], byLocation, names } | null>
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
  const norm = (s) => String(s || "").toLowerCase().replace(/[\s._\-/()]/g, "");
  const classify = (name) => {
    const n = norm(name);
    const hit = MAP.find(([re]) => re.test(n));
    return hit ? { name: hit[1] || String(name).trim(), kind: hit[2] } : { name: String(name).trim(), kind: "other" };
  };

  window.ZORT = fetch("api/zort", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j) => {
      if (!j || !j.configured || !j.stores) return null;
      const locations = [];
      for (const st of j.stores) {
        for (const wh of st.warehouses) {
          const c = classify(wh.name);
          let loc = locations.find((l) => l.name === c.name);
          if (!loc) locations.push((loc = { ...c, stock: {} }));
          for (const [sku, q] of Object.entries(wh.stock)) loc.stock[sku] = (loc.stock[sku] || 0) + q;
        }
      }
      const byLocation = Object.fromEntries(locations.map((l) => [l.name, l.stock]));
      return { fetchedAt: j.fetchedAt, locations, byLocation, names: j.names || {} };
    })
    .catch(() => null);
})();
