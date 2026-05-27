import { useState } from 'react'
import { db } from '../../hooks/useData'

const TIMING_OPTIONS = ['朝', '昼', '夕', '眠前']
const PREV_TIMING = { '朝': '眠前', '昼': '朝', '夕': '昼', '眠前': '夕' }

const EMPTY_VISIT = {
  hospital: '', department: '',
  dispensing_from: '', dispensing_to: '',
  medication_timing: '', medication_timing_end: '',
  next_visit_date: '',
}

function toFormData(v) {
  const startT = v.medication_timing ?? ''
  return {
    hospital:              v.hospital              ?? '',
    department:            v.department            ?? '',
    dispensing_from:       v.dispensing_from       ?? v.dispensing_date ?? '',
    dispensing_to:         v.dispensing_to         ?? '',
    medication_timing:     startT,
    medication_timing_end: v.medication_timing_end ?? (startT ? (PREV_TIMING[startT] ?? '') : ''),
    next_visit_date:       v.next_visit_date       ?? '',
  }
}

function fmtPeriod(from, to) {
  if (from && to) return `${from} 〜 ${to}`
  if (from)       return `${from} 〜`
  if (to)         return `〜 ${to}`
  return ''
}

export default function OtherVisitsTab({ patient, onRefetch }) {
  const [visits, setVisits]               = useState(patient?.other_visits ?? [])
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [editingId, setEditingId]         = useState(null)
  const [visitForm, setVisitForm]         = useState({ ...EMPTY_VISIT })
  const [savingVisit, setSavingVisit]     = useState(false)

  const upV = k => e => setVisitForm(f => ({ ...f, [k]: e.target.value }))

  // 開始タイミング変更時に終了タイミングを自動セット
  const handleTimingChange = (e) => {
    const t = e.target.value
    setVisitForm(f => ({
      ...f,
      medication_timing:     t,
      medication_timing_end: t ? (PREV_TIMING[t] ?? '') : '',
    }))
  }

  const openAddVisit = () => {
    setEditingId(null)
    setVisitForm({ ...EMPTY_VISIT })
    setShowVisitForm(true)
  }

  const openEditVisit = (v) => {
    setEditingId(v.id)
    setVisitForm(toFormData(v))
    setShowVisitForm(true)
  }

  const cancelVisitForm = () => {
    setShowVisitForm(false)
    setEditingId(null)
    setVisitForm({ ...EMPTY_VISIT })
  }

  const saveVisit = async () => {
    if (!visitForm.hospital.trim()) return
    setSavingVisit(true)
    let updated
    if (editingId) {
      updated = visits.map(v => v.id === editingId ? { ...visitForm, id: editingId } : v)
    } else {
      updated = [...visits, { ...visitForm, id: `${Date.now()}` }]
    }
    setVisits(updated)
    await db.updatePatient(patient.id, { other_visits: updated })
    setSavingVisit(false)
    cancelVisitForm()
    onRefetch?.()
  }

  const deleteVisit = async (id) => {
    if (!confirm('この他科受診を削除しますか？')) return
    const updated = visits.filter(v => v.id !== id)
    setVisits(updated)
    await db.updatePatient(patient.id, { other_visits: updated })
    onRefetch?.()
  }

  return (
    <div className="card">
      <div className="card-title">
        🏥 他科受診スケジュール
        <button className="btn btn-outline btn-sm" onClick={openAddVisit}>＋ 追加</button>
      </div>

      {showVisitForm && (
        <div style={{
          background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
          borderRadius: 8, padding: 12, marginBottom: 12,
        }}>
          <div className="visit-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            {/* 受診先 */}
            <div>
              <label className="field-label">受診先 *</label>
              <input
                className="field-input" value={visitForm.hospital}
                onChange={upV('hospital')} placeholder="例：○○病院" autoFocus
              />
            </div>
            {/* 診療科 */}
            <div>
              <label className="field-label">診療科</label>
              <input
                className="field-input" value={visitForm.department}
                onChange={upV('department')} placeholder="例：循環器科"
              />
            </div>
            {/* 調剤期間 from */}
            <div>
              <label className="field-label">調剤期間（開始）</label>
              <input
                type="date" className="field-input"
                value={visitForm.dispensing_from} onChange={upV('dispensing_from')}
              />
            </div>
            {/* 調剤期間 to */}
            <div>
              <label className="field-label">調剤期間（終了）</label>
              <input
                type="date" className="field-input"
                value={visitForm.dispensing_to} onChange={upV('dispensing_to')}
              />
            </div>
            {/* 服用タイミング（開始〜終了） */}
            <div style={{ gridColumn: '1/-1' }}>
              <label className="field-label">服用タイミング（開始〜終了）</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="field-input"
                  value={visitForm.medication_timing}
                  onChange={handleTimingChange}
                  style={{ flex: '0 0 90px' }}
                >
                  <option value="">-- 選択 --</option>
                  {TIMING_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                {visitForm.medication_timing && (
                  <>
                    <span style={{ fontSize: 12, color: 'var(--gray-400)', flexShrink: 0 }}>〜</span>
                    <div style={{
                      fontSize: 12, fontWeight: 600, color: 'var(--sky-700)',
                      background: 'var(--sky-50)', border: '1.5px solid var(--sky-200)',
                      borderRadius: 6, padding: '6px 12px', flexShrink: 0,
                    }}>
                      {visitForm.medication_timing_end}
                      <span style={{ fontSize: 10, color: 'var(--gray-400)', marginLeft: 4 }}>（自動）</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            {/* 次回受診日 */}
            <div style={{ gridColumn: '1/-1' }}>
              <label className="field-label">次回受診日</label>
              <input
                type="date" className="field-input"
                value={visitForm.next_visit_date} onChange={upV('next_visit_date')}
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
            <button className="btn btn-outline btn-sm" onClick={cancelVisitForm}>キャンセル</button>
            <button
              className="btn btn-primary btn-sm"
              onClick={saveVisit}
              disabled={savingVisit || !visitForm.hospital.trim()}
            >
              {savingVisit ? '…' : editingId ? '更新' : '追加'}
            </button>
          </div>
        </div>
      )}

      {visits.length === 0 && !showVisitForm && (
        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '12px 0' }}>
          他科受診の登録はありません
        </p>
      )}

      {visits.map(v => {
        const from    = v.dispensing_from ?? v.dispensing_date ?? ''
        const to      = v.dispensing_to ?? ''
        const period  = fmtPeriod(from, to)
        const endT    = v.medication_timing_end || (v.medication_timing ? (PREV_TIMING[v.medication_timing] ?? '') : '')
        return (
          <div key={v.id} style={{
            background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
            borderRadius: 8, padding: '10px 12px', marginBottom: 6,
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-900)' }}>
                {v.hospital}{v.department ? ` / ${v.department}` : ''}
              </div>
              <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
                {period              && <span>📅 調剤：{period}</span>}
                {v.medication_timing && <span>💊 服用：{v.medication_timing}〜{endT}</span>}
                {v.next_visit_date   && <span>🔄 次回：{v.next_visit_date}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="icon-btn" title="編集" onClick={() => openEditVisit(v)}>✏️</button>
              <button className="icon-btn" title="削除" onClick={() => deleteVisit(v.id)}>🗑️</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
