import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'
import CopyButton from '../common/CopyButton'
import RowActionsMenu from '../common/RowActionsMenu'
import { PREV_TIMING, computeTemporaryEnd, computeTemporaryDays } from '../../lib/changeLogFormat'

const TIMING_OPTIONS = ['朝', '昼', '夕', '眠前']

const EMPTY_VISIT = {
  hospital: '', department: '',
  dispensing_from: '', dispensing_to: '',
  medication_timing: '', medication_timing_end: '',
  days: '',
  next_visit_date: '',
  notes: '',
  is_archived: false,
}

// 日数入力 → 終了日・終了タイミングを再計算（分4ロジック、臨時薬と同じ）
function recalcFromDays(next) {
  const n = parseInt(next.days)
  if (next.days?.toString().trim() !== '' && !isNaN(n) && n > 0 && next.dispensing_from && next.medication_timing) {
    const { endDate, endTiming } = computeTemporaryEnd(next.dispensing_from, next.medication_timing, n)
    return { ...next, dispensing_to: endDate, medication_timing_end: endTiming }
  }
  return next
}

// 終了日入力 → 日数・終了タイミングを再計算（分4ロジック、臨時薬と同じ）
function recalcFromEndDate(next) {
  if (next.dispensing_to && next.dispensing_from && next.medication_timing) {
    const { days, endTiming } = computeTemporaryDays(next.dispensing_from, next.medication_timing, next.dispensing_to)
    if (days > 0) return { ...next, days: String(days), medication_timing_end: endTiming }
  }
  return next
}

function toFormData(v) {
  const startT = v.medication_timing ?? ''
  const from   = v.dispensing_from   ?? v.dispensing_date ?? ''
  const to     = v.dispensing_to     ?? ''
  let days = (v.days != null && v.days !== '') ? String(v.days) : ''
  if (!days && from && to && startT) {
    const computed = computeTemporaryDays(from, startT, to)
    if (computed.days > 0) days = String(computed.days)
  }
  return {
    hospital:              v.hospital              ?? '',
    department:            v.department            ?? '',
    dispensing_from:       from,
    dispensing_to:         to,
    medication_timing:     startT,
    medication_timing_end: v.medication_timing_end ?? (startT ? (PREV_TIMING[startT] ?? '') : ''),
    days,
    next_visit_date:       v.next_visit_date       ?? '',
    notes:                 v.notes                 ?? '',
    is_archived:           v.is_archived           ?? false,
  }
}

function fmtPeriod(from, to) {
  if (from && to) return `${from} 〜 ${to}`
  if (from)       return `${from} 〜`
  if (to)         return `〜 ${to}`
  return ''
}

// 受診1件分のテキスト（コピー用）
function formatVisitText(v) {
  let line = `・${v.hospital}`
  if (v.department) line += ` / ${v.department}`
  const from = v.dispensing_from ?? v.dispensing_date ?? ''
  const to   = v.dispensing_to ?? ''
  if (from && to)  line += `　調剤：${from}〜${to}`
  else if (from)   line += `　調剤：${from}〜`
  else if (to)     line += `　調剤：〜${to}`
  if (v.medication_timing) {
    const endT = v.medication_timing_end || (PREV_TIMING[v.medication_timing] ?? '')
    line += `　服用：${v.medication_timing}〜${endT}`
  }
  if (v.next_visit_date) line += `　次回：${v.next_visit_date}`
  if (v.notes)           line += `　備考：${v.notes}`
  return line
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

  // 調剤開始日・開始タイミング変更 → 終了タイミングを再計算し、入力済みの日数／終了日を基準に再計算
  const handleStartChange = (patch) => {
    setVisitForm(f => {
      let next = { ...f, ...patch }
      if ('medication_timing' in patch) {
        next = { ...next, medication_timing_end: next.medication_timing ? (PREV_TIMING[next.medication_timing] ?? '') : '' }
      }
      if (next.days?.toString().trim() !== '') next = recalcFromDays(next)
      else if (next.dispensing_to) next = recalcFromEndDate(next)
      return next
    })
  }

  const handleDaysChange = (val) => {
    setVisitForm(f => recalcFromDays({ ...f, days: val }))
  }

  const handleEndDateChange = (val) => {
    setVisitForm(f => recalcFromEndDate({ ...f, dispensing_to: val }))
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

            <div className="visit-compact-field">
              <label className="field-label">調剤開始日</label>
              <input
                type="date" className="field-input"
                value={visitForm.dispensing_from}
                onChange={e => handleStartChange({ dispensing_from: e.target.value })}
              />
            </div>
            <div className="visit-compact-field">
              <label className="field-label">開始タイミング</label>
              <select
                className="field-input"
                value={visitForm.medication_timing}
                onChange={e => handleStartChange({ medication_timing: e.target.value })}
              >
                <option value="">-- 選択 --</option>
                {TIMING_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="visit-compact-field">
              <label className="field-label">終了日</label>
              <input
                type="date" className="field-input"
                value={visitForm.dispensing_to}
                onChange={e => handleEndDateChange(e.target.value)}
              />
            </div>
            <div className="visit-compact-field">
              <label className="field-label">終了タイミング</label>
              <select
                className="field-input"
                value={visitForm.medication_timing_end}
                onChange={e => setVisitForm(f => ({ ...f, medication_timing_end: e.target.value }))}
              >
                <option value="">-- 選択 --</option>
                {TIMING_OPTIONS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="visit-compact-field">
              <label className="field-label">日数</label>
              <input
                type="number" inputMode="numeric" className="field-input" min="1"
                value={visitForm.days}
                onChange={e => handleDaysChange(e.target.value)}
                placeholder="自動"
              />
            </div>
            <div className="visit-compact-field">
              <label className="field-label">次回受診日</label>
              <input
                type="date" className="field-input"
                value={visitForm.next_visit_date} onChange={upV('next_visit_date')}
              />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label className="field-label">備考</label>
              <input
                className="field-input" value={visitForm.notes}
                onChange={upV('notes')} placeholder="メモなど"
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
          {v.notes             && <span>📝 備考：{v.notes}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <CopyButton title="この受診記録をコピー" getText={() => formatVisitText(v)} />
        <RowActionsMenu actions={archived ? [
          { key: 'restore', icon: '↩️', label: '復元', title: '復元（受診中に戻す）', onClick: onRestore },
          { key: 'delete',  icon: '🗑️', label: '削除', title: '完全削除', onClick: onDelete },
        ] : [
          { key: 'edit',    icon: '✏️', label: '編集', onClick: onEdit },
          { key: 'archive', icon: '📂', label: '非表示', title: 'アーカイブ（終了した受診記録として保存）', onClick: onArchive },
          { key: 'delete',  icon: '🗑️', label: '削除', title: '完全削除', onClick: onDelete },
        ]} />
      </div>
    </div>
  )
}
