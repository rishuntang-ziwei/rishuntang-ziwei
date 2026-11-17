# 日舜堂紫微排盤 · Capacitor Android App

將入口 portal 與核心 `chart.html` 排盤包裝成 Android 原生殼層（不含神牌／白板／手環／付費 UI）。

## 架構

| 層級 | 說明 |
|------|------|
| `portal/` | App 入口：介紹、註冊、登入、進入排盤 |
| `scripts/sync-www.mjs` | 複製 portal + 修補後的 `chart.html` + vendor／主題到 `www/` |
| Capacitor 7 | `appId`：`com.rishuntang.paipan`，`webDir`：`www` |

正式 API：`https://rishuntang-ziwei-api.onrender.com`（由 sync 寫入 `vendor/site-config.js`）。

審核通過（`admin` 或 `status === approved`）後進入 `./chart.html`。

## 本機指令

```bash
cd mobile-paipan
npm install
npm run sync-www
npx cap add android    # 首次
npm run build:android  # sync-www + cap sync android
```

產生的 `www/`、`android/` 已列入 `.gitignore`，請勿提交。

```bash
# 編譯 debug APK
cd android && ./gradlew assembleDebug
```
