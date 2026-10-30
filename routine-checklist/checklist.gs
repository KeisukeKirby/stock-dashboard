/**
 * ルーティンワーク定着チェックリスト（Google スプレッドシート用 Apps Script）
 *
 * - チェックリストのシート（経理／オフィス倉庫／ゴミ・掃除当番）：日付が横に並ぶ（平日＋毎月の最終土曜日）
 *   項目ごとに頻度（毎日・毎週月曜・毎月最終営業日・毎月初5営業日以内）があり、対象外の日はグレー
 * - 記録シート（返金記録／在庫差異記録／店舗補充／オンライン発送）：1件1行の表
 * - 言語切り替え（日本語／English／ไทย）：各シート左上のプルダウン、またはメニューから
 *   訳語は「翻訳」シートで直せる
 *
 * 使い方は README.md を参照。
 */

// ===== 設定 =====
const CONFIG = {
  startYear: 2026,
  startMonth: 11,   // 開始月（1〜12）
  initialMonths: 3, // 初期セットアップで作る月数（以降はメニューから1か月ずつ追加）
};

// ゴミ・掃除当番（出勤日ごとにこの順で交代）
const STAFF = ['Pong', 'Ying', 'Nut', 'Nee', 'Hoshino'];

const STORES = ['K Village', 'Central CL (Department)', 'Siam Discovery', 'Paradise Park', 'Central LP', 'Event Asok'];

const FREQ = { DAILY: 'daily', WEEKLY: 'weekly', MONTH_END: 'monthEnd', MONTH_START5: 'monthStart5' };
const FREQ_LABEL = {
  daily: ['毎日', 'Daily', 'ทุกวัน'],
  weekly: ['毎週月曜', 'Every Monday', 'ทุกวันจันทร์'],
  monthEnd: ['毎月最終営業日', 'Last business day of the month', 'วันทำการสุดท้ายของเดือน'],
  monthStart5: ['毎月初5営業日以内', 'Within the first 5 business days of the month', 'ภายใน 5 วันทำการแรกของเดือน'],
};
const FREQ_ORDER = [FREQ.DAILY, FREQ.WEEKLY, FREQ.MONTH_END, FREQ.MONTH_START5];
const WINDOW_DAYS = 5; // 月初○営業日以内

// 区分の行。文字列はチェック項目、配列は [行の種類, 見出し]
const ANOMALY = [['status', '異常の有無（なし／あり）'], ['detail', '異常内容・対応（「あり」の場合に記入）']];
const PERSON = ['person', '実施者（名前）'];
const DUTY = ['duty', '当番（交代するときは名前を変更）'];

const CHECKLISTS = [
  {
    name: '経理',
    blocks: [
      {
        name: '売上照合', freq: FREQ.DAILY, rows: [
          '前営業日分の売上データを販売管理システムから出力した',
          '売上データと請求書・納品書の件数・金額が一致している',
          '売上データと入金額（現金・振込・カード・EC決済）が一致している',
          '返品・値引き・キャンセルが正しく反映されている',
          '会計ソフトの売上計上額と販売管理システムの売上が一致している',
          ...ANOMALY, PERSON,
        ],
      },
      {
        name: '返金案件の確認', freq: FREQ.DAILY, rows: [
          '返金案件の有無を確認した（発生・処理があれば「返金記録」シートに日付を記入）',
          PERSON,
        ],
      },
      {
        name: '月次レポートの提出', freq: FREQ.MONTH_START5, rows: [
          '月次レポートを提出した',
          PERSON,
        ],
      },
      {
        name: '在庫報告の照合', freq: FREQ.MONTH_END, rows: [
          'PCの在庫報告を確認した',
          'オフィス管理の在庫表と照合した',
          ['status', '差異の有無（なし／あり）'],
          ['detail', '差異の内容（商品ごとの詳細は「在庫差異記録」シートに記入）'],
          PERSON,
        ],
      },
      {
        name: '店舗送付分の在庫更新確認', freq: FREQ.WEEKLY, rows: [
          '先週オフィスから店舗へ送った商品のシステム在庫が更新済みか確認した（「店舗補充」シート参照）',
          PERSON,
        ],
      },
    ],
  },
  {
    name: 'オフィス倉庫',
    blocks: [
      {
        name: '発送完了', freq: FREQ.DAILY, rows: [
          '14時の発送締め切り後、当日分の発送がすべて完了した',
          PERSON,
        ],
      },
      {
        name: '店舗在庫・補充の確認', freq: FREQ.WEEKLY, rows: [
          '店舗の在庫・販売状況を確認した',
          '補充が必要な商品を確認し、手配した（送った商品は「店舗補充」シートに記入）',
          PERSON,
        ],
      },
      {
        name: 'オンライン発送分の店舗在庫調整', freq: FREQ.WEEKLY, rows: [
          '週末のオンライン発送分の店舗在庫を調整した（「オンライン発送」シート参照。発送がなかった週は確認のみ）',
          PERSON,
        ],
      },
    ],
  },
  {
    name: 'ゴミ・掃除当番', title: 'ゴミ・掃除当番表',
    blocks: [
      {
        name: 'ゴミ出し・掃除', freq: FREQ.DAILY, rows: [
          DUTY,
          'ゴミを出した',
          '掃除をした',
        ],
      },
    ],
  },
];

// 記録シート。columns: [見出し, 種類, 幅, (list の選択肢)]。pending: オレンジにする条件（未処理の行）
const LOGS = [
  {
    name: '返金記録', after: '経理',
    note: '返金案件が発生したら1行追加して発生日を記入し、返金を処理したら処理日を記入してください（処理日が空欄の行はオレンジ＝未処理）',
    columns: [
      ['発生日', 'date', 100], ['処理日', 'date', 100], ['注文番号・伝票番号', 'text', 150], ['顧客名', 'text', 130],
      ['店舗・販売チャネル', 'store', 170], ['商品', 'text', 200], ['返金額', 'number', 90],
      ['返金方法', 'list', 130, ['現金', '銀行振込', 'カード返金', 'オンライン決済', 'その他']],
      ['理由', 'text', 200], ['担当者', 'text', 110], ['備考', 'text', 200],
    ],
    pending: { col: 2, when: 'blank' },
  },
  {
    name: '在庫差異記録', after: '返金記録',
    note: '毎月最終営業日の在庫照合で差異があった商品を1行ずつ記入してください（「対応完了」にチェックがない行はオレンジ）',
    columns: [
      ['照合日', 'date', 100], ['商品コード', 'text', 150], ['モデル', 'text', 150], ['カラー', 'text', 110], ['サイズ', 'text', 70],
      ['PC在庫数', 'number', 90], ['在庫表の数', 'number', 100], ['差異', 'diff', 80],
      ['原因', 'text', 200], ['対応・修正内容', 'text', 200], ['確認者', 'text', 110], ['対応完了', 'check', 90],
    ],
    pending: { col: 12, when: 'unchecked' },
  },
  {
    name: '店舗補充', after: 'オフィス倉庫',
    note: 'オフィスから店舗へ商品を送ったら1行ずつ記入し、システムの在庫を更新したらチェックしてください（未チェックの行はオレンジ）',
    columns: [
      ['送付日', 'date', 100], ['送付先店舗', 'store', 170], ['商品コード', 'text', 150], ['モデル', 'text', 150],
      ['カラー', 'text', 110], ['サイズ', 'text', 70], ['数量', 'number', 70], ['送付者', 'text', 110],
      ['システム在庫更新済', 'check', 130], ['備考', 'text', 200],
    ],
    pending: { col: 9, when: 'unchecked' },
  },
  {
    name: 'オンライン発送', after: '店舗補充',
    note: '週末に店舗からオンライン注文の商品を発送したら1行ずつ記入し、月曜に店舗在庫を調整したらチェックしてください（未チェックの行はオレンジ）',
    columns: [
      ['発送日', 'date', 100], ['発送元店舗', 'store', 170], ['注文番号', 'text', 130], ['商品コード', 'text', 150],
      ['モデル', 'text', 150], ['カラー', 'text', 110], ['サイズ', 'text', 70], ['数量', 'number', 70],
      ['店舗在庫調整済', 'check', 120], ['担当者', 'text', 110], ['備考', 'text', 200],
    ],
    pending: { col: 9, when: 'unchecked' },
  },
];
const LOG_ROWS = 1000; // 記録シートであらかじめ書式を付けておく行数

