import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function BasicInfoTab({ patient, onSaved }) {
  const [form, setForm] = useState({
    room_number: patient?.room_number ?? '',
    initial: patient?.initial ?? '',
    medical_history: patient?.medical_history ?? '',
    allergy_history: patient?.allergy_history ?? '',
    hospitalization_history: patient?.hospitalization_history ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const up = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    await db.updatePatient(patient.id, form)
    setSaving(false)
    setSaved(true)
    onSaved?.()
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="card">
      <div className="card-title">
        🏷️ 患者情報
        <button
          className={`btn btn-sm ${saved ? 'btn-outline' : 'btn-primary'}`}
          onClick={save}
          disabled={saving}
        >
          {saving ? '保存中…' : saved ? '✅ 保存済' : '💾 保存'}
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label className="field-label">部屋番号</label>
          <input className="field-input" value={form.room_number} onChange={up('room_number')} />
        </div>
        <div>
          <label className="field-label">イニシャル（任意）</label>
          <input className="field-input" value={form.initial} onChange={up('initial')} placeholder="例：SS" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="field-label">病歴・既往歴（任意）</label>
          <textarea className="field-input" rows={2} value={form.medical_history} onChange={up('medical_history')} placeholder="例：心不全 / 高血圧 / 骨粗鬆症" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="field-label">アレルギー歴（任意）</label>
          <textarea className="field-input" rows={2} value={form.allergy_history} onChange={up('allergy_history')} placeholder="例：セレコックス（発疹）/ エビ" />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="field-label">入院歴（任意）</label>
          <textarea className="field-input" rows={2} value={form.hospitalization_history} onChange={up('hospitalization_history')} placeholder="例：2024/5月 保土中 心不全増悪入院" />
        </div>
      </div>
    </div>
  )
}
