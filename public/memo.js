/* ビジネスメモ帳。memo.json を読み、索引・検索・印 (ピン)・書き足し・今日の三つを提供する */
(() => {
  "use strict";
  document.documentElement.classList.add("js");
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
  };
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KANJI = "〇一二三四五六七八九";
  const CH = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
  const kanjiNum = (n) => { // 1..31 → 一, 十, 十五, 二十三
    if (n < 10) return KANJI[n];
    const t = Math.floor(n / 10), o = n % 10;
    return (t > 1 ? KANJI[t] : "") + "十" + (o ? KANJI[o] : "");
  };
  const kanjiYear = (y) => String(y).split("").map((d) => KANJI[+d]).join("");

  /* ---------- テーマ (在庫ダッシュボードと同じ localStorage "theme") ---------- */
  const THEMES = ["auto", "light", "dark"];
  const THEME_LABEL = { auto: "自動", light: "昼", dark: "夜" };
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
    q: "", tag: "", view: "all", allTags: false,
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
  const terms = () => state.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  function matches(it) {
    const ts = terms();
    if (!ts.length) return true;
    const text = itemText(it).toLowerCase();
    return ts.every((t) => text.includes(t));
  }
  function hl(s) {
    const ts = terms();
    const out = esc(s);
    if (!ts.length) return out;
    const re = new RegExp("(" + ts.map((t) => esc(t).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
    return out.replace(re, "<mark>$1</mark>");
  }
  const summary = (it) => it.lead || it.quote || (it.body && it.body[0]) || (it.bullets && it.bullets[0] && it.bullets[0].text) || "";
  function plainText(it) {
    const lines = [it.title, ""];
    if (it.lead) lines.push(it.lead, "");
    if (it.quote) lines.push("“" + it.quote + "”", "");
    (it.body || []).forEach((p) => lines.push(p, ""));
    (it.bullets || []).forEach((b) => { lines.push("・" + b.text); (b.sub || []).forEach((s) => lines.push("　　- " + s)); });
    (it.defs || []).forEach((d) => lines.push(d.term + "：" + d.desc));
    if (it.compare) ["bad", "good"].forEach((k) => { lines.push("", it.compare[k].title); it.compare[k].rows.forEach((r) => lines.push("・" + r)); });
    if (it.tags && it.tags.length) lines.push("", "#" + it.tags.join(" #"));
    if (notes[it.id]) lines.push("", "自分の書き足し：", notes[it.id]);
    return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  // "7. Work hard（…）" → 番号と残り
  function splitNum(title) {
    const m = /^(\d{1,2})\.\s*(.+)$/.exec(title);
    return m ? { num: m[1], rest: m[2] } : { num: "", rest: title };
  }
  // "Work hard（ハードワークする）" → 英語の見出しと日本語の副題
  function splitEnJa(rest) {
    const m = /^([\x20-\x7E\u2019\u201c\u201d]+?)\s*（(.+)）$/.exec(rest);
    return m ? { en: m[1], ja: m[2] } : null;
  }
  function renderTitle(it) {
    const { num, rest } = splitNum(it.title);
    const ej = num ? splitEnJa(rest) : null;
    if (ej) return `<span class="num">${num}</span><span class="en" lang="en">${hl(ej.en)}</span><span class="ja">${hl(ej.ja)}</span>`;
    return `${num ? `<span class="num">${num}</span>` : ""}${hl(rest)}`;
  }

  /* ---------- 描画 ---------- */
  const PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9L3.5 9.7l5.9-.8z"/></svg>';
  function renderBody(it) {
    let h = "";
    if (it.lead) h += `<p class="lead">${hl(it.lead)}</p>`;
    if (it.quote) h += `<blockquote lang="en">${hl(it.quote)}</blockquote>`;
    (it.body || []).forEach((p) => { h += `<p>${hl(p)}</p>`; });
    if (it.bullets && it.bullets.length) {
      h += "<ul>" + it.bullets.map((b) =>
        `<li>${hl(b.text)}${b.sub && b.sub.length ? "<ul>" + b.sub.map((s) => `<li>${hl(s)}</li>`).join("") + "</ul>" : ""}</li>`
      ).join("") + "</ul>";
    }
    if (it.defs && it.defs.length) h += "<dl>" + it.defs.map((d) => `<dt>${hl(d.term)}</dt><dd>${hl(d.desc)}</dd>`).join("") + "</dl>";
    if (it.compare) {
      h += '<div class="compare">' + ["bad", "good"].map((k) => {
        const c = it.compare[k];
        return `<div class="${k}"><h4>${hl(c.title)}</h4><ul>${c.rows.map((r) => `<li>${hl(r)}</li>`).join("")}</ul></div>`;
      }).join("") + "</div>";
    }
    return h;
  }
  function renderCard(it, i) {
    const pinned = pins.has(it.id);
    const note = notes[it.id] || "";
    const open = state.openNotes.has(it.id);
    return `
<article class="card${pinned ? " pinned" : ""}${reduceMotion ? "" : " wait"}" id="${esc(it.id)}" data-id="${esc(it.id)}" style="--i:${i}">
  <div class="card-head">
    <h3>${renderTitle(it)}</h3>
    <button class="pin" type="button" data-act="pin" aria-pressed="${pinned}" aria-label="${pinned ? "印を外す" : "印をつける"}" title="${pinned ? "印を外す" : "印をつける"}">${PIN_SVG}</button>
  </div>
  ${it.tags && it.tags.length ? `<div class="tags">${it.tags.map((t) => `<button type="button" class="tag" data-act="tag" data-tag="${esc(t)}">${hl(t)}</button>`).join("")}</div>` : ""}
  <div class="body">${renderBody(it)}</div>
  <div class="card-foot">
    <span class="src">${esc(it.section.short || it.section.title)}</span>
    <button type="button" class="note-btn${note ? " has" : ""}${open ? " on" : ""}" data-act="note" aria-pressed="${open}">書き足す</button>
    <button type="button" data-act="copy">写す</button>
  </div>
  <div class="note"${open ? "" : " hidden"}>
    <textarea rows="3" data-act="note-text" aria-label="自分の書き足し" placeholder="気づき、自分の言葉での言い換え、やってみること">${esc(note)}</textarea>
    <span class="st"><span>書くと自動で残ります</span><span class="note-state"></span></span>
  </div>
</article>`;
  }

  function passesView(it) {
    return state.view === "all" || (state.view === "pins" && pins.has(it.id)) || (state.view === "notes" && !!notes[it.id]);
  }
  function visibleItems() {
    return items.filter((it) => passesView(it) && (!state.tag || (it.tags || []).includes(state.tag)) && matches(it));
  }

  let observer = null;
  function render() {
    const vis = visibleItems();
    const visIds = new Set(vis.map((it) => it.id));
    let k = 0;
    $("sections").innerHTML = sections.map((s, si) => {
      const its = s.items.filter((it) => visIds.has(it.id));
      if (!its.length) return "";
      const collapsed = state.collapsed.has(s.id);
      return `
<section class="chapter" id="ch-${esc(s.id)}" data-sec="${esc(s.id)}" data-collapsed="${collapsed}" aria-labelledby="h-${esc(s.id)}">
  <header class="ch-head">
    <span class="ch-num">第${CH[si]}章</span>
    <h2 id="h-${esc(s.id)}">${hl(s.title)}<span class="cnt">${its.length}${its.length !== s.items.length ? "/" + s.items.length : ""} 則</span></h2>
    <button class="ch-toggle" type="button" data-act="toggle-sec" aria-expanded="${!collapsed}">${collapsed ? "開く" : "閉じる"}</button>
    ${s.subtitle ? `<p class="ch-sub">${hl(s.subtitle)}</p>` : ""}
  </header>
  <div class="grid">${its.map((it) => renderCard(it, k++)).join("")}</div>
</section>`;
    }).join("");
    $("empty").hidden = vis.length > 0;
    const filtered = vis.length !== items.length;
    const what = [state.q.trim() && `「${state.q.trim()}」`, state.tag && `#${state.tag}`, state.view === "pins" && "印をつけた則", state.view === "notes" && "書き足した則"].filter(Boolean).join("、");
    $("resultLine").textContent = filtered ? `${what}：${vis.length} 則` : "";
    renderToc(visIds);
    renderTags();
    revealCards();
  }
  function revealCards() {
    if (observer) observer.disconnect();
    const cards = [...document.querySelectorAll(".card.wait")];
    if (!cards.length) return;
    if (!("IntersectionObserver" in window)) { cards.forEach((c) => c.classList.remove("wait")); return; }
    observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const delay = Math.min(((+el.style.getPropertyValue("--i") || 0) % 6) * 50, 250);
        setTimeout(() => el.classList.remove("wait"), delay);
        observer.unobserve(el);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    cards.forEach((c) => observer.observe(c));
    // 画面に見えないままの保険
    setTimeout(() => cards.forEach((c) => c.classList.remove("wait")), 2500);
  }
  function renderHeroToc() {
    $("heroToc").innerHTML = sections.map((s, i) =>
      `<li><a href="#ch-${esc(s.id)}" data-sec="${esc(s.id)}"><span class="ch">${CH[i]}</span><span class="t">${esc(s.title)}</span><span class="n">${s.items.length}</span></a></li>`
    ).join("");
  }
  $("heroToc").addEventListener("click", (e) => {
    const a = e.target.closest("a"); if (!a) return;
    const id = a.dataset.sec;
    if (state.collapsed.has(id) || !$("ch-" + id)) {
      e.preventDefault(); clearFilters(); state.collapsed.delete(id); store.set("memo.collapsed", [...state.collapsed]); updateCounts(); render();
      const el = $("ch-" + id); if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    }
  });
  (function progress() {
    const bar = $("progress"); let raf = 0;
    const tick = () => { raf = 0; const h = document.documentElement; const max = h.scrollHeight - h.clientHeight; bar.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`; };
    addEventListener("scroll", () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
    addEventListener("resize", tick); tick();
  })();
  function renderToc(visIds) {
    $("toc").innerHTML = sections.map((s, i) => {
      const n = s.items.filter((it) => visIds.has(it.id)).length;
      return `<li><a href="#ch-${esc(s.id)}" class="${n ? "" : "dim"}" data-sec="${esc(s.id)}"><span class="ch">${CH[i]}</span><span>${esc(s.short || s.title)}</span><span class="n">${n}</span></a></li>`;
    }).join("");
    spy();
  }
  function renderTags() {
    const base = items.filter((it) => passesView(it) && matches(it));
    const counts = new Map();
    base.forEach((it) => (it.tags || []).forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
    let tags = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ja"));
    if (state.tag && !counts.has(state.tag)) tags.unshift([state.tag, 0]);
    const hidden = state.allTags ? [] : tags.filter(([t, n]) => n < 2 && t !== state.tag);
    if (hidden.length && hidden.length < 4) hidden.length = 0;
    if (hidden.length) tags = tags.filter((x) => !hidden.includes(x));
    $("tagChips").innerHTML = tags.map(([t, n]) => `<button type="button" class="tag-chip" data-tag="${esc(t)}" aria-pressed="${state.tag === t}">${esc(t)}<span class="n">${n}</span></button>`).join("")
      + (hidden.length ? `<button type="button" class="tag-chip more" data-more="1">他 ${hidden.length} 件…</button>` : state.allTags && counts.size ? `<button type="button" class="tag-chip more" data-more="0">主なものだけ</button>` : "");
    $("tagCur").textContent = state.tag ? "#" + state.tag : "";
    if (state.tag) $("tagBox").open = true;
  }
  function updateCounts() {
    $("nAll").textContent = items.length;
    $("nPins").textContent = pins.size;
    $("nNotes").textContent = Object.keys(notes).filter((k) => notes[k]).length;
    ["All", "Pins", "Notes"].forEach((v) => $("view" + v).setAttribute("aria-pressed", state.view === v.toLowerCase()));
  }

  /* ---------- 狭い画面では章の行だけを本文の上に出して追従させる ---------- */
  (function placeToc() {
    const mq = window.matchMedia("(max-width: 860px)");
    const toc = document.querySelector(".toc"), book = document.querySelector(".book"), inner = document.querySelector(".index-inner"), tags = $("tagBox");
    const place = () => { if (mq.matches) book.insertBefore(toc, $("chapters")); else inner.insertBefore(toc, tags); };
    place();
    if (mq.addEventListener) mq.addEventListener("change", place); else mq.addListener(place);
  })();

  /* ---------- 索引の追従 (scroll spy) ---------- */
  let spyObs = null;
  function spy() {
    if (spyObs) spyObs.disconnect();
    const chapters = [...document.querySelectorAll(".chapter")];
    const links = [...document.querySelectorAll(".toc a")];
    if (!chapters.length || !("IntersectionObserver" in window)) return;
    const seen = new Map();
    spyObs = new IntersectionObserver((entries) => {
      entries.forEach((e) => seen.set(e.target.dataset.sec, e.isIntersecting ? e.boundingClientRect.top : Infinity));
      let best = null, bestTop = Infinity;
      seen.forEach((top, id) => { if (top < bestTop) { bestTop = top; best = id; } });
      if (best == null) return;
      links.forEach((a) => a.classList.toggle("active", a.dataset.sec === best));
    }, { rootMargin: "-20% 0px -60% 0px", threshold: [0, .1] });
    chapters.forEach((c) => spyObs.observe(c));
  }

  /* ---------- 操作 ---------- */
  function clearFilters() { state.q = ""; $("q").value = ""; state.tag = ""; state.view = "all"; }
  $("q").addEventListener("input", () => { state.q = $("q").value; render(); });
  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    const typing = tag === "input" || tag === "textarea";
    if (e.key === "/" && !typing) { e.preventDefault(); $("q").focus(); $("q").select(); }
    if (e.key === "Escape" && e.target === $("q")) { if (state.q) { state.q = ""; $("q").value = ""; render(); } else $("q").blur(); }
  });
  [["All", "all"], ["Pins", "pins"], ["Notes", "notes"]].forEach(([id, v]) => $("view" + id).addEventListener("click", () => { state.view = v; updateCounts(); render(); }));
  $("tagChips").addEventListener("click", (e) => {
    const b = e.target.closest(".tag-chip"); if (!b) return;
    if (b.dataset.more != null) { state.allTags = b.dataset.more === "1"; renderTags(); return; }
    state.tag = state.tag === b.dataset.tag ? "" : b.dataset.tag; render();
  });
  $("reset").addEventListener("click", () => { clearFilters(); updateCounts(); render(); });
  $("expandAll").addEventListener("click", () => { state.collapsed.clear(); store.set("memo.collapsed", []); render(); });
  $("collapseAll").addEventListener("click", () => { sections.forEach((s) => state.collapsed.add(s.id)); store.set("memo.collapsed", [...state.collapsed]); render(); });
  $("toc").addEventListener("click", (e) => {
    const a = e.target.closest("a"); if (!a) return;
    const id = a.dataset.sec;
    if (state.collapsed.has(id)) { state.collapsed.delete(id); store.set("memo.collapsed", [...state.collapsed]); render(); }
    if (a.classList.contains("dim")) { e.preventDefault(); clearFilters(); updateCounts(); render(); const el = $("ch-" + id); if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); }
  });

  $("sections").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-act]"); if (!btn) return;
    const act = btn.dataset.act;
    if (act === "toggle-sec") {
      const id = btn.closest(".chapter").dataset.sec;
      if (state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id);
      store.set("memo.collapsed", [...state.collapsed]); render(); return;
    }
    const card = btn.closest(".card"); if (!card) return;
    const id = card.dataset.id;
    if (act === "pin") {
      const on = !pins.has(id);
      if (on) pins.add(id); else pins.delete(id);
      store.set("memo.pins", [...pins]);
      card.classList.toggle("pinned", on);
      btn.setAttribute("aria-pressed", on); btn.setAttribute("aria-label", on ? "印を外す" : "印をつける"); btn.title = on ? "印を外す" : "印をつける";
      if (!reduceMotion) { btn.classList.add("pop"); setTimeout(() => btn.classList.remove("pop"), 350); }
      updateCounts();
      if (state.view === "pins" && !on) setTimeout(render, 300);
      return;
    }
    if (act === "tag") { state.tag = state.tag === btn.dataset.tag ? "" : btn.dataset.tag; render(); $("tagBox").scrollIntoView({ block: "nearest" }); return; }
    if (act === "note") {
      if (state.openNotes.has(id)) state.openNotes.delete(id); else state.openNotes.add(id);
      const open = state.openNotes.has(id);
      btn.setAttribute("aria-pressed", open); btn.classList.toggle("on", open);
      const box = card.querySelector(".note"); box.hidden = !open;
      if (open) box.querySelector("textarea").focus();
      return;
    }
    if (act === "copy") {
      const text = plainText(items.find((x) => x.id === id));
      const done = () => { btn.textContent = "写しました"; btn.classList.add("copied"); setTimeout(() => { btn.textContent = "写す"; btn.classList.remove("copied"); }, 1500); };
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
    const card = ta.closest(".card"); const id = card.dataset.id;
    if (ta.value.trim()) notes[id] = ta.value; else delete notes[id];
    store.set("memo.notes", notes);
    card.querySelector(".note-btn").classList.toggle("has", !!notes[id]);
    const st = card.querySelector(".note-state"); st.textContent = "残しました";
    clearTimeout(noteTimer); noteTimer = setTimeout(() => { st.textContent = ""; }, 1200);
    updateCounts();
  });

  /* ---------- 今日の一則 ---------- */
  let quoteIdx = -1;
  function showQuote(idx) {
    if (!items.length) return;
    quoteIdx = ((idx % items.length) + items.length) % items.length;
    const it = items[quoteIdx];
    $("quoteSection").textContent = it.section.short || it.section.title;
    $("quoteTitle").textContent = splitNum(it.title).rest;
    $("quoteText").textContent = summary(it);
    $("quoteLink").href = "#" + it.id;
  }
  $("quoteNext").addEventListener("click", () => {
    let n; do { n = Math.floor(Math.random() * items.length); } while (items.length > 1 && n === quoteIdx);
    const body = document.querySelector(".hero-body");
    if (reduceMotion) { showQuote(n); return; }
    body.style.transition = "opacity .18s"; body.style.opacity = "0";
    setTimeout(() => { showQuote(n); body.style.opacity = "1"; }, 180);
  });
  $("quoteLink").addEventListener("click", (e) => {
    e.preventDefault();
    const it = items[quoteIdx]; if (!it) return;
    if (!visibleItems().some((x) => x.id === it.id) || state.collapsed.has(it.section.id)) {
      clearFilters(); state.collapsed.delete(it.section.id); store.set("memo.collapsed", [...state.collapsed]);
      updateCounts(); render();
    }
    const el = $(it.id); if (!el) return;
    el.classList.remove("wait");
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2200);
    history.replaceState(null, "", "#" + it.id);
  });

  /* ---------- 今日の三つ / 今週の三つ / 週末レビュー ---------- */
  const pad = (n) => String(n).padStart(2, "0");
  const todayKey = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  function weekKey(d = new Date()) { // ISO 週 (月曜始まり)
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y = t.getUTCFullYear();
    return `W${y}-${pad(Math.ceil((((t - Date.UTC(y, 0, 1)) / 864e5) + 1) / 7))}`;
  }
  function weekRange(d = new Date()) {
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
    return `${mon.getMonth() + 1}/${mon.getDate()} – ${sun.getMonth() + 1}/${sun.getDate()}`;
  }
  const three = store.get("memo.three", {});
  const review = store.get("memo.review", {});
  function getThree(key) {
    const v = Array.isArray(three[key]) ? three[key] : [];
    while (v.length < 3) v.push({ t: "", d: false });
    return v;
  }
  function updateProgress() {
    const list = getThree(todayKey());
    const done = list.filter((x) => x.d).length, filled = list.filter((x) => x.t).length;
    const el = $("threeProgress");
    el.textContent = filled ? `${done} / ${filled}` : "";
    el.classList.toggle("all", filled > 0 && done === filled);
  }
  function renderThreeList(el, key) {
    const list = getThree(key);
    el.innerHTML = list.map((x, i) =>
      `<li class="${x.d ? "done" : ""}"><span class="n" aria-hidden="true">${i + 1}</span><input type="checkbox" class="maru" id="${el.id}-c${i}" data-i="${i}" ${x.d ? "checked" : ""} aria-label="${i + 1}つ目を完了"><input type="text" id="${el.id}-t${i}" data-i="${i}" value="${esc(x.t)}" placeholder="${["一つ目", "二つ目", "三つ目"][i]}" aria-label="${i + 1}つ目"></li>`
    ).join("");
    el.addEventListener("input", (e) => {
      const i = +e.target.dataset.i; const list = getThree(key);
      if (e.target.type === "checkbox") { list[i].d = e.target.checked; e.target.closest("li").classList.toggle("done", list[i].d); }
      else list[i].t = e.target.value;
      three[key] = list; store.set("memo.three", three); renderHistory(); updateProgress();
    });
  }
  function renderHistory() {
    const tk = todayKey(), wk = weekKey();
    const days = Object.keys(three).filter((k) => /^\d{4}-\d{2}-\d{2}$/.test(k) && k !== tk && three[k].some((x) => x.t)).sort().reverse().slice(0, 30);
    const weeks = Object.keys(three).filter((k) => /^W/.test(k) && k !== wk && three[k].some((x) => x.t)).sort().reverse().slice(0, 12);
    const row = (k, label) => `<tr><td>${esc(label)}</td><td>${three[k].filter((x) => x.t).map((x) => `<span class="${x.d ? "done" : ""}">${esc(x.t)}</span>`).join("　/　")}${review[k] && (review[k].good || review[k].improve) ? `<div class="rv">レビュー: ${esc([review[k].good, review[k].improve].filter(Boolean).join(" ／ "))}</div>` : ""}</td></tr>`;
    $("threeHistoryBody").innerHTML = (days.length || weeks.length)
      ? `<table>${days.map((k) => row(k, k.slice(5).replace("-", "/"))).join("")}${weeks.map((k) => row(k, k.replace(/^W(\d{4})-(\d{2})$/, "$1 W$2"))).join("")}</table>`
      : `<p class="none">まだありません。</p>`;
  }
  (function initThree() {
    const tk = todayKey(), wk = weekKey();
    const d = new Date();
    $("threeDate").textContent = `${d.getMonth() + 1}月${d.getDate()}日（${"日月火水木金土"[d.getDay()]}）`;
    $("threeWeek").textContent = weekRange(d);
    $("tateDate").textContent = `${kanjiYear(d.getFullYear())}年${kanjiNum(d.getMonth() + 1)}月${kanjiNum(d.getDate())}日`;
    renderThreeList($("threeToday"), tk);
    renderThreeList($("threeWeekList"), wk);
    const r = review[wk] || { good: "", improve: "" };
    $("reviewGood").value = r.good || ""; $("reviewImprove").value = r.improve || "";
    ["reviewGood", "reviewImprove"].forEach((id) => $(id).addEventListener("input", () => {
      review[wk] = { good: $("reviewGood").value, improve: $("reviewImprove").value };
      store.set("memo.review", review); renderHistory();
    }));
    renderHistory(); updateProgress();
  })();

  /* ---------- 読み込み ---------- */
  fetch("memo.json?v=" + Date.now(), { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then((data) => {
      sections = data.sections || [];
      items = [];
      sections.forEach((s) => s.items.forEach((it) => { it.section = s; items.push(it); }));
      $("counts").innerHTML = `<b>${sections.length}</b> 章 · <b>${items.length}</b> 則`;
      $("updated").textContent = `最終更新 ${data.updated || "-"}`;
      updateCounts();
      renderHeroToc();
      render();
      showQuote(Number(todayKey().replace(/-/g, "")) % Math.max(items.length, 1)); // 同じ日は同じ則
      if (location.hash) {
        const el = $(location.hash.slice(1));
        if (el && el.classList.contains("card")) { el.classList.remove("wait"); el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2200); }
      }
    })
    .catch((err) => {
      $("quoteTitle").textContent = "memo.json を読み込めませんでした";
      $("quoteText").textContent = `${err.message}。ローカルで見る場合は public/ で python3 -m http.server などのサーバーを起動してください。`;
      $("empty").hidden = false;
    });
})();