// ===== 翻訳（日本語: [English, ไทย]）。初期セットアップで「翻訳」シートに書き出し、以降はそちらを使う =====
const LANGS = [
  { code: 'ja', label: '日本語' },
  { code: 'en', label: 'English' },
  { code: 'th', label: 'ภาษาไทย' },
];
const TITLE_TEMPLATE = [n => `${n} ルーティンチェックリスト`, n => `${n} Routine Checklist`, n => `เช็กลิสต์งานประจำ ${n}`];
const TEXT = {
  // シート名
  '経理': ['Accounting', 'บัญชี'],
  'オフィス倉庫': ['Office Warehouse', 'คลังสินค้าสำนักงาน'],
  '返金記録': ['Refund Log', 'บันทึกการคืนเงิน'],
  '在庫差異記録': ['Stock Discrepancy Log', 'บันทึกสต็อกไม่ตรง'],
  '店舗補充': ['Store Restock', 'เติมสินค้าสาขา'],
  'オンライン発送': ['Online Shipping', 'ส่งสินค้าออนไลน์'],
  'ゴミ・掃除当番': ['Trash & Cleaning Duty', 'เวรทิ้งขยะและทำความสะอาด'],
  'ゴミ・掃除当番表': ['Trash & Cleaning Duty Roster', 'ตารางเวรทิ้งขยะและทำความสะอาด'],
  // 見出し
  '年月': ['Month', 'เดือน'],
  '日付': ['Date', 'วันที่'],
  '曜日': ['Day', 'วัน'],
  '達成率': ['Done (%)', 'ทำเสร็จ (%)'],
  '凡例： 黄＝今日 ／ オレンジ＝チェック漏れ ／ 赤＝異常あり ／ 青＝出勤土曜（毎月最終土曜） ／ グレー（－）＝その日は対象外': [
    'Legend: Yellow = today / Orange = missed / Red = problem found / Blue = working Saturday (last Saturday of the month) / Gray (－) = not required that day',
    'สัญลักษณ์สี: เหลือง = วันนี้ / ส้ม = ยังไม่ได้ทำ / แดง = พบปัญหา / ฟ้า = วันเสาร์ที่ต้องทำงาน (เสาร์สุดท้ายของเดือน) / เทา (－) = วันนั้นไม่ต้องทำ'],
  '月': ['Mon', 'จ.'],
  '火': ['Tue', 'อ.'],
  '水': ['Wed', 'พ.'],
  '木': ['Thu', 'พฤ.'],
  '金': ['Fri', 'ศ.'],
  '土(出勤)': ['Sat (work)', 'ส. (ทำงาน)'],
  // 区分
  '売上照合': ['Sales Reconciliation', 'ตรวจสอบยอดขาย'],
  '返金案件の確認': ['Refund Check', 'ตรวจสอบรายการคืนเงิน'],
  '月次レポートの提出': ['Monthly Report Submission', 'ส่งรายงานประจำเดือน'],
  '在庫報告の照合': ['Stock Report Check', 'ตรวจสอบรายงานสต็อก'],
  '店舗送付分の在庫更新確認': ['Stock Update Check for Items Sent to Stores', 'ตรวจสอบการอัปเดตสต็อกของสินค้าที่ส่งไปสาขา'],
  '発送完了': ['Shipping Completed', 'ส่งสินค้าเสร็จ'],
  '店舗在庫・補充の確認': ['Store Stock & Restock Check', 'ตรวจสอบสต็อกสาขาและการเติมสินค้า'],
  'オンライン発送分の店舗在庫調整': ['Store Stock Adjustment for Online Orders', 'ปรับสต็อกสาขาสำหรับออเดอร์ออนไลน์'],
  'ゴミ出し・掃除': ['Trash & Cleaning', 'ทิ้งขยะและทำความสะอาด'],
  // チェック項目
  '前営業日分の売上データを販売管理システムから出力した': [
    "Exported the previous business day's sales data from the sales system",
    'ดึงข้อมูลยอดขายของวันทำการก่อนหน้าจากระบบขายแล้ว'],
  '売上データと請求書・納品書の件数・金額が一致している': [
    'Sales data matches the invoices and delivery notes (number of items and amount)',
    'ข้อมูลยอดขายตรงกับใบแจ้งหนี้และใบส่งของ (จำนวนรายการและยอดเงิน)'],
  '売上データと入金額（現金・振込・カード・EC決済）が一致している': [
    'Sales data matches the payments received (cash, bank transfer, card, online payment)',
    'ข้อมูลยอดขายตรงกับยอดเงินที่ได้รับ (เงินสด เงินโอน บัตร ชำระเงินออนไลน์)'],
  '返品・値引き・キャンセルが正しく反映されている': [
    'Returns, discounts and cancellations are recorded correctly',
    'บันทึกการคืนสินค้า ส่วนลด และการยกเลิกถูกต้องแล้ว'],
  '会計ソフトの売上計上額と販売管理システムの売上が一致している': [
    'Sales in the accounting software match the sales system',
    'ยอดขายในโปรแกรมบัญชีตรงกับระบบขาย'],
  '返金案件の有無を確認した（発生・処理があれば「返金記録」シートに日付を記入）': [
    'Checked for refunds (if a refund was requested or paid, entered the date in the "Refund Log" sheet)',
    'ตรวจสอบว่ามีรายการคืนเงินหรือไม่ (ถ้ามีรายการใหม่หรือคืนเงินแล้ว ให้ลงวันที่ในชีต "บันทึกการคืนเงิน")'],
  '月次レポートを提出した': ['Submitted the monthly report', 'ส่งรายงานประจำเดือนแล้ว'],
  'PCの在庫報告を確認した': ['Checked the stock report on the PC', 'ตรวจสอบรายงานสต็อกในคอมพิวเตอร์แล้ว'],
  'オフィス管理の在庫表と照合した': [
    "Compared it with the office's stock sheet",
    'เทียบกับตารางสต็อกที่ออฟฟิศดูแลแล้ว'],
  '差異の有無（なし／あり）': ['Any discrepancy? (No / Yes)', 'มียอดไม่ตรงกันหรือไม่ (ไม่มี / มี)'],
  '差異の内容（商品ごとの詳細は「在庫差異記録」シートに記入）': [
    'Discrepancy details (enter details for each item in the "Stock Discrepancy Log" sheet)',
    'รายละเอียดยอดที่ไม่ตรง (รายละเอียดแต่ละสินค้าให้กรอกในชีต "บันทึกสต็อกไม่ตรง")'],
  '先週オフィスから店舗へ送った商品のシステム在庫が更新済みか確認した（「店舗補充」シート参照）': [
    'Checked that the system stock was updated for items sent from the office to stores last week (see the "Store Restock" sheet)',
    'ตรวจสอบว่าอัปเดตสต็อกในระบบแล้ว สำหรับสินค้าที่ส่งจากออฟฟิศไปสาขาเมื่อสัปดาห์ที่แล้ว (ดูชีต "เติมสินค้าสาขา")'],
  '14時の発送締め切り後、当日分の発送がすべて完了した': [
    "After the 2:00 PM shipping cutoff, all of today's orders have been shipped",
    'หลังปิดรอบส่งสินค้าเวลา 14:00 น. ส่งสินค้าของวันนี้ครบทั้งหมดแล้ว'],
  '店舗の在庫・販売状況を確認した': ['Checked stock and sales at each store', 'ตรวจสอบสต็อกและยอดขายของแต่ละสาขาแล้ว'],
  '補充が必要な商品を確認し、手配した（送った商品は「店舗補充」シートに記入）': [
    'Checked which items need restocking and arranged delivery (enter the items sent in the "Store Restock" sheet)',
    'ตรวจสอบสินค้าที่ต้องเติมและจัดส่งแล้ว (สินค้าที่ส่งไปให้กรอกในชีต "เติมสินค้าสาขา")'],
  '週末のオンライン発送分の店舗在庫を調整した（「オンライン発送」シート参照。発送がなかった週は確認のみ）': [
    'Adjusted store stock for items shipped to online customers over the weekend (see the "Online Shipping" sheet; if nothing was shipped, just confirm)',
    'ปรับสต็อกสาขาสำหรับสินค้าที่ส่งให้ลูกค้าออนไลน์ช่วงเสาร์-อาทิตย์แล้ว (ดูชีต "ส่งสินค้าออนไลน์" ถ้าไม่มีการส่ง ให้ตรวจสอบอย่างเดียว)'],
  '当番（交代するときは名前を変更）': ['On duty (change the name if you swap)', 'ผู้อยู่เวร (ถ้าสลับเวร ให้เปลี่ยนชื่อ)'],
  'ゴミを出した': ['Took out the trash', 'ทิ้งขยะเรียบร้อยแล้ว'],
  '掃除をした': ['Did the cleaning', 'ทำความสะอาดเรียบร้อยแล้ว'],
  // 共通の行・選択肢
  '異常の有無（なし／あり）': ['Any problems? (No / Yes)', 'พบปัญหาหรือไม่ (ไม่มี / มี)'],
  '異常内容・対応（「あり」の場合に記入）': ['Problem details & action taken (fill in if "Yes")', 'รายละเอียดปัญหาและการแก้ไข (กรอกเมื่อเลือก "มี")'],
  '実施者（名前）': ['Done by (name)', 'ผู้ทำ (ชื่อ)'],
  'なし': ['No', 'ไม่มี'],
  'あり': ['Yes', 'มี'],
  '（チェック項目を入力）': ['(Enter a check item)', '(กรอกรายการตรวจสอบ)'],
  '※ メニュー「✅ Checklist」→「チェック区分を追加」から項目を追加してください': [
    '* Add items from the menu "✅ Checklist" → "Add check section"',
    '* เพิ่มรายการได้จากเมนู "✅ Checklist" → "เพิ่มหมวดเช็กลิสต์"'],
  // 記録シートの説明
  '返金案件が発生したら1行追加して発生日を記入し、返金を処理したら処理日を記入してください（処理日が空欄の行はオレンジ＝未処理）': [
    'When a refund is requested, add a row and enter the request date. When the refund is paid, enter the processed date. (Orange rows = not paid yet)',
    'เมื่อมีรายการคืนเงิน ให้เพิ่ม 1 แถวและกรอกวันที่เกิดรายการ เมื่อคืนเงินแล้วให้กรอกวันที่คืนเงิน (แถวสีส้ม = ยังไม่ได้คืนเงิน)'],
  '毎月最終営業日の在庫照合で差異があった商品を1行ずつ記入してください（「対応完了」にチェックがない行はオレンジ）': [
    'Enter one row for each item with a discrepancy found in the month-end stock check. (Orange rows = not resolved yet)',
    'กรอกสินค้าที่ยอดไม่ตรงจากการตรวจสต็อกวันทำการสุดท้ายของเดือน แถวละ 1 รายการ (แถวสีส้ม = ยังแก้ไขไม่เสร็จ)'],
  'オフィスから店舗へ商品を送ったら1行ずつ記入し、システムの在庫を更新したらチェックしてください（未チェックの行はオレンジ）': [
    'Enter one row for each item sent from the office to a store. Tick the box after updating the system stock. (Orange rows = system stock not updated yet)',
    'เมื่อส่งสินค้าจากออฟฟิศไปสาขา ให้กรอกแถวละ 1 รายการ และติ๊กถูกเมื่ออัปเดตสต็อกในระบบแล้ว (แถวสีส้ม = ยังไม่ได้อัปเดตสต็อก)'],
  '週末に店舗からオンライン注文の商品を発送したら1行ずつ記入し、月曜に店舗在庫を調整したらチェックしてください（未チェックの行はオレンジ）': [
    'When a store ships an online order over the weekend, enter one row for each item. Tick the box after adjusting the store stock on Monday. (Orange rows = not adjusted yet)',
    'เมื่อสาขาส่งสินค้าออเดอร์ออนไลน์ช่วงเสาร์-อาทิตย์ ให้กรอกแถวละ 1 รายการ และติ๊กถูกเมื่อปรับสต็อกสาขาในวันจันทร์แล้ว (แถวสีส้ม = ยังไม่ได้ปรับสต็อก)'],
  // 記録シートの列
  '発生日': ['Request Date', 'วันที่เกิดรายการ'],
  '処理日': ['Paid Date', 'วันที่คืนเงิน'],
  '注文番号・伝票番号': ['Order / Slip No.', 'เลขที่ออเดอร์ / เลขที่เอกสาร'],
  '顧客名': ['Customer Name', 'ชื่อลูกค้า'],
  '店舗・販売チャネル': ['Store / Channel', 'สาขา / ช่องทางขาย'],
  '商品': ['Item', 'สินค้า'],
  '返金額': ['Refund Amount', 'ยอดเงินคืน'],
  '返金方法': ['Refund Method', 'วิธีคืนเงิน'],
  '現金': ['Cash', 'เงินสด'],
  '銀行振込': ['Bank Transfer', 'โอนเงินเข้าบัญชี'],
  'カード返金': ['Card Refund', 'คืนเงินเข้าบัตร'],
  'オンライン決済': ['Online Payment', 'คืนผ่านช่องทางออนไลน์'],
  'その他': ['Other', 'อื่น ๆ'],
  '理由': ['Reason', 'เหตุผล'],
  '担当者': ['Person in Charge', 'ผู้รับผิดชอบ'],
  '備考': ['Notes', 'หมายเหตุ'],
  '照合日': ['Check Date', 'วันที่ตรวจสอบ'],
  '商品コード': ['Item Code', 'รหัสสินค้า'],
  'モデル': ['Model', 'รุ่น'],
  'カラー': ['Color', 'สี'],
  'サイズ': ['Size', 'ไซซ์'],
  'PC在庫数': ['PC Stock Qty', 'จำนวนในคอมพิวเตอร์'],
  '在庫表の数': ['Stock Sheet Qty', 'จำนวนในตารางสต็อก'],
  '差異': ['Difference', 'ส่วนต่าง'],
  '原因': ['Cause', 'สาเหตุ'],
  '対応・修正内容': ['Action / Correction', 'การแก้ไข'],
  '確認者': ['Checked by', 'ผู้ตรวจสอบ'],
  '対応完了': ['Resolved', 'แก้ไขแล้ว'],
  '送付日': ['Date Sent', 'วันที่ส่งไปสาขา'],
  '送付先店舗': ['To Store', 'สาขาปลายทาง'],
  '数量': ['Qty', 'จำนวน'],
  '送付者': ['Sent by', 'ผู้ส่ง'],
  'システム在庫更新済': ['System Stock Updated', 'อัปเดตสต็อกในระบบแล้ว'],
  '発送日': ['Ship Date', 'วันที่จัดส่ง'],
  '発送元店舗': ['From Store', 'สาขาที่จัดส่ง'],
  '注文番号': ['Order No.', 'เลขที่ออเดอร์'],
  '店舗在庫調整済': ['Store Stock Adjusted', 'ปรับสต็อกสาขาแล้ว'],
};

