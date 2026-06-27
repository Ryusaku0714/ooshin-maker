import { useState } from 'react'
import LegalModal from './LegalModal'

export default function LegalFooter() {
  const [legal, setLegal] = useState(null)

  return (
    <>
      <div
        style={{
          borderTop: '1px solid #dce4f0',
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
          className="legal-link"
        >
          プライバシーポリシー
        </button>
        <span style={{ fontSize: 10, color: '#dce4f0' }}>｜</span>
        <button
          onClick={() => setLegal('terms')}
          className="legal-link"
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
