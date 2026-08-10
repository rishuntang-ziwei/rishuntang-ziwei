export function sanitizeInterpretOutput(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n').trim()
  if (!normalized) return normalized

  const lines = normalized.split('\n').map((line) => line.trim())
  const kept: string[] = []

  for (const line of lines) {
    if (!line) continue
    if (/^\*+\s/.test(line)) continue
    if (/^(wait|let's|look up|note:|think:|analysis:)/i.test(line)) continue

    const cjkCount = (line.match(/[\u4e00-\u9fff]/g) || []).length
    const latinCount = (line.match(/[a-zA-Z]/g) || []).length

    if (cjkCount === 0 && latinCount > 8) continue
    if (latinCount > cjkCount * 2 && cjkCount < 6) continue

    kept.push(line)
  }

  const joined = kept.join('\n').trim()
  if (joined) return joined

  const cjkChunks = normalized.match(/[\u4e00-\u9fff，。！？、；：「」『』（）《》—…\-0-9\s]+/g)
  if (cjkChunks) {
    const fallback = cjkChunks.map((chunk) => chunk.trim()).filter(Boolean).join('')
    if (fallback) return fallback
  }

  return normalized
}