// メニュー・メッセージ [日本語, English, ไทย]
const MSG = {
  menuToday: ['今日の列へ移動', 'Go to today', 'ไปที่วันนี้'],
  menuAddItem: ['チェック項目を追加（選択した区分に）', 'Add check item (to the selected section)', 'เพิ่มรายการตรวจสอบ (ในหมวดที่เลือก)'],
  menuAddBlock: ['チェック区分を追加', 'Add check section', 'เพิ่มหมวดเช็กลิสต์'],
  menuAddDept: ['部署シートを追加', 'Add department sheet', 'เพิ่มชีตแผนก'],
  menuAddMonth: ['翌月分の日付を追加', 'Add next month', 'เพิ่มวันที่ของเดือนถัดไป'],
  menuAutoMonth: ['翌月分を毎月自動で追加する', 'Add next month automatically every month', 'เพิ่มเดือนถัดไปอัตโนมัติทุกเดือน'],
  menuSetup: ['初期セットアップ（全シートを作り直す）', 'Initial setup (rebuild all sheets)', 'ตั้งค่าเริ่มต้น (สร้างชีตใหม่ทั้งหมด)'],
  confirm: ['確認', 'Confirm', 'ยืนยัน'],
  confirmSetup: [
    'チェックリストと記録シートをすべて作り直します。\n入力済みの内容はすべて消えます。よろしいですか？',
    'All checklist and log sheets will be rebuilt.\nEverything already entered will be deleted. Continue?',
    'ระบบจะสร้างชีตเช็กลิสต์และชีตบันทึกใหม่ทั้งหมด\nข้อมูลที่กรอกไว้จะถูกลบทั้งหมด ต้องการทำต่อหรือไม่?'],
  setupDone: ['セットアップが完了しました。', 'Setup is complete.', 'ตั้งค่าเสร็จแล้ว'],
  noFuture: [
    '今日以降の日付がありません。「翌月分の日付を追加」を実行してください。',
    'There are no dates from today onward. Please run "Add next month".',
    'ยังไม่มีวันที่ตั้งแต่วันนี้เป็นต้นไป กรุณาเลือก "เพิ่มวันที่ของเดือนถัดไป"'],
  selectRow: [
    '項目を追加したい区分の中の行（チェック項目など）を選択してから実行してください。',
    'Select a row inside the section you want to add to (for example, a check item), then try again.',
    'กรุณาเลือกแถวในหมวดที่ต้องการเพิ่ม (เช่น รายการตรวจสอบ) แล้วลองอีกครั้ง'],
  promptItem: ['チェック項目の内容を入力してください', 'Enter the check item', 'กรอกรายการตรวจสอบ'],
  promptBlockName: [
    '区分名を入力してください（例：買掛金照合）',
    'Enter the section name (e.g. Accounts Payable Check)',
    'กรอกชื่อหมวด (เช่น ตรวจสอบเจ้าหนี้)'],
  promptFreq: [
    'いつチェックしますか？ 番号を入力してください\n1：毎日\n2：毎週月曜\n3：毎月最終営業日\n4：毎月初5営業日以内',
    'How often? Enter a number\n1: Daily\n2: Every Monday\n3: Last business day of the month\n4: Within the first 5 business days of the month',
    'ต้องตรวจสอบเมื่อไร? กรอกตัวเลข\n1: ทุกวัน\n2: ทุกวันจันทร์\n3: วันทำการสุดท้ายของเดือน\n4: ภายใน 5 วันทำการแรกของเดือน'],
  promptBlockItems: [
    'チェック項目を「／」区切りで入力してください。\n空欄のままOKにすると、入力用の空き行を3行用意します。',
    'Enter the check items separated by "/".\nLeave it blank to get 3 empty rows to fill in later.',
    'กรอกรายการตรวจสอบ คั่นด้วย "/"\nถ้าเว้นว่างไว้ ระบบจะเตรียมแถวว่างให้ 3 แถว'],
  promptDept: ['部署名を入力してください（例：営業）', 'Enter the department name (e.g. Sales)', 'กรอกชื่อแผนก (เช่น ฝ่ายขาย)'],
  sheetExists: ['そのシートは既にあります。', 'That sheet already exists.', 'มีชีตนี้อยู่แล้ว'],
  noChecklist: [
    'チェックリストのシートがありません。先に「初期セットアップ」を実行してください。',
    'There is no checklist sheet. Please run "Initial setup" first.',
    'ยังไม่มีชีตเช็กลิสต์ กรุณาเลือก "ตั้งค่าเริ่มต้น" ก่อน'],
  monthAdded: ['全シートに翌月分の日付を追加しました。', 'Next month was added to all checklist sheets.', 'เพิ่มวันที่ของเดือนถัดไปในชีตเช็กลิสต์ทั้งหมดแล้ว'],
  triggerSet: [
    '毎月20日の朝に、翌月分の日付がまだ無ければ自動で追加するよう設定しました。',
    'Next month will now be added automatically on the morning of the 20th of each month.',
    'ตั้งค่าแล้ว ระบบจะเพิ่มวันที่ของเดือนถัดไปให้อัตโนมัติทุกวันที่ 20 ตอนเช้า'],
  openChecklist: [
    'チェックリストのシート（経理・オフィス倉庫など）を開いてから実行してください。',
    'Open a checklist sheet (e.g. Accounting or Office Warehouse) and try again.',
    'กรุณาเปิดชีตเช็กลิสต์ (เช่น บัญชี หรือ คลังสินค้าสำนักงาน) แล้วลองอีกครั้ง'],
  langChanging: ['表示言語を切り替えています…', 'Switching language…', 'กำลังเปลี่ยนภาษา…'],
  langChanged: ['日本語に切り替えました', 'Switched to English', 'เปลี่ยนเป็นภาษาไทยแล้ว'],
  autoTranslated: [
    '英語・タイ語は自動翻訳です。「翻訳」シートで確認・修正できます。',
    'The other languages were machine-translated. You can check and fix them in the "翻訳" (Translation) sheet.',
    'ภาษาอื่นแปลด้วยเครื่อง สามารถตรวจสอบและแก้ไขได้ในชีต "翻訳" (คำแปล)'],
};
const MENU_NAME = '✅ Checklist';
const LANG_MENU_NAME = '🌐 言語 / Language / ภาษา';

