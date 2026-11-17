# 日舜堂簡易本命排盤 · 網頁版

免登入本命排盤（表單 + 命盤格 + 命／財／事／夫／疾初步解讀）。此目錄為 **GitHub Pages 與 Capacitor App 的 UI 單一來源**。

## 公開網址

https://rishuntang-ziwei.github.io/rishuntang-ziwei/free-paipan/

Pages 部署以 repo 根目錄為 site root；本頁以相對路徑引用 `../vendor/`、`../css/`、`../icons/`、`../bracelet-card/assets/`。

## 本機預覽

於 repo 根目錄起靜態伺服器後開啟 `/free-paipan/`，例如：

```bash
npx --yes serve -l 4173 .
# 開啟 http://localhost:4173/free-paipan/
```

## Capacitor

Android 殼層見 [`mobile-free-paipan/`](../mobile-free-paipan/)。執行 `npm run sync-www` 會從此目錄改寫路徑後同步到 `www/`。
