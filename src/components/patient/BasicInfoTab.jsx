import { useState, useEffect, useRef } from 'react'
import { db } from '../../hooks/useData'

export default function BasicInfoTab({ patient, onSaved, printMode = false, onDirtyChange }) {
  const [form, setForm] = useState({
    room_number: patient?.room_number ?? '',
    initial: patient?.initial ?? '',
    medical_history: patient?.medical_history ?? '',
    allergy_history: patient?.allergy_history ?? '',
    hospitalization_history: patient?.hospitalization_history ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const medicalRef      = useRef(null)
  const allergyRef      = useRef(null)
  const hospitalizationRef = useRef(null)

  const doResize = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => {
    doResize(medicalRef.current)
    doResize(allergyRef.current)
    doResize(hospitalizationRef.current)
  }, [patient?.id])

  const toHalf = s => s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
  const up = (k) => (e) => {
    const val = k === 'room_number' ? toHalf(e.target.value) : e.target.value
    setForm(f => ({ ...f, [k]: val }))
    if (e.target.tagName === 'TEXTAREA') doResize(e.target)
    onDirtyChange?.(true)
  }

  const save = async () => {
    setSaving(true)
    await db.updatePatient(patient.id, form)
    setSaving(false)
    setSaved(true)
    onDirtyChange?.(false)
    onSaved?.()
    setTimeout(() => setSaved(false), 2000)
  }

  // 印刷専用ビュー：textarea を使わず div で全文表示、空の任意項目は非表示
  if (printMode) {
    const fields = [
      { label: '病歴・既往歴', value: patient?.medical_history },
      { label: 'アレルギー歴', value: patient?.allergy_history },
      { label: '入院歴',       value: patient?.hospitalization_history },
    ].filter(f => f.value?.trim())

    if (fields.length === 0) return null

    return (
      <div className="card">
        <div className="card-title">🏷️ 患者背景</div>
        {fields.map(f => (
          <div key={f.label} style={{ marginBottom: 6 }}>
            <div className="field-label">{f.label}</div>
            <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.7, color: 'var(--gray-900)' }}>{f.value}</div>
          </div>
        ))}
      </div>
    )
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
          <textarea
            ref={medicalRef}
            className="field-input"
            rows={2}
            style={{ resize: 'none', overflowY: 'hidden', minHeight: '2.5em' }}
            value={form.medical_history}
            onChange={up('medical_history')}
            placeholder="例：心不全 / 高血圧 / 骨粗鬆症"
          />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="field-label">アレルギー歴（任意）</label>
          <textarea
            ref={allergyRef}
            className="field-input"
            rows={2}
            style={{ resize: 'none', overflowY: 'hidden', minHeight: '2.5em' }}
            value={form.allergy_history}
            onChange={up('allergy_history')}
            placeholder="例：セレコックス（発疹）/ エビ"
          />
        </div>
        <div style={{ gridColumn: '1/-1' }}>
          <label className="field-label">入院歴（任意）</label>
          <textarea
            ref={hospitalizationRef}
            className="field-input"
            rows={2}
            style={{ resize: 'none', overflowY: 'hidden', minHeight: '2.5em' }}
            value={form.hospitalization_history}
            onChange={up('hospitalization_history')}
            placeholder="例：2024/5月 ○○病院 心不全増悪入院"
          />
        </div>
      </div>
    </div>
  )
}