// ===== レイアウト =====
const META_KEY = 'routineChecklist'; // シートの種類（checklist / log）を開発者メタデータに保存
const TRANSLATION_SHEET = '翻訳';
const ROW = { lang: 1, title: 2, month: 3, date: 4, dow: 5, rate: 6, firstData: 7 };
const COL = { type: 1, no: 2, label: 3, firstDate: 4 };
const LOG_ROW = { lang: 1, title: 2, note: 3, header: 4, firstData: 5 };
const KIND = { HEADER: 'header', CHECK: 'check', STATUS: 'status', DETAIL: 'detail', PERSON: 'person', DUTY: 'duty', NOTE: 'note' };
const NA = '－'; // 対象外の日
const DOW = ['日', '月', '火', '水', '木', '金', '土'];
const DATE_COL_WIDTH = 72;
const DETAIL_ROW_HEIGHT = 54;
const COLOR = {
  headerBg: '#434343',
  headerFont: '#ffffff',
  lang: '#fff2cc',
  saturday: '#c9daf8',
  blockBg: '#cfe2f3',
  anomalyLabel: '#f4cccc',
  personLabel: '#efefef',
  na: '#eeeeee',
  naFont: '#bbbbbb',
  border: '#cccccc',
  today: '#fff2cc',
  todayHeader: '#ffd966',
  overdue: '#fce5cd',
  anomaly: '#ea9999',
  anomalyText: '#fce8e6',
  done: '#93c47d',
  logHeader: '#3c78d8',
  tabAccounting: '#3c78d8',
  tabWarehouse: '#6aa84f',
  tabDuty: '#e69138',
  dutyLabel: '#d9ead3',
};

// ===== メニュー =====
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu(MENU_NAME)
    .addItem(msg('menuToday'), 'goToToday')
    .addSeparator()
    .addItem(msg('menuAddItem'), 'addItem')
    .addItem(msg('menuAddBlock'), 'addBlock')
    .addItem(msg('menuAddDept'), 'addDepartmentSheet')
    .addSeparator()
    .addItem(msg('menuAddMonth'), 'addNextMonth')
    .addItem(msg('menuAutoMonth'), 'installMonthlyTrigger')
    .addSeparator()
    .addSubMenu(ui.createMenu(LANG_MENU_NAME)
      .addItem('日本語', 'switchToJapanese')
      .addItem('English', 'switchToEnglish')
      .addItem('ภาษาไทย', 'switchToThai'))
    .addSeparator()
    .addItem(msg('menuSetup'), 'setupChecklist')
    .addToUi();
}

// 各シート1行目の言語プルダウンを変えたとき、「翻訳」シートを直したとき
function onEdit(e) {
  const range = e.range;
  const sheet = range.getSheet();
  if (range.getNumRows() !== 1 || range.getNumColumns() !== 1) return;
  if (sheet.getName() === TRANSLATION_SHEET) {
    onTranslationEdit(e);
    return;
  }
  if (range.getRow() !== ROW.lang || !kindOf(sheet)) return;
  const lang = LANGS.find(l => l.label === e.value);
  if (lang) switchLanguage(lang.code);
}

function switchToJapanese() { switchLanguage('ja'); }
function switchToEnglish() { switchLanguage('en'); }
function switchToThai() { switchLanguage('th'); }

function switchLanguage(lang) {
  const ss = SpreadsheetApp.getActive();
  ss.toast(msgIn('langChanging', lang));
  applyLanguage(lang);
  ss.toast(msgIn('langChanged', lang));
}

function setupChecklist() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const old = ss.getSheets().filter(s => kindOf(s));
  if (old.length) {
    if (ui.alert(msg('confirm'), msg('confirmSetup'), ui.ButtonSet.YES_NO) !== ui.Button.YES) return;
  }
  const lang = getLang();
  old.forEach((s, i) => s.setName(`_old_${i}_${Date.now()}`));
  writeTranslationSheet(ss);
  setLang('ja');

  let days = [];
  for (let i = 0; i < CONFIG.initialMonths; i++) {
    days = days.concat(workdaysOfMonth(CONFIG.startYear, CONFIG.startMonth - 1 + i));
  }
  const tabColor = [COLOR.tabAccounting, COLOR.tabWarehouse, COLOR.tabDuty];
  CHECKLISTS.forEach((c, i) => {
    const sheet = buildChecklistSheet(ss, c.name, days, c.title);
    sheet.setTabColor(tabColor[i % tabColor.length]);
    c.blocks.forEach(b => appendBlock(sheet, headerText(b.name, b.freq, 0), b.freq, b.rows.map(toRow)));
    applyConditionalFormats(sheet);
  });
  LOGS.forEach(spec => {
    const sheet = buildLogSheet(ss, spec);
    const parent = ss.getSheetByName(spec.after);
    if (parent) sheet.setTabColor(parent.getTabColor());
  });

  // 並び順：チェックリストの直後に関連する記録シート、最後に「翻訳」
  const order = [];
  CHECKLISTS.forEach(c => {
    order.push(c.name);
    for (let prev = c.name, next; (next = LOGS.find(l => l.after === prev)); prev = next.name) order.push(next.name);
  });
  order.push(TRANSLATION_SHEET);
  order.forEach((name, i) => {
    ss.setActiveSheet(ss.getSheetByName(name));
    ss.moveActiveSheet(i + 1);
  });
  old.forEach(s => ss.deleteSheet(s));
  ['シート1', 'Sheet1'].forEach(n => {
    const s = ss.getSheetByName(n);
    if (s && s.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(s);
  });
  ss.setActiveSheet(ss.getSheetByName(CHECKLISTS[0].name));
  if (lang !== 'ja') applyLanguage(lang);
  ui.alert(msg('setupDone'));
}

function goToToday() {
  const sheet = getActiveChecklistSheet();
  if (!sheet) return;
  const today = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-MM-dd');
  const pad = n => String(n).padStart(2, '0');
  // 今日が休みの日なら次の出勤日へ
  const idx = readDates(sheet).findIndex(x => x && `${x.y}-${pad(x.m)}-${pad(x.d)}` >= today);
  if (idx < 0) {
    SpreadsheetApp.getUi().alert(msg('noFuture'));
    return;
  }
  sheet.setActiveRange(sheet.getRange(ROW.firstData, COL.firstDate + idx));
}

