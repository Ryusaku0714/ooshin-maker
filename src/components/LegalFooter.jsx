import { useState } from 'react'
import LegalModal from './LegalModal'

export default function LegalFooter() {
  const [legal, setLegal] = useState(null)

  return (
    <>
      <div
        style={{
          borderTop: '1px solid #e0f2fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: '8px 0 4px',
          marginTop: 8,
        }}
      >
        <button
          onClick={() => setLegal('privacy')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#64748b', fontFamily: 'inherit',
            padding: '4px 4px',
          }}
        >
          プライバシーポリシー
        </button>
        <span style={{ fontSize: 11, color: '#94a3b8' }}>|</span>
        <button
          onClick={() => setLegal('terms')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#64748b', fontFamily: 'inherit',
            padding: '4px 4px',
          }}
        >
          利用規約
        </button>
      </div>

      {legal && (
        <LegalModal type={legal} onClose={() => setLegal(null)} />
      )}
    </>
  )
}
