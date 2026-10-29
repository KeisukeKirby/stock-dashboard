/* 業務改善マニュアル — 本文の読み込み・描画・編集・保存・PDF 化
 *
 *   読み込み: /api/kaizen（Upstash Redis に共有保存）→ なければ kaizen.md（リポジトリの初期本文）
 *   編集:     右上「編集」→ 左にテキスト、右にプレビュー。「保存」で全員に共有
 *   PDF:      右上「PDF にする」→ ブラウザの印刷（A4 縦）で「PDF に保存」
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var doc = $('doc');
  var params = new URLSearchParams(location.search);
  var LS_DRAFT = 'kaizen.draft', LS_LOCAL = 'kaizen.localText', LS_KEY = 'kaizen.editKey';

  var state = { text: '', updatedAt: null, shared: false, locked: false, editing: false, dirty: false };

  /* ======================= 読み込み ======================= */
  load().then(function () {
    showDoc();
    if (params.get('edit') === '1') openEditor();
    if (params.get('print') === '1') {
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        setTimeout(function () { window.print(); }, 300);
      });
    }
  });

  function load() {
    return fetch('api/kaizen', { cache: 'no-store' })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.shared) {
          state.shared = true; state.locked = !!res.j.locked;
          state.updatedAt = res.j.updatedAt || null;
          if (res.j.text) { state.text = res.j.text; return; }
        }
        return loadSeed();
      })
      .catch(loadSeed);
  }

  function loadSeed() {
    var local = safeGet(LS_LOCAL);
    if (!state.shared && local) { state.text = local; return Promise.resolve(); }
    return fetch('kaizen.md?v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { state.text = t || window.KaizenMD.TEMPLATE; })
      .catch(function () { state.text = window.KaizenMD.TEMPLATE; });
  }

  // 他の人の保存を取り込む（閲覧中・画面に戻ったとき）
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible' || state.editing || !state.shared) return;
    fetch('api/kaizen', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.shared && j.text && j.updatedAt && j.updatedAt !== state.updatedAt) {
        state.text = j.text; state.updatedAt = j.updatedAt; showDoc();
      }
    }).catch(function () {});
  });

  /* ======================= 描画 ======================= */
  function showDoc() {
    var data = window.KaizenMD.parse(state.text);
    doc.innerHTML = renderDoc(data);
    doc.setAttribute('aria-busy', 'false');
    doc.dataset.ready = '1';
    document.title = data.title || '業務改善マニュアル';
    $('tbTitle').textContent = data.title || '業務改善マニュアル';
    $('tbVersion').textContent = data.version ? 'v' + data.version : '';
    setFooter((data.title || '業務改善マニュアル') + (data.version ? '　v' + data.version : ''));
    updateStatus();
  }

  function updateStatus() {
    var el = $('tbStatus');
    if (!el) return;
    if (state.shared) {
      el.textContent = state.updatedAt ? '共有保存　最終更新 ' + fmtDate(state.updatedAt) : '共有保存（まだ保存されていません・初期本文を表示中）';
      el.className = 'toolbar-status is-shared';
    } else {
      el.textContent = '共有保存が未設定です（保存はこのブラウザにのみ残ります）';
      el.className = 'toolbar-status is-local';
    }
  }

  function renderDoc(data) {
    var numbered = data.chapters.filter(function (c) { return !c.appendix; });
    var html = renderCover(data) + renderToc(data, numbered);
    data.chapters.forEach(function (ch) {
      html += renderChapter(ch, ch.appendix ? null : numbered.indexOf(ch) + 1);
    });
    html += renderHistory(data);
    html += '<p class="doc-end">' + esc(data.company || '') + '　' + esc(data.title || '') + (data.version ? '　v' + esc(data.version) : '') + '　' + esc(data.date || '') + '</p>';
    return html;
  }

  function renderCover(d) {
    return '<section class="cover" id="top">' +
      '<div class="cover-top"><span>' + esc(d.company || '') + '</span><span>' + esc(d.date || '') + '</span></div>' +
      '<div class="cover-body">' +
        '<p class="cover-kicker">PROCESS IMPROVEMENT MANUAL</p>' +
        '<h1 class="cover-title">' + esc(d.title || '業務改善マニュアル') + '</h1>' +
        (d.subtitle ? '<p class="cover-sub">' + esc(d.subtitle) + '</p>' : '') +
        '<dl class="cover-meta">' +
          '<div><dt>版</dt><dd>' + esc(d.version || '—') + '</dd></div>' +
          '<div><dt>発行日</dt><dd>' + esc(d.date || '—') + '</dd></div>' +
        '</dl>' +
        '<div class="cover-sign">' +
          '<div>作成' + (d.author ? '<br><strong>' + esc(d.author) + '</strong>' : '') + '</div>' +
          '<div>確認</div>' +
          '<div>承認' + (d.approver ? '<br><strong>' + esc(d.approver) + '</strong>' : '') + '</div>' +
        '</div>' +
      '</div>' +
      '<p class="cover-foot">社内資料・取り扱い注意</p>' +
    '</section>';
  }

  function renderToc(d, numbered) {
    var h = '<section class="front"><h2 class="front-h" id="toc">目次</h2><nav class="toc" aria-label="目次"><ol>';
    d.chapters.forEach(function (ch) {
      var n = ch.appendix ? null : numbered.indexOf(ch) + 1;
      h += '<li><a class="toc-ch" href="#' + esc(ch.id) + '"><span class="num">' + (ch.appendix ? '付録' : '第' + n + '章') + '</span><span>' + esc(ch.title) + '</span></a>';
      if (ch.sections.length) {
        h += '<ol>';
        ch.sections.forEach(function (s, i) {
          var sn = ch.appendix ? String.fromCharCode(65 + i) : n + '.' + (i + 1);
          h += '<li><span class="num">' + sn + '</span><a href="#' + esc(s.id) + '">' + esc(s.title) + '</a>' + pill(s.status) + '</li>';
        });
        h += '</ol>';
      }
      h += '</li>';
    });
    return h + '</ol></nav></section>';
  }

  function renderHistory(d) {
    if (!d.history || !d.history.length) return '';
    return '<section class="history" id="history"><h2>改訂履歴</h2>' +
      table({ head: ['版', '日付', '内容'], widths: ['12%', '20%', '68%'],
        rows: d.history.map(function (r) { return [r.version, r.date, r.note]; }) }) + '</section>';
  }

  function renderChapter(ch, n) {
    var h = '<section class="chapter" id="' + esc(ch.id) + '">';
    h += '<header class="chapter-head"><span class="chapter-num">' + (ch.appendix ? '付録' : '第 ' + n + ' 章') + '</span><h2>' + esc(ch.title) + '</h2></header>';
    if (ch.lead) h += '<p class="chapter-lead">' + inline(ch.lead) + '</p>';
    (ch.intro || []).forEach(function (b) { h += block(b); });
    ch.sections.forEach(function (s, i) {
      var sn = ch.appendix ? '付録 ' + String.fromCharCode(65 + i) : n + '.' + (i + 1);
      h += '<section class="section" id="' + esc(s.id) + '">';
      h += '<header class="section-head"><span class="num">' + sn + '</span><h3>' + esc(s.title) + '</h3>' + pill(s.status) + '</header>';
      s.blocks.forEach(function (b) { h += block(b); });
      h += '</section>';
    });
    return h + '</section>';
  }

  function block(b) {
    switch (b.type) {
      case 'p': return '<p class="block">' + inline(b.text) + '</p>';
      case 'h': return '<h4 class="sub">' + inline(b.text) + '</h4>';
      case 'ul': return '<ul class="b-ul">' + listItems(b.items) + '</ul>';
      case 'ol': return '<ol class="b-ol">' + listItems(b.items) + '</ol>';
      case 'table': return table(b);
      case 'note':
        return '<aside class="note note-' + esc(b.kind || 'info') + '"><div class="note-bar"></div><div class="note-body">' +
          (b.title ? '<p class="note-title">' + inline(b.title) + '</p>' : '') + '<p>' + inline(b.text) + '</p></div></aside>';
      case 'check':
        return '<div class="check">' + (b.title ? '<div class="check-title">' + inline(b.title) + '</div>' : '') +
          '<ul>' + (b.items || []).map(function (t) { return '<li>' + inline(t) + '</li>'; }).join('') + '</ul></div>';
      case 'flow':
        return '<div class="flow">' + (b.steps || []).map(function (s) {
          return '<div class="flow-step"><span class="flow-title">' + inline(s.title) + '</span>' + inline(s.text) + '</div>';
        }).join('') + '</div>';
      case 'proposal':
        return '<div class="proposal">' +
          cell('従来のプロセス', b.current, '') + cell('問題点', b.issue, '') +
          cell('今後のプロセス', b.plan, 'is-plan') + cell('確認のしかた・指標', b.effect, 'is-effect') + '</div>';
      case 'kv':
        return '<dl class="kv">' + (b.items || []).map(function (kv) {
          return '<dt>' + inline(kv[0]) + '</dt><dd>' + inline(kv[1]) + '</dd>';
        }).join('') + '</dl>';
      case 'form':
        return '<div class="form">' + (b.rows || []).map(function (r) {
          var l = Math.min(4, Math.max(1, r.lines || 1));
          return '<div class="form-row"><div class="form-label">' + inline(r.label) + '</div><div class="form-field l' + l + '"></div></div>';
        }).join('') + '</div>';
      case 'pagebreak': return '<div class="pagebreak"></div>';
      default: return '<p class="block">' + inline(b.text || '') + '</p>';
    }
  }

  function cell(label, text, cls) {
    return '<div class="proposal-cell ' + cls + '"><span class="lbl">' + label + '</span><p>' + inline(text || '〔記入〕') + '</p></div>';
  }
  function listItems(items) {
    return (items || []).map(function (it) {
      if (typeof it === 'string') return '<li>' + inline(it) + '</li>';
      var sub = it.sub && it.sub.length ? '<ul>' + it.sub.map(function (s) { return '<li>' + inline(s) + '</li>'; }).join('') + '</ul>' : '';
      return '<li>' + inline(it.text || '') + sub + '</li>';
    }).join('');
  }
  function table(b) {
    var h = '<table class="b-table">';
    if (b.caption) h += '<caption>' + inline(b.caption) + '</caption>';
    if (b.widths) h += '<colgroup>' + b.widths.map(function (w) { return '<col style="width:' + esc(w) + '">'; }).join('') + '</colgroup>';
    var nw = function (c) { return String(c == null ? '' : c).trim().length <= 6 ? ' class="nw"' : ''; }; // 短いセルは折り返さない
    if (b.head) h += '<thead><tr>' + b.head.map(function (c) { return '<th' + nw(c) + '>' + inline(c) + '</th>'; }).join('') + '</tr></thead>';
    h += '<tbody>' + (b.rows || []).map(function (r) {
      return '<tr>' + r.map(function (c) { return '<td' + nw(c) + '>' + inline(c) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
    return h;
  }
  function pill(status) {
    if (!status) return '';
    var cls = /ドラフト|draft/i.test(status) ? 'pill-draft' : /試行/.test(status) ? 'pill-trial' : /運用/.test(status) ? 'pill-live' : 'pill-plan';
    return '<span class="pill ' + cls + '">' + esc(status) + '</span>';
  }

  /* ======================= 編集 ======================= */
  var ta = $('editor'), preview = $('preview'), renderTimer = null;

  $('editBtn').addEventListener('click', function () { state.editing ? closeEditor() : openEditor(); });
  $('cancelBtn').addEventListener('click', closeEditor);
  $('saveBtn').addEventListener('click', save);
  $('helpBtn').addEventListener('click', function () { $('help').hidden = !$('help').hidden; });
  $('downloadBtn').addEventListener('click', downloadMd);
  $('uploadInput').addEventListener('change', uploadMd);
  $('historyBtn').addEventListener('click', showHistory);
  $('printBtn').addEventListener('click', printPdf);
  $('printBtn2').addEventListener('click', printPdf);

  ta.addEventListener('input', function () {
    state.dirty = true;
    safeSet(LS_DRAFT, ta.value);
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 250);
  });
  ta.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (e.key === 'Tab') { // 2 文字下げ
      e.preventDefault();
      var s = ta.selectionStart, en = ta.selectionEnd;
      ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(en);
      ta.selectionStart = ta.selectionEnd = s + 2;
      ta.dispatchEvent(new Event('input'));
    }
  });
  window.addEventListener('beforeunload', function (e) {
    if (state.editing && state.dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  function openEditor() {
    state.editing = true;
    document.body.classList.add('is-editing');
    var draft = safeGet(LS_DRAFT);
    if (draft && draft !== state.text && confirm('保存していない下書きがこのブラウザに残っています。下書きを開きますか？\n（「キャンセル」で最新の保存内容を開きます）')) {
      ta.value = draft; state.dirty = true;
    } else {
      ta.value = state.text; state.dirty = false; safeDel(LS_DRAFT);
    }
    $('editBtn').textContent = '閲覧に戻る';
    renderPreview();
    ta.focus();
  }

  function closeEditor() {
    if (state.dirty && !confirm('保存していない変更があります。編集をやめますか？（下書きはこのブラウザに残ります）')) return;
    state.editing = false;
    document.body.classList.remove('is-editing');
    $('editBtn').textContent = '編集';
    showDoc();
  }

  function renderPreview() {
    var data = window.KaizenMD.parse(ta.value);
    preview.innerHTML = renderDoc(data);
  }

  function save() {
    var text = ta.value;
    setSaveMsg('保存中…');
    if (!state.shared) {
      safeSet(LS_LOCAL, text); safeDel(LS_DRAFT);
      state.text = text; state.dirty = false;
      setSaveMsg('このブラウザに保存しました（共有保存は未設定）');
      return;
    }
    var headers = { 'Content-Type': 'application/json' };
    var key = safeGet(LS_KEY);
    if (state.locked && !key) { key = askKey(); if (key === null) { setSaveMsg('保存を中止しました'); return; } }
    if (key) headers['X-Edit-Key'] = key;
    fetch('api/kaizen', { method: 'PUT', headers: headers, body: JSON.stringify({ text: text, base: state.updatedAt }) })
      .then(function (r) { return r.json().then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        if (res.status === 401) {
          safeDel(LS_KEY);
          var k = askKey();
          if (k === null) { setSaveMsg('保存を中止しました'); return; }
          state.locked = true;
          return save();
        }
        if (res.status === 409) {
          setSaveMsg('他の人が先に保存しています。');
          if (confirm('他の人が先に保存しています。\n「OK」＝自分の内容で上書き保存する\n「キャンセル」＝保存をやめる（.md をダウンロードして控えを取ってから、ページを再読み込みしてください）')) {
            state.updatedAt = res.j.updatedAt; return save();
          }
          return;
        }
        if (res.status !== 200) { setSaveMsg('保存できませんでした: ' + (res.j && res.j.error || res.status)); return; }
        state.text = text; state.updatedAt = res.j.updatedAt; state.dirty = false; safeDel(LS_DRAFT);
        setSaveMsg('保存しました　' + fmtDate(state.updatedAt));
        updateStatus();
      })
      .catch(function (e) { setSaveMsg('保存できませんでした: ' + e); });
  }

  function askKey() {
    var k = prompt('この文書の保存には編集キーが必要です。編集キーを入力してください。');
    if (k === null) return null;
    k = k.trim();
    if (k) safeSet(LS_KEY, k);
    return k;
  }

  function setSaveMsg(t) { $('saveMsg').textContent = t; }

  function downloadMd() {
    var text = state.editing ? ta.value : state.text;
    var d = window.KaizenMD.parse(text);
    var name = (d.title || 'kaizen') + (d.version ? '_v' + d.version.replace(/[^\w.\-]+/g, '') : '') + '.md';
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  function uploadMd(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      if (!state.editing) openEditor();
      ta.value = String(r.result); state.dirty = true; renderPreview();
      setSaveMsg('ファイルを読み込みました（まだ保存されていません）');
    };
    r.readAsText(f, 'utf-8');
    e.target.value = '';
  }

  function showHistory() {
    if (!state.shared) { alert('共有保存が未設定のため、履歴はありません。'); return; }
    fetch('api/kaizen?history=1', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var list = (j && j.history) || [];
      if (!list.length) { alert('保存の履歴はまだありません。'); return; }
      var lines = list.map(function (h, i) { return (i + 1) + ') ' + fmtDate(h.at) + '　' + (h.head || '').replace(/^version:\s*/, 'v') + '　' + h.size + ' 文字'; });
      var pick = prompt('保存の履歴（新しい順）。番号を入力すると、その内容を編集画面に読み込みます（保存するまで共有内容は変わりません）。\n\n' + lines.join('\n'));
      var n = parseInt(pick, 10);
      if (!n || !list[n - 1]) return;
      fetch('api/kaizen?rev=' + encodeURIComponent(list[n - 1].at), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (rev) {
        if (!rev || typeof rev.text !== 'string') { alert('読み込めませんでした。'); return; }
        if (!state.editing) openEditor();
        ta.value = rev.text; state.dirty = true; renderPreview();
        setSaveMsg(fmtDate(rev.updatedAt) + ' の内容を読み込みました（まだ保存されていません）');
      });
    }).catch(function (e) { alert('履歴を取得できませんでした: ' + e); });
  }

  /* ======================= PDF ======================= */
  function printPdf() {
    if (state.editing) { // 編集中は、いま書いている内容で PDF にする
      doc.innerHTML = preview.innerHTML;
    }
    var after = function () {
      window.removeEventListener('afterprint', after);
      if (state.editing) showDoc();
    };
    window.addEventListener('afterprint', after);
    window.print();
  }

  /* ======================= ユーティリティ ======================= */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function inline(s) { return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>'); }
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return String(iso || '');
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  var footerStyle = null;
  function setFooter(text) {
    if (!footerStyle) { footerStyle = document.createElement('style'); document.head.appendChild(footerStyle); }
    footerStyle.textContent = '@page { @bottom-left { content: ' + JSON.stringify(text) + '; } }\n' +
      '@page :first { @bottom-left { content: none; } @bottom-center { content: none; } }';
  }
  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function safeDel(k) { try { localStorage.removeItem(k); } catch (e) {} }
})();