function addItem() {
  const ui = SpreadsheetApp.getUi();
  const sheet = getActiveChecklistSheet();
  if (!sheet) return;
  const types = readRowTypes(sheet);
  const typeAt = r => types[r - ROW.firstData] || null;
  let row = sheet.getActiveCell().getRow();
  if (!typeAt(row)) {
    ui.alert(msg('selectRow'));
    return;
  }
  // 項目は区分の最後のチェック項目の下に追加する（異常欄・実施者欄より上）
  while (typeAt(row + 1) && typeAt(row + 1).kind === KIND.CHECK) row++;
  while (row > ROW.firstData && ![KIND.CHECK, KIND.HEADER].includes(typeAt(row).kind)) row--;
  const freq = typeAt(row).freq;

  const res = ui.prompt(msg('menuAddItem'), msg('promptItem'), ui.ButtonSet.OK_CANCEL);
  const text = res.getResponseText().trim();
  if (res.getSelectedButton() !== ui.Button.OK || !text) return;
  const added = addTranslations([text]);

  sheet.insertRowAfter(row);
  const newRow = row + 1;
  const full = sheet.getRange(newRow, 1, 1, sheet.getMaxColumns());
  full.breakApart();
  full.clearContent().clearFormat().clearDataValidations();
  sheet.getRange(newRow, COL.type, 1, 3).setValues([[`${KIND.CHECK}:${freq}`, '', text]]);
  formatLabelCells(sheet, newRow, KIND.CHECK);
  formatDateCells(sheet, newRow, KIND.CHECK, freq, COL.firstDate, lastDateCol(sheet) - COL.firstDate + 1);
  renumberBlock(sheet, newRow);
  sheet.setActiveRange(sheet.getRange(newRow, COL.label));
  if (added) ui.alert(msg('autoTranslated'));
}

function addBlock() {
  const ui = SpreadsheetApp.getUi();
  const sheet = getActiveChecklistSheet();
  if (!sheet) return;
  const r1 = ui.prompt(msg('menuAddBlock'), msg('promptBlockName'), ui.ButtonSet.OK_CANCEL);
  const name = r1.getResponseText().trim();
  if (r1.getSelectedButton() !== ui.Button.OK || !name) return;
  const r2 = ui.prompt(msg('menuAddBlock'), msg('promptFreq'), ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const freq = FREQ_ORDER[Number(r2.getResponseText().trim().replace(/[１-４]/, c => '１２３４'.indexOf(c) + 1)) - 1] || FREQ.DAILY;
  const r3 = ui.prompt(msg('menuAddBlock'), msg('promptBlockItems'), ui.ButtonSet.OK_CANCEL);
  if (r3.getSelectedButton() !== ui.Button.OK) return;
  const items = r3.getResponseText().split(/[／/]/).map(s => s.trim()).filter(Boolean);

  const lang = getLang();
  const li = langIndex(lang);
  const added = addTranslations([name].concat(items));
  // 見出し「■ 区分名（頻度）」を各言語で登録
  const names = lookupRow(loadDictionary(), name) || [name, name, name];
  addTranslationRow(LANGS.map((l, i) => headerText(names[i] || names[0], freq, i)), added);

  const dict = loadDictionary();
  const tr = ja => translate(ja, lang, dict);
  const rows = (items.length ? items : [tr('（チェック項目を入力）'), tr('（チェック項目を入力）'), tr('（チェック項目を入力）')])
    .map(text => ({ kind: KIND.CHECK, label: text }))
    .concat(ANOMALY.concat([PERSON]).map(([kind, label]) => ({ kind, label: tr(label) })));
  const row = appendBlock(sheet, headerText(names[li] || name, freq, li), freq, rows);
  applyConditionalFormats(sheet);
  sheet.setActiveRange(sheet.getRange(row + 1, COL.label));
  if (added) ui.alert(msg('autoTranslated'));
}

function addDepartmentSheet() {
  const ss = SpreadsheetApp.getActive();
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(msg('menuAddDept'), msg('promptDept'), ui.ButtonSet.OK_CANCEL);
  const name = res.getResponseText().trim();
  if (res.getSelectedButton() !== ui.Button.OK || !name) return;
  if (ss.getSheetByName(name)) {
    ui.alert(msg('sheetExists'));
    return;
  }
  const added = addTranslations([name]);
  const names = lookupRow(loadDictionary(), name) || [name, name, name];
  addTranslationRow(TITLE_TEMPLATE.map((f, i) => f(names[i] || names[0])), added);

  // 既存のチェックリストと同じ期間の日付で作る
  const ref = checklistSheets()[0];
  const refDates = ref ? readDates(ref).filter(Boolean) : [];
  let days = [];
  if (refDates.length) {
    let { y, m } = refDates[0];
    const to = refDates[refDates.length - 1];
    while (y * 12 + m <= to.y * 12 + to.m) {
      days = days.concat(workdaysOfMonth(y, m - 1));
      if (++m > 12) { m = 1; y++; }
    }
  } else {
    for (let i = 0; i < CONFIG.initialMonths; i++) {
      days = days.concat(workdaysOfMonth(CONFIG.startYear, CONFIG.startMonth - 1 + i));
    }
  }
  const sheet = buildChecklistSheet(ss, name, days);
  const tr = ja => translate(ja, getLang(), loadDictionary());
  sheet.getRange(ROW.firstData, COL.type, 1, 3)
    .setValues([[KIND.NOTE, '', tr('※ メニュー「✅ Checklist」→「チェック区分を追加」から項目を追加してください')]]);
  sheet.getRange(ROW.firstData, COL.label).setFontColor('#999999');
  applyConditionalFormats(sheet);
  ss.setActiveSheet(sheet);
  if (added) ui.alert(msg('autoTranslated'));
}

function addNextMonth() {
  const sheets = checklistSheets();
  if (!sheets.length) {
    SpreadsheetApp.getUi().alert(msg('noChecklist'));
    return;
  }
  sheets.forEach(appendMonth);
  SpreadsheetApp.getUi().alert(msg('monthAdded'));
}

function installMonthlyTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'autoExtendMonths')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('autoExtendMonths').timeBased().onMonthDay(20).atHour(6).create();
  SpreadsheetApp.getUi().alert(msg('triggerSet'));
}

// 時間主導トリガーから呼ばれる（UI は使わない）
function autoExtendMonths() {
  const [y, m] = Utilities.formatDate(new Date(), SpreadsheetApp.getActive().getSpreadsheetTimeZone(), 'yyyy-M')
    .split('-').map(Number);
  const target = y * 12 + m + 1; // 翌月
  checklistSheets().forEach(sheet => {
    for (let guard = 0; guard < 24; guard++) {
      const last = readDates(sheet).filter(Boolean).pop();
      if (last && last.y * 12 + last.m >= target) break;
      appendMonth(sheet);
    }
  });
}

// ===== チェックリストのシート =====
// title: 日本語のタイトル（省略時は「○○ ルーティンチェックリスト」）
function buildChecklistSheet(ss, name, days, title) {
  const sheet = ss.insertSheet(name, ss.getNumSheets());
  sheet.addDeveloperMetadata(META_KEY, 'checklist');
  const dict = loadDictionary();
  const lang = getLang();
  const li = langIndex(lang);
  const tr = ja => translate(ja, lang, dict);

  sheet.getRange(ROW.lang, COL.no).setValue('🌐').setHorizontalAlignment('right');
  setupLangCell(sheet.getRange(ROW.lang, COL.label), lang);
  const names = lookupRow(dict, name);
  sheet.getRange(ROW.title, COL.no)
    .setValue(title ? tr(title) : TITLE_TEMPLATE[li](names ? names[li] || names[0] : name))
    .setFontSize(14).setFontWeight('bold');
  sheet.getRange(ROW.title, COL.firstDate)
    .setValue(tr('凡例： 黄＝今日 ／ オレンジ＝チェック漏れ ／ 赤＝異常あり ／ 青＝出勤土曜（毎月最終土曜） ／ グレー（－）＝その日は対象外'))
    .setFontColor('#666666');
  sheet.getRange(ROW.month, COL.label, 4, 1).setValues([[tr('年月')], [tr('日付')], [tr('曜日')], [tr('達成率')]]);
  sheet.getRange(ROW.month, COL.no, 4, 2)
    .setBackground(COLOR.headerBg).setFontColor(COLOR.headerFont).setFontWeight('bold');
  sheet.setColumnWidth(COL.no, 40);
  sheet.setColumnWidth(COL.label, 360);
  sheet.hideColumns(COL.type);
  sheet.setFrozenRows(ROW.rate);
  sheet.setFrozenColumns(COL.label);

  writeDateColumns(sheet, days, COL.firstDate);
  const last = lastDateCol(sheet);
  if (last >= COL.firstDate && sheet.getMaxColumns() > last) {
    sheet.deleteColumns(last + 1, sheet.getMaxColumns() - last);
  }
  return sheet;
}

