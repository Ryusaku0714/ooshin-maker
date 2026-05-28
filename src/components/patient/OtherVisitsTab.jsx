import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'

const TIMING_OPTIONS = ['朝', '昼', '夕', '眠前']
const PREV_TIMING = { '朝': '眠前', '昼': '朝', '夕': '昼', '眠前': '夕' }

const EMPTY_VISIT = {
  hospital: '', department: '',
  dispensing_from: '', dispensing_to: '',
  medication_timing: '', medication_timing_end: '',
  next_visit_date: '',
  is_archived: false,
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
    is_archived:           v.is_archived           ?? false,
  }
}

function fmtPeriod(from, to) {
  if (from && to) return `${from} 〜 ${to}`
  if (from)       return `${from} 〜`
  if (to)         return `〜 ${to}`
  return ''
}

export default function OtherVisitsTab({ patient, onRefetch }) {
  const [visits,        setVisits]        = useState(patient?.other_visits ?? [])
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [editingId,     setEditingId]     = useState(null)
  const [visitForm,     setVisitForm]     = useState({ ...EMPTY_VISIT })
  const [savingVisit,   setSavingVisit]   = useState(false)
  const [showArchived,  setShowArchived]  = useState(false)

  // patient 更新時に visits を同期
  useEffect(() => {
    setVisits(patient?.other_visits ?? [])
  }, [patient?.other_visits])

  const activeVisits   = visits.filter(v => !(v.is_archived ?? false))
  const archivedVisits = visits.filter(v =>   v.is_archived ?? false)

  const upV = k => e => setVisitForm(f => ({ ...f, [k]: e.target.value }))

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
      updated = [...visits, { ...visitForm, id: `${Date.now()}`, is_archived: false }]
    }
    setVisits(updated)
    await db.updatePatient(patient.id, { other_visits: updated })
    setSavingVisit(false)
    cancelVisitForm()
    onRefetch?.()
  }

  const archiveVisit = async (id) => {
    const updated = visits.map(v => v.id === id ? { ...v, is_archived: true } : v)
    setVisits(updated)
    await db.updatePatient(patient.id, { other_visits: updated })
    onRefetch?.()
  }

  const restoreVisit = async (id) => {
    const updated = visits.map(v => v.id === id ? { ...v, is_archived: false } : v)
    setVisits(updated)
    await db.updatePatient(patient.id, { other_visits: updated })
    onRefetch?.()
  }

  const deleteVisit = async (id) => {
    if (!confirm(
      'この他科受診を完全に削除しますか？\n\n' +
      '💡 完全に削除する前に、アーカイブ（終了した受診記録として保存）することもできます。'
    )) return
    const updated = visits.filter(v => v.id !== id)
    setVisits(updated)
    await db.updatePatient(patient.id, { other_visits: updated })
    onRefetch?.()
  }

  return (
    <div className="card">
      <div className="card-title">
        🏥 他科受診スケジュール
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {archivedVisits.length > 0 && (
            <button
              className="btn btn-outline btn-sm"
              onClick={() => setShowArchived(s => !s)}
              style={{
                color: showArchived ? 'var(--sky-600)' : 'var(--gray-400)',
                borderColor: showArchived ? 'var(--sky-200)' : 'var(--gray-200)',
              }}
            >
              {showArchived
                ? '📂 アーカイブを隠す'
                : `📂 アーカイブを表示（${archivedVisits.length}件）`}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={openAddVisit}>＋ 追加</button>
        </div>
      </div>

      {/* 入力フォーム */}
      {showVisitForm && (
        <div style={{
          background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
          borderRadius: 8, padding: 12, marginBottom: 12,
        }}>
          <div className="visit-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label className="field-label">受診先 *</label>
              <input
                className="field-input" value={visitForm.hospital}
                onChange={upV('hospital')} placeholder="例：○○病院" autoFocus
              />
            </div>
            <div>
              <label className="field-label">診療科</label>
              <input
                className="field-input" value={visitForm.department}
                onChange={upV('department')} placeholder="例：循環器科"
              />
            </div>
            <div>
              <label className="field-label">調剤期間（開始）</label>
              <input
                type="date" className="field-input"
                value={visitForm.dispensing_from} onChange={upV('dispensing_from')}
              />
            </div>
            <div>
              <label className="field-label">調剤期間（終了）</label>
              <input
                type="date" className="field-input"
                value={visitForm.dispensing_to} onChange={upV('dispensing_to')}
              />
            </div>
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

      {/* 使用中の受診記録 */}
      {activeVisits.length === 0 && !showVisitForm && (
        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '12px 0' }}>
          他科受診の登録はありません
        </p>
      )}

      {activeVisits.map(v => (
        <VisitRow
          key={v.id}
          v={v}
          archived={false}
          onEdit={() => openEditVisit(v)}
          onArchive={() => archiveVisit(v.id)}
          onRestore={() => restoreVisit(v.id)}
          onDelete={() => deleteVisit(v.id)}
        />
      ))}

      {/* アーカイブ済み受診記録 */}
      {showArchived && archivedVisits.length > 0 && (
        <>
          <div style={{
            fontSize: 10, fontWeight: 700, color: 'var(--gray-400)',
            margin: '10px 0 4px', paddingTop: 10,
            borderTop: '1px dashed var(--gray-200)',
            letterSpacing: '0.06em',
          }}>
            📂 アーカイブ（終了した受診記録）
          </div>
          {archivedVisits.map(v => (
            <VisitRow
              key={v.id}
              v={v}
              archived={true}
              onEdit={() => openEditVisit(v)}
              onArchive={() => archiveVisit(v.id)}
              onRestore={() => restoreVisit(v.id)}
              onDelete={() => deleteVisit(v.id)}
            />
          ))}
        </>
      )}
    </div>
  )
}

function VisitRow({ v, archived, onEdit, onArchive, onRestore, onDelete }) {
  const from   = v.dispensing_from ?? v.dispensing_date ?? ''
  const to     = v.dispensing_to ?? ''
  const period = fmtPeriod(from, to)
  const endT   = v.medication_timing_end || (v.medication_timing ? (PREV_TIMING[v.medication_timing] ?? '') : '')

  return (
    <div style={{
      background: archived ? '#f8fafc' : 'var(--sky-50)',
      border: `1.5px solid ${archived ? 'var(--gray-200)' : 'var(--sky-100)'}`,
      borderRadius: 8, padding: '10px 12px', marginBottom: 6,
      display: 'flex', gap: 10, alignItems: 'flex-start',
      opacity: archived ? 0.7 : 1,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: archived ? 'var(--gray-400)' : 'var(--gray-900)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {v.hospital}{v.department ? ` / ${v.department}` : ''}
          {archived && (
            <span style={{ fontSize: 9, color: 'var(--gray-400)', fontStyle: 'italic', fontWeight: 400 }}>終了</span>
          )}
        </div>
        <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {period              && <span>📅 調剤：{period}</span>}
          {v.medication_timing && <span>💊 服用：{v.medication_timing}〜{endT}</span>}
          {v.next_visit_date   && <span>🔄 次回：{v.next_visit_date}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {archived ? (
          <>
            <button className="icon-btn" title="復元（受診中に戻す）" onClick={onRestore} style={{ fontSize: 11 }}>↩️</button>
            <button className="icon-btn" title="完全削除" onClick={onDelete}>🗑️</button>
          </>
        ) : (
          <>
            <button className="icon-btn" title="編集" onClick={onEdit}>✏️</button>
            <button className="icon-btn" title="アーカイブ（終了した受診記録として保存）" onClick={onArchive} style={{ fontSize: 11 }}>📂</button>
            <button className="icon-btn" title="完全削除" onClick={onDelete}>🗑️</button>
          </>
        )}
      </div>
    </div>
  )
}
