import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { ensureAdminUser } from './db.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import chartRoutes from './routes/charts.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/charts', chartRoutes)

await ensureAdminUser()

app.listen(port, '0.0.0.0', () => {
  console.log(`[server] listening on port ${port}`)
})
