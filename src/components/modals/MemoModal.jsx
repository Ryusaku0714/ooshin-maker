import { useState } from 'react'

export default function MemoModal({ title, initialMemo, onSave, onClose }) {
  const [memo, setMemo] = useState(initialMemo ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await onSave(memo.trim())
    setSaving(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div className="modal-title" style={{ margin: 0 }}>📝 {title}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1, padding: '0 2px' }}
          >✕</button>
        </div>
        <textarea
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="メモを入力してください"
          autoFocus
          rows={6}
          style={{
            width: '100%', boxSizing: 'border-box',
            fontSize: 13, border: '1.5px solid var(--sky-200)',
            borderRadius: 8, padding: '8px 10px',
            fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical',
            outline: 'none', color: 'var(--sky-900)',
            transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--sky-400)' }}
          onBlur={e => { e.target.style.borderColor = 'var(--sky-200)' }}
        />
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
