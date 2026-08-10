import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const GEMINI_MODEL_CANDIDATES = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'] as const

function getApiKey() {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim() ||
    ''
  )
}

export function isGeminiConfigured() {
  return Boolean(getApiKey())
}

function googleModel(modelId: string) {
  return createGoogleGenerativeAI({ apiKey: getApiKey() })(modelId)
}

export function formatAiError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  const lower = msg.toLowerCase()

  if (lower.includes('api key') || lower.includes('apikey') || lower.includes('permission denied')) {
    return 'AI 服務金鑰無效或未設定，請聯絡管理員。'
  }
  if (lower.includes('referer') || lower.includes('referrer') || lower.includes('restriction')) {
    return 'AI 金鑰限制了使用來源，請在 Google AI Studio 建立「不限網站」的伺服器用金鑰。'
  }
  if (lower.includes('quota') || lower.includes('rate limit') || lower.includes('429') || lower.includes('resource exhausted')) {
    return 'AI 服務請求過於頻繁或已達上限，請稍後再試。'
  }
  if (lower.includes('billing')) {
    return 'AI 服務需要啟用 Google 帳單，請聯絡管理員。'
  }
  if (lower.includes('not found') || lower.includes('model')) {
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
