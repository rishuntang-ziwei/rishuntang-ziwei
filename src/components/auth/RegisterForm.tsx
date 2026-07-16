export function RegisterForm({ onSwitchLogin }: { onSwitchLogin: () => void }) {
  return (
    <div className="auth-form">
      <h2>申請會員帳號</h2>
      <p className="auth-note">註冊需填寫出生資料（性別、曆法、日期、時辰），用於排本命命盤。</p>
      <p className="auth-note auth-note-muted">請使用正式會員登入頁完成註冊。</p>
      <button type="button" className="auth-link-btn" style={{ marginBottom: 8 }} onClick={() => { window.location.href = 'index.html' }}>
        前往註冊頁
      </button>
      <button type="button" className="auth-link-btn" onClick={onSwitchLogin}>
        已有帳號？返回登入
      </button>
    </div>
  )
}
