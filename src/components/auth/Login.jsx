import { useState } from 'react'
import LegalFooter from '../LegalFooter'

export default function Login({ onLogin }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f5fb',
      backgroundImage: [
        'linear-gradient(rgba(30,58,138,0.06) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(30,58,138,0.06) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: '20px 20px',
      padding: '20px 16px 34px',
      boxSizing: 'border-box',
    }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: '40px 32px',
          boxShadow: '0 8px 40px rgba(15,31,78,0.15)',
          border: '1px solid #dce4f0',
          textAlign: 'center',
        }}>
          {/* アイコン枠 */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1.5px solid #c9a84c',
            borderRadius: 8,
            padding: 8,
            marginBottom: 14,
          }}>
            <svg width="40" height="40" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="4" width="24" height="28" rx="4" fill="#e8eef8" stroke="#1e3a8a" strokeWidth="1.5"/>
              <rect x="4" y="4" width="7" height="28" rx="3" fill="#1e3a8a"/>
              <line x1="14" y1="12" x2="24" y2="12" stroke="#93c5fd" strokeWidth="1.5"/>
              <line x1="14" y1="17" x2="24" y2="17" stroke="#93c5fd" strokeWidth="1.5"/>
              <line x1="14" y1="22" x2="21" y2="22" stroke="#93c5fd" strokeWidth="1.5"/>
            </svg>
          </div>

          {/* タイトル */}
          <h1 style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#0f1f4e',
            fontFamily: "'Noto Sans JP', sans-serif",
            marginBottom: 4,
          }}>
            往診資料メーカー
          </h1>

          {/* サブテキスト BRIDGEWORK */}
          <p style={{
            color: '#c9a84c',
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            BRIDGEWORK
          </p>

          {/* 説明テキスト */}
          <p style={{
            fontSize: 13,
            color: '#64748b',
            marginBottom: 28,
          }}>
            施設薬剤師の往診をスマートに
          </p>

          {/* Googleログインボタン */}
          <button
            onClick={onLogin}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
              width: '100%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: hovered ? '#1e3a8a' : '#0f1f4e',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Noto Sans JP', sans-serif",
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google でログイン
          </button>

          {/* 注記テキスト */}
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 20 }}>
            個人情報は保護され、第三者に共有されません
          </p>
        </div>

        <LegalFooter />
      </div>
    </div>
  )
}
