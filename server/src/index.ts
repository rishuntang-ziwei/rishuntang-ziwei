import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { ensureAdminUser, getDbInfo, initDb } from './db.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import chartRoutes from './routes/charts.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json())

app.get('/api/health', async (_req, res) => {
  try {
    const db = await getDbInfo()
    res.json({ ok: true, db })
  } catch (err) {
    console.error('[health]', err)
    res.status(500).json({ ok: false, error: '資料庫連線失敗' })
  }
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/charts', chartRoutes)

await initDb()
const dbInfo = await getDbInfo()
console.log('[db]', dbInfo)
await ensureAdminUser()

app.listen(port, '0.0.0.0', () => {
  console.log(`[server] listening on port ${port}`)
})
