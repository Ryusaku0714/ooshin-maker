import { printWithAutoFit } from '../../lib/printFit'

export default function Navbar({ user, onSignOut }) {
  return (
    <nav style={{
      background: 'rgba(255,255,255,0.92)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--sky-100)',
      padding: '10px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexShrink: 0,
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: 'var(--sky-800)', minWidth: 0 }}>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none" style={{ flexShrink: 0 }}>
          <rect x="4" y="4" width="24" height="28" rx="4" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="1.5"/>
          <rect x="4" y="4" width="7" height="28" rx="3" fill="#38bdf8"/>
          <line x1="14" y1="12" x2="24" y2="12" stroke="#bae6fd" strokeWidth="1.5"/>
          <line x1="14" y1="17" x2="24" y2="17" stroke="#bae6fd" strokeWidth="1.5"/>
          <line x1="14" y1="22" x2="21" y2="22" stroke="#bae6fd" strokeWidth="1.5"/>
          <g transform="translate(22,22) rotate(-30)">
            <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#f97316" clipPath="url(#lnav)"/>
            <clipPath id="lnav"><rect x="-7" y="-4" width="7" height="8"/></clipPath>
            <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="#ec4899" clipPath="url(#rnav)"/>
            <clipPath id="rnav"><rect x="0" y="-4" width="7" height="8"/></clipPath>
            <ellipse cx="0" cy="0" rx="7" ry="3.5" fill="none" stroke="white" strokeWidth="0.8"/>
          </g>
        </svg>
        <span className="nav-title">往診資料メーカー</span>
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
        {user && (
          <span className="nav-username" style={{ fontSize: 11, color: 'var(--gray-500)' }}>
            {user.user_metadata?.name ?? user.email}
          </span>
        )}
        <button className="btn btn-outline btn-sm" onClick={() => printWithAutoFit()}>🖨️ 印刷</button>
        {user && (
          <button className="btn btn-outline btn-sm" onClick={onSignOut}>ログアウト</button>
        )}
      </div>
    </nav>
  )
}
