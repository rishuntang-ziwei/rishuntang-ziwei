import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export function LoginForm({ onSwitchRegister }: { onSwitchRegister: () => void }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
          await login(email.trim(), password)
        } catch (err) {
          setError(err instanceof Error ? err.message : '登入失敗')
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <h2>會員登入</h2>
      <p className="auth-note">請使用已開通的 Email 與密碼登入</p>

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        密碼
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>

      {error && <div className="auth-error">{error}</div>}

      <button type="submit" disabled={submitting}>
        {submitting ? '登入中…' : '登入'}
      </button>

      <button type="button" className="auth-link-btn" onClick={onSwitchRegister}>
        還沒有帳號？申請註冊
      </button>
    </form>
  )
}
