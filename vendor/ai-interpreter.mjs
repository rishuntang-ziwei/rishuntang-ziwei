export async function fetchInterpretStatus(apiBase, token) {
  const res = await fetch(`${apiBase}/api/interpret/status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) return { enabled: false }
  return res.json()
}

export async function fetchGuestInterpretStatus(apiBase) {
  const res = await fetch(`${apiBase}/api/guest/status`)
  if (!res.ok) return { enabled: false }
  return res.json()
}

function withTimeoutSignal(signal, timeoutMs) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  const abort = () => {
    clearTimeout(timer)
    controller.abort()
  }

  if (signal) {
    if (signal.aborted) {
      clearTimeout(timer)
      controller.abort()
    } else {
      signal.addEventListener('abort', abort, { once: true })
    }
  }

  return controller.signal
}

export async function streamInterpret({ apiBase, token, palaceJson, userInfo, onUpdate, signal }) {
  const res = await fetch(`${apiBase}/api/interpret`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ palaceJson, userInfo, prompt: '' }),
    signal: withTimeoutSignal(signal, 90000),
  })

  if (!res.ok) {
    let message = 'AI 解盤失敗'
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch (_) {
      /* ignore */
    }
    throw new Error(message)
  }

  if (!res.body) throw new Error('AI 解盤失敗')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onUpdate(text)
  }

  if (!text.trim()) throw new Error('AI 未能產生解析，請稍後再試。')

  return text
}

export async function streamGuestInterpret({ apiBase, palaceJson, topic, onUpdate, signal }) {
  const res = await fetch(`${apiBase}/api/guest/interpret`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ palaceJson, topic }),
    signal: withTimeoutSignal(signal, 90000),
  })

  if (!res.ok) {
    let message = 'AI 解盤失敗'
    try {
      const data = await res.json()
      if (data.error) message = data.error
    } catch (_) {
      /* ignore */
    }
    throw new Error(message)
  }

  if (!res.body) throw new Error('AI 解盤失敗')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    text += decoder.decode(value, { stream: true })
    onUpdate(text)
  }

  if (!text.trim()) throw new Error('AI 未能產生解析，請稍後再試。')

  return text
}
