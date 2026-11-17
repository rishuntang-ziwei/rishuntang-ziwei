# 日舜堂簡易本命排盤 · Capacitor Android

免登入本命盤 App：表單來自 `free-paipan/`，送出後以 `chart.html` guest 模式顯示官方經典命盤與命／財／事／夫／疾初步解讀。

## 架構

| 層級 | 說明 |
|------|------|
| [`../free-paipan/`](../free-paipan/) | **表單 UI 單一來源**（GitHub Pages 亦直接服務此目錄） |
| `scripts/sync-www.mjs` | 同步表單至 `www/free-paipan/`、根目錄導向該頁，並複製 `chart.html` 與 guest 所需 vendor |
| Capacitor 7 | `appId`：`com.rishuntang.freepaipan`，`webDir`：`www` |

UI 請改 [`free-paipan/`](../free-paipan/) 與根目錄 `chart.html`；勿在 `www/` 或已移除的 `app/` 副本直接改碼。

## 本機指令

```bash
cd mobile-free-paipan
npm install
npm run sync-www
npx cap add android    # 首次
npm run build:android  # sync-www + cap sync android
cd android && ./gradlew assembleDebug
```

產生的 `www/`、`android/` 已列入 `.gitignore`，請勿提交。

## 公開網頁版

https://rishuntang-ziwei.github.io/rishuntang-ziwei/free-paipan/
