import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { ensureAdminUser, getDbInfo, getDbDriverName, initDb } from './db.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import chartRoutes from './routes/charts.js'
import starDrawRoutes from './routes/starDraw.js'

if (process.env.RENDER && !process.env.DATABASE_URL?.trim()) {
  console.error(
    '[db] Render 正式環境必須設定 DATABASE_URL（建議使用 Neon 免費 PostgreSQL）。\n' +
      '請參考 server/NEON-SETUP.md 完成設定後重新部署。',
  )
  process.exit(1)
}

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    const db = await getDbInfo()
    const url = process.env.DATABASE_URL?.trim() ?? ''
    let databaseHost = ''
    if (url) {
      try {
        databaseHost = new URL(url).hostname
      } catch {
        databaseHost = '(格式錯誤)'
      }
    }
    res.json({
      ok: true,
      db,
      config: {
        render: Boolean(process.env.RENDER),
        hasDatabaseUrl: Boolean(url),
        selectedDriver: getDbDriverName(),
        databaseHost: databaseHost || null,
      },
    })
  } catch (err) {
    console.error('[health]', err)
    res.status(500).json({ ok: false, error: '資料庫連線失敗' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/charts', chartRoutes)
app.use('/api/star-draw', starDrawRoutes)

await initDb()
const dbInfo = await getDbInfo()
console.log('[db]', dbInfo)
await ensureAdminUser()

app.listen(port, '0.0.0.0', () => {
  console.log(`[server] listening on port ${port}`)
})
