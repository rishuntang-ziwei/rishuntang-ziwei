import { useState } from 'react'
import { requestPasswordReset } from '../../lib/api'

export function ForgotPasswordForm({
  onSwitchLogin,
  onVerified,
}: {
  onSwitchLogin: () => void
  onVerified: (resetToken: string) => void
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        setSubmitting(true)
        try {
          const data = await requestPasswordReset({
            email: email.trim(),
            phone: phone.trim(),
          })
          onVerified(data.resetToken)
        } catch (err) {
          setError(err instanceof Error ? err.message : '驗證失敗')
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <h2>忘記密碼</h2>
      <p className="auth-note">請輸入註冊時的 Email 與電話，驗證成功後即可重設密碼</p>

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        註冊電話
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="例如 0912345678"
          required
        />
      </label>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" disabled={submitting}>
        {submitting ? '驗證中…' : '驗證身分'}
      </button>

      <button type="button" className="auth-link-btn" onClick={onSwitchLogin}>
        返回登入
      </button>
    </form>
  )
}
