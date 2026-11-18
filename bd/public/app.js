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
  const BRAND_COLOR = { VFF: "var(--c-vff)", Vivo: "var(--c-vivo)", Oleno: "var(--c-oleno)", OLENO: "var(--c-oleno)", Coolcore: "var(--c-coolcore)", AQOZ: "var(--c-aqos)", Vivobarefoot: "var(--c-vivo)", "Vibram FiveFingers": "var(--c-vff)", "Barefootinc (Thailand)": "var(--accent)", Others: "var(--c-others)" };
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
    const files = { brands: "data/brands.json", stores: "data/stores.json", guidelines: "data/guidelines.json", sns: "data/sns.json", sales: "data/sales_monthly.json", terms: "data/terms.json", consignment: "data/consignment.json", consignmentEdv: "data/consignment_edv.json", pathwild: "data/pathwild_invoices.json", translations: "data/section_translations.json", hub: "data/brand_hub.json" };
    await Promise.all(Object.entries(files).map(async ([k, p]) => { try { D[k] = await loadJSON(p); } catch (e) { console.error(e); D[k] = null; } }));
  }

  // ---------- generic table ----------
  function table(cols, rows, opts = {}) {
    // cols: [{key,label,num,wrap,render,csv}]  rows: array of objects
    const wrap = h("div", { class: "tablewrap" });
    const tbl = h("table", { class: "dt" });
    const thead = h("thead"), tbody = h("tbody");
    let sortKey = opts.sortKey || null, desc = opts.desc || false, filter = "";
    const headNode = (l) => typeof l === "string" && l.includes("\n") ? l.split("\n").flatMap((x, i) => i ? [h("br"), x] : [x]) : l;
    const ths = cols.map((c) => h("th", { class: (c.num ? "num " : "") + (c.wrap ? "wrap" : ""), onclick: () => { if (sortKey === c.key) desc = !desc; else { sortKey = c.key; desc = !!c.num; } draw(); } }, headNode(c.label)));
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
      for (const r of rs) tbody.append(h("tr", { class: r._total ? "total" : r.ended ? "ended" : "" }, cols.map((c) => h("td", { class: (c.num ? "num " : "") + (c.wrap ? "wrap" : "") }, cell(c, r)))));
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
    const lines = [cols.map((c) => q(String(c.label).replace(/\n/g, " "))).join(",")];
    for (const r of rows) lines.push(cols.map((c) => q(c.csv ? c.csv(r[c.key], r) : r[c.key])).join(","));
    const blob = new Blob(["﻿" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `${name}_${new Date().toISOString().slice(0, 10)}.csv` }); document.body.append(a); a.click(); a.remove();
  }

  // ---------- SVG stacked bar chart ----------
  function stackedBars(months, series, { height = 260, fmtY = fmtM, unit = "" } = {}) {
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
      for (const s of series) { const v = s.values[m] || 0; if (!v) continue; const r = ns("rect", { x: padL + i * bw + bw * 0.15, width: bw * 0.7, y: y(acc + v), height: Math.max(0, y(acc) - y(acc + v)), fill: s.color, rx: 2, class: "bar-seg", tabindex: 0 }); r.dataset.tip = `${s.name}\n${m.replace("-", "/")}: ${fmt(v)}${unit}`; svg.append(r); acc += v; }
      const t = ns("text", { x: padL + i * bw + bw / 2, y: H - padB + 16, "text-anchor": "middle", "font-size": 11 }); t.textContent = m.slice(2).replace("-", "/"); svg.append(t);
      const tt = ns("text", { x: padL + i * bw + bw / 2, y: y(totals[i]) - 4, "text-anchor": "middle", "font-size": 10.5 }); tt.textContent = totals[i] ? fmtY(totals[i]) : ""; svg.append(tt);
    });
    const legend = h("div", { class: "legend" }, series.map((s) => h("span", {}, h("i", { style: `background:${s.color}` }), s.name)));
    const tip = h("div", { class: "chart-tip", hidden: true });
    const wrap = h("div", { class: "chart-wrap" }, svg, tip);
    const show = (e) => {
      const seg = e.target.closest && e.target.closest(".bar-seg"); if (!seg) { tip.hidden = true; return; }
      const box = wrap.getBoundingClientRect(), r = seg.getBoundingClientRect();
      tip.textContent = seg.dataset.tip; tip.hidden = false;
      tip.style.left = Math.min(box.width - 170, Math.max(0, r.left - box.left + r.width / 2 - 80)) + "px";
      tip.style.top = Math.max(0, r.top - box.top - tip.offsetHeight - 6) + "px";
    };
    svg.addEventListener("mouseover", show); svg.addEventListener("focusin", show); svg.addEventListener("click", show);
    svg.addEventListener("mouseleave", () => { tip.hidden = true; });
    return h("div", {}, wrap, legend);
  }

  // ---------- lightbox（写真を拡大して全体を表示） ----------
  function openLightbox(src, caption) {
    const close = () => { box.remove(); document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    const box = h("div", { class: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": caption, onclick: close },
      h("figure", {}, h("img", { src, alt: caption }), h("figcaption", {}, caption)),
      h("button", { type: "button", class: "lightbox-close", "aria-label": tr("閉じる", "Close", "ปิด") }, "×"));
    document.body.append(box); document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    box.querySelector(".lightbox-close").focus();
  }

  // ---------- router ----------
  const views = Object.create(null);
  const sections = {
    sales: ["売上", "Sales", "ยอดขาย"],
    brands: ["ブランド", "Brands", "แบรนด์"],
    stores: ["店舗一覧", "Stores", "รายชื่อร้าน"],
    consignment: ["B to B", "B to B", "B to B"],
    terms: ["取引条件", "Trade terms", "เงื่อนไขการค้า"],
    sns: ["SNS・EC", "Social & online shops", "โซเชียลและร้านออนไลน์"],
    shared: ["共有リスト", "What we share", "รายการข้อมูลที่แชร์"]
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
    let view = hash, sub = null;
    if (hash === "guidelines") { view = "brands"; sub = "guidelines"; history.replaceState(null, "", "#brands-guidelines"); }
    else if (hash.startsWith("brands-")) { view = "brands"; sub = hash.slice(7); }
    else if (hash.startsWith("brand-")) { view = "brands"; history.replaceState(null, "", "#brands"); }
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
    if (!el.dataset.ready || name === "brands") {
      el.replaceChildren();
      const lead = {
        consignment: tr("取引先（委託・買取）ごとの販売実績と、委託販売の課題です。", "Sales by business partner (consignment or outright purchase) and consignment issues.", "ยอดขายตามคู่ค้า (ฝากขายหรือซื้อขาด) และปัญหาการฝากขาย"),
        terms: tr("取引先ごとの手数料と取引の形です。", "Commission and deal type for each partner.", "ค่าคอมมิชชันและรูปแบบการค้าของแต่ละคู่ค้า"),
        shared: tr("このダッシュボードで BD に共有している情報と、その出どころ（ソース）の一覧です。売上から順に並べています。", "Everything this dashboard shares with BD and where each item comes from, in tab order starting with Sales.", "ข้อมูลทั้งหมดที่แดชบอร์ดนี้แชร์ให้ BD และแหล่งที่มา เรียงตามแท็บเริ่มจากยอดขาย"),
      }[name];
      el.append(h("header", { class: "page-head" }, h("h2", {}, tr(...sections[name])), lead ? h("p", {}, lead) : null));
      views[name](el, sub); el.dataset.ready = "1";
    }
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);

  // ---------- BRANDS（ブランド一覧 / ガイドライン / カタログ） ----------
  views.brands = (el, sub) => {
    const H = D.hub;
    if (!H) { el.append(h("p", { class: "error" }, tr("データを読み込めませんでした", "Could not load the data", "โหลดข้อมูลไม่ได้"))); return; }
    const t = (o) => (o && (o[language] || o.ja)) || "";
    const parts = [
      ["list", tr("ブランド一覧", "Brand list", "รายชื่อแบรนด์")],
      ["guidelines", tr("ガイドライン", "Brand guidelines", "คู่มือแบรนด์")],
      ["catalogs", tr("カタログ", "Catalogs", "แคตตาล็อก")]
    ];
    const cur = parts.some(([k]) => k === sub) ? sub : "list";
    el.append(h("nav", { class: "subtabs", "aria-label": tr("ブランドの項目", "Brand sections", "หัวข้อแบรนด์") },
      parts.map(([k, label]) => h("a", { class: "subtab" + (k === cur ? " active" : ""), href: k === "list" ? "#brands" : `#brands-${k}`, "aria-current": k === cur ? "page" : null }, label))));
    const companyName = (c) => c === "BFT" ? "Barefootinc (Thailand)" : "Endeavorz";
    if (cur === "list") {
      el.append(h("p", { class: "note", style: "margin:0 0 14px" }, tr(
        "取り扱いブランドは 5 つです。Barefootinc (Thailand)（BFT）が 3 ブランド、Endeavorz（EDV）が 2 ブランドを扱っています。",
        "We handle five brands: three through Barefootinc (Thailand) (BFT) and two through Endeavorz (EDV).",
        "เราดูแล 5 แบรนด์: 3 แบรนด์โดย Barefootinc (Thailand) (BFT) และ 2 แบรนด์โดย Endeavorz (EDV)")));
      el.append(h("div", { class: "grid c2" }, H.brands.map((b) => h("section", { class: "brand-card", style: `--bc:${BRAND_COLOR[b.short] || "var(--accent)"}` },
        h("div", { class: "brand-logo" + (b.logoDark ? " dark" : "") }, b.logo ? h("img", { src: b.logo, alt: `${b.name} logo`, loading: "lazy" }) : h("span", { class: "brand-logo-text" }, b.name)),
        h("div", { class: "bc" }, companyName(b.company)),
        h("h2", { class: "bn", style: "margin:2px 0 6px" }, b.name),
        h("p", { class: "bt", style: "margin:0 0 12px" }, t(b.desc)),
        h("div", { class: "brand-links" },
          b.lineup ? external(b.lineup, tr("製品ラインナップはこちら ↗", "See the product line-up ↗", "ดูไลน์อัปสินค้า ↗"), { class: "ghost" })
                   : h("span", { class: "muted small" }, tr("製品ラインナップのページはまだありません", "No product line-up page yet", "ยังไม่มีหน้าไลน์อัปสินค้า")),
          b.official ? external(b.official, tr("公式サイト ↗", "Official website ↗", "เว็บไซต์ทางการ ↗"), { class: "ghost" }) : null)))));
    } else {
      const groups = cur === "guidelines" ? H.guidelines : H.catalogs;
      el.append(h("p", { class: "note", style: "margin:0 0 14px" }, cur === "guidelines"
        ? tr("メーカーが定めた公式のブランドガイドライン（PDF）です。ロゴや写真、SNS 投稿を作る前に必ず確認してください。",
             "Official brand guidelines (PDF) from each maker. Check them before making anything with the logo, photos or social posts.",
             "คู่มือแบรนด์ทางการ (PDF) จากผู้ผลิต โปรดตรวจสอบก่อนใช้โลโก้ รูปภาพ หรือโพสต์โซเชียล")
        : tr("シーズンごとの製品カタログ（PDF）です。SS = 春夏、FW / AW = 秋冬。",
             "Product catalogs (PDF) by season. SS = spring/summer, FW / AW = fall/winter.",
             "แคตตาล็อกสินค้า (PDF) ตามฤดูกาล SS = ใบไม้ผลิ/ร้อน, FW / AW = ใบไม้ร่วง/หนาว")));
      el.append(h("div", { class: "grid c2" }, groups.map((g) => h("section", { class: "card" },
        h("h2", { style: "margin:0 0 10px" }, g.brand),
        h("ul", { class: "clean" }, g.docs.map((d) => h("li", { style: "margin:8px 0" }, external(d.url, "📄 " + t(d.label) + " ↗"))))))));
      if (cur === "guidelines") el.append(h("p", { class: "note" }, tr(
        "PDF は Google Drive にあります。開けない場合は GM に閲覧権限を依頼してください。",
        "The PDFs are in Google Drive. If one will not open, ask the GM for access.",
        "ไฟล์ PDF อยู่ใน Google Drive หากเปิดไม่ได้ โปรดขอสิทธิ์จาก GM")));
      else el.append(h("p", { class: "note" }, tr(
        "VFF は Google Drive、Vivobarefoot AW27 はこのダッシュボード内の PDF です。",
        "VFF catalogs are in Google Drive; the Vivobarefoot AW27 catalog is stored in this dashboard.",
        "แคตตาล็อก VFF อยู่ใน Google Drive ส่วน Vivobarefoot AW27 เก็บไว้ในแดชบอร์ดนี้")));
    }
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
    const S = D.sales?.summary;
    if (!S) { el.append(h("p", { class: "error" }, tr("データを読み込めませんでした", "Could not load the data", "โหลดข้อมูลไม่ได้"))); return; }
    const millions = (n) => (n / 1e6).toLocaleString("ja-JP", { maximumFractionDigits: 2 }) + "M";
    const roles = {
      bft: tr("VFF・Vivobarefoot・OLENO の輸入とブランド運営。Paradise Park・Siam Discovery・Central Chidlom とオンラインで販売", "Imports and runs VFF, Vivobarefoot and OLENO. Sells at Paradise Park, Siam Discovery, Central Chidlom and online", "นำเข้าและดูแลแบรนด์ VFF, Vivobarefoot, OLENO ขายที่ Paradise Park, Siam Discovery, Central Chidlom และออนไลน์"),
      edv: tr("店舗運営の会社。K Village・Central Ladprao・Thaniya の 3 店舗と自社ブランド Coolcore・AQOS", "Runs the shops: K Village, Central Ladprao and Thaniya, plus its own brands Coolcore and AQOS", "บริษัทที่ดูแลร้าน K Village, Central Ladprao, Thaniya และแบรนด์ของตัวเอง Coolcore, AQOS")
    };
    el.append(h("p", { class: "note", style: "margin:0 0 14px" },
      tr("グループは 2 社です。上が Barefootinc (Thailand)（BFT）、下が Endeavorz（EDV）。金額はタイバーツ（THB）、M = 100 万。",
         "The group has two companies: Barefootinc (Thailand) (BFT) above and Endeavorz (EDV) below. Amounts in Thai baht (THB); M = million.",
         "กลุ่มมี 2 บริษัท: ด้านบนคือ Barefootinc (Thailand) (BFT) ด้านล่างคือ Endeavorz (EDV) จำนวนเงินเป็นบาท (THB) M = ล้าน")));
    for (const c of S.companies) {
      el.append(h("section", { class: "card", style: "margin-bottom:16px" },
        h("h2", { style: "margin:0" }, c.name, " ", h("span", { class: "pill" }, c.short)),
        h("p", { class: "note", style: "margin:4px 0 14px" }, roles[c.id]),
        h("div", { class: "kpis" },
          h("div", { class: "kpi" }, h("p", { class: "kpi-label" }, tr("1〜10 月の売上（暫定）", "Sales Jan–Oct (provisional)", "ยอดขาย ม.ค.–ต.ค. (เบื้องต้น)")), h("p", { class: "kpi-value" }, millions(c.ytd)), h("p", { class: "kpi-note" }, "THB")),
          h("div", { class: "kpi" }, h("p", { class: "kpi-label" }, tr("10 月の売上", "Sales in October", "ยอดขายเดือนตุลาคม")), h("p", { class: "kpi-value" }, millions(c.month)), h("p", { class: "kpi-note" }, "THB"))),
        h("div", { style: "margin-top:14px" }, external(c.url, tr(`詳しくは ${c.short} 販売実績ダッシュボードへ ↗`, `See the ${c.short} sales dashboard for details ↗`, `ดูรายละเอียดในแดชบอร์ดยอดขาย ${c.short} ↗`), { class: "ghost" }))));
    }
    el.append(h("p", { class: "note" }, tr("出典: BFT・EDV それぞれの販売実績ダッシュボード（1〜10 月は暫定）", "Source: the BFT and EDV sales dashboards (January–October is provisional)", "ที่มา: แดชบอร์ดยอดขายของ BFT และ EDV (ม.ค.–ต.ค. เป็นตัวเลขเบื้องต้น)")));
  };

  views.stores = (el) => {
    if (!D.stores) return;
    const storeLabels = locale().stores || {};
    const pick = (o) => (o && (o[language] || o.ja)) || "";
    const rows = D.stores.items.filter(store =>
      store.type === "direct" || (store.type === "dept" && store.id !== "central-others"));
    const mapUrl = (store) => store.map || (store.mapQuery ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(store.mapQuery) : "");
    el.append(h("p", { class: "note", style: "margin:0 0 12px" }, tr(
      `店舗は ${rows.length} つです。ピンを押すと店名・場所・営業時間が出て、Google マップで開けます。`,
      `We have ${rows.length} shops. Tap a pin to see the name, location and hours, and open it in Google Maps.`,
      `มีร้านทั้งหมด ${rows.length} แห่ง แตะหมุดเพื่อดูชื่อร้าน ที่ตั้ง เวลาเปิด และเปิดใน Google Maps`)));
    const mapBox = h("div", { id: "storeMap", class: "store-map", role: "region", "aria-label": tr("店舗の地図", "Shop map", "แผนที่ร้าน") });
    el.append(mapBox);
    const located = rows.filter(r => r.lat && r.lng);
    if (window.L && located.length) {
      requestAnimationFrame(() => {
        const map = L.map(mapBox, { scrollWheelZoom: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, referrerPolicy: "strict-origin-when-cross-origin", attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
        const bounds = [];
        for (const store of located) {
          const info = { ...store, ...storeLabels[store.id] };
          const pop = h("div", { class: "pin-pop" }, h("strong", {}, info.name), h("div", {}, pick(store.floor)),
            info.hours ? h("div", { class: "muted" }, info.hours) : null,
            mapUrl(store) ? h("div", { style: "margin-top:4px" }, external(mapUrl(store), tr("Google マップで開く ↗", "Open in Google Maps ↗", "เปิดใน Google Maps ↗"))) : null);
          L.marker([store.lat, store.lng], { title: info.name }).addTo(map).bindPopup(pop)
            .bindTooltip(store.pin?.label || info.name, { permanent: true, direction: store.pin?.side || "right", offset: store.pin?.side === "left" ? [-14, -20] : [14, -20], className: "pin-label" });
          bounds.push([store.lat, store.lng]);
        }
        const padX = mapBox.clientWidth < 500 ? 120 : 90; map.fitBounds(bounds, { paddingTopLeft: [padX, 50], paddingBottomRight: [padX, 30] });
      });
    } else mapBox.append(h("p", { class: "muted", style: "padding:16px" }, tr("地図を読み込めませんでした", "Could not load the map", "โหลดแผนที่ไม่ได้")));
    el.append(h("div", { class: "store-cards" }, rows.map(store => {
      const info = { ...store, ...storeLabels[store.id] };
      const url = mapUrl(store);
      return h("article", { class: "store-card" },
        h("div", { class: "store-photo" }, store.photo
          ? h("button", { type: "button", class: "photo-zoom", title: tr("クリックで拡大", "Click to enlarge", "คลิกเพื่อขยาย"), "aria-label": tr(`${info.name} の写真を拡大`, `Enlarge the photo of ${info.name}`, `ขยายรูปของ ${info.name}`), onclick: () => openLightbox(store.photoFull || store.photo, info.name) },
              h("img", { class: "photo-bg", src: store.photoFull || store.photo, alt: "", "aria-hidden": "true", loading: "lazy" }),
              h("img", { class: "photo-fg", src: store.photoFull || store.photo, alt: info.name, loading: "lazy" }),
              h("span", { class: "zoom-hint", "aria-hidden": "true" }, "⤢"))
          : h("span", {}, tr("写真なし", "No photo yet", "ยังไม่มีรูป"))),
        h("div", { class: "store-body" },
          h("h3", {}, info.name),
          h("dl", { class: "store-facts" },
            h("dt", {}, tr("所在地", "Location", "ที่ตั้ง")), h("dd", {}, pick(store.floor) || info.location || "–"),
            h("dt", {}, tr("営業時間", "Hours", "เวลาเปิด")), h("dd", {}, info.hours || "–"),
            h("dt", {}, tr("開店", "Opened", "เปิดร้าน")), h("dd", {}, info.opened || "–")),
          url ? external(url, tr("Google マップで開く ↗", "Open in Google Maps ↗", "เปิดใน Google Maps ↗"), { class: "ghost" }) : null));
    })));
    if (D.stores.referenceUrl) el.append(h("div", { class: "card", style: "margin-top:14px" },
      h("h2", {}, tr("関連資料", "Related document", "เอกสารที่เกี่ยวข้อง")),
      h("ul", { class: "clean" }, h("li", {}, external(D.stores.referenceUrl, tr("店舗一覧 ↗", "Shop list ↗", "รายชื่อร้าน ↗"))))));
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
    const EC = new Set(["Shopee", "Lazada", "Website"]);
    const brandLabel = (b) => b === "Barefootinc (Thailand)" ? tr("Barefootinc (Thailand)（会社全体）", "Barefootinc (Thailand) (company-wide)", "Barefootinc (Thailand) (ทั้งบริษัท)") : b;
    el.append(h("p", { class: "note", style: "margin:0 0 12px" }, tr(
      "ブランド順に、SNS アカウントと EC（ネット販売）のショップを並べています。会社全体のアカウントは最後です。",
      "Social accounts and online shops, listed by brand. Company-wide accounts are last.",
      "บัญชีโซเชียลและร้านออนไลน์ เรียงตามแบรนด์ บัญชีของทั้งบริษัทอยู่ท้ายสุด")));
    let prevBrand = null;
    const rows = (D.sns?.items || []).map(item => {
      const isEc = EC.has(item.platform);
      const first = item.brand !== prevBrand; prevBrand = item.brand;
      return [
        first ? h("span", { class: "brand-tag", style: `--bc:${BRAND_COLOR[item.brand] || "var(--c-others)"}` }, brandLabel(item.brand)) : "",
        isEc ? tr("EC", "Online shop", "ร้านออนไลน์") : "SNS",
        item.platform,
        item.handle || null,
        item.url ? external(item.url, isEc ? tr("ショップページへ ↗", "Go to the shop ↗", "ไปที่ร้าน ↗") : tr("アカウントページへ ↗", "Go to the account ↗", "ไปที่บัญชี ↗")) : null
      ];
    });
    el.append(simpleTable([tr("ブランド", "Brand", "แบรนด์"), tr("種類", "Type", "ประเภท"), tr("プラットフォーム", "Platform", "แพลตฟอร์ม"), tr("アカウント", "Account", "บัญชี"), tr("リンク", "Link", "ลิงก์")], rows));
  };


  views.consignment = (el) => gate(el, "consignment", (el, C) => {
    const months = C.months || [];
    const last = months.slice(-18);
    const fileUrl = C.sourceUrl;
    const srcLine = (text) => h("p", { class: "note", style: "margin:8px 0 0" }, tr("出典: ", "Source: ", "ที่มา: "), fileUrl ? external(fileUrl, text + " ↗") : text);
    const sum = (rs, k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
    const isDept = (c) => c.type === "デパート委託";
    // 形態は「委託」か「買取」の 2 つだけ（Pathwild は買取）
    const isBuyout = (name, type) => /^Pathwild/i.test(name || "") || /買取/.test(type || "");
    const dealLabel = (name, type) => isBuyout(name, type) ? tr("買取", "Outright purchase", "ซื้อขาด") : tr("委託", "Consignment", "ฝากขาย");
    const nameOf = (c) => (c.displayName || c.name) + (isDept(c) ? tr("（百貨店）", " (dept. store)", " (ห้าง)") : "");
    const brandOrder = ["VFF", "OLENO", "Coolcore", "Tabi (Marugo)", "BFJ"];
    const byOrder = (a, b) => (brandOrder.indexOf(a) + 99 * (brandOrder.indexOf(a) < 0)) - (brandOrder.indexOf(b) + 99 * (brandOrder.indexOf(b) < 0));
    const brandColor = { VFF: "var(--c-vff)", OLENO: "var(--c-oleno)", Coolcore: "var(--c-coolcore)" };
    const linksCol = { key: "links", label: tr("店舗情報", "Store info", "ข้อมูลร้าน"), csv: (v) => (v || []).map((l) => l.url).join(" "), render: (v) => (v && v.length) ? h("span", { class: "link-list" }, v.map((l) => external(l.url, (l.label ? (l.label[language] || l.label.ja) : ({ map: tr("Google マップ", "Google Maps", "Google Maps"), web: tr("店舗情報", "Store page", "ข้อมูลร้าน"), fb: "Facebook" }[l.kind] || "Link")) + " ↗", { title: l.note || "" }))) : h("span", { class: "muted" }, "–") };
    const nameCol = { key: "name", label: tr("取引先", "Partner", "คู่ค้า") };
    const typeCol = { key: "deal", label: tr("形態", "Type", "รูปแบบ") };
    const soldMonths = (m) => Object.keys(m || {}).filter((k) => m[k]).sort();
    const fold = (title, ...body) => h("details", { class: "fold", style: "margin-top:14px" }, h("summary", {}, h("h4", { style: "display:inline;margin:0" }, title)), h("div", { style: "margin-top:12px" }, ...body));
    const palette = ["#3b82c4", "#d03b3b", "#2e9e5b", "#d99100", "#7c5cbf", "#00a7e1", "#8a8c8f", "#c2185b"];
    const monthTable = (rws, ms) => {
      const rs = rws.map((r) => { const o = { name: r.name }; let t = 0; for (const m of ms) { o[m] = r.monthly[m] || 0; t += o[m]; } o.total = t; return o; }).filter((r) => r.total);
      if (!rs.length) return h("p", { class: "muted small" }, tr("この期間の販売はありません", "No sales in this period", "ไม่มียอดขายในช่วงนี้"));
      const tot = { name: tr("合計", "Total", "รวม") }; for (const m of [...ms, "total"]) tot[m] = sum(rs, m);
      const cols = [{ key: "name", label: tr("取引先", "Partner", "คู่ค้า") }, ...ms.map((m) => ({ key: m, label: m.slice(2).replace("-", "/"), num: true })), { key: "total", label: tr("合計", "Total", "รวม"), num: true }];
      const cell = (c, r) => h("td", { class: c.num ? "num" : "" }, c.num ? fmt(r[c.key]) : r[c.key]);
      return h("div", { class: "tablewrap" }, h("table", { class: "dt" },
        h("thead", {}, h("tr", {}, cols.map((c) => h("th", { class: c.num ? "num" : "" }, c.label)))),
        h("tbody", {}, rs.map((r) => h("tr", {}, cols.map((c) => cell(c, r)))), h("tr", { class: "total" }, cols.map((c) => cell(c, tot))))));
    };
    const monthChart = (rws, ms) => {
      const top = rws.filter((r) => ms.some((m) => r.monthly[m])).sort((a, b) => b.sold - a.sold).slice(0, 8);
      return top.length ? stackedBars(ms, top.map((r, i) => ({ name: r.name, color: palette[i % palette.length], values: r.monthly })), { fmtY: (v) => fmt(v), unit: tr(" 足・個", " units", " ชิ้น") }) : null;
    };

    el.append(h("p", { class: "note", style: "margin:0 0 14px" }, tr(
      `${C.period || ""}・単位: 足・個。ブランドごとに取引先をまとめています。形態は「委託」（売れた分だけ精算）と「買取」の 2 つ。百貨店は名前の後ろに（百貨店）と付けています。`,
      `${C.period || ""} · units: pairs / pieces. Partners are grouped by brand. Type is either consignment (settled only for what sells) or outright purchase. Department stores are marked (dept. store).`,
      `${C.period || ""} · หน่วย: คู่ / ชิ้น จัดกลุ่มคู่ค้าตามแบรนด์ รูปแบบมี 2 แบบ คือ ฝากขาย (ชำระเฉพาะที่ขายได้) และ ซื้อขาด ห้างสรรพสินค้าจะมี (ห้าง) ต่อท้ายชื่อ`)));

    const E = D.consignmentEdv, P = D.pathwild;
    const allMonths = [...new Set([...months, ...(E?.months || []), ...Object.values(P?.byBrand || {}).flatMap((x) => Object.keys(x.monthly || {}))])].sort();
    const win12 = allMonths.slice(-12);
    const lastM = allMonths.slice(-18);
    const sumN = (rs, k) => rs.some((r) => r[k] != null) ? rs.reduce((a, r) => a + (r[k] || 0), 0) : null;
    const srcSheet = (v) => fileUrl ? external(fileUrl, tr("在庫表", "Stock sheet", "ชีตสต็อก") + " ↗", { title: `Stock VFF Consignment.xlsx / ${v}` }) : v;
    const brands = [...new Set([...C.consignees.flatMap((c) => Object.keys(c.byBrand || {})), ...(E?.rows?.length ? ["Coolcore"] : []), ...Object.keys(P?.byBrand || {})])].sort(byOrder);
    // 全ブランド共通の項目（長い見出しは 2 行にして幅を狭める）
    const two = (ja1, ja2, en1, en2, th1, th2) => ({ label: tr([ja1, ja2], [en1, en2], [th1, th2]).join("\n") });
    const cols = [nameCol, linksCol, typeCol,
      { key: "firstMonth", label: tr("開始", "First sale", "ขายครั้งแรก") },
      { key: "lastMonth", label: tr("最終販売", "Last sale", "ขายล่าสุด") },
      { key: "delivered", label: tr("納品", "Delivered", "ส่งมอบ"), num: true },
      { key: "sold", label: tr("販売", "Sold", "ขาย"), num: true },
      { key: "balance", num: true, ...two("残", "（委託在庫）", "Balance", "(consigned)", "คงเหลือ", "(ฝากขาย)") },
      { key: "last12", num: true, ...two("直近12か月", "販売", "Sold in", "last 12 months", "ขายใน", "12 เดือนล่าสุด") },
      { key: "net", num: true, ...two("売上額", "（税抜 THB）", "Sales", "(THB excl. VAT)", "ยอดขาย", "(บาท ไม่รวม VAT)") },
      { key: "src", label: tr("出典", "Source", "ที่มา"), csv: (v, r) => r.srcText || "", render: (v, r) => r.srcNode || r.srcText || "–" }
    ];
    const totalRow = (rs) => { const t = { name: tr("合計", "Total", "รวม") }; for (const k of ["delivered", "sold", "balance", "last12", "net"]) t[k] = sumN(rs, k); return t; };
    const pwName = (P && P.partner) || "Pathwild";
    const PATHWILD_BRANDS = P?.currentBrands || ["OLENO"];  // Pathwild の現在の取り扱いは OLENO のみ
    const noSale = tr("販売なし", "No sales", "ไม่มียอดขาย");
    const endedLabel = tr("委託終了", "Consignment ended", "สิ้นสุดการฝากขาย");
    for (const b of brands) {
      const card = h("section", { class: "card brand-block", style: `--bc:${brandColor[b] || "var(--c-others)"};margin-bottom:18px` });
      card.append(h("h2", { class: "brand-block-title" }, b));
      if (b === "VFF") card.append(h("div", { class: "alert", role: "note" },
        h("strong", {}, tr("VFF の委託は年内で廃止予定", "VFF consignment is to end by the end of this year", "การฝากขาย VFF จะยกเลิกภายในสิ้นปีนี้")),
        h("span", {}, tr("今後は買取のみに切り替えます。", "From then on, outright purchase only.", "หลังจากนั้นจะเป็นแบบซื้อขาดเท่านั้น"))));
      const rows = [];
      // 1) BFT の在庫表（委託）。Pathwild は請求書（卸）の実績に置き換える
      const pw = PATHWILD_BRANDS.includes(b) ? P?.byBrand?.[b] : null;
      for (const c of C.consignees) {
        if (!c.byBrand?.[b]) continue;
        if (/^Pathwild/i.test(c.name) && (pw || !PATHWILD_BRANDS.includes(b))) continue;
        const x = c.byBrand[b], mb = (c.monthlyByBrand || {})[b] || {}, sm = soldMonths(mb);
        rows.push({ name: nameOf(c), dept: isDept(c), ended: !!c.ended, links: c.links, deal: c.ended ? endedLabel : dealLabel(c.name, c.type), monthly: mb,
          delivered: x.delivered, sold: x.sold, returned: x.returned, balance: c.ended ? 0 : x.balance, sheetBalance: x.balance, net: null, netPending: null,
          last12: win12.reduce((a, m) => a + (mb[m] || 0), 0), firstMonth: sm[0] || noSale, lastMonth: sm[sm.length - 1] || noSale,
          srcNode: srcSheet(c.sheet), srcText: `Stock VFF Consignment.xlsx / ${c.sheet}` });
      }
      // 2) Pathwild の卸（BFT の請求書）
      if (pw) {
        const pwLinks = (C.consignees.find((c) => /^Pathwild/i.test(c.name)) || {}).links || [];
        rows.push({ name: pwName, links: pwLinks, deal: dealLabel(pwName), monthly: pw.monthly,
          delivered: pw.units, sold: pw.units, returned: null, balance: null, net: pw.net, netPending: pw.netPending,
          last12: win12.reduce((a, m) => a + (pw.monthly[m] || 0), 0),
          firstMonth: pw.first, lastMonth: pw.last, srcText: tr("BFT 請求書", "BFT invoices", "ใบแจ้งหนี้ BFT") });
      }
      // 3) Coolcore は Endeavorz の請求書も同じ表に
      if (b === "Coolcore" && E?.rows?.length) for (const r of E.rows.filter((r) => !/^Pathwild/i.test(r.name) || PATHWILD_BRANDS.includes(b))) {
        rows.push({ name: r.name, links: r.links, deal: dealLabel(r.name), monthly: r.monthly,
          delivered: null, sold: r.units, returned: null, balance: null, net: r.net, netPending: r.netPending,
          last12: win12.reduce((a, m) => a + (r.monthly[m] || 0), 0), firstMonth: r.first, lastMonth: r.last,
          srcText: tr("EDV 請求書", "EDV invoices", "ใบแจ้งหนี้ EDV") });
      }
      rows.sort((p, q) => ((p.ended || 0) - (q.ended || 0)) || ((q.dept || 0) - (p.dept || 0)) || (q.sold - p.sold));
      card.append(table(cols, rows, { csvName: `b2b_${b.replace(/\W+/g, "_")}`, search: false, total: totalRow }));
      // 出典と読み方
      const notes = [tr("「–」はその出典に無い項目。委託の数量は BFT 経理の在庫表（Stock VFF Consignment.xlsx、ブランドは品番の頭で判定）、売上額は請求書から。",
        "\"–\" means the source does not have that item. Consignment quantities come from the BFT stock sheet (Stock VFF Consignment.xlsx; brand from the code prefix); sales amounts come from invoices.",
        "\"–\" คือรายการที่ไม่มีในแหล่งข้อมูลนั้น จำนวนฝากขายมาจากชีตสต็อกของบัญชี BFT (Stock VFF Consignment.xlsx แยกแบรนด์จากรหัส) ยอดขายมาจากใบแจ้งหนี้")];
      if (pw) notes.push(tr(`Pathwild は買取（卸）のため、BFT の請求書 ${pw.invoices} 件（${P.period}）の実績。納品＝販売、売上額は卸値（${b === "VFF" ? "定価の 20% 引き" : "定価の 30% 引き"}）・税抜。`,
        `Pathwild buys outright, so its row shows ${pw.invoices} BFT invoices (${P.period}); delivered = sold; sales at the wholesale price (${b === "VFF" ? "20%" : "30%"} off list), excl. VAT.`,
        `Pathwild ซื้อขาด จึงแสดงจากใบแจ้งหนี้ BFT ${pw.invoices} ใบ (${P.period}) ส่งมอบ = ขาย ยอดขายเป็นราคาส่ง (ลด ${b === "VFF" ? "20%" : "30%"}) ไม่รวม VAT`));
      if (b === "Coolcore" && E?.rows?.length) { const ex = E.notes?.excluded || {}; notes.push(tr(
        `Central Chidlom 以外は Endeavorz の請求書（${E.period}）。売れた分を毎月請求し、取引先の取り分（GP）は売値の 30%。売上額は GP を引いた税抜。BFT（グループ会社）向けの請求 ${ex.bftInvoices || 0} 件は除外。`,
        `Except Central Chidlom, rows come from Endeavorz invoices (${E.period}): billed monthly for what sold; partner keeps 30% (GP); sales after GP, excl. VAT. ${ex.bftInvoices || 0} invoices to BFT (group company) are left out.`,
        `ยกเว้น Central Chidlom มาจากใบแจ้งหนี้ Endeavorz (${E.period}) เรียกเก็บรายเดือนตามที่ขายได้ คู่ค้าได้ 30% (GP) ยอดขายหลังหัก GP ไม่รวม VAT ไม่นับใบแจ้งหนี้ถึง BFT ${ex.bftInvoices || 0} ใบ`)); }
      const ended = rows.filter((r) => r.ended);
      if (ended.length) notes.push(tr(
        `「委託終了」の ${ended.map((r) => r.name).join("・")} は商品を引き取り済みのため、残を 0 と表示（在庫表では ${ended.map((r) => `${r.name} ${fmt(r.sheetBalance)}`).join("、")} のまま）。`,
        `${ended.map((r) => r.name).join(", ")} (consignment ended): goods have been taken back, so the balance shows 0 (the stock sheet still says ${ended.map((r) => `${r.name} ${fmt(r.sheetBalance)}`).join(", ")}).`,
        `${ended.map((r) => r.name).join(", ")} (สิ้นสุดการฝากขาย): รับสินค้าคืนแล้ว จึงแสดงคงเหลือเป็น 0 (ในชีตสต็อกยังเป็น ${ended.map((r) => `${r.name} ${fmt(r.sheetBalance)}`).join(", ")})`));
      card.append(h("div", { class: "note", style: "margin:8px 0 0" }, notes.map((t) => h("p", { style: "margin:2px 0" }, t))));
      if (lastM.length) card.append(fold(tr("月別の販売数（直近 18 か月）", "Monthly units sold (last 18 months)", "ยอดขายรายเดือน (18 เดือนล่าสุด)"),
        h("p", { class: "note", style: "margin:0 0 8px" }, tr("色の部分にカーソルを置く（スマホはタップ）と、その取引先の月の販売数が出ます。", "Hover over a colour (tap on a phone) to see that partner's units for the month.", "วางเมาส์บนสี (แตะบนมือถือ) เพื่อดูยอดของคู่ค้าในเดือนนั้น")),
        monthChart(rows, lastM), monthTable(rows, lastM)));
      el.append(card);
    }
    // 4. 委託販売の課題
    el.append(h("div", { class: "section-title", style: "margin-top:28px" }, h("h2", {}, tr("委託販売の課題", "Consignment issues", "ปัญหาการฝากขาย"))));
    el.append(h("section", { class: "card" },
      h("h3", { style: "margin:0 0 4px" }, tr("販売先の陳列が整っていない", "Displays at partner stores are not well organised", "การจัดวางสินค้าที่ร้านคู่ค้ายังไม่เป็นระเบียบ")),
      h("p", { class: "note", style: "margin:0 0 12px" }, tr("委託先の売場の例（写真）", "Examples from partner stores (photos)", "ตัวอย่างจากร้านคู่ค้า (ภาพถ่าย)")),
      h("div", { class: "photo-grid" }, [1, 2, 3].map((n) => h("a", { href: `img/consignment/display-${n}.jpg`, target: "_blank", rel: "noopener" },
        h("img", { src: `img/consignment/display-${n}.jpg`, alt: tr(`委託先の売場の陳列例 ${n}`, `Partner store display example ${n}`, `ตัวอย่างการจัดวางที่ร้านคู่ค้า ${n}`), loading: "lazy" }))))));
  });


  // ---------- 共有リスト（何を・どのソースから共有しているか） ----------
  views.shared = (el) => {
    const T = {
      dashboard: ["ダッシュボード", "Dashboard", "แดชบอร์ด"],
      web: ["ウェブサイト", "Website", "เว็บไซต์"],
      pdf: ["PDF", "PDF", "PDF"],
      sheet: ["スプレッドシート（Excel）", "Spreadsheet (Excel)", "สเปรดชีต (Excel)"],
      slides: ["スライド（PowerPoint）", "Slides (PowerPoint)", "สไลด์ (PowerPoint)"],
      map: ["Google マップ", "Google Maps", "Google Maps"],
      photo: ["写真・画像", "Photos / images", "ภาพถ่าย / รูปภาพ"],
      sns: ["SNS", "Social media", "โซเชียลมีเดีย"],
      ec: ["EC サイト", "Online shop", "ร้านออนไลน์"],
      text: ["社内で用意した文章", "Text written in-house", "ข้อความที่จัดทำภายใน"]
    };
    const L = (url, label) => url ? { url, label } : null;
    const hub = D.hub || {}, brandsH = hub.brands || [], S = D.sales?.summary, C = D.consignment || {}, st = D.stores || {};
    const pick = (o) => (o && (o[language] || o.ja)) || "";
    const driveNote = tr("Google Drive", "Google Drive", "Google Drive");
    const termsFile = (D.terms?.items || []).find((i) => i.sourceUrl)?.sourceUrl;
    const storeRows = (st.items || []).filter((x) => x.type === "direct" || (x.type === "dept" && x.id !== "central-others"));
    const storeLabels = locale().stores || {};
    const snsItems = D.sns?.items || [];
    const isEc = (i) => ["Shopee", "Lazada", "Website"].includes(i.platform);
    const R = (sec, info, types, links, where) => ({ sec, info, types, links: (links || []).filter(Boolean), where });
    const rows = [
      R("sales", tr("BFT の売上（1〜10 月の暫定、10 月）", "BFT sales (Jan–Oct provisional, October)", "ยอดขาย BFT (ม.ค.–ต.ค. เบื้องต้น, ต.ค.)"), ["dashboard"],
        [L(S?.companies?.find((c) => c.id === "bft")?.url, tr("BFT 販売実績ダッシュボード", "BFT sales dashboard", "แดชบอร์ดยอดขาย BFT"))]),
      R("sales", tr("EDV の売上（1〜10 月の暫定、10 月）", "EDV sales (Jan–Oct provisional, October)", "ยอดขาย EDV (ม.ค.–ต.ค. เบื้องต้น, ต.ค.)"), ["dashboard"],
        [L(S?.companies?.find((c) => c.id === "edv")?.url, tr("EDV 販売実績ダッシュボード", "EDV sales dashboard", "แดชบอร์ดยอดขาย EDV"))]),
      R("brands", tr("製品ラインナップ", "Product line-ups", "ไลน์อัปสินค้า"), ["web", "ec"],
        brandsH.filter((b) => b.lineup).map((b) => L(b.lineup, b.lineup.includes("shopee.") ? `${b.name}（Shopee）` : b.name)),
        tr("VFF・Vivobarefoot・OLENO は社内で作ったラインナップサイト、Coolcore は Shopee のショップ", "VFF, Vivobarefoot and OLENO: line-up sites made in-house; Coolcore: its Shopee shop", "VFF, Vivobarefoot, OLENO: เว็บไลน์อัปที่ทำภายใน; Coolcore: ร้านบน Shopee")),
      R("brands", tr("公式サイト", "Official websites", "เว็บไซต์ทางการ"), ["web"], brandsH.filter((b) => b.official).map((b) => L(b.official, b.name)),
        tr("各メーカーの公式サイト", "Each maker's official site", "เว็บไซต์ทางการของผู้ผลิต")),
      R("brands", tr("ブランドガイドライン", "Brand guidelines", "คู่มือแบรนด์"), ["pdf"],
        (hub.guidelines || []).flatMap((g) => g.docs.map((d) => L(d.url, `${g.short}: ${pick(d.label)}`))), driveNote),
      R("brands", tr("製品カタログ", "Product catalogs", "แคตตาล็อกสินค้า"), ["pdf"],
        (hub.catalogs || []).flatMap((g) => g.docs.map((d) => L(d.url, `${g.short} ${d.season}`))),
        tr("VFF は Google Drive、Vivobarefoot AW27 はこのダッシュボード内", "VFF in Google Drive; Vivobarefoot AW27 stored in this dashboard", "VFF อยู่ใน Google Drive; Vivobarefoot AW27 อยู่ในแดชบอร์ดนี้")),
      R("stores", tr("店舗の地図・所在地（階数）・営業時間", "Shop map, location (floor) and hours", "แผนที่ร้าน ที่ตั้ง (ชั้น) และเวลาเปิด"), ["map"],
        storeRows.filter((x) => x.map).map((x) => L(x.map, (storeLabels[x.id] || {}).name || x.name))),
      R("stores", tr("店舗の写真", "Shop photos", "รูปร้าน"), ["photo"], [], tr("Google Drive の店舗資料フォルダ", "Store folders in Google Drive", "โฟลเดอร์ร้านใน Google Drive")),
      R("stores", tr("店舗一覧（関連資料）", "Shop list (related document)", "รายชื่อร้าน (เอกสารที่เกี่ยวข้อง)"), ["web"], [L(st.referenceUrl, tr("店舗一覧", "Shop list", "รายชื่อร้าน"))]),
      R("consignment", tr("ブランドごとの取引先（委託・買取）と販売実績（SKU・納品・販売・返品・残・月別販売）", "Partners by brand (consignment / outright) and results (SKU, delivered, sold, returned, balance, monthly)", "คู่ค้าตามแบรนด์ (ฝากขาย / ซื้อขาด) และผลงาน (SKU ส่งมอบ ขาย คืน คงเหลือ รายเดือน)"), ["sheet"],
        [L(C.sourceUrl, "Stock VFF Consignment.xlsx")], tr("Google Drive（BFT 経理）", "Google Drive (BFT accounting)", "Google Drive (บัญชี BFT)")),
      R("consignment", tr("Coolcore（Endeavorz）の委託先別の販売数・金額・未入金", "Coolcore (Endeavorz) consignment: units, amounts and unpaid by partner", "Coolcore (Endeavorz) ฝากขาย: จำนวน ยอดเงิน และยอดค้างชำระตามร้าน"), ["sheet"], [],
        tr("Zort の受注明細（EDV の請求書）を Excel で書き出したもの。ダッシュボードには集計値だけを掲載", "Zort order details (EDV invoices) exported to Excel; only totals are shown here", "รายละเอียดคำสั่งซื้อจาก Zort (ใบแจ้งหนี้ EDV) ส่งออกเป็น Excel แสดงเฉพาะยอดรวม")),
      R("consignment", tr("Pathwild との卸（買取）の実績：数量・売上額・未入金", "Pathwild wholesale (outright) results: units, sales and unpaid", "ผลการขายส่ง (ซื้อขาด) กับ Pathwild: จำนวน ยอดขาย และยอดค้างชำระ"), ["sheet"], [],
        tr("BFT の請求書レポート（Excel、2026 年）。ダッシュボードには集計値だけを掲載", "BFT invoice report (Excel, 2026); only totals are shown here", "รายงานใบแจ้งหนี้ BFT (Excel ปี 2026) แสดงเฉพาะยอดรวม")),
      R("consignment", tr("委託先の店舗情報", "Partner store info", "ข้อมูลร้านของผู้รับฝากขาย"), ["map", "web", "sns"], [],
        tr("Google マップ・店舗のウェブサイト・Facebook（リンクは委託販売先一覧の各行）", "Google Maps, store websites and Facebook (links are on each row of the partner list)", "Google Maps เว็บไซต์ร้าน และ Facebook (ลิงก์อยู่ในแต่ละแถวของรายชื่อ)")),
      R("consignment", tr("委託販売の課題（売場の陳列写真）", "Consignment issues (store display photos)", "ปัญหาการฝากขาย (ภาพการจัดวางในร้าน)"), ["photo"], [], tr("社内で撮影した写真", "Photos taken by our team", "ภาพที่ทีมงานถ่าย")),
      R("terms", tr("百貨店の手数料（Siam Discovery・Central）", "Department store commission (Siam Discovery, Central)", "ค่าคอมมิชชันห้าง (Siam Discovery, Central)"), ["sheet"],
        [L(termsFile, "Sales Record_Coollabo Shop 2026.xlsx")], tr("Google Drive（精算シート）", "Google Drive (settlement sheets)", "Google Drive (ชีตสรุปยอด)")),
      R("sns", tr("SNS アカウント（Instagram・Facebook・TikTok・LINE）", "Social accounts (Instagram, Facebook, TikTok, LINE)", "บัญชีโซเชียล (Instagram, Facebook, TikTok, LINE)"), ["sns"],
        snsItems.filter((i) => !isEc(i) && i.url).map((i) => L(i.url, `${i.brand === "Barefootinc (Thailand)" ? "BFT" : i.brand} ${i.platform}`))),
      R("sns", tr("EC ショップ（Shopee・Lazada・自社サイト）", "Online shops (Shopee, Lazada, own website)", "ร้านออนไลน์ (Shopee, Lazada, เว็บไซต์บริษัท)"), ["ec"],
        snsItems.filter((i) => isEc(i) && i.url).map((i) => L(i.url, `${i.brand === "Barefootinc (Thailand)" ? "BFT" : i.brand} ${i.platform}`))),
      R("other", tr("BD オンボーディングガイド（英語版）：会社概要・ブランドの現状と課題・店舗とチャネル・取り扱いの注意", "BD Onboarding Guide (English): company overview, brands' current state and challenges, stores and channels, handling notes", "คู่มือปฐมนิเทศ BD (ภาษาอังกฤษ): ภาพรวมบริษัท สถานะและความท้าทายของแบรนด์ ร้านและช่องทาง ข้อควรระวัง"), ["slides"],
        [L("docs/BD_Onboarding_Guide_EN.pptx", "BD_Onboarding_Guide_EN.pptx")], tr("このダッシュボード内（押すとダウンロード）。2026 年 10 月版・社外秘", "Stored in this dashboard (downloads when clicked). October 2026 edition, confidential", "เก็บในแดชบอร์ดนี้ (กดเพื่อดาวน์โหลด) ฉบับ ต.ค. 2026 ข้อมูลลับ"))
    ];
    const types = [...new Set(rows.flatMap((r) => r.types))];
    el.append(h("div", { class: "card", style: "margin-bottom:14px" },
      h("p", { class: "note", style: "margin:0 0 8px" }, tr("ソースの種類", "Kinds of source", "ประเภทแหล่งที่มา")),
      h("div", {}, types.map((k) => h("span", { class: `src-type t-${k}` }, tr(...T[k]), " ", h("span", { class: "muted small" }, `${rows.filter((r) => r.types.includes(k)).length}`))))));
    let prev = null;
    const body = rows.map((r) => {
      const first = r.sec !== prev; prev = r.sec;
      return h("tr", { class: first ? "sec-first" : "" },
        h("td", {}, first ? (sections[r.sec] ? h("a", { href: `#${r.sec}`, class: "sec-link" }, tr(...sections[r.sec])) : h("span", { class: "sec-link" }, tr("その他", "Other", "อื่น ๆ"))) : ""),
        h("td", { class: "wrap" }, r.info),
        h("td", {}, r.types.map((k) => h("span", { class: `src-type t-${k}` }, tr(...T[k])))),
        h("td", { class: "wrap" }, r.links.length ? h("span", { class: "link-list" }, r.links.map((l) => external(l.url, l.label + " ↗"))) : null,
          r.where ? h("div", { class: "muted small", style: r.links.length ? "margin-top:4px" : "" }, r.where) : (r.links.length ? null : "–")));
    });
    el.append(h("div", { class: "card" }, h("div", { class: "tablewrap" }, h("table", { class: "dt shared-list" },
      h("thead", {}, h("tr", {}, [tr("セクション", "Tab", "แท็บ"), tr("共有している情報", "What is shared", "ข้อมูลที่แชร์"), tr("ソースの種類", "Kind of source", "ประเภทแหล่งที่มา"), tr("ソース（開く・保管場所）", "Source (open / where it is kept)", "แหล่งที่มา (เปิด / ที่จัดเก็บ)")].map((c) => h("th", { scope: "col" }, c)))),
      h("tbody", {}, body)))));
    el.append(h("p", { class: "note" }, tr(
      "Google Drive のファイルが開けない場合は GM に閲覧権限を依頼してください。リンクが無い行は、このダッシュボードにだけ載せている情報です。",
      "If a Google Drive file will not open, ask the GM for access. Rows without a link are shown only in this dashboard.",
      "หากเปิดไฟล์ใน Google Drive ไม่ได้ โปรดขอสิทธิ์จาก GM แถวที่ไม่มีลิงก์คือข้อมูลที่แสดงเฉพาะในแดชบอร์ดนี้")));
  };

  (async () => { await loadAll(); applyLanguage(); })();
})();
