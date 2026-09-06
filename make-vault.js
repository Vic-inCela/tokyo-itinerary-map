#!/usr/bin/env node
// Builds the encrypted booking vault for the DEMO version of tokyo-itinerary-map.
//
//   node make-vault.js [password]      (default password: demo)
//
// What it does:
//   1. generates small placeholder PDFs (no real bookings) and encrypts each one
//      to docs/<id>.bin  as  iv[12] || ciphertext || gcm-tag
//   2. encrypts the demo 憑證 HTML below and writes the result straight into the
//      `const VAULT = {...};` line of index.html
//
// Key = PBKDF2(password, random salt, 310k, SHA-256); one key for the vault and
// every .bin. The site derives the same key in the browser via WebCrypto.
//
// Everything in this file is FICTIONAL sample data. Names, booking references,
// PINs, policy numbers and phone numbers of individuals are made up so the repo
// can be shared publicly. Business phone numbers / addresses are public info.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO = __dirname;

// id, English placeholder-PDF title, button label shown in the 憑證 tab
const DOCS = {
  hotel: [
    ['hotel-mail', 'Hotel booking confirmation (sample)', '訂房確認信'],
  ],
  scoot: [
    ['scoot-itinerary', 'Airline e-ticket itinerary (sample)', '電子機票 Itinerary'],
    ['scoot-receipt',   'Airline payment receipt (sample)',    '收據 Receipt'],
    ['scoot-mail',      'Airline booking confirmation e-mail (sample)', '訂位確認信'],
  ],
  skyduck: [
    ['skyduck-confirm', 'Sky Duck reservation confirmed (sample)', '預約確定信（含 E 票連結）'],
    ['skyduck-payment', 'Sky Duck card payment notice (sample)',  '付款完成信'],
  ],
  vasara: [
    ['vasara-mail', 'Yukata rental reservation e-mail (sample)', '預約確認信'],
  ],
  insurance: [
    ['insurance-policy', 'Travel insurance policy (sample)', '保單全文（範例）'],
  ],
  jetstar: [
    ['jetstar-eticket',    'Return flight e-itinerary, bilingual (sample)', '電子行程單（中英）'],
    ['jetstar-eticket-en', 'Return flight e-itinerary, English (sample)',   '電子行程單（英文）'],
    ['jetstar-receipt',    'Return flight e-receipt (sample)',              '電子收據'],
    ['jetstar-mail',       'OTA order confirmation e-mail (sample)',        'Trip.com 訂單確認信'],
  ],
};

const docBtns = key => `
  <div class="doclist">${DOCS[key].map(([id,,label]) =>
    `<button class="doc" type="button" data-doc="${id}">📄 ${label}</button>`).join('')}
  </div>`;

