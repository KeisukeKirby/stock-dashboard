/* 業務改善マニュアルの本文（Markdown 風のテキスト）を、描画用のデータに変換する。
 *
 *   ---                      先頭のメタ情報（title / subtitle / company / version / date / author / approver）
 *   title: 業務改善マニュアル
 *   ---
 *   :::history               改訂履歴（巻末に出る）。1 行 = 版 | 日付 | 内容
 *   0.1 | 2026-10-28 | 初版
 *   :::
 *   # 章タイトル             章（自動で「第 N 章」）。「# [付録] タイトル」で付録（A, B, C…）
 *   > リード文               章タイトル直後の > 行は章の説明文
 *   ## 節タイトル [提案]      節（改善項目）。[ ] の中は状態（提案 / 試行中 / 運用中 / ドラフト）
 *   ### 小見出し
 *   本文の段落。**太字** が使える。
 *   - 箇条書き（2 文字下げで 2 段目）    1. 番号つき
 *   | 見出し | 見出し |  表（2 行目の |---|---| は省略可）
 *   :::info タイトル / :::tip / :::warn   囲み（補足・コツ・注意）
 *   :::check タイトル  + - 項目          チェックリスト
 *   :::flow            + - 工程名: 説明   工程の流れ（矢印）
 *   :::proposal        従来: / 問題: / 今後: / 確認:   改善項目の 4 枠（現状/課題/改善案/効果 でも可）
 *   :::kv              ラベル: 値         担当・頻度などの項目表
 *   :::form            ラベル: 行数       手書き用の空欄
 *   ====               改ページ
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.KaizenMD = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var META_KEYS = ['title', 'subtitle', 'company', 'version', 'date', 'author', 'approver'];

  function parse(text) {
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var doc = { title: '', subtitle: '', company: '', version: '', date: '', author: '', approver: '', history: [], chapters: [] };
    var i = 0;

    // --- メタ情報 ---
    if (lines[0] && /^---\s*$/.test(lines[0])) {
      i = 1;
      while (i < lines.length && !/^---\s*$/.test(lines[i])) {
        var m = /^([A-Za-z_]+)\s*[:：]\s*(.*)$/.exec(lines[i]);
        if (m && META_KEYS.indexOf(m[1]) >= 0) doc[m[1]] = m[2].trim();
        i++;
      }
      i++;
    }

    var chapter = null, section = null, blocks = null, lead = null, n = 0;
    var preamble = []; // 最初の章より前のブロック（history など）

    function target() {
      if (section) return section.blocks;
      if (chapter) { // 章の直下（節なし）に書かれた本文は「概要」節扱いにせず、章のリードの後ろに置く
        if (!chapter.intro) chapter.intro = [];
        return chapter.intro;
      }
      return preamble;
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      // 章
      var ch = /^#\s+(.*)$/.exec(line);
      if (ch) {
        var t = ch[1].trim(), appendix = false;
        var ap = /^\[(付録|appendix|ภาคผนวก)\]\s*(.*)$/i.exec(t);
        if (ap) { appendix = true; t = ap[2].trim(); }
        n++;
        chapter = { id: 'ch' + n, title: t, lead: '', appendix: appendix, sections: [] };
        doc.chapters.push(chapter);
        section = null;
        i++;
        // 直後の > 行はリード
        var leadLines = [];
        while (i < lines.length && /^>\s?/.test(lines[i]) && !/^>\s*\[!/.test(lines[i])) { leadLines.push(lines[i].replace(/^>\s?/, '')); i++; }
        chapter.lead = leadLines.join('').trim();
        continue;
      }

      // 節
      var se = /^##\s+(.*)$/.exec(line);
      if (se) {
        if (!chapter) { n++; chapter = { id: 'ch' + n, title: '（章タイトルなし）', lead: '', appendix: false, sections: [] }; doc.chapters.push(chapter); }
        var st = se[1].trim(), status = '';
        var sm = /^(.*?)\s*\[([^\]]+)\]\s*$/.exec(st);
        if (sm) { st = sm[1].trim(); status = sm[2].trim(); }
        section = { id: 'ch' + n + '-s' + (chapter.sections.length + 1), title: st, status: status, blocks: [] };
        chapter.sections.push(section);
        i++;
        continue;
      }

      // 小見出し
      var h = /^###+\s+(.*)$/.exec(line);
      if (h) { target().push({ type: 'h', text: h[1].trim() }); i++; continue; }

      // 改ページ
      if (/^={4,}\s*$/.test(line)) { target().push({ type: 'pagebreak' }); i++; continue; }

      // 囲みブロック
      var fence = /^:::\s*([a-zA-Z]+)\s*(.*)$/.exec(line);
      if (fence) {
        var kind = fence[1].toLowerCase(), title = fence[2].trim(), body = [];
        i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i])) { body.push(lines[i]); i++; }
        i++; // 閉じ
        var blk = fenced(kind, title, body);
        if (kind === 'history') doc.history = doc.history.concat(blk);
        else if (blk) target().push(blk);
        continue;
      }

      // 表
      if (/^\s*\|.*\|\s*$/.test(line)) {
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(splitRow(lines[i])); i++; }
        var tbl = { type: 'table', head: null, rows: [] };
        if (rows.length >= 2 && rows[1].every(function (c) { return /^:?-{2,}:?$/.test(c.trim()); })) {
          tbl.head = rows[0]; tbl.rows = rows.slice(2);
        } else if (rows.length >= 1) {
          tbl.head = rows[0]; tbl.rows = rows.slice(1);
        }
        target().push(tbl);
        continue;
      }

      // 箇条書き・番号
      if (/^\s*([-*・]|\d+[.)])\s+/.test(line)) {
        var ordered = /^\s*\d+[.)]\s+/.test(line), items = [], cur = null;
        while (i < lines.length && (/^\s*([-*・]|\d+[.)])\s+/.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
          var li = lines[i];
          var sub = /^\s{2,}([-*・]|\d+[.)])\s+(.*)$/.exec(li);
          var top = /^([-*・]|\d+[.)])\s+(.*)$/.exec(li);
          if (top) { cur = { text: top[2].trim(), sub: [] }; items.push(cur); }
          else if (sub && cur) { cur.sub.push(sub[2].trim()); }
          else if (cur) { // 続きの行
            if (cur.sub.length) cur.sub[cur.sub.length - 1] += li.trim(); else cur.text += li.trim();
          }
          i++;
        }
        target().push({ type: ordered ? 'ol' : 'ul', items: items });
        continue;
      }

      // 段落（空行まで）
      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|:::|====|\s*\||\s*([-*・]|\d+[.)])\s+|>)/.test(lines[i])) { para.push(lines[i].trim()); i++; }
      if (!para.length) { // > など、上で拾えなかった行は段落として扱う
        para.push(lines[i].replace(/^>\s?/, '').trim()); i++;
      }
      target().push({ type: 'p', text: para.join('') });
    }

    if (preamble.length) { // 章の前に書かれた本文は最初の章に入れる
      if (!doc.chapters.length) doc.chapters.push({ id: 'ch1', title: doc.title || '本文', lead: '', appendix: false, sections: [] });
      doc.chapters[0].intro = preamble.concat(doc.chapters[0].intro || []);
    }
    return doc;
  }

  function splitRow(line) {
    var s = line.trim().replace(/^\|/, '').replace(/\|$/, '');
    return s.split('|').map(function (c) { return c.trim(); });
  }

  function kvLines(body) {
    var out = [], last = null;
    body.forEach(function (l) {
      if (/^\s*$/.test(l)) return;
      var m = /^([^:：]{1,40})[:：]\s*(.*)$/.exec(l);
      if (m) { last = [m[1].trim(), m[2].trim()]; out.push(last); }
      else if (last) last[1] += l.trim();
    });
    return out;
  }

  function listLines(body) {
    return body.filter(function (l) { return !/^\s*$/.test(l); })
      .map(function (l) { return l.replace(/^\s*([-*・]|\d+[.)]|\[[ x]\])\s*/, '').replace(/^\[[ x]\]\s*/, '').trim(); });
  }

  function fenced(kind, title, body) {
    switch (kind) {
      case 'history':
        return body.filter(function (l) { return !/^\s*$/.test(l); }).map(function (l) {
          var c = l.split('|').map(function (x) { return x.trim(); });
          return { version: c[0] || '', date: c[1] || '', note: c.slice(2).join(' | ') };
        });
      case 'info': case 'tip': case 'warn': case 'note':
        return { type: 'note', kind: kind === 'note' ? 'info' : kind, title: title, text: body.filter(function (l) { return !/^\s*$/.test(l); }).map(function (l) { return l.trim(); }).join('') };
      case 'check':
        return { type: 'check', title: title, items: listLines(body) };
      case 'flow':
        return { type: 'flow', steps: listLines(body).map(function (l) {
          var m = /^([^:：]{1,30})[:：]\s*(.*)$/.exec(l);
          return m ? { title: m[1].trim(), text: m[2].trim() } : { title: l, text: '' };
        }) };
      case 'proposal': {
        var p = { type: 'proposal', current: '', issue: '', plan: '', effect: '' };
        kvLines(body).forEach(function (kv) {
          var k = kv[0];
          if (/従来|現状|^before|^current|เดิม/i.test(k)) p.current = kv[1];
          else if (/問題|課題|^problem|^issue|ปัญหา/i.test(k)) p.issue = kv[1];
          else if (/今後|改善|^new|^after|ใหม่/i.test(k)) p.plan = kv[1];
          else if (/確認|効果|指標|^check|ตรวจ/i.test(k)) p.effect = kv[1];
        });
        return p;
      }
      case 'kv':
        return { type: 'kv', items: kvLines(body) };
      case 'form':
        return { type: 'form', rows: kvLines(body).map(function (kv) { return { label: kv[0], lines: parseInt(kv[1], 10) || 1 }; }) };
      default:
        return { type: 'p', text: body.join('') };
    }
  }

  /* 空の本文のときに表示するひな形 */
  var TEMPLATE = [
    '---',
    'title: 業務改善マニュアル',
    'subtitle: 各スタッフ・セクションの業務プロセスの最適化と生産性向上のための提案',
    'company: ',
    'version: 0.1',
    'date: ' + new Date().toISOString().slice(0, 10),
    'author: ',
    'approver: ',
    '---',
    '',
    ':::history',
    '0.1 | ' + new Date().toISOString().slice(0, 10) + ' | 初版',
    ':::',
    '',
    '# はじめに',
    '> この文書の目的を 2〜3 行で。',
    '',
    '## 目的',
    '',
    '本文を書きます。**太字** が使えます。',
    '',
    '# 店舗（Store）',
    '> 章の説明。',
    '',
    '## 開店・閉店のチェックリスト [提案]',
    '',
    ':::proposal',
    '従来: これまでのやり方',
    '問題: 何が起きていたか',
    '今後: これからのやり方',
    '確認: 何を見れば守られていると分かるか',
    ':::',
    '',
    ':::check 閉店チェックリスト',
    '- レジ締め',
    '- 日報を送る',
    ':::',
    ''
  ].join('\n');

  return { parse: parse, TEMPLATE: TEMPLATE };
});
