/* Socks・Coolcore の在庫シート: Zort の在庫から該当する SKU だけを取り出して表示する。
   Socks    = VFF の靴下 (商品名に Socks を含む VFF の SKU) + Barefoot Japan (BFJ)
   Oleno    = 品番が OLN で始まる SKU
   Coolcore = 品番が CC・CP で始まる SKU
   VFF の靴下は VFF の在庫一覧には出さない (app.js の isSocks で除いている)。 */
(() => {
  const $ = (id) => document.getElementById(id);
  const t = (k, p) => window.I18N.t(k, p);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const nf = (v) => (v == null ? "" : v === 0 ? "-" : v < 0 ? `(${Math.abs(v).toLocaleString("en-US")})` : v.toLocaleString("en-US"));
  const short = (g) => String(g).replace(" (Department)", " (Dept.)");
  const SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL"];
  const isSize = (s) => SIZES.includes(String(s).toUpperCase()) || /^(F|FREE|ONE ?SIZE)$/i.test(s) || /^\d/.test(s);
  // サイズの並び: S・M・L… → 数字 (23-25 など) の小さい順 → そのほか
  const sizeKey = (s) => {
    const i = SIZES.indexOf(String(s).toUpperCase());
    if (i >= 0) return [0, i];
    const n = parseFloat(s);
    return Number.isFinite(n) ? [1, n] : [2, 0];
  };
  const isSocks = (name) => /socks?\b/i.test(String(name || ""));
  window.IS_SOCKS = isSocks;

  // 商品名から モデル・サイズ・カラー を取り出す。例: "BFJ Socks(L, Black)" / "CP Arm Sleeves (Black, L)" / "Headband Studio(Black)"
  function parseName(name) {
    const mm = /^(.*)\(([^()]*)\)\s*$/.exec(String(name || ""));
    if (!mm) return { model: String(name || "").trim(), size: "", color: "" };
    const parts = mm[2].split(",").map((x) => x.trim()).filter(Boolean);
    let size = "", color = "";
    if (parts.length === 1) (isSize(parts[0]) ? (size = parts[0]) : (color = parts[0]));
    else if (!isSize(parts[0]) && isSize(parts[parts.length - 1])) { size = parts[parts.length - 1]; color = parts.slice(0, -1).join(", "); }
    else { size = parts[0]; color = parts.slice(1).join(", "); }
    return { model: mm[1].trim(), size, color };
  }

  function sheet(cfg) {
    let data = null;
    const build = (z) => {
      const stores = z.locations.map((l) => l.name);
      const byCode = new Map();
      const add = (sku) => {
        let it = byCode.get(sku);
        if (!it) {
          const cn = window.OTHER_SHEET.consign();
          const p = parseName(z.names[sku] || (cn && cn.names && cn.names[sku]) || sku);
          it = { code: sku, ...p, qty: stores.map(() => 0) };
          byCode.set(sku, it);
        }
        return it;
      };
      z.locations.forEach((loc, k) => {
        for (const [sku, q] of Object.entries(loc.stock)) if (cfg.match(sku, z.names[sku])) add(sku).qty[k] += q;
      });
      // 委託先の在庫 (public/consign.json)。Central CL・Siam Discovery などはこの数に置き換え、Zort にない委託先は列を足す
      const cons = window.OTHER_SHEET.consign();
      if (cons) {
        for (const [store, m] of Object.entries(cons.stores || {})) {
          const mine = Object.entries(m).filter(([sku]) => cfg.match(sku, z.names[sku] || cfg.nameOf(sku, m)));
          if (!mine.length) continue; // 委託の表にこの表の品目がない拠点は Zort の数のまま (例: Pathwild の Oleno)
          let k = stores.indexOf(store);
          if (k < 0) {
            if (!mine.some(([, q]) => q)) continue;
            stores.push(store);
            byCode.forEach((it) => it.qty.push(0));
            k = stores.length - 1;
          }
          // 同じ委託先の Zort の列 (例: EDV の Central Chidlom → "Central CL (Department) (EDV)") は二重にならないよう 0 にする
          const base = (n) => n.replace(/\s*\((EDV|BFT)\)$/, "").replace(/\s+/g, "").toLowerCase();
          stores.forEach((n, j) => { if (j !== k && base(n) === base(store)) byCode.forEach((it) => (it.qty[j] = 0)); });
          byCode.forEach((it) => (it.qty[k] = 0));
          for (const [sku, q] of mine) add(sku).qty[k] = q;
        }
      }
      const mk = (it) => it.model.replace(/^VFF\s+/, "").toLowerCase();
      const cfirst = new Map();
      const items = [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code, "en"));
      items.forEach((it, i) => { const k = `${mk(it)}|${it.color}`; if (!cfirst.has(k)) cfirst.set(k, i); });
      items.sort((a, b) => {
        const sa = sizeKey(a.size), sb = sizeKey(b.size);
        return mk(a).localeCompare(mk(b), "en") || cfirst.get(`${mk(a)}|${a.color}`) - cfirst.get(`${mk(b)}|${b.color}`) || sa[0] - sb[0] || sa[1] - sb[1];
      });
      return { stores, items, zortAt: window.ZORT_TIME(z.fetchedAt) };
    };

    function render() {
      const p = cfg.prefix;
      if (!data) { $(`${p}Note`).textContent = t("socks.noZort"); return; }
      const q = ($(`${p}q`).value || "").trim().toLowerCase();
      const onlyStock = $(`${p}Stock`).checked;
      const total = (it) => it.qty.reduce((a, v) => a + (v || 0), 0);
      // 在庫がある拠点 (マイナスを含む) だけを列にする
      const shown = data.stores.map((_, i) => i).filter((i) => data.items.some((it) => it.qty[i]));
      const rows = data.items.filter((it) => (!q || `${it.code} ${it.model} ${it.color} ${it.size}`.toLowerCase().includes(q)) && (!onlyStock || total(it) > 0));
      window.OTHER_SHEET.render({
        thead: $(`${p}Thead`), tbody: $(`${p}Tbody`), title: t(`${cfg.key}.sheetTitle`), stores: data.stores, shown, rows,
        asof: t("zort.asof", { t: `Zort ${data.zortAt}` }), modelOf: (it) => it.model.replace(/^VFF\s+/, ""),
      });
      $(`${p}Count`).textContent = rows.length === data.items.length ? t("count.all", { n: data.items.length }) : t("count.of", { n: data.items.length, m: rows.length });
      $(`${p}Note`).textContent = t(`${cfg.key}.note`);
    }

    window.OTHER_SHEET.salesReady.then(() => data && render());
    window.OTHER_SHEET.onSales(() => data && render());
    [`${cfg.prefix}q`, `${cfg.prefix}Stock`].forEach((id, n) => $(id).addEventListener(n === 0 ? "input" : "change", render));
    window.I18N.onChange(render);
    let shownAt = null, lastZ = null;
    window.OTHER_SHEET.consignReady.then(() => { if (lastZ) { data = build(lastZ); render(); } });
    const show = (z) => {
      lastZ = z || lastZ;
      if (!z) return render();
      data = build(z);
      shownAt = z.fetchedAt;
      render();
    };
    show(window.ZORT_CACHED);
    if (window.ZORT) window.ZORT.then((fresh) => { if (fresh && fresh.fetchedAt !== shownAt) show(fresh); else if (!data) render(); });
    window.addEventListener("zort-update", (e) => { if (e.detail.fetchedAt !== shownAt) show(e.detail); });
  }

  // nameOf: Zort の商品名がない品番 (委託の表にだけある品番) の判定用
  const vffSockCode = (sku) => /^VFF00(2[7-9])\(/.test(sku);
  sheet({ prefix: "s", key: "socks", match: (sku, name) => (sku.startsWith("VFF") && (isSocks(name) || (!name && vffSockCode(sku)))) || /^BFJ\d/.test(sku), nameOf: () => "" });
  sheet({ prefix: "o", key: "oleno", match: (sku) => /^OLN\d/.test(sku), nameOf: () => "" });
  sheet({ prefix: "c", key: "coolcore", match: (sku) => /^(CC|CP)\d/.test(sku), nameOf: () => "" });
})();
