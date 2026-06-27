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
        <div className="modal-header">
          <div className="modal-title">📝 {title}</div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="メモを入力してください"
            autoFocus
            rows={6}
            style={{
              width: '100%', boxSizing: 'border-box',
              fontSize: 13, border: '1.5px solid #dce4f0',
              borderRadius: 8, padding: '8px 10px',
              fontFamily: 'inherit', lineHeight: 1.7, resize: 'vertical',
              outline: 'none', color: '#1e293b',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = '#1e3a8a' }}
            onBlur={e => { e.target.style.borderColor = '#dce4f0' }}
          />
        </div>
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
