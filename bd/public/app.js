/* BD オンボーディング・ダッシュボード  —  静的 HTML + JSON。ビルド不要。
   データは data/*.json。社外秘のもの（取引条件・委託実績）は /api/bd-secret から合言葉つきで取得。 */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
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
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n, d = 0) => n == null || Number.isNaN(n) ? "–" : Number(n).toLocaleString("ja-JP", { maximumFractionDigits: d, minimumFractionDigits: d });
  const fmtM = (n) => n == null ? "–" : (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + "M" : fmt(n));
  const src = (text) => text ? h("span", { class: "src", title: `出典: ${text}` }, "src") : null;
  const missing = (label = "未入力") => h("span", { class: "missing" }, label);
  const val = (v, s) => (v == null || v === "" ? missing() : h("span", {}, v, src(s)));
  const toast = (msg) => { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), 2600); };
  const BRAND_COLOR = { VFF: "var(--c-vff)", Vivo: "var(--c-vivo)", Oleno: "var(--c-oleno)", OLENO: "var(--c-oleno)", Coolcore: "var(--c-coolcore)", AQOS: "var(--c-aqos)", Others: "var(--c-others)" };
  const BRAND_ID = { vff: "VFF", vivo: "Vivo", oleno: "Oleno", coolcore: "Coolcore", aqos: "AQOS" };
  const LIGHT = new Set(["vff"]);

  // ---------- theme ----------
  (function theme() {
    const order = ["auto", "light", "dark"], label = { auto: "自動", light: "ライト", dark: "ダーク" };
    let cur = "auto"; try { cur = localStorage.getItem("bd.theme") || "auto"; } catch {}
    const apply = () => { if (cur === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", cur); $("themeLabel").textContent = label[cur]; };
    apply();
    $("themeToggle").addEventListener("click", () => { cur = order[(order.indexOf(cur) + 1) % 3]; try { localStorage.setItem("bd.theme", cur); } catch {} apply(); });
  })();

  // ---------- data ----------
  const D = {};
  async function loadJSON(path) { const r = await fetch(path, { cache: "no-store" }); if (!r.ok) throw new Error(`${path}: ${r.status}`); return r.json(); }
  async function loadAll() {
    const files = { company: "data/company.json", brands: "data/brands.json", stores: "data/stores.json", guidelines: "data/guidelines.json", sns: "data/sns.json", requests: "data/requests.json", sales: "data/sales_monthly.json", salesRecord: "data/sales_record_sum.json" };
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
      if (sortKey) { const c = cols.find((x) => x.key === sortKey); rs.sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x == null) return 1; if (y == null) return -1; const r = c && c.num ? x - y : String(x).localeCompare(String(y), "ja"); return desc ? -r : r; }); }
      return rs;
    }
    function draw() {
      ths.forEach((th, i) => { th.classList.toggle("sorted", cols[i].key === sortKey); th.classList.toggle("desc", cols[i].key === sortKey && desc); });
      tbody.replaceChildren();
      const rs = current();
      for (const r of rs) tbody.append(h("tr", { class: r._total ? "total" : "" }, cols.map((c) => h("td", { class: (c.num ? "num " : "") + (c.wrap ? "wrap" : "") }, cell(c, r)))));
      if (opts.total) { const t = opts.total(rs); if (t) tbody.append(h("tr", { class: "total" }, cols.map((c) => h("td", { class: c.num ? "num" : "" }, t[c.key] == null ? "" : c.num ? fmt(t[c.key], c.digits || 0) : t[c.key])))); }
      if (counter) counter.textContent = `${rs.length} 件`;
    }
    let counter = null;
    const bar = h("div", { class: "toolbar" });
    if (opts.search !== false) bar.append(h("input", { type: "search", placeholder: "検索…", oninput: (e) => { filter = e.target.value; draw(); } }));
    if (opts.extra) bar.append(...[].concat(opts.extra));
    counter = h("span", { class: "count" }); bar.append(counter);
    if (opts.csv !== false) bar.append(h("button", { class: "ghost", type: "button", onclick: () => csv(cols, current(), opts.csvName || "table") }, "CSV 保存"));
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
  const views = {};
  function route() {
    const hash = (location.hash || "#home").slice(1);
    const [view, sub] = hash.split("-", 2).length > 1 && hash.startsWith("brand-") ? ["brands", hash.slice(6)] : [hash, null];
    const name = views[view] ? view : "home";
    document.querySelectorAll(".view").forEach((v) => (v.hidden = v.id !== `view-${name}`));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
    const el = $(`view-${name}`);
    if (!el.dataset.ready || name === "brands") { el.replaceChildren(); views[name](el, sub); el.dataset.ready = "1"; }
    window.scrollTo({ top: 0 });
  }
  window.addEventListener("hashchange", route);

  // ---------- HOME ----------
  views.home = (el) => {
    const c = D.company, s = D.sales, st = D.stores, rq = D.requests;
    if (!c) { el.append(h("p", { class: "error" }, "company.json を読み込めませんでした")); return; }
    // KPIs
    const lastM = s ? s.months[s.months.length - 1] : null;
    const groupAmt = lastM ? Object.values(s.group.brandMonthly).reduce((a, r) => a + ((r[lastM] || {}).amount || 0), 0) : null;
    const nStores = st ? st.items.filter((x) => x.type === "direct" || x.type === "dept").length : null;
    const nReq = rq ? rq.items.length : 0;
    el.append(h("section", { class: "kpis" },
      h("div", { class: "kpi" }, h("p", { class: "kpi-label" }, `${lastM ? lastM.replace("-", "年") + "月" : "直近月"}の売上合計（BFT+EDV 小売）`), h("p", { class: "kpi-value" }, groupAmt == null ? "–" : fmt(groupAmt / 1e6, 2) + " M"), h("p", { class: "kpi-note" }, "THB・2社単純合算（二重計上の注記あり）", src("sales_monthly.json"))),
      h("div", { class: "kpi" }, h("p", { class: "kpi-label" }, "店舗数（直営 + デパート委託）"), h("p", { class: "kpi-value" }, fmt(nStores)), h("p", { class: "kpi-note" }, "pptx: 6 店舗 + オンライン", src("pptx S11"))),
      h("div", { class: "kpi" }, h("p", { class: "kpi-label" }, "取扱ブランド数"), h("p", { class: "kpi-value" }, "5"), h("p", { class: "kpi-note" }, "VFF / Vivo / OLENO（BFT）・Coolcore / AQOS（EDV）", src("pptx S4"))),
      h("a", { class: "kpi", href: "#requests", style: "display:block" }, h("p", { class: "kpi-label" }, "未入力の項目数"), h("p", { class: "kpi-value", style: "color:var(--warn)" }, fmt(nReq)), h("p", { class: "kpi-note" }, "情報リクエスト一覧へ →")),
    ));
    // intro + companies
    el.append(h("div", { class: "section-title" }, h("h2", {}, "会社と役割分担"), h("span", { class: "note" }, c.groupRevenue, src(c.companies[0].src))));
    el.append(h("div", { class: "grid c2" }, c.companies.map((co) => h("div", { class: "card" }, h("h3", {}, co.name, " ", h("span", { class: "pill" }, co.short)),
      h("dl", { class: "kv" }, h("dt", {}, "設立"), h("dd", {}, co.founded), h("dt", {}, "資本"), h("dd", {}, co.capital), h("dt", {}, "年商(概算)"), h("dd", {}, co.revenue), h("dt", {}, "ブランド"), h("dd", {}, co.brands.join(" / ")), h("dt", {}, "主な役割"), h("dd", {}, co.role))))));
    el.append(h("p", { class: "note" }, c.hq, src("pptx S3"), " ", h("span", {}, `所属: ${c.onboarding.belongsTo} ／ 上長: ${c.onboarding.manager} ／ 試用期間: ${c.onboarding.probation}`), src(c.onboarding.src)));
    // brands
    el.append(h("div", { class: "section-title" }, h("h2", {}, "5 ブランド"), h("span", { class: "note" }, "クリックで詳細へ")));
    el.append(h("div", { class: "brand-cards" }, (D.brands ? D.brands.items : []).map((b) => h("a", { class: "brand-card", href: `#brand-${b.id}`, style: `--bc:${BRAND_COLOR[b.short] || "var(--accent)"}` }, h("div", { class: "bc" }, b.company === "BFT" ? "Barefootinc" : "Endeavorz"), h("div", { class: "bn" }, b.name), h("div", { class: "bt" }, b.tagline)))));
    // rules
    el.append(h("div", { class: "section-title" }, h("h2", {}, "取り扱い上の注意 — 守ってほしい 4 つのこと"), src("pptx S14")));
    el.append(h("div", { class: "grid c2" }, c.rules.map((r) => h("div", { class: "warnbox" }, h("strong", {}, r.title), h("div", { class: "small", style: "margin-top:4px" }, r.body)))));
    // issues
    el.append(h("div", { class: "section-title" }, h("h2", {}, "ブランドをまたいだ課題 — 4 つの構造的な問題"), src("pptx S13")));
    el.append(h("div", { class: "grid c2" }, c.issues.map((i) => h("div", { class: "card" }, h("div", {}, i.brands.map((b) => h("span", { class: `pill b-${b.toLowerCase()}` }, b))), h("h3", { style: "margin-top:6px" }, i.title), h("p", { class: "small", style: "margin:0" }, i.body)))));
    // market
    el.append(h("div", { class: "section-title" }, h("h2", {}, "売り上げ減少の見立て"), src("pptx S12")));
    el.append(h("div", { class: "grid c2" }, c.market.map((m) => h("div", { class: "infobox" }, h("strong", {}, m.title), h("div", { class: "small", style: "margin-top:4px" }, m.body)))));
    // checklist
    el.append(h("div", { class: "section-title" }, h("h2", {}, "最初の 30 日で読むもの・やること"), h("span", { class: "note" }, "チェックはこのブラウザにだけ保存されます")));
    let done = {}; try { done = JSON.parse(localStorage.getItem("bd.checklist") || "{}"); } catch {}
    el.append(h("div", { class: "card" }, c.checklist.map((it, i) => { const row = h("label", { class: "check" + (done[i] ? " done" : "") }); const cb = h("input", { type: "checkbox", checked: !!done[i], onchange: (e) => { done[i] = e.target.checked; row.classList.toggle("done", done[i]); try { localStorage.setItem("bd.checklist", JSON.stringify(done)); } catch {} } }); row.append(cb, h("span", {}, it.text, it.link ? [" ", h("a", { href: it.link, target: it.link.startsWith("#") ? null : "_blank", rel: "noopener" }, "→")] : null)); return row; })));
    // tools
    el.append(h("div", { class: "section-title" }, h("h2", {}, "社内ツール・ダッシュボード")));
    el.append(h("div", { class: "grid c3" }, c.tools.map((t) => h("a", { class: "card", href: t.url, target: "_blank", rel: "noopener", style: "color:inherit" }, h("strong", {}, t.name), h("div", { class: "small muted", style: "margin-top:4px" }, t.note)))));
  };

  // ---------- BRANDS ----------
  views.brands = (el, sub) => {
    const B = D.brands ? D.brands.items : [];
    const cur = B.find((b) => b.id === sub) || B[0];
    el.append(h("div", { class: "subtabs" }, B.map((b) => h("a", { class: "subtab" + (b.id === cur.id ? " active" : "") + (LIGHT.has(b.id) ? " light" : ""), href: `#brand-${b.id}`, style: `--bc:${BRAND_COLOR[b.short]}` }, b.name))));
    if (!cur) return;
    const b = cur;
    el.append(h("div", { class: "brand-head" }, h("span", { class: "logo-chip" + (LIGHT.has(b.id) ? " light" : ""), style: `--bc:${BRAND_COLOR[b.short]}` }, b.short), h("div", {}, h("h2", { style: "margin:0" }, b.name, " ", h("span", { class: "muted small" }, b.nameJa)), h("div", { class: "note" }, b.tagline, " ／ ", b.company === "BFT" ? "Barefootinc (Thailand)" : "Endeavorz", src(b.src)))));
    el.append(h("div", { class: "grid c2" },
      h("div", { class: "card" }, h("h3", {}, "概要"), h("dl", { class: "kv" },
        h("dt", {}, "出自"), h("dd", {}, b.origin), h("dt", {}, "コンセプト"), h("dd", {}, b.concept), h("dt", {}, "ターゲット"), h("dd", {}, val(b.target === "未入力" ? null : b.target)),
        h("dt", {}, "タイで売る理由／現状"), h("dd", {}, b.whyTH), h("dt", {}, "価格帯"), h("dd", {}, b.priceRange), h("dt", {}, "取り扱い開始"), h("dd", {}, b.sinceTH && !b.sinceTH.startsWith("未入力") ? b.sinceTH : missing(b.sinceTH || "未入力")),
        h("dt", {}, "契約形態"), h("dd", {}, b.dealType), h("dt", {}, "本国の窓口"), h("dd", {}, b.principal.company, h("div", { class: "small muted" }, b.principal.role), b.principal.contactNote ? h("div", { class: "small" }, missing(), " ", b.principal.contactNote) : null))),
      h("div", {}, h("div", { class: "card" }, h("h3", {}, "数字"), h("div", { class: "kpi-row" }, b.kpis.map((k) => k.values ? Object.entries(k.values).map(([y, v]) => h("div", { class: "mini" }, h("div", { class: "l" }, y), h("div", { class: "v num" }, fmt(v)))) : null)), b.kpis.map((k) => h("p", { class: "small", style: "margin:8px 0 0" }, h("strong", {}, k.label, ": "), k.text || "", src(k.src)))),
        h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "状況"), h("p", { style: "margin:0" }, b.status), b.goal ? h("p", { class: "small" }, h("strong", {}, "目指す形: "), b.goal) : null, b.insight ? h("p", { class: "small" }, h("strong", {}, "見立て: "), b.insight) : null))));
    const lists = [];
    if (b.constraints) lists.push(h("div", { class: "warnbox" }, h("strong", {}, "制限・禁止事項"), h("ul", { class: "clean small" }, b.constraints.map((x) => h("li", {}, x)))));
    if (b.issues) lists.push(h("div", { class: "card" }, h("h3", {}, "課題"), h("ul", { class: "clean small" }, b.issues.map((x) => h("li", {}, x)))));
    if (b.wholesale) lists.push(h("div", { class: "card" }, h("h3", {}, "卸先"), table([{ key: "name", label: "卸先", wrap: true }, { key: "type", label: "形態" }, { key: "status", label: "状況", wrap: true }], b.wholesale, { search: false, csv: false })));
    el.append(h("div", { class: "grid c2", style: "margin-top:14px" }, lists));
    if (b.links && b.links.length) el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "資料・リンク"), h("ul", { class: "clean small" }, b.links.map((l) => h("li", {}, h("a", { href: l.url, target: "_blank", rel: "noopener" }, l.label))))));
    // products
    const P = D.products[b.id];
    el.append(h("div", { class: "section-title" }, h("h2", {}, "取り扱い商品"), P ? h("span", { class: "note" }, P.asOf ? `基準: ${P.asOf}` : "", " ", src(P.source)) : null));
    if (!P || !P.items || !P.items.length) { el.append(h("div", { class: "card" }, missing("商品情報なし"), " ", h("span", { class: "small" }, "情報リクエストを参照"))); return; }
    const cats = [...new Set(P.items.map((p) => p.category).filter(Boolean))].sort();
    const grid = h("div", { class: "products" });
    const sel = h("select", { onchange: draw }, h("option", { value: "" }, "すべてのカテゴリ"), cats.map((c) => h("option", { value: c }, c)));
    const q = h("input", { type: "search", placeholder: "モデル名・色で検索", oninput: draw });
    const count = h("span", { class: "count" });
    function draw() {
      const f = q.value.toLowerCase(), c = sel.value;
      const rows = P.items.filter((p) => (!c || p.category === c) && (!f || JSON.stringify([p.name, p.nameJa, p.colours, p.intro, p.code]).toLowerCase().includes(f)));
      count.textContent = `${rows.length} / ${P.items.length} 件`;
      grid.replaceChildren(...rows.map((p) => h("div", { class: "product" },
        h("div", { class: "ph" }, p.image ? h("img", { src: p.image, alt: p.name, loading: "lazy" }) : h("span", {}, p.missing ? "資料なし" : "画像なし（Drive 参照）")),
        h("div", { class: "pb" }, h("div", { class: "pn" }, p.name, p.nameJa ? h("span", { class: "muted small" }, " ", p.nameJa) : null), h("div", { class: "pc" }, [p.category, p.genders && p.genders.join("/"), p.code].filter(Boolean).join(" · ")),
          h("div", { class: "pp num" }, p.priceThb != null ? `฿${fmt(p.priceThb)}${p.priceThbMax && p.priceThbMax !== p.priceThb ? `–${fmt(p.priceThbMax)}` : ""}` : (p.priceRange ? h("span", { class: "small" }, p.priceRange) : missing("価格未入力"))),
          p.tagline ? h("div", { class: "small", style: "color:var(--ink-2)" }, p.tagline) : null,
          p.intro ? h("div", { class: "pd" }, p.intro) : null,
          (p.colours && p.colours.length) || (p.sizes && p.sizes.length) || (p.features && p.features.length) ? h("details", {}, h("summary", {}, "色・サイズ・特徴"), p.colours && p.colours.length ? h("div", {}, h("b", {}, "色: "), p.colours.join(", ")) : null, p.sizes && p.sizes.length ? h("div", {}, h("b", {}, "サイズ: "), p.sizes.join(", ")) : null, p.features && p.features.length ? h("ul", { class: "clean" }, p.features.map((f) => h("li", {}, f))) : null, p.weight ? h("div", {}, h("b", {}, "重量: "), p.weight) : null) : null,
          p.links && p.links.jp ? h("a", { class: "small", href: p.links.jp, target: "_blank", rel: "noopener" }, "公式ページ（日本）→") : null,
          p.pdf ? h("a", { class: "small", href: p.pdf, target: "_blank", rel: "noopener" }, "商品シート PDF →") : null))));
    }
    el.append(h("div", { class: "toolbar" }, q, sel, count), grid); draw();
  };

  // ---------- GUIDELINES ----------
  views.guidelines = (el) => {
    const G = D.guidelines; if (!G) return;
    for (const g of G.brands) {
      el.append(h("div", { class: "section-title" }, h("h2", {}, h("span", { class: "logo-chip" + (g.brand === "VFF" ? " light" : ""), style: `--bc:${BRAND_COLOR[g.brand]};height:30px;min-width:44px;font-size:12px;margin-right:8px` }, g.brand), g.title)));
      el.append(h("div", { class: "grid c2" },
        h("div", { class: "card" }, h("h3", {}, "原本"), h("ul", { class: "clean small" }, g.docs.map((d) => h("li", {}, h("a", { href: d.url, target: "_blank", rel: "noopener" }, d.label), d.note ? h("div", { class: "muted" }, d.note) : null)))),
        h("div", { class: "card" }, h("h3", {}, "カラー・フォント"), g.palette.length ? h("div", { class: "swatches" }, g.palette.map((p) => h("div", { class: "swatch" }, h("i", { style: `background:${p.hex}` }), h("div", {}, p.hex), p.name ? h("div", { class: "muted" }, p.name) : null))) : missing("カラーコード未抽出"), g.paletteSrc ? src(g.paletteSrc) : null,
          h("div", { style: "margin-top:10px" }, g.fonts.length ? g.fonts.map((f) => h("div", { class: "small" }, h("strong", {}, f.name), " — ", f.use)) : missing("フォント未抽出"), g.fontsSrc ? src(g.fontsSrc) : null))));
      el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "要点（ページ番号は原本 EN 版）"), table([{ key: "page", label: "頁" }, { key: "title", label: "項目" }, { key: "text", label: "内容", wrap: true }], g.rules, { search: false, csv: false })));
      if (g.localRules && g.localRules.length) el.append(h("div", { class: "grid c2", style: "margin-top:14px" }, g.localRules.map((r) => h("div", { class: "warnbox" }, h("strong", {}, r.title), h("div", { class: "small", style: "margin-top:4px" }, r.text, src(r.src))))));
    }
  };

  // ---------- SALES ----------
  views.sales = (el) => {
    const S = D.sales; if (!S) { el.append(h("p", { class: "error" }, "sales_monthly.json を読み込めませんでした")); return; }
    let scope = "group", metric = "amount";
    const seg = (opts, cur, on) => h("div", { class: "seg" }, opts.map(([k, l]) => h("button", { type: "button", class: k === cur ? "on" : "", onclick: () => on(k) }, l)));
    const body = h("div");
    function draw() {
      body.replaceChildren();
      const bm = scope === "group" ? S.group.brandMonthly : scope === "bft" ? S.bft.brandMonthly : S.edv.brandMonthly;
      const months = S.months;
      const brands = S.brands.filter((b) => bm[b]);
      const series = brands.map((b) => ({ name: b, color: BRAND_COLOR[b], values: Object.fromEntries(months.map((m) => [m, (bm[b][m] || {})[metric] || 0])) }));
      body.append(h("div", { class: "card" }, h("h3", {}, `ブランド別 月次${metric === "amount" ? "売上金額 (THB)" : "販売数量"} — ${{ group: "グループ小売（BFT + EDV）", bft: "Barefootinc (Thailand)", edv: "Endeavorz" }[scope]}`), stackedBars(months, series, { fmtY: metric === "amount" ? fmtM : (v) => fmt(v) })));
      const rows = brands.map((b) => { const r = { brand: b }; let t = 0; for (const m of months) { r[m] = (bm[b][m] || {})[metric] || 0; t += r[m]; } r.total = t; return r; });
      const cols = [{ key: "brand", label: "ブランド" }, ...months.map((m) => ({ key: m, label: m.slice(2), num: true })), { key: "total", label: "合計", num: true }];
      body.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "表（ブランド × 月）"), table(cols, rows, { search: false, csvName: `sales_${scope}_${metric}`, total: (rs) => { const t = { brand: "合計" }; for (const m of [...months, "total"]) t[m] = rs.reduce((a, r) => a + (r[m] || 0), 0); return t; } })));
    }
    el.append(h("div", { class: "toolbar" }));
    function refreshSeg() { const tb = el.querySelector(".toolbar"); tb.replaceChildren(seg([["group", "グループ"], ["bft", "BFT"], ["edv", "EDV"]], scope, (k) => { scope = k; draw(); refreshSeg(); }), seg([["amount", "金額"], ["qty", "数量"]], metric, (k) => { metric = k; draw(); refreshSeg(); }), h("span", { class: "count" }, `${S.months[0]} 〜 ${S.months[S.months.length - 1]}`)); }
    refreshSeg();
    el.append(body); draw();
    // notes + sources
    el.append(h("div", { class: "infobox", style: "margin-top:14px" }, h("strong", {}, "この数字について"), h("ul", { class: "clean small" }, S.notes.map((n) => h("li", {}, n))), h("div", { class: "small", style: "margin-top:6px" }, S.sources.map((s) => h("div", {}, h("a", { href: s.url, target: "_blank", rel: "noopener" }, s.label, " →"), ` 期間 ${s.period}。${s.basis}`)))));
    // BFT overall incl. prev year
    const ov = S.bft.overall, pv = S.bft.overallPrev, o24 = S.bft.overall2024;
    const ymRows = []; const allM = new Set([...Object.keys(ov), ...Object.keys(pv), ...Object.keys(o24)].map((m) => m.slice(5)));
    for (const mm of [...allM].sort()) ymRows.push({ month: mm + "月", y2024: (o24["2024-" + mm] || {}).amount, y2025: (pv["2025-" + mm] || {}).amount, y2026: (ov["2026-" + mm] || {}).amount, q2025: (pv["2025-" + mm] || {}).qty, q2026: (ov["2026-" + mm] || {}).qty });
    el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "BFT 全体 前年比較（売上金額 THB／数量）", src("sales-1st-half-26-dashboard monthly_overall*")), table([{ key: "month", label: "月" }, { key: "y2024", label: "2024 金額", num: true }, { key: "y2025", label: "2025 金額", num: true }, { key: "y2026", label: "2026 金額", num: true }, { key: "q2025", label: "2025 数量", num: true }, { key: "q2026", label: "2026 数量", num: true }], ymRows, { search: false, csvName: "bft_yoy" })));
    // BFT stores
    el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, `BFT 店舗・チャネル別 合計（${S.bft.kpi.period}）`, src("sales-1st-half-26-dashboard stores")), table([{ key: "store", label: "店舗・チャネル" }, { key: "groupLabel", label: "区分" }, { key: "amount", label: "売上 THB", num: true }, { key: "qty", label: "数量", num: true }, { key: "orders", label: "伝票数", num: true }], S.bft.stores, { search: false, sortKey: "amount", desc: true, csvName: "bft_stores" })));
    // EDV channels
    const edvRows = Object.entries(S.edv.channelMonthly).map(([ch, row]) => { const r = { channel: ch, group: (S.edv.channels.find((c) => c.key === ch) || {}).group }; let t = 0; for (const m of S.months) { r[m] = (row[m] || {}).amount || 0; t += r[m]; } r.total = t; return r; });
    el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "EDV チャネル × 月（売上金額 THB・税抜）", src("edv-sales-dashboard ch")), table([{ key: "channel", label: "チャネル" }, { key: "group", label: "区分" }, ...S.months.map((m) => ({ key: m, label: m.slice(2), num: true })), { key: "total", label: "合計", num: true }], edvRows, { search: false, sortKey: "total", desc: true, csvName: "edv_channels" })));
    // 経理ベース（Sales Record SUM シート、税込）店舗 × 月
    if (D.salesRecord && D.salesRecord.years) {
      const SR = D.salesRecord; const yrs = Object.keys(SR.years).sort();
      for (const y of yrs) for (const co of Object.keys(SR.years[y])) {
        const block = SR.years[y][co]; const ms = [...new Set(Object.values(block).flatMap((r) => Object.keys(r)))].sort();
        const rows = Object.entries(block).map(([st, r]) => { const o = { store: st }; let t = 0; for (const m of ms) { o[m] = r[m] || 0; t += o[m]; } o.total = t; return o; });
        el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, `経理ベース ${co} 店舗 × 月 ${y}（税込売価 THB・Sales Record SUM シート）`, src(SR.source)), h("p", { class: "note" }, SR.basis), table([{ key: "store", label: "店舗" }, ...ms.map((m) => ({ key: m, label: m.slice(2), num: true })), { key: "total", label: "合計", num: true }], rows, { search: false, sortKey: "total", desc: true, csvName: `sales_record_${co}_${y}`, total: (rs) => { const t = { store: "合計" }; for (const m of [...ms, "total"]) t[m] = rs.reduce((a, r) => a + (r[m] || 0), 0); return t; } })));
      }
      if (SR.notes) el.append(h("p", { class: "note" }, SR.notes.join(" ／ ")));
    }
    // VFF shoes by store
    const vs = S.bft.vffShoesStoreMonthly || {};
    if (Object.keys(vs).length) { const vrows = Object.entries(vs).map(([st, row]) => { const r = { store: st }; let t = 0; for (const m of S.months) { const v = row[m]; r[m] = v == null ? 0 : (typeof v === "object" ? v.qty : v); t += r[m]; } r.total = t; return r; }); el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "BFT VFF シューズ 店舗 × 月（足数）", src("sales-1st-half-26-dashboard vff_shoes.store_monthly")), table([{ key: "store", label: "店舗" }, ...S.months.map((m) => ({ key: m, label: m.slice(2), num: true })), { key: "total", label: "合計", num: true }], vrows, { search: false, sortKey: "total", desc: true, csvName: "vff_store_monthly" }))); }
  };

  // ---------- STORES ----------
  views.stores = (el) => {
    const ST = D.stores; if (!ST) return;
    let type = "", company = "";
    const typeSel = h("select", { onchange: (e) => { type = e.target.value; draw(); } }, h("option", { value: "" }, "すべての形態"), Object.entries(ST.types).map(([k, v]) => h("option", { value: k }, v)));
    const coSel = h("select", { onchange: (e) => { company = e.target.value; draw(); } }, h("option", { value: "" }, "両社"), h("option", { value: "BFT" }, "BFT"), h("option", { value: "EDV" }, "EDV"));
    const cards = h("div", { class: "grid c3" }), tbl = h("div");
    function draw() {
      const rows = ST.items.filter((s) => (!type || s.type === type) && (!company || s.company.includes(company)));
      cards.replaceChildren(...rows.map((s) => h("div", { class: "card" }, h("div", {}, h("span", { class: "pill" }, ST.types[s.type]), h("span", { class: "pill" }, s.company)), h("h3", { style: "margin-top:6px" }, s.name), h("dl", { class: "kv small" }, h("dt", {}, "場所"), h("dd", {}, s.location || missing(), s.mapQuery ? [" ", h("a", { href: `https://www.google.com/maps/search/${encodeURIComponent(s.mapQuery)}`, target: "_blank", rel: "noopener" }, "地図")] : null), h("dt", {}, "面積"), h("dd", {}, s.size || missing()), h("dt", {}, "取扱"), h("dd", {}, s.brands.join(" / ")), h("dt", {}, "月間実績"), h("dd", {}, s.monthly || missing()), h("dt", {}, "状況"), h("dd", {}, s.status || missing()), h("dt", {}, "担当"), h("dd", {}, s.staff || missing()), h("dt", {}, "営業時間"), h("dd", {}, s.hours || missing()), h("dt", {}, "開店"), h("dd", {}, s.opened || missing()), h("dt", {}, "Zort 倉庫"), h("dd", {}, s.zort || "—")), h("div", { class: "small muted", style: "margin-top:6px" }, src(s.src)))));
      tbl.replaceChildren(table([{ key: "name", label: "店舗・チャネル", wrap: true }, { key: "company", label: "運営" }, { key: "type", label: "形態", render: (v) => ST.types[v] }, { key: "brands", label: "取扱", render: (v) => v.join(" / "), csv: (v) => v.join(" / ") }, { key: "size", label: "面積" }, { key: "location", label: "場所", wrap: true }, { key: "monthly", label: "月間実績", wrap: true }, { key: "status", label: "状況", wrap: true }, { key: "staff", label: "担当" }, { key: "hours", label: "営業時間" }, { key: "opened", label: "開店" }], rows, { search: false, csvName: "stores" }));
    }
    el.append(h("div", { class: "toolbar" }, typeSel, coSel, h("span", { class: "count" }, "出典: ", ST.sources.join(" / "))), cards, h("div", { class: "section-title" }, h("h2", {}, "表")), tbl);
    draw();
    el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "未入力"), h("ul", { class: "clean small" }, ST.missing.map((m) => h("li", {}, missing(), " ", m)))));
  };

  // ---------- SECRET (terms / consignment) ----------
  const secret = { key: null };
  try { secret.key = sessionStorage.getItem("bd.key"); } catch {}
  async function fetchSecret(doc) {
    const r = await fetch(`/api/bd-secret?doc=${doc}`, { headers: secret.key ? { Authorization: `Bearer ${secret.key}` } : {}, cache: "no-store" });
    if (r.status === 401) throw Object.assign(new Error("合言葉が違います"), { code: 401 });
    if (r.status === 503) throw Object.assign(new Error("サーバー側で合言葉（BD_SECRET_KEY）が未設定です。Vercel の Environment Variables に設定してください。"), { code: 503 });
    if (!r.ok) throw new Error(`取得に失敗しました (${r.status})`);
    return r.json();
  }
  function gate(el, doc, title, render) {
    el.replaceChildren();
    const box = h("div", { class: "card locked" }, h("div", { class: "big" }, "🔒"), h("h2", {}, title), h("p", { class: "note" }, "社外秘のため合言葉が必要です（GM から受け取ってください）。入力した合言葉はこのタブを閉じるまで記憶します。"));
    const input = h("input", { type: "password", placeholder: "合言葉", autocomplete: "off" }), err = h("p", { class: "error" });
    const go = async () => { if (input.value) secret.key = input.value.trim(); try { sessionStorage.setItem("bd.key", secret.key || ""); } catch {} err.textContent = "読み込み中…"; try { const data = await fetchSecret(doc); el.replaceChildren(); render(el, data); } catch (e) { err.textContent = e.message; if (e.code === 401) { secret.key = null; } } };
    box.append(h("div", { class: "toolbar", style: "justify-content:center" }, input, h("button", { class: "ghost", type: "button", onclick: go }, "開く")), err);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    el.append(box);
    if (location.protocol === "file:" || !/vercel\.app$|localhost|127\.0\.0\.1/.test(location.hostname) && !location.hostname) err.textContent = "";
    if (secret.key) go();
  }
  views.terms = (el) => gate(el, "terms", "取引条件一覧", (el, T) => {
    el.append(h("div", { class: "section-title" }, h("h2", {}, "取引条件一覧"), h("span", { class: "note" }, `更新 ${T.updatedAt}`)));
    el.append(h("div", { class: "warnbox" }, h("strong", {}, "注意"), h("div", { class: "small" }, T.note)));
    el.append(h("div", { class: "card", style: "margin-top:14px" }, table([{ key: "counterparty", label: "取引先" }, { key: "brand", label: "ブランド" }, { key: "kind", label: "種類" }, { key: "value", label: "条件", wrap: true }, { key: "paymentTerms", label: "支払サイト" }, { key: "minOrder", label: "最低発注" }, { key: "returns", label: "返品条件" }, { key: "contractEnd", label: "契約期限" }, { key: "status", label: "確度" }, { key: "source", label: "出典", wrap: true, render: (v, r) => r.sourceUrl ? h("a", { href: r.sourceUrl, target: "_blank", rel: "noopener" }, v) : v }], T.items, { csvName: "terms" })));
    if (T.missing) el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "未入力"), h("ul", { class: "clean small" }, T.missing.map((m) => h("li", {}, missing(), " ", m)))));
  });
  views.consignment = (el) => gate(el, "consignment", "委託販売実績", (el, C) => {
    el.append(h("div", { class: "section-title" }, h("h2", {}, "委託販売実績（足数）"), h("span", { class: "note" }, `${C.period || ""} ／ 更新 ${C.updatedAt}`, src(C.source))));
    if (C.notes) el.append(h("div", { class: "infobox" }, h("ul", { class: "clean small" }, C.notes.map((n) => h("li", {}, n)))));
    const months = C.months || [];
    const rows = C.consignees.map((c) => ({ ...c, brandsText: (c.brands || []).join(" / "), last12: months.slice(-12).reduce((a, m) => a + ((c.monthly || {})[m] || 0), 0) }));
    el.append(h("div", { class: "card", style: "margin-top:14px" }, table([{ key: "name", label: "委託先" }, { key: "type", label: "形態" }, { key: "brandsText", label: "ブランド" }, { key: "skuCount", label: "SKU", num: true }, { key: "delivered", label: "納品", num: true }, { key: "sold", label: "販売", num: true }, { key: "returned", label: "返品", num: true }, { key: "balance", label: "残", num: true }, { key: "last12", label: "直近12か月 販売", num: true }, { key: "firstMonth", label: "開始" }, { key: "lastMonth", label: "最終販売" }], rows, { sortKey: "sold", desc: true, csvName: "consignment", total: (rs) => ({ name: "合計", skuCount: rs.reduce((a, r) => a + (r.skuCount || 0), 0), delivered: rs.reduce((a, r) => a + (r.delivered || 0), 0), sold: rs.reduce((a, r) => a + (r.sold || 0), 0), returned: rs.reduce((a, r) => a + (r.returned || 0), 0), balance: rs.reduce((a, r) => a + (r.balance || 0), 0), last12: rs.reduce((a, r) => a + (r.last12 || 0), 0) }) })));
    if (months.length) {
      const top = rows.slice().sort((a, b) => b.sold - a.sold).slice(0, 8);
      const palette = ["#3b82c4", "#d03b3b", "#2e9e5b", "#d99100", "#7c5cbf", "#00a7e1", "#8a8c8f", "#c2185b"];
      const last = months.slice(-18);
      el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "委託先別 月次販売足数（上位 8・直近 18 か月）"), stackedBars(last, top.map((c, i) => ({ name: c.name, color: palette[i % palette.length], values: c.monthly || {} })), { fmtY: (v) => fmt(v) })));
      const mrows = rows.map((c) => { const r = { name: c.name }; for (const m of last) r[m] = (c.monthly || {})[m] || 0; return r; });
      el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "委託先 × 月（販売足数）"), table([{ key: "name", label: "委託先" }, ...last.map((m) => ({ key: m, label: m.slice(2), num: true }))], mrows, { search: false, csvName: "consignment_monthly" })));
    }
    if (C.byBrandTotal) el.append(h("div", { class: "card", style: "margin-top:14px" }, h("h3", {}, "ブランド別 合計"), table([{ key: "brand", label: "ブランド" }, { key: "delivered", label: "納品", num: true }, { key: "sold", label: "販売", num: true }, { key: "balance", label: "残", num: true }], Object.entries(C.byBrandTotal).map(([b, v]) => ({ brand: b, ...v })), { search: false, csv: false })));
  });

  // ---------- SNS ----------
  views.sns = (el) => {
    const S = D.sns; if (!S) return;
    el.append(h("div", { class: "infobox" }, h("div", { class: "small" }, S.note)));
    el.append(h("div", { class: "card", style: "margin-top:14px" }, table([{ key: "brand", label: "ブランド" }, { key: "platform", label: "プラットフォーム" }, { key: "handle", label: "アカウント" }, { key: "url", label: "URL", render: (v) => v ? h("a", { href: v, target: "_blank", rel: "noopener" }, v.replace(/^https?:\/\//, "")) : missing() }, { key: "owner", label: "運用担当" }, { key: "followers", label: "フォロワー", num: true }, { key: "policy", label: "投稿方針" }, { key: "status", label: "備考", wrap: true }, { key: "src", label: "出典", wrap: true }], S.items, { csvName: "sns" })));
    el.append(h("p", { class: "note" }, "想定プラットフォーム: ", S.platforms.join(" / ")));
  };

  // ---------- REQUESTS ----------
  views.requests = (el) => {
    const R = D.requests; if (!R) return;
    el.append(h("div", { class: "infobox" }, h("div", { class: "small" }, R.note)));
    let pr = "";
    const sel = h("select", { onchange: (e) => { pr = e.target.value; draw(); } }, h("option", { value: "" }, "すべての優先度"), h("option", { value: "A" }, "A: ないと画面が成立しない"), h("option", { value: "B" }, "B: あると良い"));
    const box = h("div");
    function draw() { box.replaceChildren(table([{ key: "id", label: "#" }, { key: "priority", label: "優先", render: (v) => h("span", { class: "pill", style: v === "A" ? "border-color:var(--crit);color:var(--crit)" : "" }, v) }, { key: "section", label: "セクション" }, { key: "need", label: "必要な情報", wrap: true }, { key: "searched", label: "探した場所と結果", wrap: true }, { key: "question", label: "質問", wrap: true }, { key: "interim", label: "仮の扱い", wrap: true }], R.items.filter((r) => !pr || r.priority === pr), { csvName: "requests", sortKey: "id" })); }
    el.append(h("div", { class: "toolbar", style: "margin-top:14px" }, sel), box); draw();
  };

  // ---------- boot ----------
  (async () => {
    await loadAll();
    const dates = [D.company, D.brands, D.stores, D.sales, D.requests].filter(Boolean).map((x) => x.updatedAt).filter(Boolean).sort();
    $("updatedAt").textContent = dates.length ? `データ最終更新 ${dates[dates.length - 1]}` : "";
    const n = D.requests ? D.requests.items.length : 0;
    $("missingCount").textContent = n ? `未入力の項目 ${n} 件` : "";
    $("reqBadge").textContent = n || "";
    route();
  })();
})();
