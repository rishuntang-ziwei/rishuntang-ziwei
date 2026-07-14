# Neon 免費資料庫設定（Render + GitHub Pages）

> 藍新金流設定請見 **[NEWEBPAY-SETUP.md](./NEWEBPAY-SETUP.md)**（Render 環境變數，手機可照做）。

正式環境請使用 **Neon PostgreSQL（$0）**，會員資料才會永久保存。

---

## 第一步：建立 Neon 資料庫

1. 開啟 [https://neon.tech](https://neon.tech) 並註冊（可用 GitHub 登入，**不需信用卡**）
2. 點 **Create a project**
   - Project name：例如 `rishuntang-ziwei`
   - Region：選 **AWS Asia Pacific (Singapore)** 或離你最近的區域
   - Postgres version：預設即可
3. 建立完成後，在 Dashboard 找到 **Connection string**
4. 選擇：
   - **Role**：`neondb_owner`（或預設）
   - **Database**：`neondb`（或預設）
   - **Connection pooling**：先選 **Off**（Direct connection，適合 Render 長連線）
5. 複製連線字串，格式類似：
   ```
   postgresql://neondb_owner:xxxxxxxx@ep-xxxx-xxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
6. 請妥善保存，不要公開到 GitHub

---

## 第二步：設定 Render 環境變數

1. 登入 [Render Dashboard](https://dashboard.render.com)
2. 進入 Web Service：**rishuntang-ziwei-api**
3. 左側選 **Environment**
4. 新增或編輯：
   | Key | Value |
   |-----|--------|
   | `DATABASE_URL` | 貼上 Neon 的 Connection string |
5. 若已有 Render 付費 PostgreSQL 的 `DATABASE_URL`，**改成 Neon 的連線字串**即可
6. 點 **Save Changes**

---

## 第三步：重新部署

1. 在 Render 服務頁點 **Manual Deploy** → **Deploy latest commit**
2. 等部署完成（約 2～5 分鐘）
3. 若未設定 `DATABASE_URL`，服務會無法啟動（日誌會提示）

---

## 第四步：確認成功

在瀏覽器開啟：

```
https://rishuntang-ziwei-api.onrender.com/api/health
```

應看到類似：

```json
{
  "ok": true,
  "db": {
    "driver": "postgres",
    "userCount": 1,
    "persistent": true
  }
}
```

- `driver` 必須是 **`postgres`**
- `userCount` 至少為 **1**（管理員帳號）

---

## 第五步：重新註冊會員

先前存在暫存 SQLite 的帳號已無法恢復，請：

1. 用管理員登入（`ADMIN_EMAIL` / `ADMIN_PASSWORD`）
2. 請會員重新註冊
3. 在會員管理開通帳號

---

## 常見問題

### 部署失敗：DATABASE_URL 未設定
在 Render Environment 加入 Neon 連線字串後重新部署。

### 連線錯誤 / SSL
Neon 連線字串結尾應包含 `?sslmode=require`，程式已自動處理 SSL。

### API 第一次很慢
Neon 與 Render 免費方案閒置後都會休眠，第一次請求可能慢 1～3 秒，屬正常現象。

### 本機開發
不設定 `DATABASE_URL` 時，本機仍使用 `server/data/app.db`（SQLite）。

```bash
cd server
npm run dev
```

---

## 費用

| 項目 | 費用 |
|------|------|
| Render Web（免費） | $0 |
| Neon PostgreSQL（免費） | $0 |
| GitHub Pages | $0 |

Neon 免費額度：0.5 GB 儲存、100 CU-hours/月，對本網站通常足夠。
