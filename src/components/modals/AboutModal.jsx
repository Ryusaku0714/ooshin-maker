export default function AboutModal({ onClose }) {
  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 2000, padding: '16px' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: '#f5f5f3',
        borderRadius: 8,
        boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        maxWidth: 820,
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* ── ヘッダー ── */}
        <div style={{
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
          background: '#f5f5f3',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              border: '1.5px solid #0f1f4e',
              borderRadius: 5,
              padding: '3px 6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              lineHeight: 1,
            }}>
              📋
            </div>
            <span style={{
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: '1px',
              color: '#0f1f4e',
              textTransform: 'uppercase',
            }}>
              Bridgework
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              fontSize: 16,
              lineHeight: 1,
              padding: '2px 4px',
              fontFamily: 'inherit',
            }}
            aria-label="閉じる"
          >✕</button>
        </div>

        {/* ── ボディ（左右 or 縦積み） ── */}
        <div className="about-modal-body">
          {/* 左60%：テキストエリア */}
          <div className="about-modal-text">
            {/* Eyebrow */}
            <div style={{
              fontSize: 10,
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              marginBottom: 18,
            }}>
              About this app
            </div>

            {/* キャッチコピー */}
            <h2 style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: '-0.5px',
              lineHeight: 1.25,
              color: '#0f1f4e',
              margin: '0 0 28px',
            }}>
              医療の<br />
              <span style={{ color: '#c9a84c' }}>見えない</span>を<br />
              埋める。
            </h2>

            {/* 本文 */}
            <div style={{
              fontSize: 13,
              color: '#334155',
              lineHeight: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}>
              <p>薬剤師は、処方箋に応えるだけでなく「情報を持ち込む人」であれると思っています。</p>
              <p>往診に同行するとき、医師・看護師・施設スタッフ・そして患者さんに、薬剤師だからこそ気づける情報を届けたい。どんな薬を使っているか。他の科からどんな処方が出ているか。外用薬は今も使われているか。日数はちゃんとつながっているか。</p>
              <p>紹介・逆紹介という医療の流れの中で、そのつなぎ目に落ちてしまいがちな情報を、チームの一員として拾い上げる。それがBridgeworkの考える薬剤師の役割です。</p>
              <p>このアプリは、その「情報をつなぐ」ための道具として作りました。</p>
            </div>
          </div>

          {/* 右40%：橋のSVGビジュアル */}
          <div className="about-modal-visual">
            <BridgeSVG />
          </div>
        </div>
      </div>
    </div>
  )
}

function BridgeSVG() {
  return (
    <svg
      width="100%"
      viewBox="0 0 360 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="bw-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0f7ff" />
          <stop offset="100%" stopColor="#dbeafe" />
        </linearGradient>
        <linearGradient id="bw-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.25" />
        </linearGradient>
      </defs>

      {/* 空 */}
      <rect width="360" height="260" fill="url(#bw-sky)" />

      {/* 水面 */}
      <rect x="0" y="196" width="360" height="64" fill="url(#bw-water)" />

      {/* 水面境界の柔らかな波 */}
      <path d="M0 196 Q90 192 180 196 Q270 200 360 196" fill="none" stroke="#93c5fd" strokeWidth="1" opacity="0.5" />

      {/* 水面の波紋 */}
      <path d="M28 212 Q62 206 96 212"  stroke="#7dd3fc" strokeWidth="1" opacity="0.55" />
      <path d="M140 218 Q174 212 208 218" stroke="#7dd3fc" strokeWidth="1" opacity="0.55" />
      <path d="M258 210 Q288 204 318 210" stroke="#7dd3fc" strokeWidth="1" opacity="0.55" />

      {/* アーチの水面反射（淡く） */}
      <path d="M 20 198 Q 180 252 340 198" stroke="#0f1f4e" strokeWidth="2.5" opacity="0.1" />

      {/* 橋台（左右の基礎） */}
      <rect x="0"   y="188" width="24" height="72" fill="#64748b" rx="1" />
      <rect x="336" y="188" width="24" height="72" fill="#64748b" rx="1" />
      {/* 橋台笠石 */}
      <rect x="0"   y="184" width="26" height="7" fill="#475569" rx="1" />
      <rect x="334" y="184" width="26" height="7" fill="#475569" rx="1" />

      {/*
        アーチ曲線：2次ベジェ P0=(20,188) 制御=(180,-74) P2=(340,188)
        → 頂点(t=0.5)が (180, 58) になるよう計算
        x(t) = (1-t)²·20 + 2t(1-t)·180 + t²·340
        y(t) = (1-t)²·188 + 2t(1-t)·(-74) + t²·188
        頂点: y = 0.25·188 + 0.5·(-74) + 0.25·188 = 94 - 37 = 57 ≈ 58
      */}

      {/* 吊り材（ゴールド vertical hangers） */}
      {/* t=0.15: x≈68,  y≈121 */}
      {/* t=0.25: x≈100, y≈90  */}
      {/* t=0.35: x≈132, y≈69  */}
      {/* t=0.45: x≈164, y≈59  */}
      {/* t=0.50: x≈180, y≈58  (頂点) */}
      {/* t=0.55: x≈196, y≈59  */}
      {/* t=0.65: x≈228, y≈69  */}
      {/* t=0.75: x≈260, y≈90  */}
      {/* t=0.85: x≈292, y≈121 */}
      <line x1="68"  y1="121" x2="68"  y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="100" y1="90"  x2="100" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="132" y1="69"  x2="132" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="164" y1="59"  x2="164" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="180" y1="58"  x2="180" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="196" y1="59"  x2="196" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="228" y1="69"  x2="228" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="260" y1="90"  x2="260" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />
      <line x1="292" y1="121" x2="292" y2="188" stroke="#c9a84c" strokeWidth="1.5" opacity="0.9" />

      {/* メインアーチ（ネイビー太線） */}
      <path d="M 20 188 Q 180 -74 340 188" stroke="#0f1f4e" strokeWidth="7" strokeLinecap="round" />
      {/* アーチのゴールドハイライト */}
      <path d="M 20 188 Q 180 -74 340 188" stroke="#c9a84c" strokeWidth="2" strokeLinecap="round" opacity="0.55" />

      {/* 橋桁（路面） */}
      <rect x="20" y="185" width="320" height="8" fill="#0f1f4e" rx="2" />
      {/* 路面ゴールドライン */}
      <rect x="20" y="185" width="320" height="2.5" fill="#c9a84c" opacity="0.65" />

      {/* アーチ足元の接合部（ゴールド円） */}
      <circle cx="20"  cy="188" r="4.5" fill="#c9a84c" />
      <circle cx="340" cy="188" r="4.5" fill="#c9a84c" />
      {/* アーチ頂点のキャップ */}
      <circle cx="180" cy="58" r="5" fill="#c9a84c" />
    </svg>
  )
}
