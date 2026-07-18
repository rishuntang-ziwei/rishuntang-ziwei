import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'
import { ForgotPasswordForm } from './ForgotPasswordForm'
import { ResetPasswordForm } from './ResetPasswordForm'

const ANCESTOR_IMG = '/assets/zushi-jiangziya.png?v=20260717'
const ANCESTOR_CAPTION = '日舜堂傳承中華文化'

export function AuthShell() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login')
  const [resetToken, setResetToken] = useState('')

  let form
  if (mode === 'register') {
    form = <RegisterForm onSwitchLogin={() => setMode('login')} />
  } else if (mode === 'forgot') {
    form = (
      <ForgotPasswordForm
        onSwitchLogin={() => setMode('login')}
        onVerified={(token) => {
          setResetToken(token)
          setMode('reset')
        }}
      />
    )
  } else if (mode === 'reset') {
    form = (
      <ResetPasswordForm
        resetToken={resetToken}
        onSwitchLogin={() => {
          setResetToken('')
          setMode('login')
        }}
      />
    )
  } else {
    form = (
      <LoginForm
        onSwitchRegister={() => setMode('register')}
        onSwitchForgot={() => setMode('forgot')}
      />
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-split-wrap">
        <div className="auth-ancestor-panel">
          <img src={ANCESTOR_IMG} alt={ANCESTOR_CAPTION} loading="lazy" />
          <p className="auth-ancestor-caption">{ANCESTOR_CAPTION}</p>
        </div>
        <div className="auth-card auth-card-in-split">
          <div className="auth-brand">
            <h1>國際日舜堂</h1>
            <p>紫微斗數線上排盤 · 會員專區</p>
          </div>
          {form}
        </div>
      </div>
    </div>
  )
}
