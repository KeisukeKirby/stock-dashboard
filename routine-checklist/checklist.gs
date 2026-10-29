/**
 * ルーティンワーク定着チェックリスト（Google スプレッドシート用 Apps Script）
 *
 * - 日付は横方向に並ぶ（平日＋毎月の最終土曜日のみ。それ以外の土日は除外）
 * - 部署ごとにシートを分ける（経理／物流）
 * - チェック区分ごとに「異常の有無」「異常内容・対応」「実施者」の欄を持つ
 *
 * 使い方は README.md を参照。
 */

// ===== 設定（ここを書き換えて「初期セットアップ」を実行） =====
const CONFIG = {
  startYear: 2026,
  startMonth: 11,   // 開始月（1〜12）
  initialMonths: 3, // 初期セットアップで作る月数（以降はメニューから1か月ずつ追加）
  departments: {
    '経理': [
      {
        name: '売上照合',
        items: [
          '前営業日分の売上データを販売管理システムから出力した',
          '売上データと請求書・納品書の件数・金額が一致している',
          '売上データと入金額（現金・振込・カード・EC決済）が一致している',
          '返品・値引き・キャンセルが正しく反映されている',
          '会計ソフトの売上計上額と販売管理システムの売上が一致している',
        ],
      },
    ],
    '物流': [],
  },
};

// ===== レイアウト =====
const MARKER = 'CHECKLIST'; // A1（非表示列）に入れて、チェックリストのシートを見分ける
const ROW = { title: 1, month: 2, date: 3, dow: 4, rate: 5, firstData: 6 };
const COL = { type: 1, no: 2, label: 3, firstDate: 4 };
const TYPE = { HEADER: 'header', ITEM: 'item', STATUS: 'status', DETAIL: 'detail', PERSON: 'person', NOTE: 'note' };
const FOOTER_ROWS = [
  [TYPE.STATUS, '異常の有無（なし／あり）'],
  [TYPE.DETAIL, '異常内容・対応（「あり」の場合に記入）'],
  [TYPE.PERSON, '実施者（名前）'],
];
const FOOTER_TYPES = FOOTER_ROWS.map(([t]) => t);
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const DATE_COL_WIDTH = 72;
const DETAIL_ROW_HEIGHT = 54;
const COLOR = {
  headerBg: '#434343',
  headerFont: '#ffffff',
  saturday: '#c9daf8',
  blockBg: '#cfe2f3',
  anomalyLabel: '#f4cccc',
  personLabel: '#efefef',
  border: '#cccccc',
  today: '#fff2cc',
  todayHeader: '#ffd966',
  overdue: '#fce5cd',
  anomaly: '#ea9999',
  anomalyText: '#fce8e6',
  done: '#93c47d',
};

// ===== メニュー =====
function onOpen() {
  SpreadsheetApp.getUi().createMenu('チェックリスト')
    .addItem('今日の列へ移動', 'goToToday')
    .addSeparator()
    .addItem('チェック項目を追加（選択した区分に）', 'addItem')
    .addItem('チェック区分を追加', 'addBlock')
    .addItem('部署シートを追加', 'addDepartmentSheet')
    .addSeparator()
    .addItem('翌月分の日付を追加', 'addNextMonth')
    .addItem('翌月分を毎月自動で追加する', 'installMonthlyTrigger')
    .addSeparator()
    .addItem('初期セットアップ（シートを作り直す）', 'setupChecklist')
    .addToUi();
}

function setupChecklist() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const names = Object.keys(CONFIG.departments);
  const existing = names.filter(n => ss.getSheetByName(n));
  if (existing.length) {
    const res = ui.alert('確認',
      `「${existing.join('」「')}」シートを作り直します。\n入力済みのチェック内容は消えます。よろしいですか？`,
      ui.ButtonSet.YES_NO);
    if (res !== ui.Button.YES) return;
  }
  let days = [];
  for (let i = 0; i < CONFIG.initialMonths; i++) {
    days = days.concat(workdaysOfMonth(CONFIG.startYear, CONFIG.startMonth - 1 + i));
  }
  names.forEach(name => buildSheet(ss, name, CONFIG.departments[name], days));
  ['シート1', 'Sheet1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  ss.setActiveSheet(ss.getSheetByName(names[0]));
  ui.alert('セットアップが完了しました。');
}

