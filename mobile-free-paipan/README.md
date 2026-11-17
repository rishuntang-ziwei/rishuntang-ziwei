# 日舜堂簡易本命排盤 · Capacitor Android

免登入、離線可用的本命盤 App：輸入性別／國曆生日／時辰後排盤，並提供命／財／事／夫／疾初步解讀。

## 架構

| 層級 | 說明 |
|------|------|
| `app/` | 單頁 UI（表單 + 命盤格 + 解讀面板） |
| `scripts/sync-www.mjs` | 複製 app + vendor／主題／圖示到 `www/` |
| Capacitor 7 | `appId`：`com.rishuntang.freepaipan`，`webDir`：`www` |

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
