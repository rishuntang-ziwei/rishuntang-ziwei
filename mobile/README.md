# 先知斗數神牌 · Capacitor 雙平台 App

將現有 Web 神牌（`star-draw/`）與會員登入／授權流程包裝成 Android／iOS 原生殼層。

## 架構

| 層級 | 說明 |
|------|------|
| `portal/` | App 系統入口：登入、授權狀態、進入神牌 |
| `scripts/sync-www.mjs` | 把 portal + star-draw + 共用 auth／主題複製到 `www/` |
| Capacitor 7 | `appId`：`com.rishuntang.xianshi`，`webDir`：`www` |

正式 API 固定指向 Render：`https://rishuntang-ziwei-api.onrender.com`（由 sync 寫入 `vendor/site-config.js`）。

## 授權流程

1. 會員以 Email／密碼登入（與網站同一套帳號）。
2. 若尚未開通神牌，可送出「申請授權」→ `POST /api/star-draw/request-access`。
3. 狀態為「申請中」時等候管理員在會員資料庫開通。
4. 開通後即可進入神牌抽牌介面。

管理員開通後，申請時間欄位會清除；會員重新檢查即可進入。

## 本機指令

```bash
cd mobile
npm install
npm run sync-www          # 產生 www/
npm run cap:sync          # sync-www + cap sync
npm run cap:android       # 開啟 Android Studio
npm run cap:ios           # 開啟 Xcode（需 macOS）
npm run build:android     # sync 至 Android 專案
```

首次需先 `npx cap add android` / `npx cap add ios`（產生的原生目錄已列入 `.gitignore`）。

## 與網站的關係

- 網站 `star-draw/`、`vendor/auth-*.js` 仍是單一來源；App 透過 `sync-www` 複製，勿在 `www/` 直接改碼。
- 網站與 App 共用同一後端會員／神牌授權 API。