function goToToday() {
  const sheet = getActiveChecklistSheet();
  if (!sheet) return;
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  const last = lastDateCol(sheet);
  const dates = last < COL.firstDate ? []
    : sheet.getRange(ROW.date, COL.firstDate, 1, last - COL.firstDate + 1).getValues()[0];
  // 今日が休みの日なら次の出勤日へ
  const idx = dates.findIndex(v => v instanceof Date && Utilities.formatDate(v, tz, 'yyyy-MM-dd') >= today);
  if (idx < 0) {
    SpreadsheetApp.getUi().alert('今日以降の日付がありません。「翌月分の日付を追加」を実行してください。');
    return;
  }
  sheet.setActiveRange(sheet.getRange(ROW.firstData, COL.firstDate + idx));
}

function addItem() {
  const ui = SpreadsheetApp.getUi();
  const sheet = getActiveChecklistSheet();
  if (!sheet) return;
  const types = readRowTypes(sheet);
  const typeAt = r => types[r - ROW.firstData] || '';
  let row = sheet.getActiveCell().getRow();
  if (!typeAt(row)) {
    ui.alert('項目を追加したい区分の中の行（チェック項目など）を選択してから実行してください。');
    return;
  }
  // 異常欄・実施者欄を選んでいたら、その区分の最後のチェック項目の下に追加する
  while (row > ROW.firstData && FOOTER_TYPES.includes(typeAt(row))) row--;
  const res = ui.prompt('チェック項目を追加', 'チェック項目の内容を入力してください', ui.ButtonSet.OK_CANCEL);
  const text = res.getResponseText().trim();
  if (res.getSelectedButton() !== ui.Button.OK || !text) return;

  sheet.insertRowAfter(row);
  const newRow = row + 1;
  sheet.getRange(newRow, 1, 1, sheet.getMaxColumns()).clearFormat().clearDataValidations();
  sheet.getRange(newRow, COL.type, 1, 3).setValues([[TYPE.ITEM, '', text]]);
  formatLabelCells(sheet, newRow, TYPE.ITEM);
  const n = lastDateCol(sheet) - COL.firstDate + 1;
  if (n > 0) formatDateCells(sheet, newRow, TYPE.ITEM, COL.firstDate, n);
  renumberBlock(sheet, newRow);
  sheet.setActiveRange(sheet.getRange(newRow, COL.label));
}

function addBlock() {
  const ui = SpreadsheetApp.getUi();
  const sheet = getActiveChecklistSheet();
  if (!sheet) return;
  const r1 = ui.prompt('チェック区分を追加', '区分名を入力してください（例：売上照合、出荷前チェック）', ui.ButtonSet.OK_CANCEL);
  const name = r1.getResponseText().trim();
  if (r1.getSelectedButton() !== ui.Button.OK || !name) return;
  const r2 = ui.prompt('チェック項目',
    'チェック項目を「／」区切りで入力してください。\n空欄のままOKにすると、入力用の空き行を3行用意します。',
    ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const items = r2.getResponseText().split(/[／/]/).map(s => s.trim()).filter(Boolean);
  const row = appendBlock(sheet, name, items);
  applyConditionalFormats(sheet);
  sheet.setActiveRange(sheet.getRange(row + 1, COL.label));
}

function addDepartmentSheet() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt('部署シートを追加', '部署名を入力してください（例：営業）', ui.ButtonSet.OK_CANCEL);
  const name = res.getResponseText().trim();
  if (res.getSelectedButton() !== ui.Button.OK || !name) return;
  if (ss.getSheetByName(name)) {
    ui.alert(`「${name}」シートは既にあります。`);
    return;
  }
  // 既存のチェックリストと同じ期間の日付で作る
  const ref = checklistSheets()[0];
  let days = [];
  if (ref && lastDateCol(ref) >= COL.firstDate) {
    let { y, m } = monthOf(ref.getRange(ROW.date, COL.firstDate).getValue());
    const to = monthOf(ref.getRange(ROW.date, lastDateCol(ref)).getValue());
    while (y * 12 + m <= to.y * 12 + to.m) {
      days = days.concat(workdaysOfMonth(y, m - 1));
      if (++m > 12) { m = 1; y++; }
    }
  } else {
    for (let i = 0; i < CONFIG.initialMonths; i++) {
      days = days.concat(workdaysOfMonth(CONFIG.startYear, CONFIG.startMonth - 1 + i));
    }
  }
  ss.setActiveSheet(buildSheet(ss, name, [], days));
}

