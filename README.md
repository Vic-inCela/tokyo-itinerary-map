# 東京五日遊 · 路線圖行程（Demo）

單一 `index.html` 的旅遊行程網站：Google Maps 路線圖 + 每日行程面板 + 行前資訊 + 加密的訂位憑證分頁，可安裝成離線 PWA。

**這是公開示範版。** 所有訂位編號、乘客姓名、PIN、保單號碼、司機聯絡方式都是虛構的範例資料；行程本身（景點、路線、車資、時間）是真實規劃過的內容。

- 解鎖密碼：`demo`
- 「憑證」分頁與 📄 PDF 皆以 AES-256-GCM 加密存放（金鑰 = PBKDF2(密碼, salt, 310k, SHA-256)），瀏覽器端用 WebCrypto 解密。

## 目錄

| 路徑 | 說明 |
| --- | --- |
| `index.html` | 整個網站（樣式、行程資料、地圖、加密解鎖邏輯） |
| `docs/*.bin` | 加密後的佔位 PDF（`iv[12] ‖ ciphertext ‖ tag`） |
| `make-vault.js` | 產生 `docs/*.bin` 並把新的 `VAULT` 密文寫回 `index.html` |
| `sw.js` | 離線快取用 service worker；改動內容後記得調 `VERSION` |
| `manifest.webmanifest`、`icon-*.png` | PWA 安裝資訊 |

## 重新產生憑證

```bash
node make-vault.js demo
```

會用新的隨機 salt 重新加密所有文件與憑證 HTML。若要換成自己的資料：改 `make-vault.js` 裡的 `VAULT_HTML` 與 `DOCS`（把 `makePdf` 換成讀取真實 PDF），然後用自己的密碼跑一次，並把真實資料與腳本留在公開 repo 之外。

## 本機預覽

```bash
npx -y serve -l 4173 .
```

地圖的 Maps JavaScript API 金鑰有 referrer 限制，只在正式網域載入；本機預覽時地圖底圖不會出現是正常的。
