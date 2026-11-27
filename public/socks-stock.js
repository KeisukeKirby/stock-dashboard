/* Socks・Coolcore の在庫シート: Zort の在庫から該当する SKU だけを取り出して表示する。
   Socks    = VFF の靴下 (商品名に Socks を含む VFF の SKU) + Barefoot Japan (BFJ) + Oleno (OLN)
   Coolcore = 品番が CC で始まる SKU
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
          const p = parseName(z.names[sku] || sku);
          it = { code: sku, ...p, qty: stores.map(() => 0) };
          byCode.set(sku, it);
        }
        return it;
      };
      z.locations.forEach((loc, k) => {
        for (const [sku, q] of Object.entries(loc.stock)) if (cfg.match(sku, z.names[sku])) add(sku).qty[k] += q;
      });
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
      const ncol = 3 + shown.length + 1;
      $(`${p}Thead`).innerHTML = `
        <tr class="title"><th colspan="${ncol}">${esc(t(`${cfg.key}.sheetTitle`))}</th></tr>
        <tr class="asof"><th colspan="${ncol}">${esc(t("zort.asof", { t: `Zort ${data.zortAt}` }))}</th></tr>
        <tr class="h1"><th>Model</th><th>Color</th><th>Size</th>
          ${shown.map((i) => `<th title="${esc(data.stores[i])}">${esc(short(data.stores[i]))}</th>`).join("")}<th>Total</th></tr>`;
      const body = rows.map((it) => `<tr><td title="${esc(it.code)}">${esc(it.model.replace(/^VFF\s+/, ""))}</td><td>${esc(it.color)}</td><td class="c">${esc(it.size)}</td>
        ${shown.map((i) => `<td class="c${it.qty[i] < 0 ? " neg" : ""}"${it.qty[i] < 0 ? ` title="${esc(t("vivo.negTitle"))}"` : ""}>${nf(it.qty[i])}</td>`).join("")}
        <td class="c b">${nf(total(it))}</td></tr>`);
      if (!rows.length) body.push(`<tr><td class="empty" colspan="${ncol}">${esc(t("empty"))}</td></tr>`);
      const sum = (i) => rows.reduce((a, it) => a + (it.qty[i] || 0), 0);
      body.push(`<tr class="total"><td>Total</td><td></td><td></td>${shown.map((i) => `<td class="c">${nf(sum(i))}</td>`).join("")}<td class="c">${nf(rows.reduce((a, it) => a + total(it), 0))}</td></tr>`);
      $(`${p}Tbody`).innerHTML = body.join("");
      $(`${p}Count`).textContent = rows.length === data.items.length ? t("count.all", { n: data.items.length }) : t("count.of", { n: data.items.length, m: rows.length });
      $(`${p}Note`).textContent = t(`${cfg.key}.note`);
    }

    [`${cfg.prefix}q`, `${cfg.prefix}Stock`].forEach((id, n) => $(id).addEventListener(n === 0 ? "input" : "change", render));
    window.I18N.onChange(render);
    let shownAt = null;
    const show = (z) => {
      if (!z) return render();
      data = build(z);
      shownAt = z.fetchedAt;
      render();
    };
    show(window.ZORT_CACHED);
    if (window.ZORT) window.ZORT.then((fresh) => { if (fresh && fresh.fetchedAt !== shownAt) show(fresh); else if (!data) render(); });
    window.addEventListener("zort-update", (e) => { if (e.detail.fetchedAt !== shownAt) show(e.detail); });
  }

  sheet({ prefix: "s", key: "socks", match: (sku, name) => (sku.startsWith("VFF") && isSocks(name)) || /^(BFJ|OLN)\d/.test(sku) });
  sheet({ prefix: "c", key: "coolcore", match: (sku) => /^CC\d/.test(sku) });
})();
