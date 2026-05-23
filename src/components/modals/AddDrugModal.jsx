import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function AddDrugModal({ patientId, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    drug_type: 'gaiyou',
    drug_name: '',
    description: '',
    prescribed_at: today,
  })
  const [saving, setSaving] = useState(false)
  const up = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    if (!form.drug_name.trim()) return
    setSaving(true)
    await db.addDrug(patientId, form)
    setSaving(false)
    onSaved?.()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">💊 外用・頓用薬を追加</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <div>
            <label className="field-label">種別 *</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[{ v: 'gaiyou', l: '外用' }, { v: 'ton', l: '頓用' }].map(o => (
                <label key={o.v} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                  <input
                    type="radio" name="drug_type" value={o.v}
                    checked={form.drug_type === o.v}
                    onChange={up('drug_type')}
                  />
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 10,
                    background: o.v === 'gaiyou' ? 'var(--sky-100)' : '#fef3c7',
                    color: o.v === 'gaiyou' ? 'var(--sky-700)' : '#92400e',
                  }}>{o.l}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="field-label">薬剤名 *</label>
            <input className="field-input" value={form.drug_name} onChange={up('drug_name')} placeholder="例：アズノール軟膏 40g" autoFocus />
          </div>
          <div>
            <label className="field-label">説明・用途</label>
            <input className="field-input" value={form.description} onChange={up('description')} placeholder="例：臀部発赤・表皮剥離部" />
          </div>
          <div>
            <label className="field-label">処方日</label>
            <input type="date" className="field-input" value={form.prescribed_at} onChange={up('prescribed_at')} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>キャンセル</button>
          <button className="btn btn-primary" onClick={save} disabled={saving || !form.drug_name.trim()}>
            {saving ? '追加中…' : '追加'}
          </button>
        </div>
      </div>
    </div>
  )
}
