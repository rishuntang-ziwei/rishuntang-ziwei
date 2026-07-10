import { useState } from 'react'
import { LoginForm } from './LoginForm'
import { RegisterForm } from './RegisterForm'

export function AuthShell() {
  const [mode, setMode] = useState<'login' | 'register'>('login')

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <h1>紫微斗數線上排盤</h1>
          <p>國際日舜堂會員專區</p>
        </div>
        {mode === 'login' ? (
          <LoginForm onSwitchRegister={() => setMode('register')} />
        ) : (
          <RegisterForm onSwitchLogin={() => setMode('login')} />
        )}
      </div>
    </div>
  )
}