// 区分（見出し＋行）を一番下に追加し、見出しの行番号を返す。rows: [{kind, label}]（label は表示中の言語）
function appendBlock(sheet, header, freq, rows) {
  let start;
  if (sheet.getRange(ROW.firstData, COL.type).getValue() === KIND.NOTE) {
    sheet.getRange(ROW.firstData, COL.type, 1, 3).clearContent().setFontColor('#000000');
    start = ROW.firstData;
  } else {
    const last = sheet.getLastRow();
    start = last < ROW.firstData ? ROW.firstData : last + 2; // 区分の間は1行あける
  }
  let no = 0;
  const values = [[`${KIND.HEADER}:${freq}`, header, '']]
    .concat(rows.map(r => [`${r.kind}:${freq}`, r.kind === KIND.CHECK ? ++no : '', r.label]));
  const need = start + values.length - 1;
  if (sheet.getMaxRows() < need) sheet.insertRowsAfter(sheet.getMaxRows(), need - sheet.getMaxRows());
  sheet.getRange(start, COL.type, values.length, 3).setValues(values);

  const n = lastDateCol(sheet) - COL.firstDate + 1;
  const info = columnInfo(sheet);
  values.forEach(([type], k) => {
    const kind = type.split(':')[0];
    formatLabelCells(sheet, start + k, kind);
    formatDateCells(sheet, start + k, kind, freq, COL.firstDate, n, info);
    if (kind === KIND.DETAIL) sheet.setRowHeight(start + k, DETAIL_ROW_HEIGHT);
  });
  return start;
}

function appendMonth(sheet) {
  const last = readDates(sheet).filter(Boolean).pop();
  let y = CONFIG.startYear;
  let m = CONFIG.startMonth;
  if (last) {
    ({ y, m } = last);
    if (++m > 12) { m = 1; y++; }
  }
  writeDateColumns(sheet, workdaysOfMonth(y, m - 1), lastDateCol(sheet) + 1);
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
  const lang = getLang();
  const dict = loadDictionary();
  const f = ROW.firstData;
  const dates = days.map(x => `=DATE(${x.y},${x.m},${x.d})`);
  const dows = days.map(x => translate(x.dow === 6 ? '土(出勤)' : DOW[x.dow], lang, dict));
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
    sheet.getRange(ROW.month, startCol + i).setValue(monthLabel(days[i].y, days[i].m, lang));
    sheet.getRange(ROW.month, startCol + i, 1, j - i + 1).merge();
    sheet.getRange(ROW.month, startCol + i, 4, 1)
      .setBorder(null, true, null, null, null, null, '#ffffff', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    i = j + 1;
  }
  days.forEach((x, i) => {
    if (x.dow === 6) sheet.getRange(ROW.date, startCol + i, 2, 1).setBackground(COLOR.saturday).setFontColor('#000000');
  });

  const info = columnInfo(sheet);
  readRowTypes(sheet).forEach((t, k) => {
    if (t) formatDateCells(sheet, ROW.firstData + k, t.kind, t.freq, startCol, n, info);
  });
}

function formatLabelCells(sheet, row, kind) {
  const rng = sheet.getRange(row, COL.no, 1, 2);
  rng.setBorder(true, true, true, true, true, null, COLOR.border, SpreadsheetApp.BorderStyle.SOLID)
    .setVerticalAlignment('middle');
  sheet.getRange(row, COL.no).setHorizontalAlignment('center');
  sheet.getRange(row, COL.label).setWrap(true);
  if (kind === KIND.HEADER) {
    rng.merge().setBackground(COLOR.blockBg).setFontWeight('bold').setHorizontalAlignment('left');
  } else if (kind === KIND.STATUS || kind === KIND.DETAIL) {
    rng.setBackground(COLOR.anomalyLabel).setFontWeight('bold');
  } else if (kind === KIND.PERSON) {
    rng.setBackground(COLOR.personLabel);
  } else if (kind === KIND.DUTY) {
    rng.setBackground(COLOR.dutyLabel).setFontWeight('bold');
  }
}

// 日付のセル。頻度の対象外の日は「－」・グレー、月初5営業日の項目は5日分を1マスに結合
function formatDateCells(sheet, row, kind, freq, col, n, info) {
  if (n <= 0) return;
  info = info || columnInfo(sheet);
  const values = [], bgs = [], fonts = [], rules = [], aligns = [];
  const windows = [];
  const checkbox = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  const staffRule = SpreadsheetApp.newDataValidation().requireValueInList(STAFF, true).setAllowInvalid(true).build();
  let statusRule = null;
  if (kind === KIND.STATUS) {
    const dict = loadDictionary();
    statusRule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['なし', 'あり'].map(s => translate(s, getLang(), dict)), true)
      .setAllowInvalid(false).build();
  }
  for (let i = 0; i < n; i++) {
    const ci = info[col - COL.firstDate + i] || {};
    let v = '', bg = '#ffffff', font = '#000000', rule = null;
    if (kind === KIND.HEADER) {
      bg = COLOR.blockBg;
    } else if (!applies(freq, ci)) {
      v = NA; bg = COLOR.na; font = COLOR.naFont;
    } else if (freq === FREQ.MONTH_START5 && ci.bizDay > 1) {
      // 結合される側のセル
    } else {
      if (freq === FREQ.MONTH_START5) windows.push(i);
      if (kind === KIND.CHECK) { v = false; rule = checkbox; }
      if (kind === KIND.STATUS) rule = statusRule;
      // 当番は日付の列の位置で順番に割り当てる（途中で名前を変えても以降の順番はずれない）
      if (kind === KIND.DUTY) { v = STAFF[(col - COL.firstDate + i) % STAFF.length]; rule = staffRule; }
    }
    values.push(v); bgs.push(bg); fonts.push(font); rules.push(rule);
    aligns.push(kind === KIND.DETAIL && v !== NA ? 'left' : 'center');
  }
  const rng = sheet.getRange(row, col, 1, n);
  rng.setValues([values]).setBackgrounds([bgs]).setFontColors([fonts]).setDataValidations([rules])
    .setBorder(true, true, true, true, true, null, COLOR.border, SpreadsheetApp.BorderStyle.SOLID)
    .setHorizontalAlignments([aligns]).setVerticalAlignment('middle');
  if (kind === KIND.DETAIL) rng.setWrap(true).setVerticalAlignment('top').setFontSize(9);
  if (kind === KIND.PERSON) rng.setFontSize(9);
  if (kind === KIND.DUTY) rng.setFontWeight('bold');
  windows.forEach(i => {
    let w = 1;
    while (i + w < n && (info[col - COL.firstDate + i + w] || {}).bizDay === w + 1 && w < WINDOW_DAYS) w++;
    if (w > 1) sheet.getRange(row, col + i, 1, w).merge();
  });
}

function applyConditionalFormats(sheet) {
  const width = sheet.getMaxColumns() - COL.firstDate + 1;
  if (width < 1) return;
  const f = ROW.firstData;
  const d = ROW.date;
  const c = colLetter(COL.firstDate);
  const cell = `${c}${f}`;
  const dict = loadDictionary();
  const yes = LANGS.map(l => `${cell}="${translate('あり', l.code, dict)}"`).join(',');
  // 締め切り日（月初5営業日の項目は5営業日目）
  const due = `IF(AND(RIGHT($A${f},${FREQ.MONTH_START5.length})="${FREQ.MONTH_START5}",LEFT($A${f},6)<>"${KIND.HEADER}"),OFFSET(${c}$${d},0,${WINDOW_DAYS - 1}),${c}$${d})`;
  const body = sheet.getRange(f, COL.firstDate, sheet.getMaxRows() - f + 1, width);
  const header = sheet.getRange(ROW.date, COL.firstDate, 3, width);
  const rate = sheet.getRange(ROW.rate, COL.firstDate, 1, width);
  const rule = () => SpreadsheetApp.newConditionalFormatRule();
  sheet.setConditionalFormatRules([
    // 異常あり
    rule().whenFormulaSatisfied(`=AND(LEFT($A${f},6)="${KIND.STATUS}",OR(${yes}))`)
      .setBackground(COLOR.anomaly).setFontColor('#990000').setBold(true).setRanges([body]).build(),
    rule().whenFormulaSatisfied(`=AND(LEFT($A${f},6)="${KIND.DETAIL}",${cell}<>"",${cell}<>"${NA}")`)
      .setBackground(COLOR.anomalyText).setRanges([body]).build(),
    // 締め切りを過ぎたチェック漏れ・「異常の有無」の未記入
    rule().whenFormulaSatisfied(
      `=AND(${c}$${d}<>"",${due}<TODAY(),OR(AND(ISLOGICAL(${cell}),${cell}=FALSE),AND(LEFT($A${f},6)="${KIND.STATUS}",${cell}="")))`)
      .setBackground(COLOR.overdue).setRanges([body]).build(),
    // 今日
    rule().whenFormulaSatisfied(`=AND(${cell}<>"${NA}",${c}$${d}<>"",TODAY()>=${c}$${d},TODAY()<=${due})`)
      .setBackground(COLOR.today).setRanges([body]).build(),
    // 達成率100%
    rule().whenFormulaSatisfied(`=AND(ISNUMBER(${c}${ROW.rate}),${c}${ROW.rate}>=1)`)
      .setBackground(COLOR.done).setRanges([rate]).build(),
    rule().whenFormulaSatisfied(`=${c}$${d}=TODAY()`)
      .setBackground(COLOR.todayHeader).setFontColor('#000000').setRanges([header]).build(),
  ]);
}

