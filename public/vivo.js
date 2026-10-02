/* Vivo 販売ダッシュボード。データは vivo.json (scripts/vivo_sales.py で受注明細から作成) */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  const COS = ["BFT", "EDV"];

  /* ---------- 言語 (在庫ダッシュボードと同じ localStorage "lang") ---------- */
  const DICT = {
    ja: {
      "doc.title": "Vivo 販売ダッシュボード",
      h1: "Vivo 販売実績",
      loading: "読み込み中…",
      "link.stock": "← 在庫ダッシュボード",
      "lang.aria": "言語",
      "theme.aria": "表示テーマの切り替え",
      "theme.auto": "自動", "theme.light": "ライト", "theme.dark": "ダーク",
      "f.aria": "絞り込み",
      "f.company": "会社",
      "f.type": "販売場所の種類",
      "f.from": "開始日",
      "f.to": "終了日",
      "f.model": "モデル",
      "f.pending": "保留中 (Pending) の注文を含む",
      "f.loc": "販売場所",
      "f.locHint": "（クリックで選択・複数可。数字は販売数量）",
      all: "すべて",
      "all.models": "すべてのモデル",
      "all.locs": "すべての場所",
      reset: "条件をリセット",
      "type.store": "店舗",
      "type.event": "イベント",
      "type.online": "オンライン・その他",
      "loc.event": "イベント ({w})",
      "loc.online": "オンライン・その他 (LINE 等)",
      "kpi.qty": "販売数量（足）",
      "kpi.amount": "売上金額",
      "kpi.amountNote": "明細の金額合計（税込・明細値引き後）",
      "kpi.orders": "注文数",
      "kpi.ordersNote": "{n} か所の販売場所",
      "kpi.avg": "平均販売単価",
      "kpi.avgNote": "売上金額 ÷ 販売数量",
      "c.daily": "日別の販売数量",
      "c.loc": "販売場所別",
      "c.locHint": "クリックでその場所に絞り込み",
      "c.model": "モデル別",
      "c.modelHint": "クリックでそのモデルに絞り込み",
      "c.size": "サイズ別",
      "c.color": "カラー別",
      "t.title": "商品別の販売数量",
      "t.items": "{n} 品目",
      "t.model": "モデル", "t.color": "カラー", "t.size": "サイズ", "t.total": "合計", "t.amount": "金額 (฿)",
      "t.sum": "合計",
      csv: "CSV で保存",
      copy: "表をコピー",
      copied: "コピーしました",
      empty: "条件に合う販売がありません",
      pairs: "{n} 足",
      "tip.qty": "販売数量",
      "tip.amt": "金額",
      period: "期間: {f} 〜 {t}",
      src: "元データ: BFT {b} / EDV {e}",
      foot: "受注明細の Category が Vivo の行を集計（取消 Voided は除外）。BFT と EDV のイベント（Event 1）は別のイベントとして扱います。モデル・カラー・サイズは商品名から判定しています。データ作成: {d}",
    },
    en: {
      "doc.title": "Vivo Sales Dashboard",
      h1: "Vivo sales",
      loading: "Loading…",
      "link.stock": "← Stock dashboard",
      "lang.aria": "Language",
      "theme.aria": "Toggle theme",
      "theme.auto": "Auto", "theme.light": "Light", "theme.dark": "Dark",
      "f.aria": "Filters",
      "f.company": "Company",
      "f.type": "Location type",
      "f.from": "From",
      "f.to": "To",
      "f.model": "Model",
      "f.pending": "Include pending orders",
      "f.loc": "Sales location",
      "f.locHint": "(click to select, multiple allowed; numbers are pairs sold)",
      all: "All",
      "all.models": "All models",
      "all.locs": "All locations",
      reset: "Reset filters",
      "type.store": "Store",
      "type.event": "Event",
      "type.online": "Online / other",
      "loc.event": "Event ({w})",
      "loc.online": "Online / other (LINE etc.)",
      "kpi.qty": "Pairs sold",
      "kpi.amount": "Sales amount",
      "kpi.amountNote": "Sum of line amounts (incl. VAT, after line discounts)",
      "kpi.orders": "Orders",
      "kpi.ordersNote": "{n} sales locations",
      "kpi.avg": "Average price",
      "kpi.avgNote": "Sales amount ÷ pairs sold",
      "c.daily": "Pairs sold by day",
      "c.loc": "By sales location",
      "c.locHint": "Click to filter to that location",
      "c.model": "By model",
      "c.modelHint": "Click to filter to that model",
      "c.size": "By size",
      "c.color": "By colour",
      "t.title": "Pairs sold by item",
      "t.items": "{n} items",
      "t.model": "Model", "t.color": "Colour", "t.size": "Size", "t.total": "Total", "t.amount": "Amount (฿)",
      "t.sum": "Total",
      csv: "Save CSV",
      copy: "Copy table",
      copied: "Copied",
      empty: "No sales match the filters",
      pairs: "{n} pairs",
      "tip.qty": "Pairs",
      "tip.amt": "Amount",
      period: "Period: {f} – {t}",
      src: "Source: BFT {b} / EDV {e}",
      foot: "Order-detail lines with Category = Vivo (voided orders excluded). BFT and EDV events (Event 1) are treated as separate events. Model, colour and size are read from the product name. Generated: {d}",
    },
    th: {
      "doc.title": "แดชบอร์ดยอดขาย Vivo",
      h1: "ยอดขาย Vivo",
      loading: "กำลังโหลด…",
      "link.stock": "← แดชบอร์ดสต็อก",
      "lang.aria": "ภาษา",
      "theme.aria": "สลับธีม",
      "theme.auto": "อัตโนมัติ", "theme.light": "สว่าง", "theme.dark": "มืด",
      "f.aria": "ตัวกรอง",
      "f.company": "บริษัท",
      "f.type": "ประเภทจุดขาย",
      "f.from": "ตั้งแต่",
      "f.to": "ถึง",
      "f.model": "รุ่น",
      "f.pending": "รวมคำสั่งซื้อที่รอดำเนินการ (Pending)",
      "f.loc": "จุดขาย",
      "f.locHint": "(คลิกเพื่อเลือก เลือกได้หลายจุด ตัวเลขคือจำนวนคู่ที่ขาย)",
      all: "ทั้งหมด",
      "all.models": "ทุกรุ่น",
      "all.locs": "ทุกจุดขาย",
      reset: "ล้างตัวกรอง",
      "type.store": "สาขา",
      "type.event": "อีเวนต์",
      "type.online": "ออนไลน์ / อื่นๆ",
      "loc.event": "อีเวนต์ ({w})",
      "loc.online": "ออนไลน์ / อื่นๆ (LINE ฯลฯ)",
      "kpi.qty": "จำนวนที่ขาย (คู่)",
      "kpi.amount": "ยอดขาย",
      "kpi.amountNote": "ผลรวมยอดรายการ (รวม VAT หลังส่วนลดรายการ)",
      "kpi.orders": "จำนวนคำสั่งซื้อ",
      "kpi.ordersNote": "{n} จุดขาย",
      "kpi.avg": "ราคาขายเฉลี่ย",
      "kpi.avgNote": "ยอดขาย ÷ จำนวนคู่",
      "c.daily": "จำนวนที่ขายรายวัน",
      "c.loc": "ตามจุดขาย",
      "c.locHint": "คลิกเพื่อกรองเฉพาะจุดขายนั้น",
      "c.model": "ตามรุ่น",
      "c.modelHint": "คลิกเพื่อกรองเฉพาะรุ่นนั้น",
      "c.size": "ตามไซซ์",
      "c.color": "ตามสี",
      "t.title": "จำนวนที่ขายตามสินค้า",
      "t.items": "{n} รายการ",
      "t.model": "รุ่น", "t.color": "สี", "t.size": "ไซซ์", "t.total": "รวม", "t.amount": "ยอดเงิน (฿)",
      "t.sum": "รวม",
      csv: "บันทึก CSV",
      copy: "คัดลอกตาราง",
      copied: "คัดลอกแล้ว",
      empty: "ไม่มียอดขายที่ตรงกับเงื่อนไข",
      pairs: "{n} คู่",
      "tip.qty": "จำนวน",
      "tip.amt": "ยอดเงิน",
      period: "ช่วงเวลา: {f} – {t}",
      src: "ข้อมูล: BFT {b} / EDV {e}",
      foot: "รวมรายการที่ Category = Vivo จากรายละเอียดคำสั่งซื้อ (ไม่รวมรายการที่ยกเลิก Voided) อีเวนต์ของ BFT และ EDV (Event 1) นับเป็นคนละอีเวนต์ รุ่น สี และไซซ์อ่านจากชื่อสินค้า สร้างข้อมูล: {d}",
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
  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t("doc.title");
    document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = t(el.dataset.i18n)));
    document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
    document.querySelectorAll("[data-lang]").forEach((b) => b.setAttribute("aria-pressed", b.dataset.lang === lang));
  }
  document.querySelectorAll("[data-lang]").forEach((b) => b.addEventListener("click", () => {
    lang = b.dataset.lang;
    try { localStorage.setItem("lang", lang); } catch (_) {}
    applyLang();
    applyTheme();
    if (data) { fillModels(); render(); }
  }));

  /* ---------- テーマ (在庫ダッシュボードと同じ localStorage "theme") ---------- */
  const THEMES = ["auto", "light", "dark"];
  let theme = "auto";
  try { theme = localStorage.getItem("theme") || "auto"; } catch (_) {}
  function applyTheme() {
    if (!$("themeToggle")) return;
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    if ($("themeLabel")) $("themeLabel").textContent = t(`theme.${theme}`);
  }
  // 単体版 (公開ページ) ではテーマ切り替えボタンがなく、閲覧画面のテーマに従う
  if ($("themeToggle")) $("themeToggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem("theme", theme); } catch (_) {}
    applyTheme();
  });
  applyLang();
  applyTheme();

  /* ---------- データ ---------- */
  let data = null;
  let LOC = {};          // id -> location
  let lines = [];        // {date, loc, co, type, order, model, color, size, qty, amount, pending}
  const state = { company: "", type: "", locs: new Set(), from: "", to: "", model: "", pending: true };
  let sort = { key: "total", dir: -1 };

  const locName = (l) => (l.type === "event" ? t("loc.event", { w: l.wh }) : l.type === "online" && !l.name ? t("loc.online") : l.name);
  const locLabelHtml = (l) => `<span class="co">${l.company}</span>${esc(locName(l))}`;
  const locLabelText = (l) => `${l.company} ${locName(l)}`;
  const sizeKey = (s) => { const m = /^([A-Z]+)(\d+(?:\.\d+)?)$/.exec(s); return m ? [m[1], +m[2]] : [s, 0]; };
  const bySize = (a, b) => { const x = sizeKey(a), y = sizeKey(b); return x[0] < y[0] ? 1 : x[0] > y[0] ? -1 : x[1] - y[1]; }; // W → M の順
  const fmtDate = (iso, long) => {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(LOCALE[lang], long ? { year: "numeric", month: "short", day: "numeric" } : { month: "numeric", day: "numeric" });
  };

  // 場所の候補 (会社・種類で絞ったもの)
  const availLocs = () => data.locations.filter((l) => (!state.company || l.company === state.company) && (!state.type || l.type === state.type));
  const activeLocIds = () => {
    const av = availLocs().map((l) => l.id);
    const sel = av.filter((id) => state.locs.has(id));
    return new Set(sel.length ? sel : av);
  };

  // loc 以外の条件
  const passBase = (r) => (state.pending || !r.pending) && (!state.from || r.date >= state.from) && (!state.to || r.date <= state.to) && (!state.model || r.model === state.model);

  /* ---------- フィルター UI ---------- */
  function syncSeg(id, v) { $(id).querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", b.dataset.v === v)); }
  $("segCompany").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.company = b.dataset.v; render();
  });
  $("segType").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    state.type = b.dataset.v; render();
  });
  $("locChips").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.id === "") state.locs.clear();
    else if (state.locs.has(b.dataset.id)) state.locs.delete(b.dataset.id);
    else state.locs.add(b.dataset.id);
    render();
  });
  $("dFrom").addEventListener("change", (e) => { state.from = e.target.value; render(); });
  $("dTo").addEventListener("change", (e) => { state.to = e.target.value; render(); });
  $("fModel").addEventListener("change", (e) => { state.model = e.target.value; render(); });
  $("incPending").addEventListener("change", (e) => { state.pending = e.target.checked; render(); });
  $("reset").addEventListener("click", () => {
    Object.assign(state, { company: "", type: "", from: data.from, to: data.to, model: "", pending: true });
    state.locs.clear();
    $("dFrom").value = data.from; $("dTo").value = data.to; $("incPending").checked = true;
    render();
  });

  function fillModels() {
    const models = [...new Set(lines.map((r) => r.model))].sort();
    $("fModel").innerHTML = `<option value="">${esc(t("all.models"))}</option>` + models.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("");
    $("fModel").value = state.model;
  }

  function renderLocChips() {
    const av = availLocs();
    const qty = {};
    lines.forEach((r) => { if (passBase(r)) qty[r.loc] = (qty[r.loc] || 0) + r.qty; });
    const anySel = av.some((l) => state.locs.has(l.id));
    $("locChips").innerHTML =
      `<button type="button" class="loc-chip all" data-id="" aria-pressed="${!anySel}">${esc(t("all.locs"))}</button>` +
      av.map((l) => `<button type="button" class="loc-chip" data-id="${esc(l.id)}" aria-pressed="${state.locs.has(l.id)}">` +
        `<i class="sw" data-co="${l.company}"></i>${locLabelHtml(l)}<span class="n">${fmt(qty[l.id] || 0)}</span></button>`).join("");
  }

  /* ---------- ツールチップ ---------- */
  const tip = $("tip");
  function showTip(e, html) {
    tip.innerHTML = html; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    let x = e.clientX + 14, y = e.clientY + 14;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 14;
    if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 14;
    tip.style.left = `${Math.max(8, x)}px`; tip.style.top = `${Math.max(8, y)}px`;
  }
  const hideTip = () => (tip.hidden = true);
  const tipBody = (title, byCo, amt) => {
    const tot = COS.reduce((s, c) => s + (byCo[c] || 0), 0);
    return `<b>${esc(title)}</b><br>` +
      COS.map((c) => `<i class="sw" data-co="${c}"></i>${c}: ${fmt(byCo[c] || 0)}`).join("<br>") +
      `<br>${esc(t("tip.qty"))}: <b>${fmt(tot)}</b>` + (amt !== undefined ? `<br>${esc(t("tip.amt"))}: ฿${fmt(amt)}` : "");
  };
  function bindTips(root, getHtml) {
    root.querySelectorAll("[data-k]").forEach((el) => {
      el.addEventListener("mousemove", (e) => showTip(e, getHtml(el.dataset.k)));
      el.addEventListener("mouseleave", hideTip);
    });
  }

  /* ---------- 集計 ---------- */
  const group = (rows, keyFn) => {
    const m = new Map();
    rows.forEach((r) => {
      const k = keyFn(r);
      let g = m.get(k);
      if (!g) m.set(k, (g = { key: k, qty: 0, amount: 0, BFT: 0, EDV: 0 }));
      g.qty += r.qty; g.amount += r.amount; g[r.co] += r.qty;
    });
    return m;
  };

  // 横棒 (会社ごとに積み上げ)
  function hbars(el, entries, { label, onClick, active, single }) {
    if (!entries.length) { el.innerHTML = `<p class="empty-note">${esc(t("empty"))}</p>`; return; }
    const max = Math.max(...entries.map((e) => e.qty));
    el.innerHTML = entries.map((e) => {
      const segs = COS.filter((c) => e[c] > 0).map((c) => `<span class="bar-fill" data-co="${c}" style="width:${(e[c] / max) * 100}%"></span>`).join("");
      const tag = onClick ? "button" : "div";
      return `<${tag} ${onClick ? 'type="button"' : ""} class="bar-row${onClick ? "" : " static"}${active === e.key ? " active" : ""}" data-k="${esc(e.key)}">` +
        `<span class="bar-label" title="${esc(single ? "" : e.key)}">${label(e)}</span>` +
        `<span class="bar-track stack">${segs}</span><span class="bar-val">${fmt(e.qty)}</span></${tag}>`;
    }).join("");
    const map = new Map(entries.map((e) => [String(e.key), e]));
    bindTips(el, (k) => { const e = map.get(k); return tipBody(e.title || e.key, { BFT: e.BFT, EDV: e.EDV }, e.amount); });
    if (onClick) el.querySelectorAll(".bar-row").forEach((b) => b.addEventListener("click", () => onClick(b.dataset.k)));
  }

  // 縦棒 (会社ごとに積み上げ)
  function vbars(el, entries, { xLabel, showTotals }) {
    if (!entries.some((e) => e.qty)) { el.innerHTML = `<p class="empty-note">${esc(t("empty"))}</p>`; return; }
    const maxV = Math.max(...entries.map((e) => e.qty));
    const step = maxV <= 5 ? 1 : maxV <= 10 ? 2 : maxV <= 25 ? 5 : maxV <= 50 ? 10 : Math.ceil(maxV / 5 / 10) * 10;
    const top = Math.ceil(maxV / step) * step;
    const width = el.clientWidth || 600;
    const every = Math.max(1, Math.ceil(entries.length / Math.max(1, Math.floor((width - 40) / 46))));
    // 棒の上に合計ラベルを置く分 (16px) を空け、目盛り線も同じ基準にする
    let grid = "";
    for (let v = 0; v <= top; v += step) grid += `<div class="grid${v === 0 ? " base" : ""}" style="bottom:calc(22px + (100% - 38px) * ${v / top})"><span>${v}</span></div>`;
    const cols = entries.map((e, i) => {
      const present = COS.filter((c) => e[c] > 0);
      const segs = present.slice().reverse().map((c, j) => `<span class="seg-b${j === 0 ? " cap" : ""}" data-co="${c}" style="height:calc((100% - 16px) * ${e[c] / top})"></span>`).join("");
      return `<div class="col" data-k="${esc(e.key)}">${showTotals && e.qty ? `<span class="vtot">${e.qty}</span>` : ""}${segs}` +
        `${i % every === 0 ? `<span class="xl">${esc(xLabel(e))}</span>` : ""}</div>`;
    }).join("");
    el.innerHTML = grid + `<div class="cols">${cols}</div>`;
    const map = new Map(entries.map((e) => [String(e.key), e]));
    bindTips(el, (k) => { const e = map.get(k); return tipBody(e.title || xLabel(e), { BFT: e.BFT, EDV: e.EDV }, e.amount); });
  }

  /* ---------- 描画 ---------- */
  let current = [];
  function render() {
    syncSeg("segCompany", state.company);
    syncSeg("segType", state.type);
    renderLocChips();
    const locIds = activeLocIds();
    const rows = lines.filter((r) => passBase(r) && locIds.has(r.loc));
    current = rows;

    // KPI
    const qty = rows.reduce((s, r) => s + r.qty, 0);
    const amt = rows.reduce((s, r) => s + r.amount, 0);
    const orders = new Set(rows.map((r) => `${r.co}|${r.order}`)).size;
    const usedLocs = new Set(rows.map((r) => r.loc)).size;
    const coQty = (c) => rows.reduce((s, r) => s + (r.co === c ? r.qty : 0), 0);
    const coAmt = (c) => rows.reduce((s, r) => s + (r.co === c ? r.amount : 0), 0);
    $("kQty").textContent = fmt(qty);
    $("kQtyNote").innerHTML = COS.map((c) => `<span class="co-split"><i class="sw" data-co="${c}"></i>${c} ${fmt(coQty(c))}</span>`).join("");
    $("kAmt").textContent = `฿${fmt(amt)}`;
    $("kAmtNote").innerHTML = COS.map((c) => `<span class="co-split"><i class="sw" data-co="${c}"></i>${c} ฿${fmt(coAmt(c))}</span>`).join("");
    $("kOrders").textContent = fmt(orders);
    $("kOrdersNote").textContent = t("kpi.ordersNote", { n: usedLocs });
    $("kAvg").textContent = qty ? `฿${fmt(amt / qty)}` : "–";

    // 日別 (期間内の全日。販売のない日も 0 で表示)
    const from = state.from || data.from, to = state.to || data.to;
    const byDay = group(rows, (r) => r.date);
    const days = [];
    for (let d = new Date(`${from}T00:00:00Z`); d <= new Date(`${to}T00:00:00Z`) && days.length < 800; d.setUTCDate(d.getUTCDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      const g = byDay.get(k) || { key: k, qty: 0, amount: 0, BFT: 0, EDV: 0 };
      g.title = fmtDate(k, true);
      days.push(g);
    }
    vbars($("dailyChart"), days, { xLabel: (e) => fmtDate(e.key), showTotals: days.length <= 62 });

    // 販売場所別
    const byLoc = [...group(rows, (r) => r.loc).values()].sort((a, b) => b.qty - a.qty);
    byLoc.forEach((e) => (e.title = locLabelText(LOC[e.key])));
    const oneLoc = state.locs.size === 1 ? [...state.locs][0] : "";
    hbars($("locChart"), byLoc, {
      label: (e) => `<i class="sw" data-co="${LOC[e.key].company}"></i>${locLabelHtml(LOC[e.key])}`,
      active: oneLoc,
      single: true,
      onClick: (k) => { if (state.locs.size === 1 && state.locs.has(k)) state.locs.clear(); else { state.locs.clear(); state.locs.add(k); } render(); },
    });

    // モデル別
    const byModel = [...group(lines.filter((r) => (state.pending || !r.pending) && (!state.from || r.date >= state.from) && (!state.to || r.date <= state.to) && locIds.has(r.loc)), (r) => r.model).values()]
      .sort((a, b) => b.qty - a.qty || a.key.localeCompare(b.key));
    hbars($("modelChart"), byModel, {
      label: (e) => esc(e.key),
      active: state.model,
      onClick: (k) => { state.model = state.model === k ? "" : k; $("fModel").value = state.model; render(); },
    });

    // サイズ別
    const bySz = [...group(rows, (r) => r.size || "-").values()].sort((a, b) => bySize(a.key, b.key));
    vbars($("sizeChart"), bySz, { xLabel: (e) => e.key, showTotals: true });

    // カラー別
    const byColor = [...group(rows, (r) => r.color || "-").values()].sort((a, b) => b.qty - a.qty || a.key.localeCompare(b.key));
    hbars($("colorChart"), byColor, { label: (e) => esc(e.key) });

    renderTable(rows, locIds);

    $("period").textContent = t("period", { f: fmtDate(data.from, true), t: fmtDate(data.to, true) });
    $("source").textContent = t("src", { b: data.sources.BFT, e: data.sources.EDV });
    $("foot").textContent = t("foot", { d: data.generated.replace("T", " ").slice(0, 16) });
  }

  /* ---------- 明細表 (モデル × カラー × サイズ、販売場所ごとの列) ---------- */
  let tableCache = null;
  function renderTable(rows, locIds) {
    const locs = data.locations.filter((l) => locIds.has(l.id) && rows.some((r) => r.loc === l.id));
    const m = new Map();
    rows.forEach((r) => {
      const k = `${r.model}\t${r.color}\t${r.size}`;
      let g = m.get(k);
      if (!g) m.set(k, (g = { model: r.model, color: r.color, size: r.size, total: 0, amount: 0, by: {} }));
      g.total += r.qty; g.amount += r.amount; g.by[r.loc] = (g.by[r.loc] || 0) + r.qty;
    });
    const items = [...m.values()];
    const cols = [
      { key: "model", label: t("t.model") },
      { key: "color", label: t("t.color") },
      { key: "size", label: t("t.size") },
      ...locs.map((l) => ({ key: `loc:${l.id}`, label: locLabelText(l), loc: l, num: true })),
      { key: "total", label: t("t.total"), num: true },
      { key: "amount", label: t("t.amount"), num: true },
    ];
    if (!cols.some((c) => c.key === sort.key)) sort = { key: "total", dir: -1 };
    const val = (it, key) => (key.startsWith("loc:") ? it.by[key.slice(4)] || 0 : it[key]);
    items.sort((a, b) => {
      let d;
      if (sort.key === "size") d = bySize(a.size, b.size);
      else { const x = val(a, sort.key), y = val(b, sort.key); d = typeof x === "number" ? x - y : String(x).localeCompare(String(y)); }
      return d * sort.dir || b.total - a.total || a.model.localeCompare(b.model) || bySize(a.size, b.size);
    });
    tableCache = { cols, items, val };

    $("tCount").textContent = t("t.items", { n: items.length });
    $("tHead").innerHTML = `<tr>${cols.map((c) => `<th class="${c.num ? "num" : ""}" data-key="${esc(c.key)}"${sort.key === c.key ? ` aria-sort="${sort.dir > 0 ? "ascending" : "descending"}"` : ""}>` +
      `${c.loc ? `<i class="sw" data-co="${c.loc.company}"></i>` : ""}${esc(c.label)}</th>`).join("")}</tr>`;
    $("tBody").innerHTML = items.length
      ? items.map((it) => `<tr>${cols.map((c) => {
        const v = val(it, c.key);
        if (!c.num) return `<td>${esc(v)}</td>`;
        return `<td class="num${v ? "" : " zero"}">${v ? fmt(v) : "-"}</td>`;
      }).join("")}</tr>`).join("")
      : `<tr><td colspan="${cols.length}" class="empty-note">${esc(t("empty"))}</td></tr>`;
    $("tFoot").innerHTML = items.length ? `<tr>${cols.map((c, i) => {
      if (i === 0) return `<td>${esc(t("t.sum"))}</td>`;
      if (!c.num) return "<td></td>";
      return `<td class="num">${fmt(items.reduce((s, it) => s + val(it, c.key), 0))}</td>`;
    }).join("")}</tr>` : "";
  }
  $("tHead").addEventListener("click", (e) => {
    const th = e.target.closest("th"); if (!th) return;
    const k = th.dataset.key;
    sort = sort.key === k ? { key: k, dir: -sort.dir } : { key: k, dir: ["model", "color", "size"].includes(k) ? 1 : -1 };
    renderTable(current, activeLocIds());
  });
  // 表をタブ区切りでコピー (Excel・スプレッドシートにそのまま貼り付けできる)
  $("copyTable").addEventListener("click", () => {
    if (!tableCache) return;
    const { cols, items, val } = tableCache;
    const tsv = [cols.map((c) => c.label).join("\t"), ...items.map((it) => cols.map((c) => (c.num ? Math.round(val(it, c.key) * 100) / 100 : val(it, c.key))).join("\t"))].join("\n");
    const done = () => { $("copyTable").textContent = t("copied"); setTimeout(() => ($("copyTable").textContent = t("copy")), 1600); };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = tsv; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); done(); } catch (_) {}
      ta.remove();
    };
    if (navigator.clipboard) navigator.clipboard.writeText(tsv).then(done, fallback); else fallback();
  });
  if ($("dlCsv")) $("dlCsv").addEventListener("click", () => {
    if (!tableCache) return;
    const { cols, items, val } = tableCache;
    const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
    const csv = [cols.map((c) => q(c.label)).join(","), ...items.map((it) => cols.map((c) => (c.num ? Math.round(val(it, c.key) * 100) / 100 : q(val(it, c.key)))).join(","))].join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" }));
    a.download = `vivo_sales_${state.from || data.from}_${state.to || data.to}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => data && render(), 150); });

  // 単体版は window.VIVO_DATA にデータを埋め込む
  (window.VIVO_DATA ? Promise.resolve(window.VIVO_DATA) : fetch("vivo.json", { cache: "no-store" }).then((r) => r.json()))
    .then((d) => {
      data = d;
      LOC = Object.fromEntries(d.locations.map((l) => [l.id, l]));
      const ix = Object.fromEntries(d.fields.map((f, i) => [f, i]));
      lines = d.lines.map((x) => {
        const l = LOC[x[ix.loc]];
        return { date: x[ix.date], loc: l.id, co: l.company, type: l.type, order: x[ix.order], model: x[ix.model], color: x[ix.color],
          size: x[ix.size], qty: x[ix.qty], amount: x[ix.amount], pending: x[ix.status] === "pending" };
      });
      state.from = d.from; state.to = d.to;
      $("dFrom").value = d.from; $("dTo").value = d.to;
      $("dFrom").min = $("dTo").min = d.from; $("dFrom").max = $("dTo").max = d.to;
      fillModels();
      render();
    })
    .catch(() => { $("period").textContent = "vivo.json could not be loaded"; });
})();
