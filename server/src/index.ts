import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import { ensureAdminUser } from './db.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'

const app = express()
const port = Number(process.env.PORT || 3001)

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

await ensureAdminUser()

app.listen(port, () => {
  console.log(`[server] http://localhost:${port}`)
})
