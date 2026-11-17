# 日舜堂簡易本命排盤 · 網頁版

免登入本命排盤表單。提交後寫入 `sessionStorage.guestChartPayload`，並導向 `chart.html?guest=1&from=p`，以 **官方經典命盤視圖** 顯示本命盤，並附命／財／事／夫／疾初步解讀。

此目錄為 **GitHub Pages 與 Capacitor App 的表單 UI 單一來源**。

## 公開網址

https://rishuntang-ziwei.github.io/rishuntang-ziwei/p/

舊網址 `/free-paipan/` 會導向 `/p/`（`noindex,follow`，canonical 指向 `/p/`）。

Pages 部署以 repo 根目錄為 site root；本頁以相對路徑引用 `../css/`、`../icons/`、`../bracelet-card/assets/`，排盤結果則開啟根目錄的 `chart.html` guest 模式。

## Google Search Console

1. 在 [Google Search Console](https://search.google.com/search-console) 新增資源：`https://rishuntang-ziwei.github.io/rishuntang-ziwei/`
2. 完成網域／網址前置驗證後，於「Sitemaps」提交：
   `https://rishuntang-ziwei.github.io/rishuntang-ziwei/sitemap.xml`
3. 使用「網址檢查」抽查 `/p/`，確認可檢索且 canonical 正確。
4. 可再以「檢查即時網址」確認 `robots.txt` 允許爬取。

## 本機預覽

於 repo 根目錄起靜態伺服器後開啟 `/p/`，例如：

```bash
npx --yes serve -l 4173 .
# 開啟 http://localhost:4173/p/
```

填寫表單並送出後，應導向 `/chart.html?guest=1&from=p` 並看到經典本命盤與解讀分頁。

## Capacitor

Android 殼層見 [`mobile-free-paipan/`](../mobile-free-paipan/)。執行 `npm run sync-www` 會將本表單同步到 `www/p/`、複製 `chart.html` 與 guest 所需 vendor，並讓根 `index.html` 導向簡易排盤。
