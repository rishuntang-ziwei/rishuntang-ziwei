import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

/** 2026-08：gemini-2.0-flash 已下線，優先使用 2.5 / 3.x */
const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
] as const

function sanitizeApiKey(raw: string) {
  let key = raw.trim()
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim()
  }
  return key
}

function getApiKey() {
  const raw =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY ??
    ''
  return sanitizeApiKey(raw)
}

export function getGeminiKeyMeta() {
  const key = getApiKey()
  return {
    configured: Boolean(key),
    keyLength: key.length,
    looksValid: /^AIza[\w-]{30,}$/.test(key),
  }
}

export function isGeminiConfigured() {
  return getGeminiKeyMeta().configured
}

function googleModel(modelId: string) {
  return createGoogleGenerativeAI({ apiKey: getApiKey() })(modelId)
}

export function formatAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (
    lower.includes('api key not valid') ||
    lower.includes('api_key_invalid') ||
    lower.includes('api key') ||
    lower.includes('apikey')
  ) {
    return 'AI 服務金鑰無效。請至 Google AI Studio 建立新金鑰，並在 Render 更新 GOOGLE_GENERATIVE_AI_API_KEY 後重新部署。'
  }
  if (lower.includes('permission denied') || lower.includes('referer') || lower.includes('referrer')) {
    return 'AI 金鑰限制了使用來源，請在 Google AI Studio 建立「不限網站」的伺服器用金鑰。'
  }
  if (
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('429') ||
    lower.includes('resource exhausted')
  ) {
    return 'AI 服務請求過於頻繁或已達上限，請稍後再試。'
  }
  if (lower.includes('billing')) {
    return 'AI 服務需要啟用 Google 帳單，請聯絡管理員。'
  }
  if (lower.includes('not found') || lower.includes('model') || lower.includes('deprecated')) {
    return 'AI 模型暫不可用，請稍後再試。'
  }

  return '命盤解析失敗，請稍後再試。'
}

export async function generateWithGemini(input: {
  system: string
  prompt: string
  maxOutputTokens: number
}) {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('Google Generative AI API key is missing')
  }

  let lastError: unknown
  for (const modelId of GEMINI_MODEL_CANDIDATES) {
    try {
      return await generateText({
        model: googleModel(modelId),
        system: input.system,
        prompt: input.prompt,
        maxOutputTokens: input.maxOutputTokens,
      })
    } catch (err) {
      lastError = err
      console.error(`[gemini] ${modelId} failed:`, err)
    }
  }

  throw lastError ?? new Error('All Gemini models failed')
}

export async function probeGeminiConnection() {
  const meta = getGeminiKeyMeta()
  if (!meta.configured) {
    return { ok: false as const, meta, error: '未設定 GOOGLE_GENERATIVE_AI_API_KEY' }
  }

  try {
    const result = await generateWithGemini({
      system: 'You are a test assistant.',
      prompt: 'Reply with exactly: OK',
      maxOutputTokens: 16,
    })
    return {
      ok: true as const,
      meta,
      sample: result.text.trim().slice(0, 40),
    }
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return {
      ok: false as const,
      meta,
      error: formatAiError(err),
      detail,
    }
  }
}
