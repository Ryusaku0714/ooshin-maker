import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function AddFacilityModal({ onClose, onSaved }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    await db.addFacility(name.trim())
    setSaving(false)
    onSaved?.()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">🏠 施設を追加</div>
        <label className="field-label">施設名</label>
        <input
          className="field-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="例：施設A / 〇〇在宅CL"
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !name.trim()}>
            {saving ? '追加中…' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
