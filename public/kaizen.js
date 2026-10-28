/* 業務改善マニュアル — kaizen.json を読み、表紙・改訂履歴・目次・本文を描く */
(function () {
  'use strict';

  var doc = document.getElementById('doc');
  var params = new URLSearchParams(location.search);

  fetch('kaizen.json?v=' + Date.now(), { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status + ' ' + r.statusText); return r.json(); })
    .then(render)
    .catch(function (err) {
      doc.innerHTML = '<p class="loading">本文（kaizen.json）を読み込めませんでした。' + esc(String(err)) + '</p>';
      doc.setAttribute('aria-busy', 'false');
    });

  document.getElementById('printBtn').addEventListener('click', function () { window.print(); });

  /* ---------- 描画 ---------- */
  function render(data) {
    document.title = data.title || document.title;
    document.getElementById('tbTitle').textContent = data.title || '';
    document.getElementById('tbVersion').textContent = data.version ? 'v' + data.version : '';
    setFooter(data.title + (data.version ? '　v' + data.version : ''));

    var numbered = data.chapters.filter(function (c) { return !c.appendix; });
    var html = '';
    html += renderCover(data);
    html += renderFront(data, numbered);
    data.chapters.forEach(function (ch) {
      var n = ch.appendix ? null : numbered.indexOf(ch) + 1;
      html += renderChapter(ch, n);
    });
    html += renderHistory(data);
    html += '<p class="doc-end">' + esc(data.company || '') + '　' + esc(data.title || '') + '　v' + esc(data.version || '') + '　' + esc(data.date || '') + '</p>';

    doc.innerHTML = html;
    doc.setAttribute('aria-busy', 'false');
    doc.dataset.ready = '1';

    if (params.get('print') === '1') {
      (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () {
        setTimeout(function () { window.print(); }, 200);
      });
    }
  }

  function renderCover(d) {
    return '<section class="cover" id="top">' +
      '<div class="cover-top"><span>' + esc(d.company || '') + '</span><span>' + esc(d.date || '') + '</span></div>' +
      '<div class="cover-body">' +
        '<p class="cover-kicker">PROCESS IMPROVEMENT MANUAL</p>' +
        '<h1 class="cover-title">' + esc(d.title || '') + '</h1>' +
        (d.subtitle ? '<p class="cover-sub">' + esc(d.subtitle) + '</p>' : '') +
        '<dl class="cover-meta">' +
          '<div><dt>版</dt><dd>' + esc(d.version || '') + '</dd></div>' +
          '<div><dt>発行日</dt><dd>' + esc(d.date || '') + '</dd></div>' +
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

  function renderFront(d, numbered) {
    var h = '<section class="front">';
    h += '<h2 class="front-h" id="toc">目次</h2><nav class="toc" aria-label="目次"><ol>';
    d.chapters.forEach(function (ch) {
      var n = ch.appendix ? null : numbered.indexOf(ch) + 1;
      var label = ch.appendix ? '付録' : '第' + n + '章';
      h += '<li><a class="toc-ch" href="#ch-' + esc(ch.id) + '"><span class="num">' + label + '</span><span>' + esc(ch.title) + '</span></a>';
      if (ch.sections && ch.sections.length) {
        h += '<ol>';
        ch.sections.forEach(function (s, i) {
          var sn = ch.appendix ? String.fromCharCode(65 + i) : n + '.' + (i + 1);
          h += '<li><span class="num">' + sn + '</span><a href="#sec-' + esc(s.id) + '">' + esc(s.title) + '</a>' + pill(s.status) + '</li>';
        });
        h += '</ol>';
      }
      h += '</li>';
    });
    h += '</ol></nav></section>';
    return h;
  }

  function renderHistory(d) {
    if (!d.history || !d.history.length) return '';
    return '<section class="history" id="history"><h2>改訂履歴</h2>' +
      table({ head: ['版', '日付', '内容'], widths: ['12%', '20%', '68%'],
        rows: d.history.map(function (r) { return [r.version, r.date, r.note]; }) }) + '</section>';
  }

  function renderChapter(ch, n) {
    var h = '<section class="chapter" id="ch-' + esc(ch.id) + '">';
    h += '<header class="chapter-head"><span class="chapter-num">' + (ch.appendix ? '付録' : '第 ' + n + ' 章') + '</span><h2>' + esc(ch.title) + '</h2></header>';
    if (ch.lead) h += '<p class="chapter-lead">' + inline(ch.lead) + '</p>';
    (ch.sections || []).forEach(function (s, i) {
      var sn = ch.appendix ? '付録 ' + String.fromCharCode(65 + i) : n + '.' + (i + 1);
      h += '<section class="section" id="sec-' + esc(s.id) + '">';
      h += '<header class="section-head"><span class="num">' + sn + '</span><h3>' + esc(s.title) + '</h3>' + pill(s.status) + '</header>';
      if (s.summary) h += '<p class="section-summary">' + inline(s.summary) + '</p>';
      (s.blocks || []).forEach(function (b) { h += block(b); });
      h += '</section>';
    });
    h += '</section>';
    return h;
  }

  /* ---------- ブロック ---------- */
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
          cell('現状', b.current, '') + cell('課題', b.issue, '') +
          cell('改善案', b.plan, 'is-plan') + cell('効果の測り方', b.effect, 'is-effect') + '</div>';
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
    if (b.head) h += '<thead><tr>' + b.head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') + '</tr></thead>';
    h += '<tbody>' + (b.rows || []).map(function (r) {
      return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
    return h;
  }

  function pill(status) {
    if (!status) return '';
    var cls = /ドラフト|draft/i.test(status) ? 'pill-draft'
      : /試行/.test(status) ? 'pill-trial'
      : /運用/.test(status) ? 'pill-live' : 'pill-plan';
    return '<span class="pill ' + cls + '">' + esc(status) + '</span>';
  }

  /* ---------- ユーティリティ ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  /* **太字** だけの最小限のインライン記法 */
  function inline(s) {
    return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  /* ページ下の左に出す文書名（@page の余白ボックス。Chrome 系で有効） */
  function setFooter(text) {
    var st = document.createElement('style');
    st.textContent = '@page { @bottom-left { content: ' + JSON.stringify(text) + '; } }\n' +
      '@page :first { @bottom-left { content: none; } @bottom-center { content: none; } }';
    document.head.appendChild(st);
  }
})();