function addNextMonth() {
  const sheets = checklistSheets();
  if (!sheets.length) {
    SpreadsheetApp.getUi().alert('チェックリストのシートがありません。先に「初期セットアップ」を実行してください。');
    return;
  }
  sheets.forEach(appendMonth);
  SpreadsheetApp.getUi().alert('全シートに翌月分の日付を追加しました。');
}

function installMonthlyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoExtendMonths')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoExtendMonths').timeBased().onMonthDay(20).atHour(6).create();
  SpreadsheetApp.getUi().alert('毎月20日の朝に、翌月分の日付がまだ無ければ自動で追加するよう設定しました。');
}

// 時間主導トリガーから呼ばれる（UI は使わない）
function autoExtendMonths() {
  const cur = monthOf(new Date());
  const target = cur.y * 12 + cur.m + 1; // 翌月
  checklistSheets().forEach(sheet => {
    for (let guard = 0; guard < 24; guard++) {
      const last = lastDateCol(sheet);
      if (last >= COL.firstDate) {
        const lm = monthOf(sheet.getRange(ROW.date, last).getValue());
        if (lm.y * 12 + lm.m >= target) break;
      }
      appendMonth(sheet);
    }
  });
}

// ===== シート作成 =====
function buildSheet(ss, name, blocks, days) {
  const old = ss.getSheetByName(name);
  const sheet = old ? ss.insertSheet(name + '_new', old.getIndex() - 1) : ss.insertSheet(name, ss.getNumSheets());
  if (old) {
    ss.deleteSheet(old);
    sheet.setName(name);
  }

  sheet.getRange(ROW.title, COL.type).setValue(MARKER);
  sheet.getRange(ROW.title, COL.no).setValue(`${name} ルーティンチェックリスト`).setFontSize(14).setFontWeight('bold');
  sheet.getRange(ROW.title, COL.firstDate)
    .setValue('凡例： 黄＝今日 ／ オレンジ＝チェック漏れ ／ 赤＝異常あり ／ 青＝出勤土曜（毎月最終土曜）')
    .setFontColor('#666666');
  sheet.getRange(ROW.month, COL.label, 4, 1).setValues([['年月'], ['日付'], ['曜日'], ['達成率']]);
  sheet.getRange(ROW.month, COL.no, 4, 2)
    .setBackground(COLOR.headerBg).setFontColor(COLOR.headerFont).setFontWeight('bold');
  sheet.setColumnWidth(COL.no, 40);
  sheet.setColumnWidth(COL.label, 340);
  sheet.hideColumns(COL.type);
  sheet.setFrozenRows(ROW.rate);
  sheet.setFrozenColumns(COL.label);

  writeDateColumns(sheet, days, COL.firstDate);
  const last = lastDateCol(sheet);
  if (last >= COL.firstDate && sheet.getMaxColumns() > last) {
    sheet.deleteColumns(last + 1, sheet.getMaxColumns() - last);
  }

  if (blocks.length) {
    blocks.forEach(b => appendBlock(sheet, b.name, b.items));
  } else {
    sheet.getRange(ROW.firstData, COL.type, 1, 3)
      .setValues([[TYPE.NOTE, '', '※ メニュー「チェックリスト」→「チェック区分を追加」から項目を追加してください']]);
    sheet.getRange(ROW.firstData, COL.label).setFontColor('#999999');
  }
  applyConditionalFormats(sheet);
  return sheet;
}

