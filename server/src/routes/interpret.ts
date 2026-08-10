import { Router } from 'express'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { requireAuth, requireActiveMember } from '../middleware.js'

const router = Router()

const systemPrompt = `
你是一位精通紫微斗數的命理大師。請針對用戶提供的「命宮、事業宮、夫妻宮」數據進行深度解析。

解析要求：
1. 命宮：分析核心性格、格局高低及人生主軸。
2. 事業宮：分析職涯傾向、適合的行業、職場易遇到的挑戰。
3. 夫妻宮：分析感情觀、配偶特質、婚姻維繫建議。
4. 綜合分析：說明這三個宮位的連動關係（例如事業如何影響感情）。

注意：請使用繁體中文，語氣要專業、溫暖且具啟發性。使用 Markdown 格式輸出。
`.trim()

function isInterpretEnabled() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim())
}

router.get('/status', requireAuth, (_req, res) => {
  res.json({
    enabled: isInterpretEnabled(),
    provider: 'gemini',
  })
})

router.post('/', requireAuth, requireActiveMember, async (req, res) => {
  const { palaceJson, userInfo } = req.body ?? {}

  if (!palaceJson || typeof palaceJson !== 'string') {
    res.status(400).json({ error: '缺少宮位資料' })
    return
  }

  if (!isInterpretEnabled()) {
    res.status(503).json({ error: 'AI 解盤功能尚未開放，請稍後再試。' })
    return
  }

  try {
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: systemPrompt,
      prompt: `用戶資料：${JSON.stringify(userInfo ?? {})}。宮位數據：${palaceJson}`,
    })

    await result.pipeTextStreamToResponse(res)
  } catch (err) {
    console.error('[interpret]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: 'AI 解盤失敗' })
    }
  }
})

export default router
