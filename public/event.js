/* イベント売上ページ
   events/index.json (イベント一覧) → events/<id>.json (販売明細、scripts/event_sales.py が作成) を読み、
   ブラウザで日別・カテゴリ別・曜日別・時間帯別・支払方法別・モデル別に集計して表示する。
   金額はすべて税込 (POS の Total amount)。 */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const int = (n) => Math.round(n).toLocaleString("en-US");
  const baht = (n) => "฿" + int(n);
  const pct = (n) => (Math.round(n * 1000) / 10).toFixed(1) + "%";

  /* ---------- 言語 (index.html と同じ localStorage "lang") ---------- */
  const DICT = {
    ja: {
      "doc.title": "イベント売上実績", eyebrow: "Event Sales Report", "event.pick": "イベント", "nav.stock": "← 在庫ダッシュボード",
      "f.cat": "カテゴリ", "f.all": "すべて", "f.from": "開始日", "f.to": "終了日", "f.reset": "条件をクリア",
      "chip.day": "{d} のみ",
      "k.sales": "売上（税込）", "k.orders": "注文数（客数）", "k.units": "販売点数", "k.aov": "客単価", "k.perDay": "1日平均売上", "k.disc": "平均値引率",
      "k.salesTarget": "目標 {t} の {p}", "k.salesOf": "全体 {t} の {p}", "k.ordersNote": "1注文あたり {n} 点", "k.unitsNote": "{m} モデル・{s} SKU",
      "k.aovNote": "1点あたり {p}", "k.perDayNote": "販売日 {s} 日 / 会期 {d} 日", "k.discNote": "定価合計 {l} から {d} 値引き",
      "daily.title": "日別売上", "daily.hint": "棒をクリックするとその日に絞り込み（もう一度クリックで解除）。太字の日付は土日。",
      "m.sales": "売上", "m.orders": "注文数", "m.units": "点数", "m.cum": "累計売上",
      "avg": "平均 {v}", "target": "目標 {v}",
      "c.cat": "カテゴリ別売上", "c.catHint": "クリックでカテゴリに絞り込み", "c.dow": "曜日別 1日平均売上", "c.dowHint": "会期中のその曜日の日数で割った平均",
      "c.hour": "時間帯別売上", "c.hourNoTime": "時刻なし {n} 注文（{v}）は含まない", "c.hourAll": "決済時刻で集計",
      "c.pay": "支払方法別売上", "c.payHint": "注文数・売上", "pay.none": "（記録なし）",
      "c.model": "モデル別売上", "model.hint": "行をクリックでカラー別・サイズ別の内訳。モデルは商品コードの親コード（VV0004 など）でまとめています。",
      "c.days": "日別明細", "dl.csv": "CSV で保存",
      "th.rank": "#", "th.model": "モデル", "th.cat": "カテゴリ", "th.units": "点数", "th.orders": "注文", "th.sales": "売上", "th.share": "構成比",
      "th.avgPrice": "平均販売単価", "th.disc": "値引率", "th.date": "日付", "th.aov": "客単価", "th.cum": "累計売上", "th.total": "合計",
      "v.color": "カラー別（点数）", "v.size": "サイズ別（点数）", "v.none": "—",
      "tip.sales": "売上 {v}", "tip.orders": "注文 {v}", "tip.units": "点数 {v}", "tip.aov": "客単価 {v}", "tip.cum": "累計 {v}", "tip.share": "構成比 {v}",
      "tip.days": "{n} 日（{v} / 日）", "tip.noSales": "販売なし",
      "foot": "データ: {src}（{g} 作成）。倉庫「{w}」の完了済み注文のみ、税込。明細合計 {l} / 注文金額合計 {a} {ok}。顧客情報は取り込んでいません。",
      "foot.ok": "（一致）", "foot.ng": "（不一致: 要確認）",
      "theme.auto": "自動", "theme.light": "ライト", "theme.dark": "ダーク",
      "empty": "条件に合う販売がありません",
    },
    en: {
      "doc.title": "Event Sales", eyebrow: "Event Sales Report", "event.pick": "Event", "nav.stock": "← Stock dashboard",
      "f.cat": "Category", "f.all": "All", "f.from": "From", "f.to": "To", "f.reset": "Clear filters",
      "chip.day": "{d} only",
      "k.sales": "Sales (incl. VAT)", "k.orders": "Orders (customers)", "k.units": "Units sold", "k.aov": "Avg. order value", "k.perDay": "Avg. sales / day", "k.disc": "Avg. discount",
      "k.salesTarget": "{p} of target {t}", "k.salesOf": "{p} of total {t}", "k.ordersNote": "{n} units per order", "k.unitsNote": "{m} models · {s} SKUs",
      "k.aovNote": "{p} per unit", "k.perDayNote": "{s} selling days / {d} event days", "k.discNote": "{d} off list price {l}",
      "daily.title": "Daily sales", "daily.hint": "Click a bar to filter to that day (click again to clear). Bold dates are weekends.",
      "m.sales": "Sales", "m.orders": "Orders", "m.units": "Units", "m.cum": "Cumulative",
      "avg": "Avg {v}", "target": "Target {v}",
      "c.cat": "Sales by category", "c.catHint": "Click to filter", "c.dow": "Avg. daily sales by weekday", "c.dowHint": "Divided by the number of that weekday in the period",
      "c.hour": "Sales by hour", "c.hourNoTime": "{n} orders ({v}) without a time are excluded", "c.hourAll": "By payment time",
      "c.pay": "Sales by payment method", "c.payHint": "Orders · sales", "pay.none": "(not recorded)",
      "c.model": "Sales by model", "model.hint": "Click a row for the colour / size breakdown. Models are grouped by parent product code (e.g. VV0004).",
      "c.days": "Daily breakdown", "dl.csv": "Save CSV",
      "th.rank": "#", "th.model": "Model", "th.cat": "Category", "th.units": "Units", "th.orders": "Orders", "th.sales": "Sales", "th.share": "Share",
      "th.avgPrice": "Avg. price", "th.disc": "Discount", "th.date": "Date", "th.aov": "AOV", "th.cum": "Cumulative", "th.total": "Total",
      "v.color": "By colour (units)", "v.size": "By size (units)", "v.none": "—",
      "tip.sales": "Sales {v}", "tip.orders": "Orders {v}", "tip.units": "Units {v}", "tip.aov": "AOV {v}", "tip.cum": "Cumulative {v}", "tip.share": "Share {v}",
      "tip.days": "{n} days ({v} / day)", "tip.noSales": "No sales",
      "foot": "Data: {src} (generated {g}). Completed orders at warehouse \"{w}\" only, incl. VAT. Line total {l} / order amount total {a} {ok}. No customer data is imported.",
      "foot.ok": "(match)", "foot.ng": "(MISMATCH — check)",
      "theme.auto": "Auto", "theme.light": "Light", "theme.dark": "Dark",
      "empty": "No sales match the filters",
    },
    th: {
      "doc.title": "ยอดขายอีเวนต์", eyebrow: "Event Sales Report", "event.pick": "อีเวนต์", "nav.stock": "← แดชบอร์ดสต็อก",
      "f.cat": "หมวดหมู่", "f.all": "ทั้งหมด", "f.from": "ตั้งแต่", "f.to": "ถึง", "f.reset": "ล้างตัวกรอง",
      "chip.day": "เฉพาะ {d}",
      "k.sales": "ยอดขาย (รวม VAT)", "k.orders": "จำนวนบิล (ลูกค้า)", "k.units": "จำนวนชิ้น", "k.aov": "ยอดเฉลี่ยต่อบิล", "k.perDay": "ยอดขายเฉลี่ย/วัน", "k.disc": "ส่วนลดเฉลี่ย",
      "k.salesTarget": "{p} ของเป้า {t}", "k.salesOf": "{p} ของทั้งหมด {t}", "k.ordersNote": "{n} ชิ้นต่อบิล", "k.unitsNote": "{m} รุ่น · {s} SKU",
      "k.aovNote": "{p} ต่อชิ้น", "k.perDayNote": "ขายได้ {s} วัน / งาน {d} วัน", "k.discNote": "ลด {d} จากราคาเต็ม {l}",
      "daily.title": "ยอดขายรายวัน", "daily.hint": "คลิกแท่งเพื่อกรองเฉพาะวันนั้น (คลิกอีกครั้งเพื่อยกเลิก) วันที่ตัวหนาคือเสาร์-อาทิตย์",
      "m.sales": "ยอดขาย", "m.orders": "บิล", "m.units": "ชิ้น", "m.cum": "ยอดสะสม",
      "avg": "เฉลี่ย {v}", "target": "เป้า {v}",
      "c.cat": "ยอดขายตามหมวดหมู่", "c.catHint": "คลิกเพื่อกรอง", "c.dow": "ยอดขายเฉลี่ยต่อวันตามวันในสัปดาห์", "c.dowHint": "หารด้วยจำนวนวันนั้นในช่วงงาน",
      "c.hour": "ยอดขายตามช่วงเวลา", "c.hourNoTime": "ไม่รวม {n} บิล ({v}) ที่ไม่มีเวลา", "c.hourAll": "ตามเวลาชำระเงิน",
      "c.pay": "ยอดขายตามวิธีชำระเงิน", "c.payHint": "บิล · ยอดขาย", "pay.none": "(ไม่ได้บันทึก)",
      "c.model": "ยอดขายตามรุ่น", "model.hint": "คลิกแถวเพื่อดูแยกตามสีและไซซ์ รุ่นจัดกลุ่มตามรหัสสินค้าหลัก (เช่น VV0004)",
      "c.days": "รายละเอียดรายวัน", "dl.csv": "บันทึก CSV",
      "th.rank": "#", "th.model": "รุ่น", "th.cat": "หมวดหมู่", "th.units": "ชิ้น", "th.orders": "บิล", "th.sales": "ยอดขาย", "th.share": "สัดส่วน",
      "th.avgPrice": "ราคาขายเฉลี่ย", "th.disc": "ส่วนลด", "th.date": "วันที่", "th.aov": "ต่อบิล", "th.cum": "ยอดสะสม", "th.total": "รวม",
      "v.color": "ตามสี (ชิ้น)", "v.size": "ตามไซซ์ (ชิ้น)", "v.none": "—",
      "tip.sales": "ยอดขาย {v}", "tip.orders": "บิล {v}", "tip.units": "ชิ้น {v}", "tip.aov": "ต่อบิล {v}", "tip.cum": "สะสม {v}", "tip.share": "สัดส่วน {v}",
      "tip.days": "{n} วัน ({v} / วัน)", "tip.noSales": "ไม่มียอดขาย",
      "foot": "ข้อมูล: {src} (สร้างเมื่อ {g}) เฉพาะบิลที่สำเร็จของคลัง \"{w}\" รวม VAT ยอดรวมรายการ {l} / ยอดรวมบิล {a} {ok} ไม่ได้นำเข้าข้อมูลลูกค้า",
      "foot.ok": "(ตรงกัน)", "foot.ng": "(ไม่ตรงกัน — โปรดตรวจสอบ)",
      "theme.auto": "อัตโนมัติ", "theme.light": "สว่าง", "theme.dark": "มืด",
      "empty": "ไม่มียอดขายที่ตรงกับเงื่อนไข",
    },
  };
  const LOCALE = { ja: "ja-JP", en: "en-GB", th: "th-TH" };
  let lang = null;
  try { lang = localStorage.getItem("lang"); } catch (_) {}
  if (!DICT[lang]) {
    const nav = (navigator.languages || [navigator.language || ""]).map((l) => l.slice(0, 2).toLowerCase());
    lang = nav.find((l) => DICT[l]) || "en";
  }
  const t = (k, p = {}) => (DICT[lang][k] ?? DICT.en[k] ?? k).replace(/\{(\w+)\}/g, (_, x) => p[x] ?? `{${x}}`);

  /* ---------- theme (index.html と共通の localStorage "theme") ---------- */
  const THEMES = ["auto", "light", "dark"];
  let theme = "auto";
  try { theme = localStorage.getItem("theme") || "auto"; } catch (_) {}
  const applyTheme = () => {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    $("themeLabel").textContent = t(`theme.${theme}`);
  };
  $("themeToggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem("theme", theme); } catch (_) {}
    applyTheme();
  });

  /* ---------- 日付 ---------- */
  const parseD = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const isoD = (dt) => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  const daysBetween = (a, b) => { const out = []; for (let d = parseD(a); isoD(d) <= b; d.setDate(d.getDate() + 1)) out.push(isoD(d)); return out; };
  const dow = (s) => parseD(s).getDay();
  const isWe = (s) => dow(s) === 0 || dow(s) === 6;
  const wdName = (i, style = "short") => new Intl.DateTimeFormat(LOCALE[lang], { weekday: style }).format(new Date(2026, 0, 4 + i)); // 2026-01-04 は日曜
  const dLabel = (s) => { const d = parseD(s); return `${d.getMonth() + 1}/${d.getDate()} (${wdName(d.getDay())})`; };

  /* ---------- 状態 ---------- */
  const state = { cat: "", from: "", to: "", day: "", metric: "sales", modelSort: "sales", open: new Set() };
  let ev = null;      // 読み込んだイベント
  let models = null;  // 親コード → { label, cat }

  const tip = $("tip");
  const showTip = (e, html) => {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = x + "px"; tip.style.top = y + "px";
  };
  const hideTip = () => (tip.hidden = true);

  /* ---------- 集計 ---------- */
  const agg = (lines) => {
    const orders = new Set(), skus = new Set(), mods = new Set();
    let sales = 0, units = 0, list = 0;
    for (const l of lines) { sales += l.net; units += l.q; list += l.list; orders.add(l.o); skus.add(l.c); mods.add(l.p); }
    return { sales, units, list, orders: orders.size, skus: skus.size, models: mods.size };
  };
  const groupBy = (lines, key) => {
    const m = new Map();
    for (const l of lines) { const k = key(l); if (!m.has(k)) m.set(k, []); m.get(k).push(l); }
    return m;
  };
  const mostCommon = (arr) => { const c = new Map(); arr.forEach((v) => c.set(v, (c.get(v) || 0) + 1)); return [...c].sort((a, b) => b[1] - a[1])[0][0]; };

  // 期間・カテゴリ・日の条件。except で指定した条件は無視 (そのグラフ自身の絞り込み用)
  function filtered(except = "") {
    return ev.lines.filter((l) =>
      (except === "period" || ((!state.from || l.d >= state.from) && (!state.to || l.d <= state.to))) &&
      (except === "cat" || !state.cat || l.cat === state.cat) &&
      (except === "day" || !state.day || l.d === state.day));
  }
  const periodDays = () => daysBetween(state.from || ev.from, state.to || ev.to);

  /* ---------- 横棒 (style.css の .bar-row) ---------- */
  function bars(el, entries, { fmtVal, tipFor, onClick, active } = {}) {
    const max = Math.max(1, ...entries.map((e) => e.value));
    el.innerHTML = entries.length ? entries.map((e, i) => `
      <button type="button" class="bar-row${onClick ? "" : " static"}${active && active === e.key ? " active" : ""}" data-i="${i}">
        <span class="bar-label" title="${esc(e.label)}">${esc(e.label)}</span>
        <span class="bar-track"><span class="bar-fill" style="width:${(e.value / max) * 100}%"></span></span>
        <span class="bar-val">${fmtVal ? fmtVal(e) : int(e.value)}</span>
      </button>`).join("") : `<p class="hint">${esc(t("empty"))}</p>`;
    el.querySelectorAll(".bar-row").forEach((b) => {
      const e = entries[+b.dataset.i];
      if (tipFor) { b.addEventListener("mousemove", (ev2) => showTip(ev2, tipFor(e))); b.addEventListener("mouseleave", hideTip); }
      if (onClick) b.addEventListener("click", () => { hideTip(); onClick(e); });
    });
  }

  /* ---------- KPI ---------- */
  function renderKpis(lines) {
    const a = agg(lines);
    const all = agg(ev.lines);
    const days = periodDays();
    const selling = new Set(lines.map((l) => l.d)).size;
    const narrowed = state.cat || state.day || state.from || state.to;
    $("kSales").textContent = baht(a.sales);
    $("kSalesNote").textContent = narrowed ? t("k.salesOf", { p: pct(a.sales / (all.sales || 1)), t: baht(all.sales) })
      : ev.target ? t("k.salesTarget", { p: pct(a.sales / ev.target), t: baht(ev.target) }) : "";
    $("kOrders").textContent = int(a.orders);
    $("kOrdersNote").textContent = a.orders ? t("k.ordersNote", { n: (a.units / a.orders).toFixed(2) }) : "";
    $("kUnits").textContent = int(a.units);
    $("kUnitsNote").textContent = t("k.unitsNote", { m: a.models, s: a.skus });
    $("kAov").textContent = a.orders ? baht(a.sales / a.orders) : "–";
    $("kAovNote").textContent = a.units ? t("k.aovNote", { p: baht(a.sales / a.units) }) : "";
    const nDays = state.day ? 1 : days.length;
    $("kPerDay").textContent = baht(a.sales / (nDays || 1));
    $("kPerDayNote").textContent = t("k.perDayNote", { s: selling, d: nDays });
    $("kDisc").textContent = a.list ? pct(1 - a.sales / a.list) : "–";
    $("kDiscNote").textContent = a.list ? t("k.discNote", { l: baht(a.list), d: baht(a.list - a.sales) }) : "";
  }

  /* ---------- 日別売上 (SVG 縦棒 / 累計は折れ線) ---------- */
  const niceMax = (v) => {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  };
  const shortNum = (v) => (v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + "M" : v >= 1e3 ? (v / 1e3).toFixed(v % 1e3 ? 1 : 0) + "k" : String(v));

  function renderDaily() {
    const lines = filtered("day");
    const days = periodDays();
    const byDay = groupBy(lines, (l) => l.d);
    let cum = 0;
    const rows = days.map((d) => {
      const a = agg(byDay.get(d) || []);
      cum += a.sales;
      return { d, ...a, cum };
    });
    const m = state.metric;
    const val = (r) => (m === "cum" ? r.cum : r[m]);
    const fmtV = (v) => (m === "orders" || m === "units" ? int(v) : baht(v));
    $("dailyTitle").textContent = `${t("daily.title")} — ${t("m." + m)}`;
    document.querySelectorAll("#metricSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.metric === m));

    const box = $("dailyChart");
    const W = Math.max(320, box.clientWidth || 900);
    const small = W < 640;
    const H = small ? 240 : 300;
    const pad = { l: 48, r: 12, t: 22, b: 40 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    let ymax = Math.max(...rows.map(val), 0);
    if (m === "cum" && ev.target) ymax = Math.max(ymax, ev.target);
    ymax = niceMax(ymax);
    const y = (v) => pad.t + ih - (v / ymax) * ih;
    const step = iw / rows.length;
    const bw = Math.max(3, Math.min(34, step - 4));
    const ticks = [0, .25, .5, .75, 1].map((f) => f * ymax);
    const labelEvery = step < 22 ? Math.ceil(22 / step) : 1;

    let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(t("daily.title"))}">`;
    svg += `<g class="grid">${ticks.map((v) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text x="${pad.l - 6}" y="${y(v) + 4}" text-anchor="end">${m === "orders" || m === "units" ? v : shortNum(v)}</text>`).join("")}</g>`;
    if (m === "cum") {
      if (ev.target) {
        svg += `<line class="avg" x1="${pad.l}" x2="${W - pad.r}" y1="${y(ev.target)}" y2="${y(ev.target)}"/><text class="avg-l" x="${W - pad.r}" y="${y(ev.target) - 5}" text-anchor="end">${esc(t("target", { v: baht(ev.target) }))}</text>`;
      }
      const pts = rows.map((r, i) => `${pad.l + step * i + step / 2},${y(r.cum)}`);
      svg += `<polyline class="cum" points="${pts.join(" ")}"/>`;
    }
    rows.forEach((r, i) => {
      const x = pad.l + step * i + step / 2;
      const v = val(r);
      const sel = state.day === r.d;
      svg += `<g class="col${sel ? " sel" : ""}" data-i="${i}"><rect class="hit" x="${pad.l + step * i}" y="${pad.t}" width="${step}" height="${ih}"/>`;
      if (m === "cum") svg += `<circle class="cum-dot" cx="${x}" cy="${y(v)}" r="${sel ? 5 : 3.5}"/>`;
      else if (v > 0) {
        const h = Math.max(1, (v / ymax) * ih);
        const r4 = Math.min(4, bw / 2, h);
        const dim = state.day && !sel;
        svg += `<path class="bar${dim ? " dim" : ""}" d="M${x - bw / 2},${pad.t + ih} v${-(h - r4)} q0,${-r4} ${r4},${-r4} h${bw - 2 * r4} q${r4},0 ${r4},${r4} v${h - r4} z"/>`;
      } else svg += `<text class="zero" x="${x}" y="${pad.t + ih - 4}" text-anchor="middle">0</text>`;
      svg += `</g>`;
    });
    // 平均線と最大値ラベル (累計以外)
    if (m !== "cum") {
      const active = rows.filter((r) => val(r) > 0);
      const avg = rows.reduce((s, r) => s + val(r), 0) / (rows.length || 1);
      if (avg > 0) svg += `<line class="avg" x1="${pad.l}" x2="${W - pad.r}" y1="${y(avg)}" y2="${y(avg)}"/><text class="avg-l" x="${W - pad.r}" y="${y(avg) - 5}" text-anchor="end">${esc(t("avg", { v: fmtV(avg) }))}</text>`;
      const top = active.slice().sort((a, b) => val(b) - val(a))[0];
      if (top && !small) {
        const i = rows.indexOf(top);
        svg += `<text class="val" x="${pad.l + step * i + step / 2}" y="${y(val(top)) - 5}" text-anchor="middle">${fmtV(val(top))}</text>`;
      }
    } else if (rows.length) {
      const last = rows[rows.length - 1];
      svg += `<text class="val" x="${W - pad.r}" y="${y(last.cum) + 16}" text-anchor="end">${baht(last.cum)}</text>`;
    }
    svg += `<g class="xl">${rows.map((r, i) => {
      if (i % labelEvery && state.day !== r.d) return "";
      const x = pad.l + step * i + step / 2, d = parseD(r.d);
      const cls = state.day === r.d ? "sel" : isWe(r.d) ? "we" : "";
      return `<text class="${cls}" x="${x}" y="${H - pad.b + 16}" text-anchor="middle">${d.getDate()}</text><text class="${cls}" x="${x}" y="${H - pad.b + 30}" text-anchor="middle">${esc(wdName(d.getDay(), "narrow"))}</text>`;
    }).join("")}</g></svg>`;
    box.innerHTML = svg;

    box.querySelectorAll(".col").forEach((g) => {
      const r = rows[+g.dataset.i];
      g.addEventListener("mousemove", (e) => showTip(e, `<b>${esc(dLabel(r.d))}</b><br>` + (r.orders
        ? [t("tip.sales", { v: baht(r.sales) }), t("tip.orders", { v: int(r.orders) }), t("tip.units", { v: int(r.units) }), t("tip.aov", { v: baht(r.sales / r.orders) }), t("tip.cum", { v: baht(r.cum) })].map(esc).join("<br>")
        : esc(t("tip.noSales")))));
      g.addEventListener("mouseleave", hideTip);
      g.addEventListener("click", () => { hideTip(); state.day = state.day === r.d ? "" : r.d; render(); });
    });
  }

  /* ---------- カテゴリ・曜日・時間帯・支払方法 ---------- */
  function renderBreakdowns(lines) {
    const total = agg(lines).sales || 1;

    const catLines = filtered("cat");
    const catTotal = agg(catLines).sales || 1;
    const cats = [...groupBy(catLines, (l) => l.cat || "—")].map(([k, ls]) => ({ key: k, label: k, ...agg(ls), value: agg(ls).sales }))
      .sort((a, b) => b.value - a.value);
    bars($("catChart"), cats, {
      active: state.cat,
      fmtVal: (e) => baht(e.value),
      tipFor: (e) => `<b>${esc(e.label)}</b><br>` + [t("tip.sales", { v: baht(e.sales) }), t("tip.share", { v: pct(e.sales / catTotal) }), t("tip.units", { v: int(e.units) }), t("tip.orders", { v: int(e.orders) })].map(esc).join("<br>"),
      onClick: (e) => { state.cat = state.cat === e.key ? "" : e.key; $("fCat").value = state.cat; render(); },
    });

    // 曜日別: 会期内のその曜日の日数で割った 1 日平均 (月曜始まり)
    const days = state.day ? [state.day] : periodDays();
    const nDow = [0, 0, 0, 0, 0, 0, 0];
    days.forEach((d) => nDow[dow(d)]++);
    const byDow = groupBy(lines, (l) => dow(l.d));
    const dows = [1, 2, 3, 4, 5, 6, 0].filter((i) => nDow[i]).map((i) => {
      const a = agg(byDow.get(i) || []);
      return { key: i, label: wdName(i, "long"), ...a, n: nDow[i], value: a.sales / nDow[i] };
    });
    bars($("dowChart"), dows, {
      fmtVal: (e) => baht(e.value),
      tipFor: (e) => `<b>${esc(e.label)}</b><br>` + [t("tip.days", { n: e.n, v: baht(e.value) }), t("tip.sales", { v: baht(e.sales) }), t("tip.orders", { v: int(e.orders) })].map(esc).join("<br>"),
    });

    // 時間帯別 (決済時刻)
    const timed = lines.filter((l) => l.t);
    const untimed = lines.filter((l) => !l.t);
    const byHour = groupBy(timed, (l) => +l.t.slice(0, 2));
    const hs = [...byHour.keys()];
    const hours = hs.length ? Array.from({ length: Math.max(...hs) - Math.min(...hs) + 1 }, (_, i) => Math.min(...hs) + i) : [];
    bars($("hourChart"), hours.map((h) => {
      const a = agg(byHour.get(h) || []);
      return { key: h, label: `${String(h).padStart(2, "0")}:00`, ...a, value: a.sales };
    }), {
      fmtVal: (e) => baht(e.value),
      tipFor: (e) => `<b>${e.label}–${String(e.key + 1).padStart(2, "0")}:00</b><br>` + [t("tip.sales", { v: baht(e.sales) }), t("tip.orders", { v: int(e.orders) }), t("tip.units", { v: int(e.units) })].map(esc).join("<br>"),
    });
    const ua = agg(untimed);
    $("hourHint").textContent = ua.orders ? t("c.hourNoTime", { n: ua.orders, v: baht(ua.sales) }) : t("c.hourAll");

    // 支払方法別
    const pays = [...groupBy(lines, (l) => l.pay || "")].map(([k, ls]) => {
      const a = agg(ls);
      return { key: k, label: k || t("pay.none"), ...a, value: a.sales };
    }).sort((a, b) => b.value - a.value);
    bars($("payChart"), pays, {
      fmtVal: (e) => baht(e.value),
      tipFor: (e) => `<b>${esc(e.label)}</b><br>` + [t("tip.orders", { v: int(e.orders) }), t("tip.sales", { v: baht(e.sales) }), t("tip.share", { v: pct(e.sales / total) }), t("tip.aov", { v: baht(e.sales / (e.orders || 1)) })].map(esc).join("<br>"),
    });
  }

  /* ---------- モデル別 ---------- */
  function modelRows() {
    const lines = filtered();
    const total = agg(lines).sales || 1;
    const rows = [...groupBy(lines, (l) => l.p)].map(([p, ls]) => ({ p, label: models.get(p).label, cat: models.get(p).cat, lines: ls, ...agg(ls) }));
    rows.sort((a, b) => (state.modelSort === "units" ? b.units - a.units || b.sales - a.sales : b.sales - a.sales));
    return { rows, total };
  }

  const sizeOrder = (s) => {
    const m = /^([A-Z]*)(\d+)(?:-(\d+))?$/.exec(s);
    if (m) return [m[1] === "W" ? 0 : m[1] === "M" ? 1 : 2, +m[2]];
    const i = ["XXS", "XS", "S", "M", "L", "XL", "XXL"].indexOf(s);
    return [3, i < 0 ? 99 : i];
  };

  function renderModels() {
    const { rows, total } = modelRows();
    const maxShare = Math.max(...rows.map((r) => r.sales), 1);
    $("modelCount").textContent = rows.length;
    document.querySelectorAll("#modelSortSeg button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.sort === state.modelSort));
    const head = `<thead><tr><th>${t("th.rank")}</th><th>${esc(t("th.model"))}</th><th class="opt">${esc(t("th.cat"))}</th><th class="num">${esc(t("th.units"))}</th><th class="num opt">${esc(t("th.orders"))}</th><th class="num">${esc(t("th.sales"))}</th><th>${esc(t("th.share"))}</th><th class="num opt">${esc(t("th.avgPrice"))}</th><th class="num opt">${esc(t("th.disc"))}</th></tr></thead>`;
    const body = rows.map((r, i) => {
      const open = state.open.has(r.p);
      let html = `<tr class="model${open ? " open" : ""}" data-p="${esc(r.p)}">
        <td class="rank">${i + 1}</td><td class="name" title="${esc(r.p)}">${esc(r.label)}</td><td class="cat opt">${esc(r.cat)}</td>
        <td class="num">${int(r.units)}</td><td class="num opt">${int(r.orders)}</td><td class="num">${baht(r.sales)}</td>
        <td class="share"><div class="share-bar"><i style="width:${(r.sales / maxShare) * 100}%"></i><span>${pct(r.sales / total)}</span></div></td>
        <td class="num opt">${baht(r.sales / (r.units || 1))}</td><td class="num opt">${r.list ? pct(1 - r.sales / r.list) : "–"}</td></tr>`;
      if (open) {
        const vbars = (key, order) => {
          const g = [...groupBy(r.lines, key)].map(([k, ls]) => ({ k: k || t("v.none"), q: ls.reduce((s, l) => s + l.q, 0) }));
          g.sort(order || ((a, b) => b.q - a.q));
          const mx = Math.max(...g.map((x) => x.q), 1);
          return g.map((x) => `<div class="bar-row static"><span class="bar-label">${esc(x.k)}</span><span class="bar-track"><span class="bar-fill" style="width:${(x.q / mx) * 100}%"></span></span><span class="bar-val">${int(x.q)}</span></div>`).join("");
        };
        const hasSize = r.lines.some((l) => l.s);
        html += `<tr class="detail"><td colspan="9"><div class="variants">
          <div><h3>${esc(t("v.color"))}</h3>${vbars((l) => l.col)}</div>
          ${hasSize ? `<div><h3>${esc(t("v.size"))}</h3>${vbars((l) => l.s, (a, b) => { const x = sizeOrder(a.k), y = sizeOrder(b.k); return x[0] - y[0] || x[1] - y[1]; })}</div>` : ""}
        </div></td></tr>`;
      }
      return html;
    }).join("");
    const a = agg(rows.flatMap((r) => r.lines));
    const foot = rows.length ? `<tr class="total"><td></td><td>${esc(t("th.total"))}</td><td class="opt"></td><td class="num">${int(a.units)}</td><td class="num opt">${int(a.orders)}</td><td class="num">${baht(a.sales)}</td><td></td><td class="num opt">${baht(a.sales / (a.units || 1))}</td><td class="num opt">${a.list ? pct(1 - a.sales / a.list) : "–"}</td></tr>`
      : `<tr><td colspan="9" class="hint">${esc(t("empty"))}</td></tr>`;
    $("modelTable").innerHTML = head + `<tbody>${body}${foot}</tbody>`;
    $("modelTable").querySelectorAll("tr.model").forEach((tr) => tr.addEventListener("click", () => {
      const p = tr.dataset.p;
      state.open.has(p) ? state.open.delete(p) : state.open.add(p);
      renderModels();
    }));
  }

  /* ---------- 日別明細 ---------- */
  function dayRows() {
    const byDay = groupBy(filtered("day"), (l) => l.d);
    let cum = 0;
    return periodDays().map((d) => { const a = agg(byDay.get(d) || []); cum += a.sales; return { d, ...a, cum }; });
  }
  function renderDays() {
    const rows = dayRows();
    const a = rows.reduce((s, r) => ({ sales: s.sales + r.sales, orders: s.orders + r.orders, units: s.units + r.units }), { sales: 0, orders: 0, units: 0 });
    $("dayTable").innerHTML = `<thead><tr><th>${esc(t("th.date"))}</th><th class="num">${esc(t("th.orders"))}</th><th class="num">${esc(t("th.units"))}</th><th class="num">${esc(t("th.sales"))}</th><th class="num">${esc(t("th.aov"))}</th><th class="num opt">${esc(t("th.cum"))}</th></tr></thead><tbody>` +
      rows.map((r) => `<tr class="day${isWe(r.d) ? " we" : ""}${r.orders ? "" : " none"}${state.day === r.d ? " sel" : ""}" data-d="${r.d}">
        <td>${esc(dLabel(r.d))}</td><td class="num">${int(r.orders)}</td><td class="num">${int(r.units)}</td><td class="num">${baht(r.sales)}</td>
        <td class="num">${r.orders ? baht(r.sales / r.orders) : "–"}</td><td class="num opt">${baht(r.cum)}</td></tr>`).join("") +
      `<tr class="total"><td>${esc(t("th.total"))}</td><td class="num">${int(a.orders)}</td><td class="num">${int(a.units)}</td><td class="num">${baht(a.sales)}</td><td class="num">${a.orders ? baht(a.sales / a.orders) : "–"}</td><td class="opt"></td></tr></tbody>`;
    $("dayTable").querySelectorAll("tr.day").forEach((tr) => tr.addEventListener("click", () => {
      state.day = state.day === tr.dataset.d ? "" : tr.dataset.d; render();
      if (state.day) $("dailyChart").scrollIntoView({ behavior: "smooth", block: "center" });
    }));
  }

  /* ---------- CSV ---------- */
  function saveCsv(name, rows) {
    const csv = "﻿" + rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : v)).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  $("dlModels").addEventListener("click", () => {
    const { rows, total } = modelRows();
    saveCsv(`${ev.id}_models.csv`, [["Code", "Model", "Category", "Units", "Orders", "Sales", "Share", "Avg price", "Discount"],
      ...rows.map((r) => [r.p, r.label, r.cat, r.units, r.orders, r.sales.toFixed(2), (r.sales / total).toFixed(4), (r.sales / (r.units || 1)).toFixed(2), r.list ? (1 - r.sales / r.list).toFixed(4) : ""])]);
  });
  $("dlDays").addEventListener("click", () => {
    saveCsv(`${ev.id}_daily.csv`, [["Date", "Weekday", "Orders", "Units", "Sales", "AOV", "Cumulative"],
      ...dayRows().map((r) => [r.d, wdName(dow(r.d)), r.orders, r.units, r.sales.toFixed(2), r.orders ? (r.sales / r.orders).toFixed(2) : "", r.cum.toFixed(2)])]);
  });

  /* ---------- 条件 ---------- */
  function renderChips() {
    const chips = [];
    if (state.day) chips.push(["day", t("chip.day", { d: dLabel(state.day) })]);
    $("chips").innerHTML = chips.map(([k, s]) => `<button type="button" class="chip" data-k="${k}"><b>${esc(s)}</b><span aria-hidden="true">×</span></button>`).join("");
    $("chips").querySelectorAll(".chip").forEach((b) => b.addEventListener("click", () => { state[b.dataset.k] = ""; render(); }));
  }

  function applyStatic() {
    document.documentElement.lang = lang;
    document.title = `${t("doc.title")}${ev ? " — " + ev.name : ""}`;
    document.querySelectorAll("[data-t]").forEach((el) => (el.textContent = t(el.dataset.t)));
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
    applyTheme();
    if (!ev) return;
    const sel = $("fCat"), cur = state.cat;
    const cats = [...groupBy(ev.lines, (l) => l.cat)].map(([k, ls]) => [k, agg(ls).sales]).sort((a, b) => b[1] - a[1]).map(([k]) => k);
    sel.innerHTML = `<option value="">${esc(t("f.all"))}</option>` + cats.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    sel.value = cur;
    $("evName").textContent = ev.name;
    const nDays = daysBetween(ev.from, ev.to).length;
    $("evPeriod").textContent = `${dLabel(ev.from)} – ${dLabel(ev.to)} (${nDays}d)`;
    $("evVenue").textContent = ev.venue || ev.warehouse;
    $("evSource").textContent = ev.warehouse ? `POS: ${ev.warehouse}` : "";
    $("foot").textContent = t("foot", {
      src: ev.sources.join(", "), g: ev.generated, w: ev.warehouse, l: "฿" + ev.check.lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 }),
      a: "฿" + ev.check.orderAmount.toLocaleString("en-US", { minimumFractionDigits: 2 }), ok: t(ev.check.match ? "foot.ok" : "foot.ng"),
    });
  }

  function render() {
    const lines = filtered();
    renderChips();
    renderKpis(lines);
    renderDaily();
    renderBreakdowns(lines);
    renderModels();
    renderDays();
  }

  /* ---------- イベント ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-lang]");
    if (!b || !DICT[b.dataset.lang] || b.dataset.lang === lang) return;
    lang = b.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch (_) {}
    applyStatic();
    if (ev) render();
  });
  $("metricSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-metric]"); if (b) { state.metric = b.dataset.metric; renderDaily(); } });
  $("modelSortSeg").addEventListener("click", (e) => { const b = e.target.closest("[data-sort]"); if (b) { state.modelSort = b.dataset.sort; renderModels(); } });
  $("fCat").addEventListener("change", (e) => { state.cat = e.target.value; render(); });
  // 会期の初日・最終日と同じなら絞り込みなし扱い
  $("fFrom").addEventListener("change", (e) => { state.from = e.target.value > ev.from ? e.target.value : ""; state.day = ""; render(); });
  $("fTo").addEventListener("change", (e) => { state.to = e.target.value && e.target.value < ev.to ? e.target.value : ""; state.day = ""; render(); });
  $("fReset").addEventListener("click", () => {
    Object.assign(state, { cat: "", from: "", to: "", day: "" });
    $("fCat").value = ""; $("fFrom").value = ev.from; $("fTo").value = ev.to;
    render();
  });
  let rt = 0;
  window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => ev && renderDaily(), 120); });

  async function load(id) {
    ev = await (await fetch(`events/${encodeURIComponent(id)}.json`, { cache: "no-store" })).json();
    models = new Map([...groupBy(ev.lines, (l) => l.p)].map(([p, ls]) => [p, { label: mostCommon(ls.map((l) => l.m)), cat: mostCommon(ls.map((l) => l.cat)) }]));
    Object.assign(state, { cat: "", from: "", to: "", day: "", open: new Set() });
    ["fFrom", "fTo"].forEach((k) => { $(k).min = ev.from; $(k).max = ev.to; });
    $("fFrom").value = ev.from; $("fTo").value = ev.to;
    try { history.replaceState(null, "", `#${id}`); } catch (_) {}
    applyStatic();
    render();
  }

  (async () => {
    applyStatic();
    const idx = await (await fetch("events/index.json", { cache: "no-store" })).json();
    const list = idx.events || [];
    if (!list.length) { $("evName").textContent = t("empty"); return; }
    const pick = $("evPick");
    pick.innerHTML = list.map((e) => `<option value="${esc(e.id)}">${esc(e.name)} (${esc(e.from)})</option>`).join("");
    $("evPickWrap").hidden = list.length < 2;
    pick.addEventListener("change", () => load(pick.value));
    const want = decodeURIComponent(location.hash.slice(1));
    const id = list.some((e) => e.id === want) ? want : list[0].id;
    pick.value = id;
    await load(id);
  })();
})();
