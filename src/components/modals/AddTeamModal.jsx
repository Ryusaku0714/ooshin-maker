import { useState } from 'react'
import { db } from '../../hooks/useData'

const SCHEDULES = [
  '第1・3週 水曜', '第2・4週 水曜', '毎週 水曜', '隔週 木曜',
  '第1・3週 木曜', '第2・4週 木曜', '毎週 木曜', 'カスタム',
]

export default function AddTeamModal({ facilityId, onClose, onSaved }) {
  const [form, setForm] = useState({
    clinic_name: '', team_name: '',
    visit_schedule: SCHEDULES[0],
    default_rx_days: 14, grace_days: 1, pharmacist_name: '',
  })
  const [saving, setSaving] = useState(false)
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.clinic_name.trim() || !form.team_name.trim()) return
    setSaving(true)
    await db.addTeam(facilityId, {
      ...form,
      default_rx_days: Number(form.default_rx_days),
      grace_days: Number(form.grace_days),
    })
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
            <label className="field-label">クリニック名 *</label>
            <input className="field-input" value={form.clinic_name} onChange={up('clinic_name')} placeholder="例：さくらCL" autoFocus />
          </div>
          <div>
            <label className="field-label">チーム名 *</label>
            <input className="field-input" value={form.team_name} onChange={up('team_name')} placeholder="例：チーム①" />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label className="field-label">往診スケジュール</label>
            <select className="field-input" value={form.visit_schedule} onChange={up('visit_schedule')}>
              {SCHEDULES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label">通常処方日数</label>
            <input type="number" className="field-input" value={form.default_rx_days} onChange={up('default_rx_days')} min={1} max={90} />
          </div>
          <div>
            <label className="field-label">猶予日数（薬局設定）</label>
            <input type="number" className="field-input" value={form.grace_days} onChange={up('grace_days')} min={0} max={14} />
          </div>
          <div style={{ gridColumn: '1/-1' }}>
            <label className="field-label">担当薬剤師</label>
            <input className="field-input" value={form.pharmacist_name} onChange={up('pharmacist_name')} placeholder="例：山田T" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.clinic_name.trim() || !form.team_name.trim()}>
            {saving ? '追加中…' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
