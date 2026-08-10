import { Router } from 'express'
import { requireAuth, requireActiveMember } from '../middleware.js'
import { formatAiError, generateWithGemini, isGeminiConfigured } from '../gemini.js'
import { INTERPRET_PARAGRAPH_MAX_CHARS, INTERPRET_SYSTEM_PROMPT } from '../interpretPrompt.js'
import { buildPalaceInterpretPrompt } from '../palacePrompt.js'

const router = Router()

router.get('/status', requireAuth, (_req, res) => {
  res.json({
    enabled: isGeminiConfigured(),
    provider: 'gemini',
  })
})

router.post('/', requireAuth, requireActiveMember, async (req, res) => {
  const { palaceJson, userInfo } = req.body ?? {}

  if (!palaceJson || typeof palaceJson !== 'string') {
    res.status(400).json({ error: '缺少宮位資料' })
    return
  }

  if (!isGeminiConfigured()) {
    res.status(503).json({ error: 'AI 解盤功能尚未開放，請稍後再試。' })
    return
  }

  try {
    const result = await generateWithGemini({
      system: INTERPRET_SYSTEM_PROMPT,
      prompt: buildPalaceInterpretPrompt(palaceJson, `用戶資料：${JSON.stringify(userInfo ?? {})}`),
      maxOutputTokens: INTERPRET_PARAGRAPH_MAX_CHARS * 5,
    })

    const text = result.text.trim()
    if (!text) {
      console.error('[interpret] empty response', result.finishReason)
      res.status(500).json({ error: 'AI 解盤失敗，請稍後再試。' })
      return
    }

    res.type('text/plain; charset=utf-8').send(text)
  } catch (err) {
    console.error('[interpret]', err)
    if (!res.headersSent) {
      res.status(500).json({ error: formatAiError(err) })
    }
  }
})

export default router