// 区分（見出し＋チェック項目＋異常欄＋実施者欄）を一番下に追加し、見出しの行番号を返す
function appendBlock(sheet, name, items) {
  let start;
  if (sheet.getRange(ROW.firstData, COL.type).getValue() === TYPE.NOTE) {
    sheet.getRange(ROW.firstData, COL.type, 1, 3).clearContent().setFontColor('#000000');
    start = ROW.firstData;
  } else {
    const last = sheet.getLastRow();
    start = last < ROW.firstData ? ROW.firstData : last + 2; // 区分の間は1行あける
  }
  const list = items.length ? items : ['（チェック項目を入力）', '（チェック項目を入力）', '（チェック項目を入力）'];
  const rows = [[TYPE.HEADER, `■ ${name}`, '']]
    .concat(list.map((text, i) => [TYPE.ITEM, i + 1, text]))
    .concat(FOOTER_ROWS.map(([type, label]) => [type, '', label]));
  const need = start + rows.length - 1;
  if (sheet.getMaxRows() < need) sheet.insertRowsAfter(sheet.getMaxRows(), need - sheet.getMaxRows());
  sheet.getRange(start, COL.type, rows.length, 3).setValues(rows);

  const n = lastDateCol(sheet) - COL.firstDate + 1;
  rows.forEach(([type], k) => {
    formatLabelCells(sheet, start + k, type);
    if (n > 0) formatDateCells(sheet, start + k, type, COL.firstDate, n);
    if (type === TYPE.DETAIL) sheet.setRowHeight(start + k, DETAIL_ROW_HEIGHT);
  });
  return start;
}

function appendMonth(sheet) {
  const last = lastDateCol(sheet);
  let y = CONFIG.startYear;
  let m = CONFIG.startMonth;
  if (last >= COL.firstDate) {
    ({ y, m } = monthOf(sheet.getRange(ROW.date, last).getValue()));
    if (++m > 12) { m = 1; y++; }
  }
  writeDateColumns(sheet, workdaysOfMonth(y, m - 1), last + 1);
  applyConditionalFormats(sheet);
}

// 日付の見出し（年月・日付・曜日・達成率）を書き、既存の行にも書式を付ける
function writeDateColumns(sheet, days, startCol) {
  const n = days.length;
  if (!n) return;
  const endCol = startCol + n - 1;
  if (sheet.getMaxColumns() < endCol) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), endCol - sheet.getMaxColumns());
  }

  const f = ROW.firstData;
  const dates = days.map(x => `=DATE(${x.y},${x.m},${x.d})`);
  const dows = days.map(x => (x.dow === 6 ? '土(出勤)' : DOW[x.dow]));
  const rates = days.map((x, i) => {
    const c = colLetter(startCol + i);
    // 未来の日は空欄
    return `=IF(${c}$${ROW.date}>TODAY(),"",IFERROR(COUNTIF(${c}${f}:${c},TRUE)/(COUNTIF(${c}${f}:${c},TRUE)+COUNTIF(${c}${f}:${c},FALSE)),""))`;
  });
  sheet.getRange(ROW.month, startCol, 4, n)
    .setBackground(COLOR.headerBg).setFontColor(COLOR.headerFont)
    .setFontWeight('bold').setHorizontalAlignment('center');
  sheet.getRange(ROW.date, startCol, 1, n).setFormulas([dates]).setNumberFormat('m/d');
  sheet.getRange(ROW.dow, startCol, 1, n).setValues([dows]);
  sheet.getRange(ROW.rate, startCol, 1, n).setFormulas([rates]).setNumberFormat('0%');
  sheet.setColumnWidths(startCol, n, DATE_COL_WIDTH);

  for (let i = 0; i < n;) {
    let j = i;
    while (j + 1 < n && days[j + 1].y === days[i].y && days[j + 1].m === days[i].m) j++;
    sheet.getRange(ROW.month, startCol + i).setValue(`${days[i].y}年${days[i].m}月`);
    sheet.getRange(ROW.month, startCol + i, 1, j - i + 1).merge();
    sheet.getRange(ROW.month, startCol + i, 4, 1)
      .setBorder(null, true, null, null, null, null, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    i = j + 1;
  }
  days.forEach((x, i) => {
    if (x.dow === 6) sheet.getRange(ROW.date, startCol + i, 2, 1).setBackground(COLOR.saturday).setFontColor('#000000');
  });

  readRowTypes(sheet).forEach((type, k) => {
    if (type) formatDateCells(sheet, ROW.firstData + k, type, startCol, n);
  });
}

