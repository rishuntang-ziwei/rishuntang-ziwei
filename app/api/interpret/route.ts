// app/api/interpret/route.ts
import { streamText } from 'ai'
import { google } from '@ai-sdk/google'

const systemPrompt = `
你是一位精通紫微斗數的命理大師。請針對用戶提供的「命宮、事業宮、夫妻宮」數據進行深度解析。

解析要求：
1. 命宮：分析核心性格、格局高低及人生主軸。
2. 事業宮：分析職涯傾向、適合的行業、職場易遇到的挑戰。
3. 夫妻宮：分析感情觀、配偶特質、婚姻維繫建議。
4. 綜合分析：說明這三個宮位的連動關係（例如事業如何影響感情）。

注意：請使用繁體中文，語氣要專業、溫暖且具啟發性。使用 Markdown 格式輸出。
`.trim()

export async function POST(req: Request) {
  const { palaceJson, userInfo } = await req.json()

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()) {
    return Response.json({ error: 'AI 解盤功能尚未開放' }, { status: 503 })
  }

  const result = streamText({
    model: google('gemini-2.0-flash'),
    system: systemPrompt,
    prompt: `用戶資料：${JSON.stringify(userInfo ?? {})}。宮位數據：${palaceJson}`,
  })

  return result.toTextStreamResponse()
}

export async function GET() {
  return Response.json({
    enabled: Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()),
    provider: 'gemini',
  })
}
