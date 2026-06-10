import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function AddTeamModal({ facilityId, onClose, onSaved }) {
  const [form, setForm] = useState({ clinic_name: '', team_name: '' })
  const [saving, setSaving] = useState(false)
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.team_name.trim()) return
    setSaving(true)
    await db.addTeam(facilityId, form)
    setSaving(false)
    onSaved?.()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 520 }}>
        <div className="modal-title">🏥 チームを追加</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="field-label">クリニック名（任意）</label>
            <input className="field-input" value={form.clinic_name} onChange={up('clinic_name')} placeholder="例：さくらCL / 空白でもOK" autoFocus />
          </div>
          <div>
            <label className="field-label">往診名称 *</label>
            <input className="field-input" value={form.team_name} onChange={up('team_name')} placeholder="例：往診チームA / ○曜日往診" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.team_name.trim()}>
            {saving ? '追加中…' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
