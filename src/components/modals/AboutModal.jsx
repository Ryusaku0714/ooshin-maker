const NOTE_URL = 'https://note.com/gentle_pansy1797'

export default function AboutModal({ onClose }) {
  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 2000, padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#f5f5f3',
        width: '100%',
        maxWidth: 680,
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(15,31,78,0.25)',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}>
        {/* ── nav ── */}
        <div style={{
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: "'Inter', sans-serif",
            fontWeight: 700,
            fontSize: 14,
            color: '#0f1f4e',
            letterSpacing: '1px',
          }}>
            <div style={{
              width: 18,
              height: 18,
              border: '1.5px solid #0f1f4e',
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
            }}>
              📋
            </div>
            BRIDGEWORK
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="閉じる"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: 14,
              cursor: 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              lineHeight: 1,
            }}
          >✕</button>
        </div>

        {/* スマホ縦専用：上部ビジュアル */}
        <div className="about-visual-top-mobile">
          <svg viewBox="0 0 360 90" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
            <defs>
              <linearGradient id="about-mtop" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#0f1f4e" />
                <stop offset="100%" stopColor="#2563eb" />
              </linearGradient>
            </defs>
            <path d="M -20 75 Q 180 -10, 380 75" stroke="url(#about-mtop)" strokeWidth="7" fill="none" strokeLinecap="round" />
            <path d="M -20 82 Q 180 5, 380 82" stroke="#c9a84c" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.6" />
          </svg>
        </div>

        {/* ── main ── */}
        <div className="about-main-area">
          <div className="about-left-area">
            <div style={{
              fontSize: 10,
              color: '#94a3b8',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              fontFamily: "'Inter', sans-serif",
              marginBottom: 12,
            }}>
              About this app
            </div>

            <div className="about-catch" style={{
              fontWeight: 900,
              color: '#0f1f4e',
              lineHeight: 1.4,
              marginBottom: 18,
              letterSpacing: '-0.5px',
            }}>
              医療の<span style={{ color: '#c9a84c' }}>見えない</span>を埋める。
            </div>

            <div className="about-desc" style={{ color: '#475569', lineHeight: 1.95 }}>
              <p style={{ marginBottom: 13 }}>薬剤師は、処方箋に応えるだけでなく<strong style={{ color: '#0f1f4e', fontWeight: 700 }}>「情報を持ち込む人」</strong>であれると思っています。</p>
              <p style={{ marginBottom: 13 }}>往診に同行するとき、医師・看護師・施設スタッフ・そして患者さんに、薬剤師だからこそ気づける情報を届けたい。どんな薬を使っているか。他の科からどんな処方が出ているか。外用薬は今も使われているか。日数はちゃんとつながっているか。</p>
              <p style={{ marginBottom: 13 }}>紹介・逆紹介という医療の流れの中で、そのつなぎ目に落ちてしまいがちな情報を、チームの一員として拾い上げる。それがBridgeworkの考える薬剤師の役割です。</p>
              <p style={{ marginBottom: 0 }}>このアプリは、その「情報をつなぐ」ための道具として作りました。</p>
            </div>
          </div>

          <div className="about-right-area">
            <svg viewBox="0 0 300 320" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
              <defs>
                <linearGradient id="about-bridge" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0f1f4e" />
                  <stop offset="100%" stopColor="#2563eb" />
                </linearGradient>
              </defs>
              <path d="M -20 250 Q 150 30, 320 250" stroke="url(#about-bridge)" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M -20 270 Q 150 70, 320 270" stroke="#c9a84c" strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.6" />
              <circle cx="40" cy="245" r="5" fill="#0f1f4e" />
              <circle cx="260" cy="245" r="5" fill="#0f1f4e" />
              <line x1="40" y1="245" x2="40" y2="320" stroke="#94a3b8" strokeWidth="2" />
              <line x1="260" y1="245" x2="260" y2="320" stroke="#94a3b8" strokeWidth="2" />
            </svg>
          </div>
        </div>

        {/* ── footer ── */}
        <div style={{
          padding: '16px 28px',
          borderTop: '1px solid rgba(15,31,78,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'white',
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0f1f4e' }}>{'薬剤師　鈴木隆索'}</div>
          <button
            type="button"
            onClick={() => window.open(NOTE_URL, '_blank', 'noopener,noreferrer')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#0f1f4e',
              color: 'white',
              padding: '8px 16px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            📝 公式noteを読む
          </button>
        </div>
      </div>
    </div>
  )
}
