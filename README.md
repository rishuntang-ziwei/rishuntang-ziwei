# 國際日舜堂 · 紫微斗數線上排盤

- 正式前端（GitHub Pages）：`chart.html`、`index.html`
- 正式 API（Render）：`rishuntang-ziwei-api`

## 部署設定文件

| 文件 | 用途 |
|------|------|
| [server/NEON-SETUP.md](./server/NEON-SETUP.md) | Neon 資料庫 + Render `DATABASE_URL` |
| [server/NEWEBPAY-SETUP.md](./server/NEWEBPAY-SETUP.md) | 藍新金流 Render 環境變數（手機可照做） |

## 本機開發

```bash
npm install
cd server && npm install && npm run dev
npm run dev   # 根目錄 Vite（app.html）
```

---

# React + TypeScript + Vite（開發版）

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
