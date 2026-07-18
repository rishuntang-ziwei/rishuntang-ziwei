import { useState } from 'react'
import { resetPassword } from '../../lib/api'

export function ResetPasswordForm({
  resetToken,
  onSwitchLogin,
}: {
  resetToken: string
  onSwitchLogin: () => void
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSubmitting(true)
        try {
          const data = await resetPassword({
            resetToken,
            newPassword,
            confirmPassword,
          })
          setSuccess(data.message)
          setDone(true)
          window.setTimeout(onSwitchLogin, 1800)
        } catch (err) {
          setError(err instanceof Error ? err.message : '重設失敗')
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <h2>重設密碼</h2>
      <p className="auth-note">請設定新密碼（至少 8 個字元）</p>

      <label>
        新密碼
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          disabled={done}
        />
      </label>
      <label>
        確認新密碼
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          disabled={done}
        />
      </label>

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <button type="submit" disabled={submitting || done}>
        {submitting ? '更新中…' : '更新密碼'}
      </button>

      <button type="button" className="auth-link-btn" onClick={onSwitchLogin}>
        返回登入
      </button>
    </form>
  )
}