const VAULT_HTML = `
<div class="info">
  <p class="caution">🧪 <b>示範資料</b>：此分頁與所有 📄 文件皆為虛構的範例，用來展示「加密憑證」功能的呈現方式；姓名、訂位編號、PIN、保單號碼皆非真實資料。</p>

  <div class="sec"><i></i><h3>✈️ 去程 · 酷航 TR866 · 8/28（五）</h3></div>
  <div class="facts">
    <div class="fact"><span class="fk">航班</span><span><b>TR866</b>（B787-9 · 經濟 M 艙）<span class="fm tzTW">06:45</span> 桃園 T1 → <span class="fm">11:15</span> 成田 T1</span></div>
    <div class="fact"><span class="fk">訂單</span><span>酷航訂單編號 <b>DEMO01</b></span></div>
    <div class="fact"><span class="fk">座位</span><span>DEMO TRAVELER A <b>34K</b> · DEMO TRAVELER B <b>34J</b></span></div>
    <div class="fact"><span class="fk">行李</span><span>託運每人 <b>20kg</b>；手提 2 件合計上限 10kg（54×38×22cm）</span></div>
    <div class="fact"><span class="fk">報到</span><span>櫃檯起飛前 60 分關閉；網路報到 checkin.flyscoot.com（前 48h–1.5h 開放）</span></div>
  </div>${docBtns('scoot')}

  <div class="sec"><i></i><h3>🏨 住宿 · Shinjuku City Hotel N.U.T.S Tokyo · 8/28–9/1</h3></div>
  <div class="facts">
    <div class="fact"><span class="fk">訂房</span><span>Booking.com 確認碼 <b>0000000000</b> · PIN <b>0000</b>（範例）</span></div>
    <div class="fact"><span class="fk">房型</span><span>標準雙人房 × 4 晚 · 2 位成人 · 住客 DEMO TRAVELER A</span></div>
    <div class="fact"><span class="fk">時間</span><span>入住 8/28（五）<span class="fm">16:00</span> 起 · 退房 9/1（二）<span class="fm">10:00</span> 前（Day 1 約 14:15 先寄放行李）</span></div>
    <div class="fact"><span class="fk">地址</span><span>東京都新宿区新宿 1-16-5 · 電話 +81 3-5379-1041（新宿御苑前站步行 2 分）</span></div>
    <div class="fact"><span class="fk">費用</span><span>總價 <b>69,500 円</b>（含稅・服務費）— 入住時支付全額</span></div>
    <div class="fact"><span class="fk">注意</span><span>早餐另計 1,500 円／人／天；8/25 23:59（JST）後取消收全額；建議先告知預計抵達時間</span></div>
  </div>${docBtns('hotel')}

  <div class="sec"><i></i><h3>🦆 Sky Duck 橫濱 柯南 Twilight Cruise · 8/29（六）18:10</h3></div>
  <div class="facts">
    <div class="fact"><span class="fk">受付番號</span><span><b>DEMO0001</b>（予約番號 DEMO0002）</span></div>
    <div class="fact"><span class="fk">內容</span><span>大人（乗車のみ）× 2 · 合計 <b>8,000 円</b> 已刷卡付清</span></div>
    <div class="fact"><span class="fk">報到</span><span><span class="fm">17:50</span> 前至日本丸チケットカウンター（みなとみらい2-1-1），當日需出示預約確認信裡的 <b>E 票</b>（「チケットを表示する」按鈕）</span></div>
    <div class="fact"><span class="fk">代表者</span><span>Demo Traveler · 現場電話 03-3215-0008（9:30–18:00）</span></div>
    <div class="fact"><span class="fk">注意</span><span>座位系統自動分配；車上不能撐傘、無廁所，建議帶帽子與輕便雨衣</span></div>
  </div>${docBtns('skyduck')}

  <div class="sec"><i></i><h3>👘 VASARA 浴衣租借 · 8/30（日）10:00 新宿駅前店</h3></div>
  <div class="facts">
    <div class="fact"><span class="fk">預約 ID</span><span><b>000000</b> · 2 名 · 合計 <b>14,630 円</b></span></div>
    <div class="fact"><span class="fk">方案</span><span>Men's 浴衣選び放題セット ＋ 浴衣レトロ★★☆（含標準髮型設計）</span></div>
    <div class="fact"><span class="fk">地點</span><span>店舖 8/21 已搬遷：<b>東京都新宿区新宿3丁目31-5 ペガサス館 7F</b>（新宿三丁目站旁）</span></div>
    <div class="fact"><span class="fk">必帶</span><span><b>護照</b>（無身分證件無法租借）；浴衣當日到店挑選</span></div>
    <div class="fact"><span class="fk">付款</span><span>若線上付款未完成，自動改為當日店頭支付（不會被取消）</span></div>
    <div class="fact"><span class="fk">取消</span><span>前日 50%、當日 100%；8/1–9/15 浴衣專案：着付開始前聯絡可免取消費。遲到 30 分內可直接前往。改期寄信 info@vasara-h.co.jp（03-6744-6725）</span></div>
  </div>${docBtns('vasara')}

  <div class="sec"><i></i><h3>✈️ 回程 · 捷星日本 GK011 · 9/1（二）</h3></div>
  <div class="facts">
    <div class="fact"><span class="fk">航班</span><span><b>GK011</b>（A321neo · 經濟艙 · 無餐點）<span class="fm">22:40</span> 成田 T3 → <span class="fm tzTW">9/2 01:30</span> 桃園 T1</span></div>
    <div class="fact"><span class="fk">訂位代號</span><span>航空公司 PNR <b>DEMO02</b>（捷星官網管理訂單／報到用）· Trip.com 訂單 0000000000000000</span></div>
    <div class="fact"><span class="fk">乘客</span><span>DEMO TRAVELER A · DEMO TRAVELER B（登機證件姓名需一致）</span></div>
    <div class="fact"><span class="fk">託運</span><span>已加購：A <b>25kg</b> · B <b>20kg</b></span></div>
    <div class="fact"><span class="fk">手提</span><span>個人物品＋手提每人合計上限 <b>7kg</b>（56×36×23cm），無免費託運額度以外的行李</span></div>
    <div class="fact"><span class="fk">報到</span><span>建議起飛前 3 小時（19:40 前）抵達成田 T3</span></div>
  </div>${docBtns('jetstar')}

  <div class="sec"><i></i><h3>🛡️ 旅遊平安險 · 8/28–9/2</h3></div>
  <div class="facts">
    <div class="fact"><span class="fk">保單</span><span>新旅遊綜合保險 · 保單號碼 <b>DEMO-000000</b></span></div>
    <div class="fact"><span class="fk">被保人</span><span>王小明（範例，要保人同）· 身故保險金受益人 王大明（範例）</span></div>
    <div class="fact"><span class="fk">效期</span><span><span class="fm tzTW">08/28 03:00</span> 起至 <span class="fm tzTW">09/02 03:00</span> 止 · 共 5 天 · 旅遊地點 日本</span></div>
    <div class="fact"><span class="fk">保費</span><span>新台幣 <b>853 元</b> · 網路投保 · 承保 1 人</span></div>
    <div class="fact"><span class="fk">救援</span><span>24h 海外救援 <a href="tel:+886226199210">+886-2-6619-9210</a> · 客服 0800-528-528 · 申訴 0800-099-080</span></div>
    <div class="fact"><span class="fk">額度</span><span>身故失能 900萬 · 傷害醫療 90萬 · 海外突發疾病 36萬 · 緊急醫療運送 150萬 · 遺體運返 90萬 · 旅程取消／更改各 5萬 · 班機延誤 6千 · 行李延誤／損失各 6千 · 旅行文件 3千 · 法律責任 100萬（自負額10%）· 居家竊盜 10萬 · 海外探視 5萬 · 班機改降 5千 · 水陸交通延誤 3千</span></div>
    <div class="fact"><span class="fk">應變</span><span>出險處理流程與該留的單據，見「<b>行前</b>」分頁的旅平險卡片</span></div>
  </div>${docBtns('insurance')}

  <p class="caution">📄 按鈕會解密並開啟 PDF（新分頁）。此頁與所有文件皆以 AES-256-GCM 加密存放，只有輸入密碼才能解開；正式使用時，這裡放的是真實的訂位憑證。</p>
</div>`;

