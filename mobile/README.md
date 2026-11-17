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
npm run build:ios         # sync 至 iOS 專案（僅同步；編譯需 macOS 或雲端 Mac）
```

首次需先 `npx cap add android` / `npx cap add ios`（產生的原生目錄已列入 `.gitignore`）。  
CI 的 iOS workflow 會自動 `cap add ios`，本機不必提交 `ios/`。

> `build:ios` 只做 `sync-www` + `cap sync ios`；實際編譯／簽名請用本機 Xcode，或下方 GitHub Actions 雲端 macOS runner。

## 與網站的關係

- 網站 `star-draw/`、`vendor/auth-*.js` 仍是單一來源；App 透過 `sync-www` 複製，勿在 `www/` 直接改碼。
- 網站與 App 共用同一後端會員／神牌授權 API。

## iOS 雲端編譯（GitHub Actions）

Workflow：[.github/workflows/ios-build.yml](../.github/workflows/ios-build.yml)  
Runner：`macos-14`（GitHub 託管）。手動觸發：`Actions` → **iOS Cloud Build** → `Run workflow`。

### 模式

| mode | 說明 | 需要 Apple secrets？ |
|------|------|----------------------|
| `verify`（預設） | 無簽名 `xcodebuild`，確認雲端可編過 | 否 |
| `release` | 簽名 archive 並匯出 IPA，上傳 artifact + GitHub Release | 是 |

`export_method`（僅 `release`）：

| 值 | 用途 |
|----|------|
| `ad-hoc`（預設） | 直裝測試機（裝置須在 Provisioning Profile 內） |
| `app-store` | App Store Connect／TestFlight 上傳用 IPA |

### Apple Developer 準備

1. Apple Developer 帳號建立 App ID：`com.rishuntang.xianshi`。
2. 建立 Distribution Certificate（`.p12` + 密碼）。
3. 建立對應 Provisioning Profile：
   - Ad Hoc：列出可安裝的 UDID。
   - App Store：給 TestFlight／上架用。
4. 將 `.p12` 與 `.mobileprovision` 轉成 base64 後寫入 repo secrets（見下表）。

### Repo secrets

在 GitHub → Settings → Secrets and variables → Actions 設定：

| Secret | 說明 |
|--------|------|
| `APPLE_CERTIFICATE_BASE64` | Distribution `.p12` 的 base64 |
| `APPLE_CERTIFICATE_PASSWORD` | `.p12` 密碼 |
| `APPLE_PROVISIONING_PROFILE_BASE64` | `.mobileprovision` 的 base64 |
| `APPLE_TEAM_ID` | Apple Team ID（10 字元） |

簽名腳本：`mobile/ios-ci/import-signing.sh`（CI 匯入暫存 keychain）。  
ExportOptions 樣板：`mobile/ios-ci/ExportOptions.ad-hoc.plist.template`、`ExportOptions.app-store.plist.template`。

### 手動觸發範例

```bash
# 僅驗證可編譯（不需 secrets）
gh workflow run ios-build.yml -f mode=verify

# Ad Hoc IPA
gh workflow run ios-build.yml -f mode=release -f export_method=ad-hoc

# TestFlight／App Store IPA
gh workflow run ios-build.yml -f mode=release -f export_method=app-store
```

`release` 成功後：Actions artifact（`xianshi-ios-<method>`）與 GitHub Release（tag `ios-<method>-YYYYMMDDHHMM`）都會附上 IPA。
