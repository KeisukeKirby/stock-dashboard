/* BD オンボーディング・ダッシュボード  —  静的 HTML + JSON。ビルド不要。
   データは data/*.json（取引条件・委託実績も含む。社内限り、全ページ noindex）。 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const languages = ["ja", "en", "th"];
  let language = "ja";
  try { const saved = localStorage.getItem("bd.language"); if (languages.includes(saved)) language = saved; } catch {}
  const tr = (ja, en, th) => [ja, en, th][languages.indexOf(language)];
  const locale = () => D.translations?.[language] || {};
  const external = (url, label, attrs = {}) => h("a", { ...attrs, href: url, target: "_blank", rel: "noopener noreferrer" }, label);
  const h = (tag, attrs = {}, ...kids) => {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  };
  const fmt = (n, d = 0) => n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("ja-JP", { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtM = (n) => n == null ? "–" : (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + "M" : fmt(n));
  const src = (text) => text ? h("span", { class: "src", title: `${tr("出典", "Source", "ที่มา")} · ${text}` }, "src") : null;
  const missing = (label = tr("未入力", "Unavailable", "ยังไม่มีข้อมูล")) => h("span", { class: "missing" }, label);
  const val = (v, s) => (v == null || v === "" ? missing() : h("span", {}, v, src(s)));
  const BRAND_COLOR = { VFF: "var(--c-vff)", Vivo: "var(--c-vivo)", Oleno: "var(--c-oleno)", OLENO: "var(--c-oleno)", Coolcore: "var(--c-coolcore)", AQOZ: "var(--c-aqos)", Others: "var(--c-others)" };
  const BRAND_ID = { vff: "VFF", vivo: "Vivo", oleno: "Oleno", coolcore: "Coolcore", aqos: "AQOS" };
  const LIGHT = new Set(["vff"]);

  // ---------- theme ----------
  const themes = ["auto", "light", "dark"];
  const themeLabels = {
    auto: () => tr("自動", "Auto", "อัตโนมัติ"),
    light: () => tr("ライト", "Light", "สว่าง"),
    dark: () => tr("ダーク", "Dark", "มืด")
  };
  let themeMode = "auto";
  try { const saved = localStorage.getItem("bd.theme"); if (themes.includes(saved)) themeMode = saved; } catch {}
  function applyTheme() {
    if (themeMode === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", themeMode);
    $("themeLabel").textContent = themeLabels[themeMode]();
  }
  applyTheme();
  $("themeToggle").addEventListener("click", () => {
    themeMode = themes[(themes.indexOf(themeMode) + 1) % themes.length];
    try { localStorage.setItem("bd.theme", themeMode); } catch {}
    applyTheme();
  });

  // ---------- data ----------
  const D = {};
  async function loadJSON(path) { const r = await fetch(path, { cache: "no-store" }); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }
  async function loadAll() {
    const files = { brands: "data/brands.json", stores: "data/stores.json", guidelines: "data/guidelines.json", sns: "data/sns.json", sales: "data/sales_monthly.json", terms: "data/terms.json", consignment: "data/consignment.json", translations: "data/section_translations.json" };
    await Promise.all(Object.entries(files).map(async ([k, p]) => { try { D[k] = await loadJSON(p); } catch (e) { console.error(e); D[k] = null; } }));
    D.products = {};
    await Promise.all(Object.keys(BRAND_ID).map(async (id) => { try { D.products[id] = await loadJSON(`data/products/${id}.json`); } catch { D.products[id] = null; } }));
  }

  // ---------- generic table ----------
  function table(cols, rows, opts = {}) {
    // cols: [{key,label,num,wrap,render,csv}]  rows: array of objects
    const wrap = h("div", { class: "tablewrap" });
    const tbl = h("table", { class: "dt" });
    const thead = h("thead"), tbody = h("tbody");
    let sortKey = opts.sortKey || null, desc = opts.desc || false, filter = "";
    const ths = cols.map((c) => h("th", { class: (c.num ? "num " : "") + (c.wrap ? "wrap" : ""), onclick: () => { if (sortKey === c.key) desc = !desc; else { sortKey = c.key; desc = !!c.num; } draw(); } }, c.label));
    thead.append(h("tr", {}, ths)); tbl.append(thead, tbody); wrap.append(tbl);
    const cell = (c, r) => { const v = r[c.key]; return c.render ? c.render(v, r) : c.num ? fmt(v, c.digits || 0) : (v == null || v === "" ? missing() : String(v)); };
    function current() {
      let rs = rows.slice();
      if (filter) { const f = filter.toLowerCase(); rs = rs.filter((r) => cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(f))); }
      if (sortKey) { const c = cols.find((x) => x.key === sortKey); rs.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x == null) return 1; if (y == null) return -1; const r = c && c.num ? x - y : String(x).localeCompare(String(y), language); return desc ? -r : r; }); }
      return rs;
    }
    function draw() {
      ths.forEach((th, i) => { th.classList.toggle("sorted", cols[i].key === sortKey); th.classList.toggle("desc", cols[i].key === sortKey && desc); });
      tbody.replaceChildren();
      const rs = current();
      for (const r of rs) tbody.append(h("tr", { class: r._total ? "total" : "" }, cols.map((c) => h("td", { class: (c.num ? "num " : "") + (c.wrap ? "wrap" : "") }, cell(c, r)))));
      if (opts.total) { const t = opts.total(rs); if (t) tbody.append(h("tr", { class: "total" }, cols.map((c) => h("td", { class: c.num ? "num" : "" }, t[c.key] == null ? "" : c.num ? fmt(t[c.key], c.digits || 0) : t[c.key])))); }
      if (counter) counter.textContent = tr(`${rs.length} 件`, `${rs.length} rows`, `${rs.length} รายการ`);
    }
    let counter = null;
    const bar = h("div", { class: "toolbar" });
    if (opts.search !== false) bar.append(h("input", { type: "search", placeholder: tr("検索…", "Search…", "ค้นหา…"), oninput: (e) => { filter = e.target.value; draw(); } }));
    if (opts.extra) bar.append(...[].concat(opts.extra));
    counter = h("span", { class: "count" }); bar.append(counter);
    if (opts.csv !== false) bar.append(h("button", { class: "ghost", type: "button", onclick: () => csv(cols, current(), opts.csvName || "table") }, tr("CSV 保存", "Download CSV", "ดาวน์โหลด CSV")));
    draw();
    return h("div", {}, bar, wrap);
  }
  function csv(cols, rows, name) {
    const q = (s) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines = [cols.map((c) => q(c.label)).join(",")];
    for (const r of rows) lines.push(cols.map((c) => q(c.csv ? c.csv(r[c.key], r) : r[c.key])).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `${name}_${new Date().toISOString().slice(0, 10)}.csv` }); document.body.append(a); a.click(); a.remove();
  }

  // ---------- SVG stacked bar chart ----------
  function stackedBars(months, series, { height = 260, fmtY = fmtM } = {}) {
    // series: [{name,color,values:{month:number}}]
    const W = 900, H = height, padL = 56, padR = 12, padT = 12, padB = 34;
    const totals = months.map((m) => series.reduce((s, x) => s + (x.values[m] || 0), 0));
    const max = Math.max(1, ...totals);
    const bw = (W - padL - padR) / months.length;
    const y = (v) => padT + (H - padT - padB) * (1 - v / max);
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "chart"); svg.setAttribute("role", "img");
    const ns = (t, a) => { const e = document.createElementNS("http://www.w3.org/2000/svg", t); for (const [k, v] of Object.entries(a)) e.setAttribute(k, v); return e; };
    for (let i = 0; i <= 4; i++) { const v = (max / 4) * i; svg.append(ns("line", { x1: padL, x2: W - padR, y1: y(v), y2: y(v), stroke: "var(--line)" })); const t = ns("text", { x: padL - 6, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }); t.textContent = fmtY(v); svg.append(t); }
    months.forEach((m, i) => {
      let acc = 0;
      for (const s of series) { const v = s.values[m] || 0; if (!v) continue; const r = ns("rect", { x: padL + i * bw + bw * 0.15, width: bw * 0.7, y: y(acc + v), height: Math.max(0, y(acc) - y(acc + v)), fill: s.color, rx: 2 }); const title = ns("title", {}); title.textContent = `${m} ${s.name}: ${fmt(v)}`; r.append(title); svg.append(r); acc += v; }
      const t = ns("text", { x: padL + i * bw + bw / 2, y: H - padB + 16, "text-anchor": "middle", "font-size": 11 }); t.textContent = m.slice(2).replace("-", "/"); svg.append(t);
      const tt = ns("text", { x: padL + i * bw + bw / 2, y: y(totals[i]) - 4, "text-anchor": "middle", "font-size": 10.5 }); tt.textContent = totals[i] ? fmtY(totals[i]) : ""; svg.append(tt);
    });
    const legend = h("div", { class: "legend" }, series.map((s) => h("span", {}, h("i", { style: `background:${s.color}` }), s.name)));
    return h("div", {}, svg, legend);
  }

  // ---------- router ----------
  const views = Object.create(null);
  const sections = {
    sales: ["売上", "Sales", "ยอดขาย"],
    brands: ["ブランド", "Brands", "แบรนด์"],
    guidelines: ["ガイドライン", "Brand guidelines", "คู่มือแบรนด์"],
    stores: ["店舗一覧", "Stores", "รายชื่อร้าน"],
    consignment: ["委託販売", "Consignment", "การฝากขาย"],
    terms: ["取引条件", "Trade terms", "เงื่อนไขการค้า"],
    sns: ["SNS", "Social media", "โซเชียลมีเดีย"]
  };
  function applyLanguage() {
    document.documentElement.lang = language;
    $("pageTitle").textContent = tr("BD オンボーディング・ダッシュボード", "BD Onboarding Dashboard", "แดชบอร์ดปฐมนิเทศ BD");
    document.title = $("pageTitle").textContent;
    $("confidentiality").textContent = tr("社外秘", "Internal only", "ใช้ภายในเท่านั้น");
    $("sections").setAttribute("aria-label", tr("セクション", "Sections", "ส่วนข้อมูล"));
    $("themeToggle").setAttribute("aria-label", tr("表示モード切替", "Change display theme", "เปลี่ยนธีมการแสดงผล"));
    $("themeLabel").textContent = themeLabels[themeMode]();
    document.querySelectorAll(".tab").forEach(tab => { tab.textContent = tr(...sections[tab.dataset.view]); });
    document.querySelectorAll("[data-language]").forEach(button => {
      const active = button.dataset.language === language;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("on", active);
    });
    document.querySelectorAll(".view").forEach(section => { delete section.dataset.ready; });
    route();
  }
  document.querySelectorAll("[data-language]").forEach(button => button.addEventListener("click", () => {
    language = button.dataset.language;
    try { localStorage.setItem("bd.language", language); } catch {}
    applyLanguage();
  }));
  function route() {
    const hash = (location.hash || "#sales").slice(1);
    const [view, sub] = hash.split("-", 2).length > 1 && hash.startsWith("brand-") ? ["brands", hash.slice(6)] : [hash, null];
    const name = Object.hasOwn(views, view) ? view : "sales";
    if (name !== view) history.replaceState(null, "", "#sales");
    document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
    document.querySelectorAll(".tab").forEach((tab) => {
      const active = tab.dataset.view === name;
      tab.classList.toggle("active", active);
      if (active) tab.setAttribute("aria-current", "page");
      else tab.removeAttribute("aria-current");
    });
    const el = $(`view-${name}`);
    if (!el.dataset.ready || name === "brands") { el.replaceChildren(); views[name](el, sub); el.dataset.ready = "1"; }
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);

  // ---------- BRANDS ----------
  views.brands = (el, sub) => {
    const B = D.brands ? D.brands.items : [];
    const cur = B.find((b) => b.id === sub) || B[0];
    el.append(h("div", { class: "subtabs" }, B.map((b) => h("a", { class: "subtab" + (b.id === cur.id ? " active" : "") + (LIGHT.has(b.id) ? " light" : ""), href: `#brand-${b.id}`, style: `--bc:${BRAND_COLOR[b.short]}` }, b.name))));
    if (!cur) return;
    const details = locale().brands?.[cur.id] || {};
    const b = { ...cur, ...details };
    el.append(h("div", { class: "brand-head" }, h("span", { class: "logo-chip" + (LIGHT.has(b.id) ? " light" : ""), style: `--bc:${BRAND_COLOR[b.short]}` }, b.short), h("div", {}, h("h2", { style: "margin:0" }, b.name, " ", h("span", { class: "muted small" }, b.nameJa)), h("div", { class: "note" }, b.tagline, " ／ ", b.company === "BFT" ? "Barefootinc (Thailand)" : "Endeavorz", src(b.src)))));
    el.append(h("div", { class: "grid c2" },
      h("div", { class: "card" }, h("h3", {}, tr("概要", "Overview", "ภาพรวม")), h("dl", { class: "kv" },
        h("dt", {}, tr("出自", "Origin", "ที่มา")), h("dd", {}, b.origin), h("dt", {}, tr("コンセプト", "Concept", "แนวคิด")), h("dd", {}, b.concept), h("dt", {}, tr("ターゲット", "Audience", "กลุ่มเป้าหมาย")), h("dd", {}, val(b.target === "未入力" ? null : b.target)),
        h("dt", {}, tr("タイで売る理由／現状", "Thailand market", "ตลาดประเทศไทย")), h("dd", {}, b.whyTH), h("dt", {}, tr("価格帯", "Price range", "ช่วงราคา")), h("dd", {}, b.priceRange), h("dt", {}, tr("取り扱い開始", "Start of sales", "เริ่มจำหน่าย")), h("dd", {}, b.sinceTH && !b.sinceTH.startsWith("未入力") ? b.sinceTH : missing(b.sinceTH || "未入力")),
        h("dt", {}, tr("契約形態", "Distribution", "รูปแบบการจัดจำหน่าย")), h("dd", {}, b.dealType), h("dt", {}, tr("本国の窓口", "Brand contact", "ผู้ติดต่อแบรนด์")), h("dd", {}, b.principal.company, h("div", { class: "small muted" }, b.principal.role), b.principal.contactNote ? h("div", { class: "small" }, missing(), " ", b.principal.contactNote) : null))),
      h("div", {}, h("div", { class: "card" }, h("h3", {}, tr("数字", "Figures", "ตัวเลข")), h("div", { class: "kpi-row" }, b.kpis.map((k) => k.values ? Object.entries(k.values).map(([y, v]) => h("div", { class: "mini" }, h("div", { class: "l" }, y === "2026見込" ? tr(y, "2026 forecast", "คาดการณ์ 2026") : y), h("div", { class: "v num" }, fmt(v)))) : null)), b.kpis.map((k, index) => h("p", { class: "small", style: "margin:8px 0 0" }, h("strong", {}, b.kpiLabels?.[index] || k.label, " · "), b.kpiTexts?.[index] || k.text || "", src(k.src)))),
        h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, tr("状況", "Current status", "สถานะ")), h("p", { style: "margin:0" }, b.status), b.goal ? h("p", { class: "small" }, h("strong", {}, tr("目指す形: ", "Proposed partnership · ", "แผนความร่วมมือ · ")), b.goal) : null, b.insight ? h("p", { class: "small" }, h("strong", {}, tr("見立て: ", "What works · ", "ปัจจัยที่ได้ผล · ")), b.insight) : null))));
    const lists = [];
    if (b.constraints) lists.push(h("div", { class: "warnbox" }, h("strong", {}, tr("制限・禁止事項", "Restrictions", "ข้อจำกัด")), h("ul", { class: "clean small" }, b.constraints.map((x) => h("li", {}, x)))));
    if (b.issues) lists.push(h("div", { class: "card" }, h("h3", {}, tr("課題", "Priorities", "ประเด็นที่ต้องดำเนินการ")), h("ul", { class: "clean small" }, b.issues.map((x) => h("li", {}, x)))));
    if (b.wholesale) lists.push(h("div", { class: "card" }, h("h3", {}, tr("卸先", "Wholesale partners", "ร้านค้าส่ง")), table([{ key: "name", label: tr("卸先", "Wholesale partners", "ร้านค้าส่ง"), wrap: true }, { key: "type", label: tr("形態", "Type", "ประเภท") }, { key: "status", label: tr("状況", "Current status", "สถานะ"), wrap: true }], b.wholesale, { search: false, csv: false })));
    el.append(h("div", { class: "grid c2", style: "margin-top:14px" }, lists));
    if (b.history || b.fitFeelFlex || b.sizeGuide) el.append(h("div", { class: "grid c3", style: "margin-top:14px" }, b.history ? h("div", { class: "card" }, h("h3", {}, tr("歴史", "History", "ประวัติ")), h("p", { class: "small", style: "margin:0" }, b.history), src("Product Training Vivobarefoot.pdf")) : null, b.fitFeelFlex ? h("div", { class: "card" }, h("h3", {}, "Fit / Feel / Flex"), h("p", { class: "small", style: "margin:0" }, b.fitFeelFlex)) : null, b.sizeGuide ? h("div", { class: "card" }, h("h3", {}, tr("サイズの測り方", "How to measure", "วิธีวัดขนาด")), h("p", { class: "small", style: "margin:0" }, b.sizeGuide)) : null));
    if (b.links && b.links.length) el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, tr("資料・リンク", "Resources", "เอกสารและลิงก์")), h("ul", { class: "clean small" }, b.links.map((l, index) => h("li", {}, external(l.url, b.linkLabels?.[index] || l.label))))));
    // products
    const P = D.products[b.id];
    if (b.catalogImage) el.append(h("figure", { class: "card", style: "margin:14px 0 0;max-width:440px" },
      external(b.catalogImage, h("img", { src: b.catalogImage, alt: "AQOZ AQUAHOLE", width: 1200, height: 1911, style: "display:block;max-width:100%;height:auto", loading: "lazy" })),
      h("figcaption", { class: "small", style: "margin-top:8px" }, external(b.catalogImage, b.catalogLabel || "AQOZ AQUAHOLE"), " ", b.catalogNote)));
    el.append(h("div", { class: "section-title" }, h("h2", {}, tr("取り扱い商品", "Products", "สินค้า")), P ? h("span", { class: "note" }, P.asOf ? tr(`基準 · ${P.asOf}`, "Source product records", "รายการสินค้าจากเอกสารต้นฉบับ") : "", " ", src(P.source)) : null));
    const catUrl = b.catalogUrl || (P && P.catalog);
    if (catUrl) el.append(h("a", { class: "infobox", href: catUrl, target: "_blank", rel: "noopener", style: "display:block;margin-bottom:12px;color:inherit" }, h("strong", {}, (b.catalogLabel || tr(`${b.name} 商品カタログを開く`, `Open the ${b.name} catalog`, `เปิดแคตตาล็อก ${b.name}`)) + " →"), h("div", { class: "small" }, b.catalogNote || tr("商品の説明・画像・価格・色・サイズ・商品シートはカタログで確認できます。", "See the catalog for product descriptions, images, prices, colors and sizes.", "ดูคำอธิบาย รูปสินค้า ราคา สี และขนาดในแคตตาล็อก"))));
    if (!P || !P.items || !P.items.length) { el.append(h("div", { class: "card" }, missing(tr("商品情報なし", "Product information unavailable", "ยังไม่มีข้อมูลสินค้า")), " ", h("span", { class: "small" }, tr("情報リクエストを参照", "No product records yet.", "ยังไม่มีรายการสินค้า")))); return; }
    const cats = [...new Set(P.items.map((p) => p.category).filter(Boolean))].sort();
    const grid = h("div", { class: "products" });
    const sel = h("select", { onchange: draw }, h("option", { value: "" }, tr("すべてのカテゴリ", "All categories", "ทุกหมวดหมู่")), cats.map((c) => h("option", { value: c }, c)));
    const q = h("input", { type: "search", placeholder: tr("モデル名・色で検索", "Search models or colors", "ค้นหารุ่นหรือสี"), oninput: draw });
    const count = h("span", { class: "count" });
    function draw() {
      const f = q.value.toLowerCase(), c = sel.value;
      const rows = P.items.filter((p) => (!c || p.category === c) && (!f || JSON.stringify([p.name, p.nameJa, p.colours, p.intro, p.code, p.target, p.brief]).toLowerCase().includes(f)));
      count.textContent = tr(`${rows.length} / ${P.items.length} 件`, `${rows.length} / ${P.items.length} products`, `${rows.length} / ${P.items.length} รายการ`);
      grid.replaceChildren(...rows.map((p) => h("div", { class: "product" },
        h("div", { class: "ph" }, p.image ? h("img", { src: p.image, alt: p.name, loading: "lazy" }) : h("span", {}, p.missing ? tr("資料なし", "No source record", "ไม่มีเอกสารต้นฉบับ") : tr("画像なし（Drive 参照）", "See linked resources for images", "ดูรูปในเอกสารที่ลิงก์"))),
        h("div", { class: "pb" }, h("div", { class: "pn" }, p.name, p.nameJa ? h("span", { class: "muted small" }, " ", p.nameJa) : null), h("div", { class: "pc" }, [p.category, p.genders && p.genders.join("/"), p.code].filter(Boolean).join(" · ")),
          h("div", { class: "pp num" }, p.priceThb != null ? `฿${fmt(p.priceThb)}${p.priceThbMax && p.priceThbMax !== p.priceThb ? `–${fmt(p.priceThbMax)}` : ""}` : (p.priceRange ? h("span", { class: "small" }, p.priceRange) : missing(tr("価格未入力", "Price unavailable", "ยังไม่มีราคา")))),
          p.tagline ? h("div", { class: "small", style: "color:var(--ink-2)" }, p.tagline) : null,
          p.intro ? h("div", { class: "pd" }, p.intro) : null,
          (p.colours && p.colours.length) || (p.sizes && p.sizes.length) || (p.features && p.features.length) || p.brief ? h("details", {}, h("summary", {}, tr("色・サイズ・特徴・素材", "Colors, sizes and features", "สี ขนาด และคุณสมบัติ")), p.colours && p.colours.length ? h("div", {}, h("b", {}, tr("色: ", "Colors · ", "สี · ")), p.colours.join(", ")) : null, p.sizes && p.sizes.length ? h("div", {}, h("b", {}, tr("サイズ: ", "Sizes · ", "ขนาด · ")), p.sizes.join(", ")) : null, p.features && p.features.length ? h("ul", { class: "clean" }, p.features.map((f) => h("li", {}, f))) : null, p.weight ? h("div", {}, h("b", {}, tr("重量: ", "Weight · ", "น้ำหนัก · ")), p.weight) : null, p.target ? h("div", {}, h("b", {}, tr("用途・ターゲット: ", "Use and audience · ", "การใช้งานและกลุ่มเป้าหมาย · ")), p.target) : null, p.brief ? h("div", {}, h("b", {}, tr("トレーニング資料: ", "Training notes · ", "หมายเหตุจากคู่มืออบรม · ")), p.brief) : null, p.materials ? h("div", {}, h("b", {}, tr("素材: ", "Materials · ", "วัสดุ · ")), p.materials) : null, p.care ? h("div", {}, h("b", {}, tr("ケア: ", "Care · ", "การดูแล · ")), p.care) : null, p.priceNote ? h("div", { class: "muted" }, p.priceNote) : null) : null,
          p.links && p.links.jp ? h("a", { class: "small", href: p.links.jp, target: "_blank", rel: "noopener" }, tr("公式ページ（日本）→", "Official page (Japan) ↗", "หน้าทางการ (ญี่ปุ่น) ↗")) : null,
          p.pdf ? h("a", { class: "small", href: p.pdf, target: "_blank", rel: "noopener" }, tr("商品シート PDF →", "Product sheet (PDF) ↗", "เอกสารสินค้า (PDF) ↗")) : null))));
    }
    el.append(h("div", { class: "toolbar" }, q, sel, count), grid); draw();
  };

  // ---------- terms / consignment（社内限り。取引条件は GM の判断で全件掲載） ----------
  function gate(el, doc, render) {
    const data = D[doc];
    if (!data) { el.append(h("p", { class: "error" }, tr("データを読み込めませんでした", "Could not load the data", "โหลดข้อมูลไม่ได้"))); return; }
    render(el, data);
  }
  function simpleTable(columns, rows) {
    const header = h("tr", {}, columns.map(column => h("th", { scope: "col" }, column)));
    return h("div", { class: "tablewrap" }, h("table", { class: "dt" }, h("thead", {}, header),
      h("tbody", {}, rows.map(row => h("tr", {}, row.map(cell => h("td", { class: "wrap" }, cell ?? "–")))))));
  }

  views.sales = (el) => {
    const links = D.sales?.sources || [];
    const labels = {
      bft: tr("BFT 販売実績ダッシュボード", "BFT Sales Dashboard", "แดชบอร์ดยอดขาย BFT"),
      edv: tr("EDV 販売実績ダッシュボード", "EDV Sales Dashboard", "แดชบอร์ดยอดขาย EDV")
    };
    el.append(h("div", { class: "grid c2" }, links.map(link =>
      external(link.url, h("strong", {}, labels[link.id] || link.label, " ↗"), { class: "card" }))));
  };

  views.stores = (el) => {
    if (!D.stores) return;
    const storeLabels = locale().stores || {};
    const rows = D.stores.items.filter(store =>
      store.type === "direct" || (store.type === "dept" && store.id !== "central-others"));
    const links = [
      [D.stores.referenceUrl, tr("店舗資料", "Store reference", "เอกสารอ้างอิงร้าน")],
      ["https://stock-dashboard-kadq.vercel.app/", tr("店舗・オフィス在庫", "Store and office inventory", "สต็อกร้านและสำนักงาน")],
      ["https://vff-stock-dashboard.vercel.app/", tr("VFF 在庫・欠品予測", "VFF stock and shortage forecast", "สต็อก VFF และคาดการณ์สินค้าขาด")],
      ["https://kaizen-manual.vercel.app/", tr("店舗・倉庫の業務マニュアル", "Store and warehouse procedures", "คู่มือปฏิบัติงานร้านและคลังสินค้า")]
    ];
    el.append(simpleTable(
      [tr("店舗", "Store", "ร้าน"), tr("所在地", "Location", "ที่ตั้ง"), tr("営業時間", "Hours", "เวลาเปิด"), tr("開店", "Opened", "เปิดร้าน"), tr("リンク", "Link", "ลิงก์")],
      rows.map(store => {
        const info = { ...store, ...storeLabels[store.id] };
        const map = store.map || (store.mapQuery ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.mapQuery) : "");
        return [info.name, h("div", {}, info.location, info.address && h("div", { class: "muted small" }, info.address)), info.hours || null,
          info.opened || null, map ? external(map, "Google Maps ↗") : null];
      })
    ));
    el.append(h("div", { class: "card", style: "margin-top:14px" },
      h("h2", {}, tr("関連リンク", "Related links", "ลิงก์ที่เกี่ยวข้อง")),
      h("ul", { class: "clean" }, links.filter(([url]) => url).map(([url, label]) => h("li", {}, external(url, label))))));
  };

  views.guidelines = (el) => {
    const labels = locale().guidelines || {};
    el.append(h("div", { class: "grid c2" }, (D.guidelines?.brands || []).map(group =>
      h("div", { class: "card" }, h("h2", {}, group.brand === "Vivo" ? "Vivobarefoot" : "Vibram FiveFingers"),
        h("ul", { class: "clean" }, group.docs.map((doc, index) =>
          h("li", {}, external(doc.url, labels[group.brand]?.[index] || doc.label))))))));
  };

  views.terms = (el) => {
    const conditions = locale().terms || D.translations?.ja?.terms || [];
    const rows = (D.terms?.items || []).map((item, index) => {
      const summary = conditions[index];
      return [summary?.counterparty || item.counterparty, summary?.brand || item.brand, summary?.condition || item.value];
    });
    el.append(simpleTable([tr("取引先", "Counterparty", "คู่ค้า"), tr("ブランド", "Brand", "แบรนด์"), tr("条件", "Terms", "เงื่อนไข")], rows));
  };

  views.sns = (el) => {
    const rows = (D.sns?.items || []).map(item => [
      item.brand === "Vivobarefoot（公式 SNS）" ? "Vivobarefoot" : item.brand,
      item.platform === "Instagram ほか" ? "Instagram" : item.platform,
      item.handle || null,
      item.url ? external(item.url, item.url.replace(/^https?:\/\/(?:www\.)?/, "")) : null
    ]);
    el.append(simpleTable([tr("ブランド", "Brand", "แบรนด์"), tr("プラットフォーム", "Platform", "แพลตฟอร์ม"), tr("アカウント", "Account", "บัญชี"), "URL"], rows));
  };

  views.consignment = (el) => gate(el, "consignment", (el, C) => {
    el.append(h("div", { class: "section-title" }, h("h2", {}, tr("委託販売実績（足数）", "Consignment sales (units)", "ยอดฝากขาย (จำนวนชิ้น)")), h("span", { class: "note" }, `${C.period || ""} · ${tr("更新", "Updated", "อัปเดต")} ${C.updatedAt}`, src(C.source))));
    if (C.notes) el.append(h("div", { class: "infobox" }, h("ul", { class: "clean small" }, (locale().consignmentNotes || C.notes).map((n) => h("li", {}, n)))));
    const months = C.months || [];
    const consigneeTypes = {
      "デパート委託": tr("デパート委託", "Department store", "ห้างสรรพสินค้า"),
      "アウトドア店委託": tr("アウトドア店委託", "Outdoor store", "ร้านอุปกรณ์กลางแจ้ง"),
      "店舗（買取へ移行中）": tr("店舗（買取へ移行中）", "Store moving to outright purchase", "ร้านค้าที่กำลังเปลี่ยนเป็นซื้อขาด"),
      "ランニングショップ委託": tr("ランニングショップ委託", "Running store", "ร้านอุปกรณ์วิ่ง"),
      "店舗委託": tr("店舗委託", "Retail store", "ร้านค้าปลีก"),
      "個人・小規模委託": tr("個人・小規模委託", "Individual or small business", "บุคคลหรือธุรกิจขนาดเล็ก"),
      "カフェ委託": tr("カフェ委託", "Café", "คาเฟ่")
    };
    const rows = C.consignees.map((c) => ({ ...c, type: consigneeTypes[c.type] || c.type, brandsText: (c.brands || []).join(" / "), last12: months.slice(-12).reduce((a, m) => a + ((c.monthly || {})[m] || 0), 0) }));
    el.append(h("div", { class: "card", style: "margin-top:14px" }, table([{ key: "name", label: tr("委託先", "Consignee", "ผู้รับฝากขาย") }, { key: "type", label: tr("形態", "Type", "ประเภท") }, { key: "brandsText", label: tr("ブランド", "Brand", "แบรนด์") }, { key: "skuCount", label: "SKU", num: true }, { key: "delivered", label: tr("納品", "Delivered", "ส่งมอบ"), num: true }, { key: "sold", label: tr("販売", "Sold", "ขาย"), num: true }, { key: "returned", label: tr("返品", "Returned", "คืน"), num: true }, { key: "balance", label: tr("残", "Balance", "คงเหลือ"), num: true }, { key: "last12", label: tr("直近12か月 販売", "Sold in last 12 months", "ขายใน 12 เดือนล่าสุด"), num: true }, { key: "firstMonth", label: tr("開始", "First sale", "ขายครั้งแรก") }, { key: "lastMonth", label: tr("最終販売", "Last sale", "ขายล่าสุด") }], rows, { sortKey: "sold", desc: true, csvName: "consignment", total: (rs) => ({ name: tr("合計", "Total", "รวม"), skuCount: rs.reduce((a, r) => a + (r.skuCount || 0), 0), delivered: rs.reduce((a, r) => a + (r.delivered || 0), 0), sold: rs.reduce((a, r) => a + (r.sold || 0), 0), returned: rs.reduce((a, r) => a + (r.returned || 0), 0), balance: rs.reduce((a, r) => a + (r.balance || 0), 0), last12: rs.reduce((a, r) => a + (r.last12 || 0), 0) }) })));
    if (months.length) {
      const top = rows.slice().sort((a, b) => b.sold - a.sold).slice(0, 8);
      const palette = ["#3b82c4", "#d03b3b", "#2e9e5b", "#d99100", "#7c5cbf", "#00a7e1", "#8a8c8f", "#c2185b"];
      const last = months.slice(-18);
      el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, tr("委託先別 月次販売足数（上位 8・直近 18 か月）", "Monthly consignment sales (top 8, last 18 months)", "ยอดฝากขายรายเดือน (8 อันดับแรก ใน 18 เดือนล่าสุด)")), stackedBars(last, top.map((c, i) => ({ name: c.name, color: palette[i % palette.length], values: c.monthly || {} })), { fmtY: (v) => fmt(v) })));
      const mrows = rows.map((c) => { const r = { name: c.name }; for (const m of last) r[m] = (c.monthly || {})[m] || 0; return r; });
      el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, tr("委託先 × 月（販売足数）", "Units sold by consignee and month", "จำนวนที่ขายแยกตามผู้รับฝากขายและเดือน")), table([{ key: "name", label: tr("委託先", "Consignee", "ผู้รับฝากขาย") }, ...last.map((m) => ({ key: m, label: m.slice(2), num: true }))], mrows, { search: false, csvName: "consignment_monthly" })));
    }
    if (C.byBrandTotal) el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, tr("ブランド別 合計", "Totals by brand", "ยอดรวมตามแบรนด์")), table([{ key: "brand", label: tr("ブランド", "Brand", "แบรนด์") }, { key: "delivered", label: tr("納品", "Delivered", "ส่งมอบ"), num: true }, { key: "sold", label: tr("販売", "Sold", "ขาย"), num: true }, { key: "balance", label: tr("残", "Balance", "คงเหลือ"), num: true }], Object.entries(C.byBrandTotal).map(([b, v]) => ({ brand: b, ...v })), { search: false, csv: false })));
  });

  (async () => { await loadAll(); applyLanguage(); })();
})();
