import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { sanitizeInterpretOutput } from './sanitizeInterpretOutput.js'

/** 優先使用較少思考輸出的模型 */
const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
] as const

type GeminiGenerateResult = {
  text: string
  finishReason: string
}

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

function getKeyType(key: string) {
  if (key.startsWith('AQ.')) return 'auth'
  if (key.startsWith('AIza')) return 'standard'
  return 'unknown'
}

function looksValidKey(key: string) {
  if (/^AIza[\w-]{30,}$/.test(key)) return true
  if (/^AQ\.[\w.-]{20,}$/.test(key)) return true
  return false
}

export function getGeminiKeyMeta() {
  const key = getApiKey()
  return {
    configured: Boolean(key),
    keyLength: key.length,
    keyType: getKeyType(key),
    looksValid: looksValidKey(key),
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
    lower.includes('invalid authentication credentials')
  ) {
    return 'AI 服務金鑰無效或未完整貼上。請在 Render 更新 GOOGLE_GENERATIVE_AI_API_KEY 後重新部署。'
  }
  if (lower.includes('permission denied') || lower.includes('referer') || lower.includes('referrer')) {
    return 'AI 金鑰限制了使用來源，請在 Google AI Studio 建立伺服器用金鑰。'
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

async function generateWithGeminiRest(
  modelId: string,
  input: { system: string; prompt: string; maxOutputTokens: number },
): Promise<GeminiGenerateResult> {
  const apiKey = getApiKey()
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: input.system }] },
        contents: [{ role: 'user', parts: [{ text: input.prompt }] }],
        generationConfig: {
          maxOutputTokens: input.maxOutputTokens,
          temperature: 0.5,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
  )

  const data = (await res.json()) as {
    error?: { message?: string }
    candidates?: Array<{
      finishReason?: string
      content?: { parts?: Array<{ text?: string; thought?: boolean }> }
    }>
  }

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini HTTP ${res.status}`)
  }

  const text = sanitizeInterpretOutput(
    (data.candidates?.[0]?.content?.parts ?? [])
      .filter((part) => !part.thought)
      .map((part) => part.text ?? '')
      .join('')
      .trim(),
  )

  return {
    text,
    finishReason: data.candidates?.[0]?.finishReason ?? 'unknown',
  }
}

export async function generateWithGemini(input: {
  system: string
  prompt: string
  maxOutputTokens: number
}): Promise<GeminiGenerateResult> {
  const apiKey = getApiKey()
  if (!apiKey) {
    throw new Error('Google Generative AI API key is missing')
  }

  let lastError: unknown
  for (const modelId of GEMINI_MODEL_CANDIDATES) {
    try {
      return await generateWithGeminiRest(modelId, input)
    } catch (restErr) {
      lastError = restErr
      console.error(`[gemini/rest] ${modelId} failed:`, restErr)
    }

    try {
      const sdkResult = await generateText({
        model: googleModel(modelId),
        system: input.system,
        prompt: input.prompt,
        maxOutputTokens: input.maxOutputTokens,
        temperature: 0.5,
      })
      return {
        text: sanitizeInterpretOutput(sdkResult.text.trim()),
        finishReason: sdkResult.finishReason ?? 'unknown',
      }
    } catch (sdkErr) {
      lastError = sdkErr
      console.error(`[gemini/sdk] ${modelId} failed:`, sdkErr)
    }
  }

  throw lastError ?? new Error('All Gemini models failed')
}

export async function probeGeminiConnection() {
  const meta = getGeminiKeyMeta()
  if (!meta.configured) {
    return { ok: false as const, meta, error: '未設定 GOOGLE_GENERATIVE_AI_API_KEY' }
  }

  if (!meta.looksValid) {
    return {
      ok: false as const,
      meta,
      error: '金鑰長度或格式異常，可能未完整複製。請重新 Copy key 並貼到 Render。',
      detail: `keyType=${meta.keyType}, keyLength=${meta.keyLength}`,
    }
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