function formatLabelCells(sheet, row, type) {
  const rng = sheet.getRange(row, COL.no, 1, 2);
  rng.setBorder(true, true, true, true, true, null, COLOR.border, SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment('middle');
  sheet.getRange(row, COL.no).setHorizontalAlignment('center');
  sheet.getRange(row, COL.label).setWrap(true);
  if (type === TYPE.HEADER) {
    rng.merge().setBackground(COLOR.blockBg).setFontWeight('bold').setHorizontalAlignment('left');
  } else if (type === TYPE.STATUS || type === TYPE.DETAIL) {
    rng.setBackground(COLOR.anomalyLabel).setFontWeight('bold');
  } else if (type === TYPE.PERSON) {
    rng.setBackground(COLOR.personLabel);
  }
}

function formatDateCells(sheet, row, type, col, n) {
  const rng = sheet.getRange(row, col, 1, n);
  rng.setBorder(true, true, true, true, true, null, COLOR.border, SpreadsheetApp.BorderStyle.SOLID);
  switch (type) {
    case TYPE.HEADER:
      rng.setBackground(COLOR.blockBg);
      break;
    case TYPE.ITEM:
      rng.insertCheckboxes().setHorizontalAlignment('center');
      break;
    case TYPE.STATUS:
      rng.setDataValidation(SpreadsheetApp.newDataValidation()
        .requireValueInList(['なし', 'あり'], true).setAllowInvalid(false).build())
        .setHorizontalAlignment('center');
      break;
    case TYPE.DETAIL:
      rng.setWrap(true).setVerticalAlignment('top').setFontSize(9);
      break;
    case TYPE.PERSON:
      rng.setHorizontalAlignment('center').setFontSize(9);
      break;
  }
}

function applyConditionalFormats(sheet) {
  const width = sheet.getMaxColumns() - COL.firstDate + 1;
  if (width < 1) return;
  const f = ROW.firstData;
  const d = ROW.date;
  const c = colLetter(COL.firstDate);
  const body = sheet.getRange(f, COL.firstDate, sheet.getMaxRows() - f + 1, width);
  const header = sheet.getRange(ROW.date, COL.firstDate, 3, width);
  const rate = sheet.getRange(ROW.rate, COL.firstDate, 1, width);
  const rule = () => SpreadsheetApp.newConditionalFormatRule();
  sheet.setConditionalFormatRules([
    // 異常あり
    rule().whenFormulaSatisfied(`=AND($A${f}="${TYPE.STATUS}",${c}${f}="あり")`)
      .setBackground(COLOR.anomaly).setFontColor('#990000').setBold(true).setRanges([body]).build(),
    rule().whenFormulaSatisfied(`=AND($A${f}="${TYPE.DETAIL}",${c}${f}<>"")`)
      .setBackground(COLOR.anomalyText).setRanges([body]).build(),
    // 過去日のチェック漏れ・異常の有無の未記入
    rule().whenFormulaSatisfied(
      `=AND(${c}$${d}<>"",${c}$${d}<TODAY(),OR(AND(ISLOGICAL(${c}${f}),${c}${f}=FALSE),AND($A${f}="${TYPE.STATUS}",${c}${f}="")))`)
      .setBackground(COLOR.overdue).setRanges([body]).build(),
    // 今日の列
    rule().whenFormulaSatisfied(`=${c}$${d}=TODAY()`)
      .setBackground(COLOR.today).setRanges([body]).build(),
    // 達成率100%
    rule().whenFormulaSatisfied(`=AND(ISNUMBER(${c}${ROW.rate}),${c}${ROW.rate}>=1)`)
      .setBackground(COLOR.done).setRanges([rate]).build(),
    rule().whenFormulaSatisfied(`=${c}$${d}=TODAY()`)
      .setBackground(COLOR.todayHeader).setFontColor('#000000').setRanges([header]).build(),
  ]);
}

// ===== ユーティリティ =====

// 出勤日（月〜金＋その月の最終土曜日）。monthIndex は 0 始まり（12 以上なら翌年へ繰り上がる）
function workdaysOfMonth(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const y = first.getFullYear();
  const m = first.getMonth();
  const lastDay = new Date(y, m + 1, 0).getDate();
  let lastSat = lastDay;
  while (new Date(y, m, lastSat).getDay() !== 6) lastSat--;
  const days = [];
  for (let d = 1; d <= lastDay; d++) {
    const dow = new Date(y, m, d).getDay();
    if ((dow >= 1 && dow <= 5) || d === lastSat) days.push({ y, m: m + 1, d, dow });
  }
  return days;
}

// 各データ行の種類。種類が空でも項目名があれば（手動で挿入した行）チェック項目として扱う
function readRowTypes(sheet) {
  const last = sheet.getLastRow();
  if (last < ROW.firstData) return [];
  return sheet.getRange(ROW.firstData, COL.type, last - ROW.firstData + 1, COL.label).getValues()
    .map(([type, , label]) => {
      if (type === TYPE.NOTE) return '';
      if (type) return type;
      return label !== '' ? TYPE.ITEM : '';
    });
}

function renumberBlock(sheet, row) {
  const types = readRowTypes(sheet);
  const typeAt = r => types[r - ROW.firstData] || '';
  let r = row;
  while (r > ROW.firstData && typeAt(r - 1) === TYPE.ITEM) r--;
  for (let no = 1; typeAt(r) === TYPE.ITEM; r++, no++) sheet.getRange(r, COL.no).setValue(no);
}

function lastDateCol(sheet) {
  const last = sheet.getLastColumn();
  if (last < COL.firstDate) return COL.firstDate - 1;
  const vals = sheet.getRange(ROW.date, COL.firstDate, 1, last - COL.firstDate + 1).getValues()[0];
  for (let i = vals.length - 1; i >= 0; i--) {
    if (vals[i] !== '') return COL.firstDate + i;
  }
  return COL.firstDate - 1;
}

function monthOf(date) {
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  const [y, m] = Utilities.formatDate(date, tz, 'yyyy-M').split('-').map(Number);
  return { y, m };
}

function isChecklistSheet(sheet) {
  return sheet.getRange(ROW.title, COL.type).getValue() === MARKER;
}

function checklistSheets() {
  return SpreadsheetApp.getActive().getSheets().filter(isChecklistSheet);
}

function getActiveChecklistSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (isChecklistSheet(sheet)) return sheet;
  SpreadsheetApp.getUi().alert('チェックリストのシート（経理・物流など）を開いてから実行してください。');
  return null;
}

function colLetter(col) {
  let s = '';
  for (let c = col; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
  return s;
}
