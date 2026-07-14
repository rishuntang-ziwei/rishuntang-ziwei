# 藍新金流（NewebPay）Render 設定指南

正式環境請在 **Render Dashboard** 設定金流環境變數。  
**HashKey、HashIV 請只填在 Render，不要貼在聊天、GitHub 或任何公開地方。**

---

## 請您現在做（手機即可）

1. 開啟 [Render Dashboard](https://dashboard.render.com)
2. 進入 Web Service：**rishuntang-ziwei-api**
3. 左側選 **Environment**
4. 依下表 **新增** 各變數（值請向藍新後台或管理員索取，勿公開分享）：

| 變數 | 填什麼 |
|------|--------|
| `NEWEBPAY_MERCHANT_ID` | 商店代號 |
| `NEWEBPAY_HASH_KEY` | HashKey（僅填 Render） |
| `NEWEBPAY_HASH_IV` | HashIV（僅填 Render） |
| `NEWEBPAY_TEST_MODE` | 先填 `true`（測試環境） |
| `NEWEBPAY_ALLOW_MOCK` | `false` |
| `PUBLIC_APP_URL` | `https://rishuntang-ziwei-api.onrender.com` |
| `PUBLIC_SITE_URL` | `https://rishuntang-ziwei.github.io/rishuntang-ziwei` |

5. 點 **Save Changes**
6. 回到服務首頁 → **Manual Deploy** → **Deploy latest commit**（重新部署）

---

## 目前卡點（重要）

金鑰填好之後，還需要 **後端已部署含藍新金流的程式**，付款才會生效。

可用瀏覽器快速檢查：

| 網址 | 正常 | 尚未就緒 |
|------|------|----------|
| `https://rishuntang-ziwei-api.onrender.com/api/health` | 回 JSON，`ok: true` | 無法連線 |
| `https://rishuntang-ziwei-api.onrender.com/api/payment/plans` | 回方案列表 JSON | **404**（代表後端還沒有付款程式） |

若 `/api/payment/plans` 仍是 **404**，代表 **只填金鑰還不夠**，必須把含藍新功能的程式部署到 Render。

---

## 程式部署（需含金流 API）

正式 GitHub Pages 仍指向 **rishuntang-ziwei** 原版 repo，請擇一：

1. **有電腦時**：將含金流的分支合併到 `main`，推送後在 Render 重新部署（最穩）
2. **Render 改部署來源**：將服務連到已含金流程式碼的 repo／分支
3. **請 Agent 代推**：若已開放 Agent 對原版 repo 的寫入權限，可請 Agent 合併並推送

金流相關 API 預期包含（部署成功後可測）：

- `GET /api/payment/plans` — 方案列表
- `POST /api/payment/checkout` — 建立付款（需登入）
- `POST /api/payment/newebpay/notify` — 藍新背景通知（由藍新伺服器呼叫）

---

## 設定完成後請回報

Render 環境變數存檔並重新部署後，請回覆：

> **Render 已設定**

若 `/api/payment/plans` 已非 404，代表金流後端已上線，可進一步測試付款流程。

---

## 上線前檢查清單

- [ ] `DATABASE_URL` 已設定（Neon PostgreSQL，見 [NEON-SETUP.md](./NEON-SETUP.md)）
- [ ] 藍新六個環境變數已填入 Render（HashKey / HashIV 未外洩）
- [ ] `NEWEBPAY_TEST_MODE=true` 完成測試後，改 `false` 再部署（正式收款）
- [ ] `/api/health` 正常
- [ ] `/api/payment/plans` 回傳方案（非 404）
- [ ] 藍新後台「Notify URL」指向：`https://rishuntang-ziwei-api.onrender.com/api/payment/newebpay/notify`（若後端路由名稱不同，以程式為準）

---

## 本機開發（選用）

在 `server/.env` 可參考 `.env.example` 填入相同變數名稱。  
本機若設 `NEWEBPAY_ALLOW_MOCK=true`，部分流程可跳過真實金流（僅開發用，正式 Render 請設 `false`）。

```bash
cd server
npm run dev
```

---

## 安全提醒

- **不要** 在 LINE、Email、GitHub Issue 貼 HashKey / HashIV
- **不要** 把金鑰 commit 進 Git
- 若金鑰曾外洩，請至藍新後台 **重新產生** HashKey / HashIV，並更新 Render 環境變數
