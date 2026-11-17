# 日舜堂簡易本命排盤 · Capacitor Android

免登入、離線可用的本命盤 App：輸入性別／國曆生日／時辰後排盤，並提供命／財／事／夫／疾初步解讀。

## 架構

| 層級 | 說明 |
|------|------|
| [`../free-paipan/`](../free-paipan/) | **網頁版 UI 單一來源**（GitHub Pages 亦直接服務此目錄） |
| `scripts/sync-www.mjs` | 自 `free-paipan/` 改寫相對路徑後，連同 vendor／主題／圖示複製到 `www/` |
| Capacitor 7 | `appId`：`com.rishuntang.freepaipan`，`webDir`：`www` |

UI 請改 [`free-paipan/`](../free-paipan/)；勿在 `www/` 或已移除的 `app/` 副本直接改碼。

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
