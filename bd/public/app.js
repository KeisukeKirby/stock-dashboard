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
    const files = { brands: "data/brands.json", stores: "data/stores.json", guidelines: "data/guidelines.json", sns: "data/sns.json", sales: "data/sales_monthly.json", terms: "data/terms.json", consignment: "data/consignment.json", translations: "data/section_translations.json", hub: "data/brand_hub.json" };
    await Promise.all(Object.entries(files).map(async ([k, p]) => { try { D[k] = await loadJSON(p); } catch (e) { console.error(e); D[k] = null; } }));
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

  // ---------- router ----------
  const views = Object.create(null);
  const sections = {
    sales: ["売上", "Sales", "ยอดขาย"],
    brands: ["ブランド", "Brands", "แบรนด์"],
    stores: ["店舗一覧", "Stores", "รายชื่อร้าน"],
    consignment: ["委託販売", "Consignment", "การฝากขาย"],
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
        consignment: tr("委託販売先、販売実績、課題です。", "Consignment partners, sales and issues.", "ผู้รับฝากขาย ยอดขาย และปัญหา"),
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
          ? h("img", { src: store.photo, alt: info.name, loading: "lazy" })
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
    const fileUrl = C.sourceUrl;
    const srcLine = (text) => h("p", { class: "note", style: "margin:8px 0 0" }, tr("出典: ", "Source: ", "ที่มา: "), fileUrl ? external(fileUrl, text + " ↗") : text);
    const consigneeTypes = {
      "デパート委託": tr("デパート委託", "Department store", "ห้างสรรพสินค้า"),
      "アウトドア店委託": tr("アウトドア店委託", "Outdoor store", "ร้านอุปกรณ์กลางแจ้ง"),
      "店舗（買取へ移行中）": tr("店舗（買取へ移行中）", "Store moving to outright purchase", "ร้านค้าที่กำลังเปลี่ยนเป็นซื้อขาด"),
      "ランニングショップ委託": tr("ランニングショップ委託", "Running store", "ร้านอุปกรณ์วิ่ง"),
      "店舗委託": tr("店舗委託", "Retail store", "ร้านค้าปลีก"),
      "個人・小規模委託": tr("個人・小規模委託", "Individual or small business", "บุคคลหรือธุรกิจขนาดเล็ก"),
      "カフェ委託": tr("カフェ委託", "Café", "คาเฟ่")
    };
    const isDept = (c) => c.type === "デパート委託";
    const ordered = C.consignees.slice().sort((a, b) => (isDept(b) - isDept(a)) || (b.sold - a.sold));
    const rows = ordered.map((c) => ({ ...c, name: c.displayName || c.name, typeLabel: consigneeTypes[c.type] || c.type, brandsText: (c.brands || []).join(" / "), last12: months.slice(-12).reduce((a, m) => a + ((c.monthly || {})[m] || 0), 0) }));
    const sum = (rs, k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
    // 1. 委託販売先一覧（百貨店をひとまとめ、それ以外はブランドごと）
    const brandOrder = ["VFF", "OLENO", "Coolcore", "Tabi (Marugo)", "BFJ"];
    const byOrder = (a, b) => (brandOrder.indexOf(a) + 99 * (brandOrder.indexOf(a) < 0)) - (brandOrder.indexOf(b) + 99 * (brandOrder.indexOf(b) < 0));
    const linksCol = { key: "links", label: tr("店舗情報", "Store info", "ข้อมูลร้าน"), csv: (v) => (v || []).map((l) => l.url).join(" "), render: (v) => (v && v.length) ? h("span", { class: "link-list" }, v.map((l) => external(l.url, ({ map: tr("Google マップ", "Google Maps", "Google Maps"), web: tr("店舗情報", "Store page", "ข้อมูลร้าน"), fb: "Facebook" }[l.kind] || "Link") + " ↗", { title: l.note || "" }))) : h("span", { class: "muted" }, "–") };
    const numCols = [
      { key: "skuCount", label: "SKU", num: true },
      { key: "delivered", label: tr("納品", "Delivered", "ส่งมอบ"), num: true },
      { key: "sold", label: tr("販売", "Sold", "ขาย"), num: true },
      { key: "returned", label: tr("返品", "Returned", "คืน"), num: true },
      { key: "balance", label: tr("残", "Balance", "คงเหลือ"), num: true },
      { key: "last12", label: tr("直近12か月 販売", "Sold in last 12 months", "ขายใน 12 เดือนล่าสุด"), num: true },
      { key: "firstMonth", label: tr("開始", "First sale", "ขายครั้งแรก") },
      { key: "lastMonth", label: tr("最終販売", "Last sale", "ขายล่าสุด") },
      { key: "sheet", label: tr("出典（シート）", "Source (sheet)", "ที่มา (ชีต)"), render: (v) => fileUrl ? external(fileUrl, (v || "") + " ↗") : (v || "–") }
    ];
    const groupTotal = (rs) => ({ name: tr("合計", "Total", "รวม"), skuCount: sum(rs, "skuCount"), delivered: sum(rs, "delivered"), sold: sum(rs, "sold"), returned: sum(rs, "returned"), balance: sum(rs, "balance"), last12: sum(rs, "last12") });
    const soldMonths = (m) => Object.keys(m || {}).filter((k) => m[k]).sort();
    el.append(h("div", { class: "section-title" }, h("h2", {}, tr("委託販売先一覧", "Consignment partners", "รายชื่อผู้รับฝากขาย")), h("span", { class: "note" }, `${C.period || ""} · ${tr("単位: 足・個", "Units: pairs / pieces", "หน่วย: คู่ / ชิ้น")}`)));
    el.append(h("p", { class: "note", style: "margin:0 0 12px" }, tr(
      "百貨店はひとつのグループにまとめ、それ以外の委託先はブランドごとに分けています。複数のブランドを置いている委託先は、それぞれのブランドの表に出ます（数字はそのブランドの分だけ）。",
      "Department stores are grouped together; other partners are split by brand. A partner that carries several brands appears in each of those brand tables, with that brand's numbers only.",
      "ห้างสรรพสินค้ารวมเป็นกลุ่มเดียว ผู้รับฝากขายอื่นแยกตามแบรนด์ ร้านที่มีหลายแบรนด์จะอยู่ในตารางของแต่ละแบรนด์ (ตัวเลขเฉพาะแบรนด์นั้น)")));
    const groupCard = (title, cols, rs, csvName) => h("section", { class: "card", style: "margin-bottom:14px" },
      h("h3", { class: "table-label" }, title),
      table(cols, rs, { csvName, search: false, total: groupTotal }));
    const deptRows = rows.filter(isDept);
    if (deptRows.length) el.append(groupCard(tr("百貨店", "Department stores", "ห้างสรรพสินค้า"),
      [{ key: "name", label: tr("委託先", "Consignee", "ผู้รับฝากขาย") }, linksCol, { key: "brandsText", label: tr("ブランド", "Brand", "แบรนด์") }, ...numCols],
      deptRows.map((c) => ({ ...c, brandsText: (c.brands || []).slice().sort(byOrder).join(" / ") })), "consignment_department_stores"));
    const others = ordered.filter((c) => !isDept(c));
    const otherBrands = [...new Set(others.flatMap((c) => Object.keys(c.byBrand || {})))].sort(byOrder);
    for (const b of otherBrands) {
      const brs = others.filter((c) => c.byBrand?.[b]).map((c) => {
        const x = c.byBrand[b], mb = (c.monthlyByBrand || {})[b] || {}, sm = soldMonths(mb);
        return { name: c.displayName || c.name, links: c.links, typeLabel: consigneeTypes[c.type] || c.type, sheet: c.sheet,
          skuCount: x.skuCount, delivered: x.delivered, sold: x.sold, returned: x.returned, balance: x.balance,
          last12: months.slice(-12).reduce((a, m) => a + (mb[m] || 0), 0), firstMonth: sm[0] || "", lastMonth: sm[sm.length - 1] || "" };
      }).sort((p, q) => q.sold - p.sold);
      el.append(groupCard(b, [{ key: "name", label: tr("委託先", "Consignee", "ผู้รับฝากขาย") }, linksCol, { key: "typeLabel", label: tr("形態", "Type", "ประเภท") }, ...numCols], brs, `consignment_${b.replace(/\W+/g, "_")}`));
    }
    el.append(srcLine(tr("Stock VFF Consignment.xlsx（BFT 経理、委託先ごとのシート）。SKU〜最終販売はすべてこのファイルの数量から集計。ブランドは品番の頭（VFF / OLN / CP / MTB / BFJ）で判定", "Stock VFF Consignment.xlsx (BFT accounting, one sheet per consignee). SKU through last sale are all counted from this file; brand is taken from the code prefix (VFF / OLN / CP / MTB / BFJ)", "Stock VFF Consignment.xlsx (บัญชี BFT แยกชีตตามผู้รับฝากขาย) ตั้งแต่ SKU ถึงขายล่าสุดนับจากไฟล์นี้ทั้งหมด แยกแบรนด์จากรหัส (VFF / OLN / CP / MTB / BFJ)")));
    if (!months.length) return;
    const last = months.slice(-18);
    const fold = (title, ...body) => h("details", { class: "card fold", style: "margin-top:14px" }, h("summary", {}, h("h3", { style: "display:inline;margin:0" }, title)), h("div", { style: "margin-top:12px" }, ...body));
    // 2. 委託先別 月次販売足数（グラフ）
    const top = rows.slice().sort((a, b) => b.sold - a.sold).slice(0, 8);
    const palette = ["#3b82c4", "#d03b3b", "#2e9e5b", "#d99100", "#7c5cbf", "#00a7e1", "#8a8c8f", "#c2185b"];
    el.append(fold(tr("委託先別 月次販売足数（上位 8・直近 18 か月）", "Monthly units sold by consignee (top 8, last 18 months)", "ยอดขายรายเดือนตามผู้รับฝากขาย (8 อันดับแรก 18 เดือนล่าสุด)"),
      h("p", { class: "note", style: "margin:0 0 8px" }, tr("色の部分にカーソルを置く（スマホはタップ）と、その委託先の月の販売数が出ます。", "Hover over a colour (tap on a phone) to see that consignee's units for the month.", "วางเมาส์บนสี (แตะบนมือถือ) เพื่อดูยอดของผู้รับฝากขายในเดือนนั้น")),
      stackedBars(last, top.map((c, i) => ({ name: c.name, color: palette[i % palette.length], values: c.monthly || {} })), { fmtY: (v) => fmt(v), unit: tr(" 足", " units", " ชิ้น") }),
      srcLine(tr("Stock VFF Consignment.xlsx の各シートの月別販売列", "monthly sales columns in each sheet of Stock VFF Consignment.xlsx", "คอลัมน์ยอดขายรายเดือนในแต่ละชีตของ Stock VFF Consignment.xlsx"))));
    // 3. 委託先 × 月（ブランド別）
    const brands = [...new Set(C.consignees.flatMap((c) => Object.keys(c.monthlyByBrand || {})))];
    brands.sort(byOrder);
    const brandTables = brands.map((b) => {
      const brows = ordered.filter((c) => c.monthlyByBrand?.[b] && last.some((m) => c.monthlyByBrand[b][m])).map((c) => {
        const r = { name: c.displayName || c.name }; let t = 0; for (const m of last) { r[m] = c.monthlyByBrand[b][m] || 0; t += r[m]; } r.total = t; return r; });
      if (!brows.length) return null;
      const total = { name: tr("合計", "Total", "รวม") }; for (const m of [...last, "total"]) total[m] = sum(brows, m);
      const cols = [{ key: "name", label: tr("委託先", "Consignee", "ผู้รับฝากขาย") }, ...last.map((m) => ({ key: m, label: m.slice(2).replace("-", "/"), num: true })), { key: "total", label: tr("合計", "Total", "รวม"), num: true }];
      const cell = (c, r) => h("td", { class: c.num ? "num" : "" }, c.num ? fmt(r[c.key]) : r[c.key]);
      return h("div", { style: "margin-top:18px" }, h("h4", { class: "table-label" }, b),
        h("div", { class: "tablewrap" }, h("table", { class: "dt" },
          h("thead", {}, h("tr", {}, cols.map((c) => h("th", { class: c.num ? "num" : "" }, c.label)))),
          h("tbody", {}, brows.map((r) => h("tr", {}, cols.map((c) => cell(c, r)))), h("tr", { class: "total" }, cols.map((c) => cell(c, total)))))));
    });
    el.append(fold(tr("委託先 × 月（販売足数・ブランド別、直近 18 か月）", "Units sold by consignee and month, by brand (last 18 months)", "จำนวนที่ขายตามผู้รับฝากขายและเดือน แยกตามแบรนด์ (18 เดือนล่าสุด)"),
      ...brandTables,
      srcLine(tr("Stock VFF Consignment.xlsx の SKU 行（品番の頭 VFF / OLN / CP / MTB / BFJ でブランドを判定）", "SKU rows in Stock VFF Consignment.xlsx (brand from the code prefix VFF / OLN / CP / MTB / BFJ)", "แถว SKU ใน Stock VFF Consignment.xlsx (แยกแบรนด์จากรหัส VFF / OLN / CP / MTB / BFJ)"))));
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
    const deck = tr("BD オンボーディング資料", "BD onboarding deck", "เอกสารปฐมนิเทศ BD");
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
      R("brands", tr("ブランドの紹介文（どの会社が扱うか、どんなブランドか）", "Brand introductions (which company handles it, what the brand is)", "คำแนะนำแบรนด์ (บริษัทที่ดูแล และแบรนด์คืออะไร)"), ["text"], [],
        tr("社内で用意した文章をそのまま掲載", "Text written in-house, shown as is", "ข้อความที่จัดทำภายใน แสดงตามเดิม")),
      R("brands", tr("ブランドのロゴ", "Brand logos", "โลโก้แบรนด์"), ["photo"], [], tr("各ブランドのロゴ画像（Coolcore は未入手）", "Each brand's logo image (Coolcore not yet received)", "รูปโลโก้ของแต่ละแบรนด์ (ยังไม่มีของ Coolcore)")),
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
      R("stores", tr("店舗の開店時期", "When each shop opened", "เวลาที่แต่ละร้านเปิด"), ["slides"], [], deck),
      R("stores", tr("店舗の写真", "Shop photos", "รูปร้าน"), ["photo"], [], tr("Google Drive の店舗資料フォルダ", "Store folders in Google Drive", "โฟลเดอร์ร้านใน Google Drive")),
      R("stores", tr("店舗一覧（関連資料）", "Shop list (related document)", "รายชื่อร้าน (เอกสารที่เกี่ยวข้อง)"), ["web"], [L(st.referenceUrl, tr("店舗一覧", "Shop list", "รายชื่อร้าน"))]),
      R("consignment", tr("委託販売先一覧と販売実績（SKU・納品・販売・返品・残・月別販売）", "Consignment partners and results (SKU, delivered, sold, returned, balance, monthly sales)", "ผู้รับฝากขายและผลงาน (SKU ส่งมอบ ขาย คืน คงเหลือ ยอดรายเดือน)"), ["sheet"],
        [L(C.sourceUrl, "Stock VFF Consignment.xlsx")], tr("Google Drive（BFT 経理）", "Google Drive (BFT accounting)", "Google Drive (บัญชี BFT)")),
      R("consignment", tr("委託先の店舗情報", "Partner store info", "ข้อมูลร้านของผู้รับฝากขาย"), ["map", "web", "sns"], [],
        tr("Google マップ・店舗のウェブサイト・Facebook（リンクは委託販売先一覧の各行）", "Google Maps, store websites and Facebook (links are on each row of the partner list)", "Google Maps เว็บไซต์ร้าน และ Facebook (ลิงก์อยู่ในแต่ละแถวของรายชื่อ)")),
      R("consignment", tr("委託販売の課題（売場の陳列写真）", "Consignment issues (store display photos)", "ปัญหาการฝากขาย (ภาพการจัดวางในร้าน)"), ["photo"], [], tr("社内で撮影した写真", "Photos taken by our team", "ภาพที่ทีมงานถ่าย")),
      R("terms", tr("百貨店の手数料（Siam Discovery・Central）", "Department store commission (Siam Discovery, Central)", "ค่าคอมมิชชันห้าง (Siam Discovery, Central)"), ["sheet"],
        [L(termsFile, "Sales Record_Coollabo Shop 2026.xlsx")], tr("Google Drive（精算シート）", "Google Drive (settlement sheets)", "Google Drive (ชีตสรุปยอด)")),
      R("terms", tr("それ以外の取引先の条件（Pathwild・小規模委託先）", "Terms for other partners (Pathwild, small consignees)", "เงื่อนไขของคู่ค้าอื่น (Pathwild, ผู้รับฝากขายรายเล็ก)"), ["slides"], [], deck),
      R("sns", tr("SNS アカウント（Instagram・Facebook・TikTok・LINE）", "Social accounts (Instagram, Facebook, TikTok, LINE)", "บัญชีโซเชียล (Instagram, Facebook, TikTok, LINE)"), ["sns"],
        snsItems.filter((i) => !isEc(i) && i.url).map((i) => L(i.url, `${i.brand === "Barefootinc (Thailand)" ? "BFT" : i.brand} ${i.platform}`))),
      R("sns", tr("EC ショップ（Shopee・Lazada・自社サイト）", "Online shops (Shopee, Lazada, own website)", "ร้านออนไลน์ (Shopee, Lazada, เว็บไซต์บริษัท)"), ["ec"],
        snsItems.filter((i) => isEc(i) && i.url).map((i) => L(i.url, `${i.brand === "Barefootinc (Thailand)" ? "BFT" : i.brand} ${i.platform}`)))
    ];
    const types = [...new Set(rows.flatMap((r) => r.types))];
    el.append(h("div", { class: "card", style: "margin-bottom:14px" },
      h("p", { class: "note", style: "margin:0 0 8px" }, tr("ソースの種類", "Kinds of source", "ประเภทแหล่งที่มา")),
      h("div", {}, types.map((k) => h("span", { class: `src-type t-${k}` }, tr(...T[k]), " ", h("span", { class: "muted small" }, `${rows.filter((r) => r.types.includes(k)).length}`))))));
    let prev = null;
    const body = rows.map((r) => {
      const first = r.sec !== prev; prev = r.sec;
      return h("tr", { class: first ? "sec-first" : "" },
        h("td", {}, first ? h("a", { href: `#${r.sec}`, class: "sec-link" }, tr(...sections[r.sec])) : ""),
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
