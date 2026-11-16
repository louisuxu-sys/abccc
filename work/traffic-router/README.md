# 活動分流後台

給單一管理員使用的自架 A/B 分流工具。需要 Node.js 24，使用內建 SQLite，不需安裝 npm 套件或申請第三方 API。預設使用本機的 `traffic.sqlite`，啟動時會自動建立資料庫。

## 在 Windows 上啟動

解壓縮後在該資料夾開啟 PowerShell，執行以下指令。

```powershell
node server.mjs
```

瀏覽器直接開啟 `http://127.0.0.1:8787/admin`。預設本機模式免登入。若你先前在同一個終端設定過 `ADMIN_PASSWORD`，可執行 `Remove-Item Env:ADMIN_PASSWORD` 後再啟動。按 `Ctrl+C` 可停止。

## 建立活動

1. 按「新增路由」，輸入名稱、推廣平台、原始頁面（A）和落地頁面（B）。
2. 展開「分流與連結選項」可自訂網址代號、同網址純文字模式及 A 流量比例。新路由預設 A 為 0%，讓符合規則的訪客到 B。分組 Cookie 保留 30 天，調整比例時部分訪客可能改組。
3. 在路由列表按「規則」設定裝置、台北時區的推廣時段、國家、地區與 ASN。未符合規則時會使用 A。
4. 按「取得連結」查看推廣網址、開啟測試或查看 UTM 來源。左側「儀表板」可看 A/B 累計次數。把路由狀態改成「停用」即可暫停。

跳轉模式保留目的地原有參數，並轉送訪客網址中的 `utm_*`、`gclid`、`gbraid`、`wbraid`、`fbclid` 和 `msclkid`。同名以訪客連結上的值為準。同網址模式使用內建樣式顯示純文字，適合測試文案。次數統計包含重複造訪、管理員手動開啟及機器人流量。

## 放到自己的伺服器

- 使用 Node.js 24 的伺服器，以固定工作目錄及持久儲存執行，並用系統服務管理自動重啟。設定 `ADMIN_PASSWORD` 為至少 16 個字元，管理員帳號為 `admin`。
- 使用 HTTPS 反向代理將 `/admin` 和 `/r/` 轉發到 `127.0.0.1:8787`，設定 `COOKIE_SECURE=1`，保留原始查詢參數，並略過這些路徑的 CDN 快取。管理後台使用 HTTP Basic Auth，對外使用時須經 HTTPS。
- 建議在反向代理限制 `/admin` 只允許自己的網路或 IP，並依實際流量設定限流。程式沒有內建機器人辨識或代理 IP 查詢。
- 可透過 `PORT` 更改監聽埠、用 `DB_PATH` 指定 SQLite 路徑，並用 `PUBLIC_ORIGIN` 指定公開基底網址，例如 `https://go.example.com`。簡單備份方式是先停止程式，再複製資料庫及任何同名 `-wal` 檔案。
- 國家、地區及 ASN 規則需由反向代理接入 GeoIP／ASN 資料。設定 `ROUTER_PROXY_SECRET` 為隨機共用密鑰，代理必須先清除客戶端傳入的 `X-Router-*`，再注入 `X-Router-Secret`、`X-Router-Country`（ISO 兩碼）、`X-Router-Region`（名稱或代碼）和 `X-Router-ASN`（數字或 AS 開頭）。資料缺漏時，該條件會把訪客送往 A。ASN 欄位使用自己提供的清單。
