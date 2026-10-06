/* ビジネスメモダッシュボード。memo.json を読み、検索・絞り込み・ピン留め・自分のメモ・今日の3つを提供する */
(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };

  /* ---------- テーマ (在庫ダッシュボードと同じ localStorage "theme") ---------- */
  const THEMES = ["auto", "light", "dark"];
  const THEME_LABEL = { auto: "自動", light: "ライト", dark: "ダーク" };
  let theme = "auto";
  try { theme = localStorage.getItem("theme") || "auto"; } catch (_) {}
  function applyTheme() {
    if (theme === "auto") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", theme);
    $("themeLabel").textContent = THEME_LABEL[theme];
  }
  applyTheme();
  $("themeToggle").addEventListener("click", () => {
    theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    try { localStorage.setItem("theme", theme); } catch (_) {}
    applyTheme();
  });

  /* ---------- 状態 ---------- */
  const state = {
    q: "", sec: "", tag: "", pinsOnly: false, notesOnly: false, allTags: false,
    collapsed: new Set(store.get("memo.collapsed", [])),
    openNotes: new Set(),
  };
  const pins = new Set(store.get("memo.pins", []));
  const notes = store.get("memo.notes", {});
  let sections = [];
  let items = [];

  /* ---------- 文字列 ---------- */
  function itemText(it) {
    const parts = [it.title, it.lead, it.quote, ...(it.body || []), ...(it.tags || [])];
    (it.bullets || []).forEach((b) => { parts.push(b.text); (b.sub || []).forEach((s) => parts.push(s)); });
    (it.defs || []).forEach((d) => parts.push(d.term, d.desc));
    if (it.compare) ["bad", "good"].forEach((k) => parts.push(it.compare[k].title, ...it.compare[k].rows));
    if (notes[it.id]) parts.push(notes[it.id]);
    return parts.filter(Boolean).join("\n");
  }
  function terms() { return state.q.trim().toLowerCase().split(/\s+/).filter(Boolean); }
  function matches(it) {
    const ts = terms();
    if (!ts.length) return true;
    const text = itemText(it).toLowerCase();
    return ts.every((t) => text.includes(t));
  }
  function hl(s) {
    const ts = terms();
    let out = esc(s);
    if (!ts.length) return out;
    const re = new RegExp("(" + ts.map((t) => esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return out.replace(re, "<mark>$1</mark>");
  }
  function summary(it) {
    return it.lead || it.quote || (it.body && it.body[0]) || (it.bullets && it.bullets[0] && it.bullets[0].text) || "";
  }
  function plainText(it) {
    const lines = [it.title, ""];
    if (it.lead) lines.push(it.lead, "");
    if (it.quote) lines.push("“" + it.quote + "”", "");
    (it.body || []).forEach((p) => lines.push(p, ""));
    (it.bullets || []).forEach((b) => { lines.push("・" + b.text); (b.sub || []).forEach((s) => lines.push("　　- " + s)); });
    (it.defs || []).forEach((d) => lines.push(d.term + "：" + d.desc));
    if (it.compare) ["bad", "good"].forEach((k) => { lines.push("", it.compare[k].title); it.compare[k].rows.forEach((r) => lines.push("・" + r)); });
    if (it.tags && it.tags.length) lines.push("", "#" + it.tags.join(" #"));
    if (notes[it.id]) lines.push("", "自分のメモ：", notes[it.id]);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }

  /* ---------- 描画 ---------- */
  function renderBody(it) {
    let h = "";
    if (it.lead) h += `<p class="lead">${hl(it.lead)}</p>`;
    if (it.quote) h += `<blockquote>${hl(it.quote)}</blockquote>`;
    (it.body || []).forEach((p) => { h += `<p>${hl(p)}</p>`; });
    if (it.bullets && it.bullets.length) {
      h += "<ul>" + it.bullets.map((b) =>
        `<li>${hl(b.text)}${b.sub && b.sub.length ? "<ul>" + b.sub.map((s) => `<li>${hl(s)}</li>`).join("") + "</ul>" : ""}</li>`
      ).join("") + "</ul>";
    }
    if (it.defs && it.defs.length) {
      h += "<dl>" + it.defs.map((d) => `<dt>${hl(d.term)}</dt><dd>${hl(d.desc)}</dd>`).join("") + "</dl>";
    }
    if (it.compare) {
      h += '<div class="compare">' + ["bad", "good"].map((k) => {
        const c = it.compare[k];
        return `<div class="${k}"><h4>${hl(c.title)}</h4><ul>${c.rows.map((r) => `<li>${hl(r)}</li>`).join("")}</ul></div>`;
      }).join("") + "</div>";
    }
    return h;
  }

  function renderCard(it) {
    const pinned = pins.has(it.id);
    const note = notes[it.id] || "";
    const open = state.openNotes.has(it.id);
    return `
<article class="card mcard${pinned ? " pinned" : ""}" id="${esc(it.id)}" data-id="${esc(it.id)}">
  <div class="mcard-head">
    <h3>${hl(it.title)}</h3>
    <button class="pin-btn" type="button" data-act="pin" aria-pressed="${pinned}" aria-label="${pinned ? "ピン留めを外す" : "ピン留め"}" title="${pinned ? "ピン留めを外す" : "ピン留め"}">${pinned ? "★" : "☆"}</button>
  </div>
  ${it.tags && it.tags.length ? `<div class="mtags">${it.tags.map((t) => `<button type="button" class="mtag" data-act="tag" data-tag="${esc(t)}">${hl(t)}</button>`).join("")}</div>` : ""}
  <div class="mbody">${renderBody(it)}</div>
  <div class="mfoot">
    <span class="msrc">${esc(it.section.title)}</span>
    <button class="ghost small note-btn${note ? " has" : ""}" type="button" data-act="note" aria-pressed="${open}">自分のメモ</button>
    <button class="ghost small" type="button" data-act="copy">コピー</button>
  </div>
  <div class="note-box"${open ? "" : " hidden"}>
    <textarea rows="3" data-act="note-text" placeholder="気づき・自分の言葉での言い換え・やってみること など">${esc(note)}</textarea>
    <span class="hint"><span>入力すると自動で保存</span><span class="note-state"></span></span>
  </div>
</article>`;
  }

  function visibleItems() {
    return items.filter((it) =>
      (!state.sec || it.section.id === state.sec) &&
      (!state.tag || (it.tags || []).includes(state.tag)) &&
      (!state.pinsOnly || pins.has(it.id)) &&
      (!state.notesOnly || !!notes[it.id]) &&
      matches(it)
    );
  }

  function render() {
    const vis = visibleItems();
    const visIds = new Set(vis.map((it) => it.id));
    const root = $("sections");
    root.innerHTML = sections.map((s) => {
      const its = s.items.filter((it) => visIds.has(it.id));
      if (!its.length) return "";
      const collapsed = state.collapsed.has(s.id);
      return `
<section class="msec" data-sec="${esc(s.id)}" data-collapsed="${collapsed}">
  <div class="msec-head">
    <h2>${hl(s.title)}</h2>
    <span class="count">${its.length}${its.length !== s.items.length ? " / " + s.items.length : ""}</span>
    <button class="msec-toggle" type="button" data-act="toggle-sec">${collapsed ? "開く" : "閉じる"}</button>
    ${s.subtitle ? `<p class="msub">${hl(s.subtitle)}</p>` : ""}
  </div>
  <div class="mgrid">${its.map(renderCard).join("")}</div>
</section>`;
    }).join("");
    $("empty").hidden = vis.length > 0;
    const filtered = vis.length !== items.length;
    $("kItemsNote").textContent = filtered ? `表示中 ${vis.length} / ${items.length}` : `${sections.length} カテゴリ`;
    renderChips();
  }

  function renderChips() {
    const base = items.filter((it) => (!state.pinsOnly || pins.has(it.id)) && (!state.notesOnly || !!notes[it.id]) && matches(it));
    const secCount = (id) => base.filter((it) => (!id || it.section.id === id) && (!state.tag || (it.tags || []).includes(state.tag))).length;
    $("secChips").innerHTML =
      `<button type="button" class="sec-chip" data-sec="" aria-pressed="${!state.sec}">すべて <span class="n">${secCount("")}</span></button>` +
      sections.map((s) => `<button type="button" class="sec-chip" data-sec="${esc(s.id)}" aria-pressed="${state.sec === s.id}">${esc(s.title)} <span class="n">${secCount(s.id)}</span></button>`).join("");
    // タグ: 表示中のカテゴリに含まれるタグを件数順に
    const counts = new Map();
    base.filter((it) => !state.sec || it.section.id === state.sec).forEach((it) => (it.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    let tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
    if (state.tag && !counts.has(state.tag)) tags.unshift([state.tag, 0]);
    // 2 回以上使われているタグだけを出し、残りは「他 N 件」で展開 (1 回だけのタグが多いため)
    const hidden = state.allTags ? [] : tags.filter(([t, n]) => n < 2 && t !== state.tag);
    if (hidden.length && hidden.length < 4) hidden.length = 0;
    if (hidden.length) tags = tags.filter((x) => !hidden.includes(x));
    $("tagChips").innerHTML = tags.length
      ? `<span class="chips-label">タグ</span>` + tags.map(([t, n]) => `<button type="button" class="tag-chip" data-tag="${esc(t)}" aria-pressed="${state.tag === t}">${esc(t)} <span class="n">${n}</span></button>`).join("")
        + (hidden.length ? `<button type="button" class="tag-chip more" data-more="1">他 ${hidden.length} 件のタグ…</button>` : state.allTags && counts.size ? `<button type="button" class="tag-chip more" data-more="0">主なタグだけ</button>` : "")
      : "";
  }

  function updateKpis() {
    $("kItems").textContent = items.length;
    $("kSections").textContent = sections.length;
    $("kPins").textContent = pins.size;
    $("kNotes").textContent = Object.keys(notes).filter((k) => notes[k]).length;
    $("kPinsBtn").setAttribute("aria-pressed", state.pinsOnly);
    $("kNotesBtn").setAttribute("aria-pressed", state.notesOnly);
  }

  /* ---------- 操作 ---------- */
  $("q").addEventListener("input", () => { state.q = $("q").value; render(); });
  $("secChips").addEventListener("click", (e) => {
    const b = e.target.closest(".sec-chip"); if (!b) return;
    state.sec = b.dataset.sec; render();
  });
  $("tagChips").addEventListener("click", (e) => {
    const b = e.target.closest(".tag-chip"); if (!b) return;
    if (b.dataset.more != null) { state.allTags = b.dataset.more === "1"; renderChips(); return; }
    state.tag = state.tag === b.dataset.tag ? "" : b.dataset.tag; render();
  });
  $("kPinsBtn").addEventListener("click", () => { state.pinsOnly = !state.pinsOnly; if (state.pinsOnly) state.notesOnly = false; updateKpis(); render(); });
  $("kNotesBtn").addEventListener("click", () => { state.notesOnly = !state.notesOnly; if (state.notesOnly) state.pinsOnly = false; updateKpis(); render(); });
  $("reset").addEventListener("click", () => {
    state.q = ""; $("q").value = ""; state.sec = ""; state.tag = ""; state.pinsOnly = false; state.notesOnly = false;
    updateKpis(); render();
  });
  $("expandAll").addEventListener("click", () => { state.collapsed.clear(); store.set("memo.collapsed", []); render(); });
  $("collapseAll").addEventListener("click", () => { sections.forEach((s) => state.collapsed.add(s.id)); store.set("memo.collapsed", [...state.collapsed]); render(); });

  $("sections").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const act = btn.dataset.act;
    if (act === "toggle-sec") {
      const id = btn.closest(".msec").dataset.sec;
      if (state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id);
      store.set("memo.collapsed", [...state.collapsed]); render(); return;
    }
    const card = btn.closest(".mcard"); if (!card) return;
    const id = card.dataset.id;
    if (act === "pin") {
      if (pins.has(id)) pins.delete(id); else pins.add(id);
      store.set("memo.pins", [...pins]); updateKpis(); render(); return;
    }
    if (act === "tag") { state.tag = state.tag === btn.dataset.tag ? "" : btn.dataset.tag; render(); return; }
    if (act === "note") {
      if (state.openNotes.has(id)) state.openNotes.delete(id); else state.openNotes.add(id);
      const open = state.openNotes.has(id);
      btn.setAttribute("aria-pressed", open);
      const box = card.querySelector(".note-box"); box.hidden = !open;
      if (open) box.querySelector("textarea").focus();
      return;
    }
    if (act === "copy") {
      const it = items.find((x) => x.id === id);
      const text = plainText(it);
      const done = () => { btn.textContent = "コピーしました"; btn.classList.add("copied"); setTimeout(() => { btn.textContent = "コピー"; btn.classList.remove("copied"); }, 1500); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
      else fallbackCopy(text, done);
    }
  });
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (_) {}
    document.body.removeChild(ta);
  }
  let noteTimer = null;
  $("sections").addEventListener("input", (e) => {
    const ta = e.target; if (!ta.matches("[data-act='note-text']")) return;
    const card = ta.closest(".mcard"); const id = card.dataset.id;
    const v = ta.value;
    if (v.trim()) notes[id] = v; else delete notes[id];
    store.set("memo.notes", notes);
    card.querySelector(".note-btn").classList.toggle("has", !!notes[id]);
    const st = card.querySelector(".note-state"); st.textContent = "保存しました";
    clearTimeout(noteTimer); noteTimer = setTimeout(() => { st.textContent = ""; }, 1200);
    updateKpis();
  });

  /* ---------- 今日の一言 ---------- */
  let quoteIdx = -1;
  function showQuote(idx) {
    if (!items.length) return;
    quoteIdx = ((idx % items.length) + items.length) % items.length;
    const it = items[quoteIdx];
    $("quoteSection").textContent = it.section.title;
    $("quoteTitle").textContent = it.title;
    $("quoteText").textContent = summary(it);
    $("quoteLink").href = "#" + it.id;
  }
  $("quoteNext").addEventListener("click", () => {
    let n; do { n = Math.floor(Math.random() * items.length); } while (items.length > 1 && n === quoteIdx);
    showQuote(n);
  });
  $("quoteLink").addEventListener("click", (e) => {
    e.preventDefault();
    const it = items[quoteIdx]; if (!it) return;
    if (!visibleItems().some((x) => x.id === it.id) || state.collapsed.has(it.section.id)) {
      state.q = ""; $("q").value = ""; state.sec = ""; state.tag = ""; state.pinsOnly = false; state.notesOnly = false;
      state.collapsed.delete(it.section.id); store.set("memo.collapsed", [...state.collapsed]);
      updateKpis(); render();
    }
    const el = document.getElementById(it.id); if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2000);
    history.replaceState(null, "", "#" + it.id);
  });

  /* ---------- 今日の3つ / 今週の3つ / 週末レビュー ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  function weekKey(d = new Date()) {
    // ISO 週 (月曜始まり)
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y = t.getUTCFullYear();
    const w = Math.ceil((((t - Date.UTC(y, 0, 1)) / 864e5) + 1) / 7);
    return `W${y}-${pad(w)}`;
  }
  function weekRange(d = new Date()) {
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${mon.getMonth() + 1}/${mon.getDate()}–${sun.getMonth() + 1}/${sun.getDate()}`;
  }
  const three = store.get("memo.three", {});
  const review = store.get("memo.review", {});
  function getThree(key) {
    const v = Array.isArray(three[key]) ? three[key] : [];
    while (v.length < 3) v.push({ t: "", d: false });
    return v;
  }
  function renderThreeList(el, key) {
    const list = getThree(key);
    el.innerHTML = list.map((x, i) =>
      `<li class="${x.d ? "done" : ""}"><input type="checkbox" data-i="${i}" ${x.d ? "checked" : ""} aria-label="完了"><input type="text" data-i="${i}" value="${esc(x.t)}" placeholder="${i + 1}つ目"></li>`
    ).join("");
    el.addEventListener("input", (e) => {
      const i = +e.target.dataset.i; const list = getThree(key);
      if (e.target.type === "checkbox") { list[i].d = e.target.checked; e.target.closest("li").classList.toggle("done", list[i].d); }
      else list[i].t = e.target.value;
      three[key] = list; store.set("memo.three", three); renderHistory();
    });
  }
  function renderHistory() {
    const tk = todayKey(), wk = weekKey();
    const days = Object.keys(three).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k !== tk && three[k].some((x) => x.t)).sort().reverse().slice(0, 30);
    const weeks = Object.keys(three).filter((k) => /^W/.test(k) && k !== wk && three[k].some((x) => x.t)).sort().reverse().slice(0, 12);
    const row = (k, label) => `<tr><td>${esc(label)}</td><td>${three[k].filter((x) => x.t).map((x) => `<span class="${x.d ? "done" : ""}">${esc(x.t)}</span>`).join("　/　")}${review[k] && (review[k].good || review[k].improve) ? `<div class="hint">レビュー: ${esc([review[k].good, review[k].improve].filter(Boolean).join(" ／ "))}</div>` : ""}</td></tr>`;
    const h = (days.length || weeks.length)
      ? `<table>${days.map((k) => row(k, k.slice(5).replace("-", "/"))).join("")}${weeks.map((k) => row(k, k.replace(/^W(\d{4})-(\d{2})$/, "$1年 第$2週"))).join("")}</table>`
      : `<p class="none">まだありません</p>`;
    $("threeHistoryBody").innerHTML = h;
  }
  (function initThree() {
    const tk = todayKey(), wk = weekKey();
    const d = new Date();
    $("threeDate").textContent = `${d.getMonth() + 1}/${d.getDate()}（${"日月火水木金土"[d.getDay()]}）`;
    $("threeWeek").textContent = weekRange(d);
    renderThreeList($("threeToday"), tk);
    renderThreeList($("threeWeekList"), wk);
    const r = review[wk] || { good: "", improve: "" };
    $("reviewGood").value = r.good || ""; $("reviewImprove").value = r.improve || "";
    ["reviewGood", "reviewImprove"].forEach((id) => $(id).addEventListener("input", () => {
      review[wk] = { good: $("reviewGood").value, improve: $("reviewImprove").value };
      store.set("memo.review", review); renderHistory();
    }));
    renderHistory();
  })();

  /* ---------- 読み込み ---------- */
  fetch("memo.json?v=" + Date.now(), { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then((data) => {
      sections = data.sections || [];
      items = [];
      sections.forEach((s) => s.items.forEach((it) => { it.section = s; items.push(it); }));
      $("updated").textContent = `更新日 ${data.updated || "-"}`;
      $("counts").textContent = `${sections.length} カテゴリ・${items.length} メモ`;
      updateKpis();
      render();
      // 今日の一言: 日付で決まる (同じ日は同じ)
      const seed = Number(todayKey().replace(/-/g, "")) % Math.max(items.length, 1);
      showQuote(seed);
      if (location.hash) {
        const el = document.getElementById(location.hash.slice(1));
        if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2000); }
      }
    })
    .catch((err) => {
      $("updated").textContent = "memo.json を読み込めませんでした";
      $("empty").textContent = `memo.json を読み込めませんでした（${err.message}）。ローカルで見る場合は public/ で python3 -m http.server などのサーバーを起動してください。`;
      $("empty").hidden = false;
    });
})();
