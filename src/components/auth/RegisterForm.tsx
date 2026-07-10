import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'

export function RegisterForm({ onSwitchLogin }: { onSwitchLogin: () => void }) {
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setSubmitting(true)
        try {
          const message = await register({
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim(),
            password,
            confirmPassword,
          })
          setSuccess(message)
        } catch (err) {
          setError(err instanceof Error ? err.message : '註冊失敗')
        } finally {
          setSubmitting(false)
        }
      }}
    >
      <h2>申請會員帳號</h2>
      <p className="auth-note">註冊後需等待管理員開通，開通後才能登入排盤</p>

      <label>
        姓名
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        電話
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="例如 0912345678"
          required
        />
      </label>
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
      <label>
        確認密碼
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>

      {error && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <button type="submit" disabled={submitting}>
        {submitting ? '送出中…' : '送出申請'}
      </button>

      <button type="button" className="auth-link-btn" onClick={onSwitchLogin}>
        已有帳號？返回登入
      </button>
    </form>
  )
}