/* ---------- tiny PDF writer (Helvetica, ASCII text only) ---------- */
function makePdf(title, lines){
  const esc = s => s.replace(/[\\()]/g, m => '\\' + m);
  const text = [
    'BT', '/F1 20 Tf', '56 760 Td', `(${esc(title)}) Tj`, 'ET',
    'BT', '/F1 11 Tf', '56 720 Td', '15 TL',
    ...lines.map(l => `(${esc(l)}) Tj T*`),
    'ET',
  ].join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${Buffer.byteLength(text)} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  let out = '%PDF-1.4\n';
  const offsets = [];
  objs.forEach((o, i) => { offsets.push(Buffer.byteLength(out)); out += `${i+1} 0 obj\n${o}\nendobj\n`; });
  const xref = Buffer.byteLength(out);
  out += `xref\n0 ${objs.length+1}\n0000000000 65535 f \n`;
  offsets.forEach(o => { out += String(o).padStart(10,'0') + ' 00000 n \n'; });
  out += `trailer\n<< /Size ${objs.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

/* ---------- crypto ---------- */
const password = process.argv[2] || 'demo';
const iter = 310000;
const salt = crypto.randomBytes(16);
const key = crypto.pbkdf2Sync(Buffer.from(password, 'utf8'), salt, iter, 32, 'sha256');

const enc = buf => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  return { iv, ct: Buffer.concat([c.update(buf), c.final(), c.getAuthTag()]) };
};

/* 1. placeholder PDFs -> docs/*.bin */
const outDir = path.join(REPO, 'docs');
fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });
const ids = [];
for(const group of Object.values(DOCS)){
  for(const [id, title] of group){
    const pdf = makePdf('DEMO - ' + title, [
      'This is a placeholder document for the public demo of tokyo-itinerary-map.',
      'In the real trip site this file was the original booking PDF, encrypted',
      'with AES-256-GCM and only readable after entering the site password.',
      '',
      `document id : ${id}`,
      'booking ref : DEMO-0000 (fictional)',
      'passenger   : DEMO TRAVELER (fictional)',
      '',
      'No real personal data is contained in this repository.',
    ]);
    const e = enc(pdf);
    fs.writeFileSync(path.join(outDir, id + '.bin'), Buffer.concat([e.iv, e.ct]));
    ids.push(id);
    console.error(`docs/${id}.bin  ${(pdf.length/1024).toFixed(1)}KB`);
  }
}

/* 2. vault HTML -> VAULT constant in index.html */
const v = enc(Buffer.from(VAULT_HTML, 'utf8'));
const json = JSON.stringify({ iter, salt: salt.toString('base64'), iv: v.iv.toString('base64'), ct: v.ct.toString('base64') });
const idx = path.join(REPO, 'index.html');
const html = fs.readFileSync(idx, 'utf8');
if(!/^const VAULT = \{.*\};$/m.test(html)) throw new Error('VAULT constant not found in index.html');
fs.writeFileSync(idx, html.replace(/^const VAULT = \{.*\};$/m, 'const VAULT = ' + json + ';'));
console.error(`index.html VAULT updated (password: ${password})`);

/* 3. remind about the service worker precache list */
console.error('\nsw.js PRECACHE should list exactly these docs:\n' + ids.map(i => `  '/docs/${i}.bin',`).join('\n'));
console.error('…and bump VERSION in sw.js so installed clients refetch.');
