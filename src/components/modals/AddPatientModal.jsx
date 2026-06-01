import { useState } from 'react'
import { db } from '../../hooks/useData'

const toHalf = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))

export default function AddPatientModal({ teamId, onClose, onSaved }) {
  const [form, setForm] = useState({ room_number: '', initial: '' })
  const [saving, setSaving] = useState(false)
  const up = k => e => {
    const val = k === 'room_number' ? toHalf(e.target.value) : e.target.value
    setForm(f => ({ ...f, [k]: val }))
  }

  const save = async () => {
    if (!form.room_number.trim()) return
    setSaving(true)
    const { data } = await db.addPatient(teamId, form)
    setSaving(false)
    onSaved?.(data?.id)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">👤 患者を追加</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="field-label">部屋番号 *</label>
            <input className="field-input" value={form.room_number} onChange={up('room_number')} placeholder="例：101 / 個人在宅は①など" autoFocus />
          </div>
          <div>
            <label className="field-label">イニシャル（任意）</label>
            <input className="field-input" value={form.initial} onChange={up('initial')} placeholder="例：SS" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.room_number.trim()}>
            {saving ? '追加中…' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