// ===== 記録シート =====
function buildLogSheet(ss, spec) {
  const lang = getLang();
  const dict = loadDictionary();
  const tr = ja => translate(ja, lang, dict);
  const sheet = ss.insertSheet(spec.name, ss.getNumSheets());
  sheet.addDeveloperMetadata(META_KEY, 'log');
  const n = spec.columns.length;
  if (sheet.getMaxColumns() > n) sheet.deleteColumns(n + 1, sheet.getMaxColumns() - n);
  const need = LOG_ROW.firstData + LOG_ROWS - 1;
  if (sheet.getMaxRows() < need) sheet.insertRowsAfter(sheet.getMaxRows(), need - sheet.getMaxRows());
  if (sheet.getMaxRows() > need) sheet.deleteRows(need + 1, sheet.getMaxRows() - need);

  sheet.getRange(LOG_ROW.lang, 1).setValue('🌐').setHorizontalAlignment('right');
  setupLangCell(sheet.getRange(LOG_ROW.lang, 2), lang);
  sheet.getRange(LOG_ROW.title, 1).setValue(tr(spec.name)).setFontSize(14).setFontWeight('bold');
  sheet.getRange(LOG_ROW.note, 1, 1, n).merge().setValue(tr(spec.note))
    .setWrap(true).setFontColor('#666666').setVerticalAlignment('top');
  sheet.setRowHeight(LOG_ROW.note, 36);
  sheet.getRange(LOG_ROW.header, 1, 1, n).setValues([spec.columns.map(([title]) => tr(title))])
    .setBackground(COLOR.logHeader).setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(LOG_ROW.header, 36);
  sheet.setFrozenRows(LOG_ROW.header);

  spec.columns.forEach(([, type, width, options], i) => {
    const col = i + 1;
    sheet.setColumnWidth(col, width);
    const rng = sheet.getRange(LOG_ROW.firstData, col, LOG_ROWS, 1);
    const dv = SpreadsheetApp.newDataValidation();
    switch (type) {
      case 'date':
        rng.setDataValidation(dv.requireDate().setAllowInvalid(false).build())
          .setNumberFormat('yyyy/mm/dd').setHorizontalAlignment('center');
        break;
      case 'number':
        rng.setNumberFormat('#,##0').setHorizontalAlignment('right');
        break;
      case 'check':
        rng.insertCheckboxes().setHorizontalAlignment('center');
        break;
      case 'list':
        rng.setDataValidation(dv.requireValueInList(options.map(tr), true).setAllowInvalid(true).build());
        break;
      case 'store':
        rng.setDataValidation(dv.requireValueInList(STORES, true).setAllowInvalid(true).build());
        break;
      case 'diff': {
        const a = colLetter(col - 2), b = colLetter(col - 1), r = LOG_ROW.firstData;
        sheet.getRange(r, col).setFormula(
          `=ARRAYFORMULA(IF((${a}${r}:${a}<>"")*(${b}${r}:${b}<>""),${a}${r}:${a}-${b}${r}:${b},""))`);
        rng.setNumberFormat('+#,##0;-#,##0;0').setHorizontalAlignment('right').setFontWeight('bold');
        break;
      }
      default:
        rng.setWrap(true);
    }
  });
  sheet.getRange(LOG_ROW.header, 1, LOG_ROWS + 1, n)
    .setBorder(true, true, true, true, true, true, COLOR.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(LOG_ROW.firstData, 1, LOG_ROWS, n).setVerticalAlignment('top');
  sheet.getRange(LOG_ROW.header, 1, LOG_ROWS + 1, n).createFilter();

  const r = LOG_ROW.firstData;
  const p = `$${colLetter(spec.pending.col)}${r}`;
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(`=AND($A${r}<>"",${spec.pending.when === 'blank' ? `${p}=""` : `${p}=FALSE`})`)
      .setBackground(COLOR.overdue)
      .setRanges([sheet.getRange(r, 1, LOG_ROWS, n)]).build(),
  ]);
  return sheet;
}

// ===== 言語 =====
function getLang() {
  return PropertiesService.getDocumentProperties().getProperty('lang') || 'ja';
}

function setLang(lang) {
  PropertiesService.getDocumentProperties().setProperty('lang', lang);
}

function langIndex(lang) {
  return Math.max(0, LANGS.findIndex(l => l.code === lang));
}

function msg(key) {
  return msgIn(key, getLang());
}

function msgIn(key, lang) {
  return MSG[key][langIndex(lang)] || MSG[key][0];
}

function setupLangCell(range, lang) {
  range.setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(LANGS.map(l => l.label), true).setAllowInvalid(false).build())
    .setValue(LANGS[langIndex(lang)].label)
    .setBackground(COLOR.lang).setFontWeight('bold')
    .setBorder(true, true, true, true, null, null, '#f1c232', SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function headerText(name, freq, li) {
  const f = FREQ_LABEL[freq][li];
  return li === 0 ? `■ ${name}（${f}）` : `■ ${name} (${f})`;
}

function monthLabel(y, m, lang) {
  if (lang === 'en') return `${EN_MONTHS[m - 1]} ${y}`;
  if (lang === 'th') return `${TH_MONTHS[m - 1]} ${y + 543}`; // タイでは仏暦
  return `${y}年${m}月`;
}
const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TH_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];

function parseMonthLabel(s) {
  let m = s.match(/^(\d{4})年(\d{1,2})月$/);
  if (m) return { y: +m[1], m: +m[2] };
  m = s.match(/^(\S+) (\d{4})$/);
  if (!m) return null;
  if (EN_MONTHS.includes(m[1])) return { y: +m[2], m: EN_MONTHS.indexOf(m[1]) + 1 };
  if (TH_MONTHS.includes(m[1])) return { y: +m[2] - 543, m: TH_MONTHS.indexOf(m[1]) + 1 };
  return null;
}

// 組み込みの訳語（TEXT＋区分見出し＋シートタイトル）
function builtInTranslations() {
  const rows = Object.keys(TEXT).map(ja => [ja].concat(TEXT[ja]));
  const lookup = ja => (TEXT[ja] ? [ja].concat(TEXT[ja]) : [ja, ja, ja]);
  CHECKLISTS.forEach(c => {
    const names = lookup(c.name);
    if (!c.title) rows.push(TITLE_TEMPLATE.map((f, i) => f(names[i])));
    c.blocks.forEach(b => {
      const bn = lookup(b.name);
      rows.push(LANGS.map((l, i) => headerText(bn[i], b.freq, i)));
    });
  });
  return rows;
}

// 「翻訳」シートを作る（利用者が追加した行は残す）
function writeTranslationSheet(ss) {
  const rows = builtInTranslations().map(r => r.concat([false]));
  const known = new Set(rows.map(r => r[0]));
  let sheet = ss.getSheetByName(TRANSLATION_SHEET);
  if (sheet) {
    const last = sheet.getLastRow();
    if (last > 1) {
      sheet.getRange(2, 1, last - 1, 4).getValues()
        .filter(r => r[0] !== '' && !known.has(r[0]))
        .forEach(r => rows.push(r));
    }
    ss.deleteSheet(sheet);
  }
  sheet = ss.insertSheet(TRANSLATION_SHEET, ss.getNumSheets());
  sheet.setTabColor('#999999');
  sheet.getRange(1, 1, 1, 5).setValues([[
    '日本語', 'English', 'ไทย', '自動翻訳（要確認） / Machine-translated / แปลด้วยเครื่อง',
    'ここで訳語を直すと、シートの表示にも反映されます / Edit translations here / แก้คำแปลได้ที่นี่',
  ]]).setFontWeight('bold').setBackground('#efefef');
  sheet.getRange(1, 5).setFontWeight('normal').setFontColor('#666666').setBackground(null);
  sheet.getRange(2, 1, rows.length, 4).setValues(rows);
  sheet.getRange(2, 4, rows.length, 1).insertCheckboxes();
  sheet.setColumnWidths(1, 3, 380);
  sheet.setColumnWidth(4, 150);
  sheet.getRange(1, 1, rows.length + 1, 3).setWrap(true).setVerticalAlignment('top');
  sheet.setFrozenRows(1);
  sheet.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$D2=TRUE')
      .setBackground('#fff2cc').setRanges([sheet.getRange(2, 1, sheet.getMaxRows() - 1, 4)]).build(),
  ]);
}

function loadDictionary() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(TRANSLATION_SHEET);
  let rows;
  if (sheet && sheet.getLastRow() > 1) {
    rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues()
      .map(r => r.map(v => String(v).trim()))
      .filter(r => r[0] || r[1] || r[2]);
  } else {
    rows = builtInTranslations();
  }
  const index = new Map();
  rows.forEach(r => r.forEach(t => { if (t && !index.has(t)) index.set(t, r); }));
  return { rows, index };
}

