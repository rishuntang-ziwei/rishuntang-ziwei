import { Router } from 'express'
import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { getGuestAiQuota, incrementGuestAiQuota } from '../db.js'
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
  const quota = await getGuestAiQuota(ip)
  if (!quota.allowed) {
    res.status(429).json({
      error: `今日免費解析次數已用完（${GUEST_DAILY_AI_LIMIT} 次），請明日再試或註冊會員使用完整功能。`,
      quota: quota.quota,
    })
    return
  }

  const normalizedTopic = normalizeGuestTopic(topic)
  const topicMeta = GUEST_TOPICS[normalizedTopic]

  try {
    const result = await generateText({
      model: google('gemini-2.0-flash'),
      system: buildGuestInterpretSystemPrompt(normalizedTopic),
      prompt: `主題：${topicMeta.label}。宮位數據：${palaceJson}`,
      maxOutputTokens: 1024,
    })

    const text = result.text.trim()
    if (!text) {
      console.error('[guest/interpret] empty response', result.finishReason)
      res.status(500).json({ error: 'AI 未能產生解析，請稍後再試。' })
      return
    }

    await incrementGuestAiQuota(ip)
    res.type('text/plain; charset=utf-8').send(text.slice(0, GUEST_ANSWER_MAX_CHARS))
  } catch (err) {
    console.error('[guest/interpret]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: '命盤解析失敗，請稍後再試。' })
    }
  }
})

export default router
