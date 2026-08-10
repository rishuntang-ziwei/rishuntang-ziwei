import { Router } from 'express'
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'
import { consumeGuestAiQuota } from '../db.js'
import { clientIp, GUEST_DAILY_AI_LIMIT } from '../guestQuota.js'
import {
  buildGuestInterpretSystemPrompt,
  GUEST_ANSWER_MAX_CHARS,
  GUEST_TOPICS,
  normalizeGuestTopic,
} from '../guestInterpretPrompt.js'

const router = Router()

function isGuestInterpretEnabled() {
  return Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim())
}

router.get('/status', (_req, res) => {
  res.json({
    enabled: isGuestInterpretEnabled(),
    provider: 'gemini',
    topics: GUEST_TOPICS,
    answerMaxChars: GUEST_ANSWER_MAX_CHARS,
    dailyLimit: GUEST_DAILY_AI_LIMIT,
  })
})

router.post('/interpret', async (req, res) => {
  const { palaceJson, topic } = req.body ?? {}

  if (!palaceJson || typeof palaceJson !== 'string') {
    res.status(400).json({ error: '缺少宮位資料' })
    return
  }

  if (!isGuestInterpretEnabled()) {
    res.status(503).json({ error: '命盤解析功能尚未開放，請稍後再試。' })
    return
  }

  const ip = clientIp(req)
  const quota = await consumeGuestAiQuota(ip)
  if (!quota.allowed) {
    res.status(429).json({
      error: `今日免費解析次數已用完（${GUEST_DAILY_AI_LIMIT} 次），請明日再試或註冊會員使用完整功能。`,
      quota,
    })
    return
  }

  const normalizedTopic = normalizeGuestTopic(topic)
  const topicMeta = GUEST_TOPICS[normalizedTopic]

  try {
    const result = streamText({
      model: google('gemini-2.0-flash'),
      system: buildGuestInterpretSystemPrompt(normalizedTopic),
      prompt: `主題：${topicMeta.label}。宮位數據：${palaceJson}`,
      maxOutputTokens: GUEST_ANSWER_MAX_CHARS * 2,
    })

    await result.pipeTextStreamToResponse(res)
  } catch (err) {
    console.error('[guest/interpret]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: '命盤解析失敗' })
    }
  }
})

export default router
