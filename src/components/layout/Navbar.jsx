import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { printWithAutoFit } from '../../lib/printFit'
import AboutModal from '../modals/AboutModal'

const NOTE_URL = 'https://note.com/gentle_pansy1797'

export default function Navbar({ user, onSignOut, onOpenZanyaku, scale, onSetScale, onResetView }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const [showAbout, setShowAbout] = useState(false)

  const displayName = user?.user_metadata?.name ?? user?.email ?? ''

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }
  const close = () => setOpen(false)

  const runAndClose = (fn) => () => { close(); fn() }

  return (
    <nav style={{
      background: 'var(--color-primary)',
      borderBottom: '3px solid var(--color-accent)',
      padding: '10px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      zIndex: 100,
    }}>
      <button
        type="button"
        onClick={() => setShowAbout(true)}
        title="Bridgeworkについて"
        aria-label="Aboutを開く"
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 700, fontSize: 15, color: 'var(--color-text-white)',
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, fontFamily: 'inherit', minWidth: 0,
        }}
      >
        <div style={{
          background: 'transparent',
          border: '1.5px solid var(--color-gold)',
          borderRadius: 'var(--radius-sm)',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="4" width="24" height="28" rx="4" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
            <rect x="4" y="4" width="7" height="28" rx="3" fill="rgba(255,255,255,0.5)"/>
            <line x1="14" y1="12" x2="24" y2="12" stroke="white" strokeWidth="1.5"/>
            <line x1="14" y1="17" x2="24" y2="17" stroke="white" strokeWidth="1.5"/>
            <line x1="14" y1="22" x2="21" y2="22" stroke="white" strokeWidth="1.5"/>
            <g transform="translate(22,22) rotate(-30)">
              <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#f97316" clipPath="url(#lnav)"/>
              <clipPath id="lnav"><rect x="-7" y="-4" width="7" height="8"/></clipPath>
              <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#ec4899" clipPath="url(#rnav)"/>
              <clipPath id="rnav"><rect x="0" y="-4" width="7" height="8"/></clipPath>
              <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="none" stroke="white" strokeWidth="0.8"/>
            </g>
          </svg>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span className="nav-title" style={{ fontFamily: 'var(--font-base)', fontWeight: 700, color: 'var(--color-text-white)' }}>往診資料メーカー</span>
          <span style={{ fontSize: 9, color: 'var(--color-gold)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 2 }}>Bridgework</span>
        </div>
      </button>

      {user && (
        <>
          <button
            ref={btnRef}
            type="button"
            className="btn btn-sm"
            onClick={toggle}
            title="メニュー"
            aria-label="メニュー"
            aria-haspopup="menu"
            aria-expanded={open}
            style={{
              fontSize: 16,
              lineHeight: 1,
              padding: '6px 11px',
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--color-gold)',
              border: '1px solid var(--color-gold)',
              borderRadius: 'var(--radius-sm)',
            }}
          >☰</button>
          {open && pos && createPortal(
            <>
              <div className="row-menu-overlay" onClick={close} />
              <div className="row-menu" style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: 200 }}>
                <div className="nav-menu-username">{displayName}</div>
                <div className="nav-menu-divider" />
                <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--sky-100)' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
                    🔤 文字サイズ
                  </div>
                  <div style={{ display: 'flex', gap: 3, background: '#f1f5fb', borderRadius: 8, padding: 3 }}>
                    {[['標準', 1], ['ゆとり', 1.15], ['大', 1.3]].map(([label, v]) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => onSetScale(v)}
                        style={{
                          flex: 1, padding: '4px 8px', borderRadius: 6, border: 'none',
                          fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                          background: scale === v ? '#0f1f4e' : 'transparent',
                          color: scale === v ? '#ffffff' : '#64748b',
                        }}
                      >{label}</button>
                    ))}
                  </div>
                </div>
                <button type="button" className="row-menu-item" onClick={runAndClose(() => printWithAutoFit())}>
                  🖨️ 印刷
                </button>
                <button type="button" className="row-menu-item" onClick={runAndClose(() => onOpenZanyaku?.())}>
                  💊 加算確認
                </button>
                <button
                  type="button"
                  className="row-menu-item"
                  onClick={runAndClose(() => window.open(NOTE_URL, '_blank', 'noopener,noreferrer'))}
                >
                  📝 公式note
                </button>
                <button type="button" className="row-menu-item" onClick={runAndClose(onResetView)}>
                  ↩️ 表示を初期化
                </button>
                <div className="nav-menu-divider" />
                <button type="button" className="row-menu-item" style={{ color: '#dc2626' }} onClick={runAndClose(onSignOut)}>
                  🚪 ログアウト
                </button>
              </div>
            </>,
            document.body
          )}
        </>
      )}

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </nav>
  )
}
