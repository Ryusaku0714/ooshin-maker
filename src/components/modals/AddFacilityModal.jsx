import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function AddFacilityModal({ onClose, onSaved, onHomeCareCreated }) {
  const [name, setName] = useState('')
  const [type, setType] = useState('facility') // 'facility' | 'home_care'
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    const isHomeCare = type === 'home_care'
    const { data: facility } = await db.addFacility(name.trim(), isHomeCare)
    if (isHomeCare && facility) {
      const { data: team } = await db.addTeam(facility.id, {
        clinic_name: '',
        team_name: '在宅①',
        visit_schedule: '',
        visit_schedule_custom: '',
        default_rx_days: 14,
        grace_days: 1,
        pharmacist_name: '',
      })
      setSaving(false)
      onSaved?.()
      onClose()
      if (team) onHomeCareCreated?.(team.id)
    } else {
      setSaving(false)
      onSaved?.()
      onClose()
    }
  }

  const placeholder = type === 'home_care'
    ? '例：〇〇在宅CL / 担当医名など'
    : '例：施設A / 〇〇在宅CL'

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-title">🏠 施設を追加</div>

        {/* 種別選択 */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { value: 'facility', label: '🏥 施設' },
            { value: 'home_care', label: '🏠 個人在宅' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setType(opt.value)}
              style={{
                flex: 1, padding: '7px 0', borderRadius: 8, fontSize: 13, fontWeight: 600,
                border: type === opt.value ? 'none' : '1.5px solid var(--sky-200)',
                background: type === opt.value ? 'var(--sky-600)' : 'white',
                color: type === opt.value ? 'white' : 'var(--sky-500)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
              }}
            >{opt.label}</button>
          ))}
        </div>

        <label className="field-label">施設名</label>
        <input
          className="field-input"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => e.key === 'Enter' && save()}
          autoFocus
        />

        {type === 'home_care' && (
          <div style={{
            fontSize: 11, color: 'var(--sky-700)', background: 'var(--sky-50)',
            border: '1px solid var(--sky-200)', borderRadius: 6,
            padding: '7px 10px', marginTop: 10, lineHeight: 1.7,
          }}>
            追加後に「在宅①」チームを自動作成し、患者追加画面へ移動します。
          </div>
        )}

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