function lookupRow(dict, text) {
  return dict.index.get(String(text).trim()) || null;
}

function translate(text, lang, dict) {
  if (typeof text !== 'string' || !text) return text;
  const ym = parseMonthLabel(text);
  if (ym) return monthLabel(ym.y, ym.m, lang);
  const row = lookupRow(dict, text);
  if (!row) return text;
  return row[langIndex(lang)] || row[0] || text;
}

// 表示中の言語で入力された文言を「翻訳」シートに登録（他の言語は自動翻訳）。新規登録があれば true
function addTranslations(texts) {
  const lang = getLang();
  const li = langIndex(lang);
  let added = false;
  texts.forEach(text => {
    if (lookupRow(loadDictionary(), text)) return;
    const row = LANGS.map((l, i) => {
      if (i === li) return text;
      try { return LanguageApp.translate(text, lang, l.code); } catch (e) { return ''; }
    });
    addTranslationRow(row, true);
    added = true;
  });
  return added;
}

function addTranslationRow(row, auto) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(TRANSLATION_SHEET);
  if (!sheet || lookupRow(loadDictionary(), row[langIndex(getLang())] || row[0])) return;
  const r = sheet.getLastRow() + 1;
  sheet.getRange(r, 1, 1, 3).setValues([row]);
  sheet.getRange(r, 4).insertCheckboxes().setValue(!!auto);
}

// 全シートの表示を指定の言語に切り替える
function applyLanguage(lang) {
  const ss = SpreadsheetApp.getActive();
  const dict = loadDictionary();
  const fn = s => translate(s, lang, dict);
  ss.getSheets().filter(s => kindOf(s)).forEach(sheet => {
    const rng = translationRange(sheet);
    translateValidations(rng, fn);
    translateCells(rng, fn);
    const name = fn(sheet.getName());
    if (name !== sheet.getName() && !ss.getSheetByName(name)) sheet.setName(name);
    const langCol = kindOf(sheet) === 'log' ? 2 : COL.label;
    sheet.getRange(ROW.lang, langCol).setValue(LANGS[langIndex(lang)].label);
  });
  setLang(lang);
  try { onOpen(); } catch (e) { /* メニューは次に開いたときに切り替わる */ }
}

// 「翻訳」シートで訳語を直したら、表示中の文言も置き換える
function onTranslationEdit(e) {
  const range = e.range;
  const col = range.getColumn();
  if (range.getRow() < 2 || col > 3) return;
  const li = langIndex(getLang());
  const after = range.getSheet().getRange(range.getRow(), 1, 1, 3).getValues()[0].map(v => String(v).trim());
  const before = after.slice();
  before[col - 1] = e.oldValue === undefined ? '' : String(e.oldValue).trim();
  const from = before[li] || before[0];
  const to = after[li] || after[0];
  if (!from || !to || from === to) return;
  const ss = SpreadsheetApp.getActive();
  const fn = s => (s === from ? to : s);
  ss.getSheets().filter(s => kindOf(s)).forEach(sheet => {
    const rng = translationRange(sheet);
    translateValidations(rng, fn);
    translateCells(rng, fn);
    if (sheet.getName() === from && !ss.getSheetByName(to)) sheet.setName(to);
  });
}

// 記録シートはまだ入力のない行にもプルダウンがあるので、シート全体を対象にする
function translationRange(sheet) {
  return kindOf(sheet) === 'log'
    ? sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns())
    : sheet.getDataRange();
}

function translateValidations(rng, fn) {
  let changed = false;
  const list = SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST;
  const rules = rng.getDataValidations().map(row => row.map(rule => {
    if (!rule || rule.getCriteriaType() !== list) return rule;
    const values = rule.getCriteriaValues()[0];
    const next = values.map(fn);
    if (next.every((v, i) => v === values[i])) return rule;
    changed = true;
    return rule.copy().requireValueInList(next, rule.getCriteriaValues()[1]).build();
  }));
  if (changed) rng.setDataValidations(rules);
}

// 文字列のセルを置き換える（数式はそのまま）。変わった行だけ書き戻す
function translateCells(rng, fn) {
  const values = rng.getValues();
  const formulas = rng.getFormulas();
  const changedRows = [];
  const out = values.map((row, i) => {
    let changed = false;
    const next = row.map((v, j) => {
      if (formulas[i][j]) return formulas[i][j];
      const t = fn(v);
      if (t !== v) changed = true;
      return t;
    });
    if (changed) changedRows.push(i);
    return next;
  });
  if (!changedRows.length) return;
  if (changedRows.length > 50) {
    rng.setValues(out);
    return;
  }
  const sheet = rng.getSheet();
  changedRows.forEach(i => sheet.getRange(rng.getRow() + i, rng.getColumn(), 1, out[i].length).setValues([out[i]]));
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

// 日付の列の {y, m, d, dow}（列を削除した休日は詰まる）
function readDates(sheet) {
  const last = lastDateCol(sheet);
  if (last < COL.firstDate) return [];
  const rng = sheet.getRange(ROW.date, COL.firstDate, 1, last - COL.firstDate + 1);
  const formulas = rng.getFormulas()[0];
  const values = rng.getValues()[0];
  const tz = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
  return formulas.map((f, i) => {
    let m = f.match(/^=DATE\((\d+),(\d+),(\d+)\)$/);
    let ymd = m && m.slice(1).map(Number);
    if (!ymd && values[i] instanceof Date) ymd = Utilities.formatDate(values[i], tz, 'yyyy-M-d').split('-').map(Number);
    if (!ymd) return null;
    return { y: ymd[0], m: ymd[1], d: ymd[2], dow: new Date(ymd[0], ymd[1] - 1, ymd[2]).getDay() };
  });
}

// 日付の列ごとに、週の最初の出勤日か・月の何営業日目か・月の最終営業日か
function columnInfo(sheet) {
  const dates = readDates(sheet);
  const info = dates.map(() => ({}));
  const weekOf = x => { const t = new Date(x.y, x.m - 1, x.d - (x.dow + 6) % 7); return `${t.getFullYear()}-${t.getMonth()}-${t.getDate()}`; };
  dates.forEach((x, i) => {
    if (!x) return;
    const prev = dates[i - 1];
    const next = dates[i + 1];
    const sameMonth = (a, b) => a && b && a.y === b.y && a.m === b.m;
    info[i] = {
      weekStart: !prev || weekOf(prev) !== weekOf(x),
      bizDay: sameMonth(prev, x) ? info[i - 1].bizDay + 1 : 1,
      monthEnd: !sameMonth(x, next),
    };
  });
  return info;
}

function applies(freq, ci) {
  switch (freq) {
    case FREQ.WEEKLY: return !!ci.weekStart;
    case FREQ.MONTH_END: return !!ci.monthEnd;
    case FREQ.MONTH_START5: return ci.bizDay >= 1 && ci.bizDay <= WINDOW_DAYS;
    default: return true;
  }
}

function toRow(r) {
  return typeof r === 'string' ? { kind: KIND.CHECK, label: r } : { kind: r[0], label: r[1] };
}

// 各データ行の {kind, freq}。種類が空でも項目名があれば（手動で挿入した行）上の区分のチェック項目として扱う
function readRowTypes(sheet) {
  const last = sheet.getLastRow();
  if (last < ROW.firstData) return [];
  let freq = FREQ.DAILY;
  return sheet.getRange(ROW.firstData, COL.type, last - ROW.firstData + 1, COL.label).getValues()
    .map(([type, , label]) => {
      if (type) {
        const [kind, f] = String(type).split(':');
        freq = f || freq;
        return kind === KIND.NOTE ? null : { kind, freq };
      }
      return label !== '' ? { kind: KIND.CHECK, freq } : null;
    });
}

function renumberBlock(sheet, row) {
  const types = readRowTypes(sheet);
  const isCheck = r => (types[r - ROW.firstData] || {}).kind === KIND.CHECK;
  let r = row;
  while (r > ROW.firstData && isCheck(r - 1)) r--;
  for (let no = 1; isCheck(r); r++, no++) sheet.getRange(r, COL.no).setValue(no);
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

function kindOf(sheet) {
  const meta = sheet.getDeveloperMetadata().find(m => m.getKey() === META_KEY);
  if (meta) return meta.getValue();
  return sheet.getRange(1, 1).getValue() === 'CHECKLIST' ? 'legacy' : null; // 旧バージョンのシート
}

function checklistSheets() {
  return SpreadsheetApp.getActive().getSheets().filter(s => kindOf(s) === 'checklist');
}

function getActiveChecklistSheet() {
  const sheet = SpreadsheetApp.getActiveSheet();
  if (kindOf(sheet) === 'checklist') return sheet;
  SpreadsheetApp.getUi().alert(msg('openChecklist'));
  return null;
}

function colLetter(col) {
  let s = '';
  for (let c = col; c > 0; c = Math.floor((c - 1) / 26)) s = String.fromCharCode(65 + ((c - 1) % 26)) + s;
  return s;
}
