import LegalFooter from '../LegalFooter'

export default function Login({ onLogin }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--sky-50)',
      paddingBottom: 34,
    }}>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '40px 36px',
        boxShadow: '0 8px 40px rgba(7,89,133,0.12)',
        textAlign: 'center',
        maxWidth: 360,
        width: '100%',
      }}>
        {/* Logo */}
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" style={{ marginBottom: 12 }}>
          <rect x="4" y="4" width="24" height="28" rx="4" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5"/>
          <rect x="4" y="4" width="7" height="28" rx="3" fill="#38bdf8"/>
          <line x1="14" y1="12" x2="24" y2="12" stroke="#bae6fd" strokeWidth="1.5"/>
          <line x1="14" y1="17" x2="24" y2="17" stroke="#bae6fd" strokeWidth="1.5"/>
          <line x1="14" y1="22" x2="21" y2="22" stroke="#bae6fd" strokeWidth="1.5"/>
        </svg>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--sky-800)', marginBottom: 4 }}>
          往診資料メーカー
        </h1>
        <p style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 28 }}>
          施設薬剤師の往診をスマートに
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '11px 0', fontSize: 14 }}
          onClick={onLogin}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google でログイン
        </button>
        <p style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 20 }}>
          個人情報は保護され、第三者に共有されません
        </p>
      </div>
      <LegalFooter />
    </div>
  )
}
