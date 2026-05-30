import { useState } from 'react'
import { createPortal } from 'react-dom'
import LegalModal from './LegalModal'

/**
 * createPortal で document.body に直接レンダリングするフッター。
 * #root の overflow:hidden / height:100vh の影響を受けない。
 */
export default function LegalFooter() {
  const [legal, setLegal] = useState(null)

  return createPortal(
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          zIndex: 999,
          height: 34,
          background: 'rgba(255,255,255,0.96)',
          borderTop: '1px solid #e0f2fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}
      >
        <button
          onClick={() => setLegal('privacy')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: '#94a3b8', fontFamily: 'inherit',
          }}
        >
          プライバシーポリシー
        </button>
        <span style={{ fontSize: 10, color: '#cbd5e1' }}>|</span>
        <button
          onClick={() => setLegal('terms')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: '#94a3b8', fontFamily: 'inherit',
          }}
        >
          利用規約
        </button>
      </div>

      {legal && (
        <LegalModal type={legal} onClose={() => setLegal(null)} />
      )}
    </>,
    document.body
  )
}
