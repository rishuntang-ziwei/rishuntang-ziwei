import { useEffect, useMemo, useState } from 'react'
import { useCompletion } from '@ai-sdk/react'
import { getApiBase, getStoredToken } from '../lib/api'
import { formatPalaceDataFromAstrolabe } from '../utils/aiFormatter'
import type FunctionalAstrolabe from 'iztro/lib/astro/FunctionalAstrolabe'

type PalaceSummary = ReturnType<typeof formatPalaceDataFromAstrolabe>[number]

export interface AIInterpretationUserInfo {
  name: string
  gender: string
  calendar: string
  birthDate: string
  timeIndex: number | string
}

interface AIInterpretationProps {
  astrolabe: FunctionalAstrolabe
  userInfo: AIInterpretationUserInfo
}

export function AIInterpretation({ astrolabe, userInfo }: AIInterpretationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [statusLoaded, setStatusLoaded] = useState(false)
  const palaceData = useMemo<PalaceSummary[]>(
    () => formatPalaceDataFromAstrolabe(astrolabe),
    [astrolabe],
  )

  const { completion, complete, isLoading, error } = useCompletion({
    api: `${getApiBase()}/api/interpret`,
    headers: {
      Authorization: `Bearer ${getStoredToken() ?? ''}`,
    },
  })

  useEffect(() => {
    let cancelled = false

    async function loadStatus() {
      try {
        const res = await fetch(`${getApiBase()}/api/interpret/status`, {
          headers: {
            Authorization: `Bearer ${getStoredToken() ?? ''}`,
          },
        })
        if (!res.ok) throw new Error('status failed')
        const data = (await res.json()) as { enabled?: boolean }
        if (!cancelled) setEnabled(Boolean(data.enabled))
      } catch {
        if (!cancelled) setEnabled(false)
      } finally {
        if (!cancelled) setStatusLoaded(true)
      }
    }

    loadStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const handleStartAnalysis = async () => {
    if (!enabled) return
    setIsOpen(true)
    const palaceJson = JSON.stringify(palaceData)
    await complete('', { body: { palaceJson, userInfo } })
  }

  const buttonLabel = !statusLoaded
    ? '載入中…'
    : !enabled
      ? '🔮 AI 深度解盤（籌備中）'
      : isLoading
        ? '大師正在觀星中...'
        : '🔮 AI 深度解盤 (命/事/夫)'

  return (
    <div className="ai-interpret-wrap">
      <button
        type="button"
        onClick={handleStartAnalysis}
        className={`ai-interpret-btn${enabled ? '' : ' ai-interpret-btn--pending'}`}
        disabled={!statusLoaded || !enabled || isLoading}
        title={enabled ? undefined : 'AI 解盤功能籌備中，開放後即可使用'}
      >
        {buttonLabel}
      </button>
      {!enabled && statusLoaded && (
        <p className="ai-interpret-hint">此功能籌備中，正式開放後將提供命宮、事業宮、夫妻宮 AI 解析。</p>
      )}

      {isOpen && enabled && (
        <div className="ai-interpret-modal" role="dialog" aria-modal="true" aria-label="紫微 AI 命理報告">
          <div className="ai-interpret-dialog">
            <div className="ai-interpret-header">
              <h2 className="ai-interpret-title">紫微 AI 命理報告</h2>
              <button type="button" onClick={() => setIsOpen(false)} className="ai-interpret-close">
                關閉
              </button>
            </div>

            <div className="ai-interpret-body">
              {error ? (
                <p className="ai-interpret-error">{error.message || 'AI 解盤失敗，請稍後再試。'}</p>
              ) : completion ? (
                <div className="ai-interpret-content">{completion}</div>
              ) : (
                <div className="ai-interpret-loading">正在分析星盤能量...</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
