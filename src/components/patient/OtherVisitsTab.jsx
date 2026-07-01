import { useEffect, useRef, useState } from 'react'
import { db } from '../../hooks/useData'
import CopyButton from '../common/CopyButton'
import { PREV_TIMING, computeTemporaryEnd, computeTemporaryDays } from '../../lib/changeLogFormat'

const TIMING_OPTIONS = ['朝', '昼', '夕', '眠前']

// 終了タイミング → 次の開始タイミング（Do処方用）
const NEXT_TIMING = { '朝': '昼', '昼': '夕', '夕': '眠前', '眠前': '朝' }

const EMPTY_VISIT = {
  hospital: '', department: '',
  dispensing_from: '', dispensing_to: '',
  medication_timing: '', medication_timing_end: '',
  days: '',
  next_visit_date: '',
  notes: '',
  is_archived: false,
}

function addOneDayToStr(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function recalcFromDays(next) {
  const n = parseInt(next.days)
  if (next.days?.toString().trim() !== '' && !isNaN(n) && n > 0 && next.dispensing_from) {
    const { endDate, endTiming } = computeTemporaryEnd(next.dispensing_from, next.medication_timing || '朝', n)
    return { ...next, dispensing_to: endDate, medication_timing_end: next.medication_timing ? endTiming : '' }
  }
  return next
}

function recalcFromEndDate(next) {
  if (next.dispensing_to && next.dispensing_from) {
    const { days, endTiming } = computeTemporaryDays(next.dispensing_from, next.medication_timing || '朝', next.dispensing_to)
    if (days > 0) return { ...next, days: String(days), medication_timing_end: next.medication_timing ? endTiming : '' }
  }
  return next
}

function toFormData(v) {
  const startT = v.medication_timing ?? ''
  const from   = v.dispensing_from   ?? v.dispensing_date ?? ''
  const to     = v.dispensing_to     ?? ''
  let days = (v.days != null && v.days !== '') ? String(v.days) : ''
  if (!days && from && to) {
    const computed = computeTemporaryDays(from, startT || '朝', to)
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
  const [doFromId,      setDoFromId]      = useState(null)
  const [visitForm,     setVisitForm]     = useState({ ...EMPTY_VISIT })
  const [savingVisit,   setSavingVisit]   = useState(false)
  const [showArchived,  setShowArchived]  = useState(false)
  const notesRef = useRef(null)

  useEffect(() => {
    setVisits(patient?.other_visits ?? [])
  }, [patient?.other_visits])

  const resizeNotes = (el) => {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }
  useEffect(() => {
    if (showVisitForm) resizeNotes(notesRef.current)
  }, [showVisitForm, editingId])

  const activeVisits   = visits.filter(v => !(v.is_archived ?? false))
  const archivedVisits = visits.filter(v =>   v.is_archived ?? false)

  const upV = k => e => setVisitForm(f => ({ ...f, [k]: e.target.value }))

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

  const handleNotesChange = (e) => {
    setVisitForm(f => ({ ...f, notes: e.target.value }))
    resizeNotes(e.target)
  }

  const openAddVisit = () => {
    setEditingId(null)
    setDoFromId(null)
    setVisitForm({ ...EMPTY_VISIT })
    setShowVisitForm(true)
  }

  const openEditVisit = (v) => {
    setEditingId(v.id)
    setDoFromId(null)
    setVisitForm(toFormData(v))
    setShowVisitForm(true)
  }

  // Do処方：前回終了タイミングから次の開始タイミング・調剤開始日を自動計算
  const openDoVisit = (v) => {
    const prevEndDate   = v.dispensing_to ?? ''
    const prevEndTiming = v.medication_timing_end ?? ''

    let newStartDate, newStartTiming
    if (!prevEndDate) {
      newStartDate   = ''
      newStartTiming = ''
    } else if (!prevEndTiming) {
      // タイミングなし → 翌日・タイミングなし
      newStartDate   = addOneDayToStr(prevEndDate)
      newStartTiming = ''
    } else if (prevEndTiming === '眠前') {
      // 眠前終了 → 翌日朝開始
      newStartDate   = addOneDayToStr(prevEndDate)
      newStartTiming = '朝'
    } else {
      // 朝→昼・昼→夕・夕→眠前（同日）
      newStartDate   = prevEndDate
      newStartTiming = NEXT_TIMING[prevEndTiming] ?? ''
    }

    const baseForm = {
      hospital:              v.hospital   ?? '',
      department:            v.department ?? '',
      dispensing_from:       newStartDate,
      dispensing_to:         '',
      medication_timing:     newStartTiming,
      medication_timing_end: prevEndTiming,   // 前回と同じ終了タイミング（手動変更可）
      days:                  v.days ? String(v.days) : '',
      next_visit_date:       '',               // 次回受診日は空欄（手動入力）
      notes:                 v.notes ?? '',
      is_archived:           false,
    }

    const withRecalc = recalcFromDays(baseForm)
    setDoFromId(v.id)
    setEditingId(null)
    setVisitForm(withRecalc)
    setShowVisitForm(true)
  }

  const cancelVisitForm = () => {
    setShowVisitForm(false)
    setEditingId(null)
    setDoFromId(null)
    setVisitForm({ ...EMPTY_VISIT })
  }

  const saveVisit = async () => {
    if (!visitForm.hospital.trim()) return
    setSavingVisit(true)
    let updated
    if (editingId) {
      updated = visits.map(v => v.id === editingId ? { ...visitForm, id: editingId } : v)
    } else {
      const newRecord = { ...visitForm, id: `${Date.now()}`, is_archived: false }
      if (doFromId) {
        // Do処方：前回レコードをアーカイブしてから新レコードを追加
        updated = visits.map(v => v.id === doFromId ? { ...v, is_archived: true } : v)
        updated = [...updated, newRecord]
      } else {
        updated = [...visits, newRecord]
      }
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
                color: showArchived ? '#1e3a8a' : '#94a3b8',
                background: showArchived ? '#dbeafe' : 'white',
                borderColor: '#dce4f0',
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
        <div className="rx-form-box">
          {/* Do処方ヒント */}
          {doFromId && (
            <div style={{
              fontSize: 11, color: '#1e3a8a', background: '#dbeafe',
              border: '1px solid #bfdbfe', borderRadius: 6,
              padding: '6px 10px', marginBottom: 10,
            }}>
              🔄 Do処方：確定すると前回のレコードが自動でアーカイブされます
            </div>
          )}

          <div className="visit-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label className="field-label">受診先 *</label>
              <input
                className="field-input rx-input" value={visitForm.hospital}
                onChange={upV('hospital')} placeholder="例：○○病院" autoFocus
              />
            </div>
            <div>
              <label className="field-label">診療科</label>
              <input
                className="field-input rx-input" value={visitForm.department}
                onChange={upV('department')} placeholder="例：循環器科"
              />
            </div>

            <div className="rx-row">
              <div>
                <label className="field-label">調剤開始日</label>
                <input
                  type="date" className="field-input rx-input"
                  value={visitForm.dispensing_from}
                  onChange={e => handleStartChange({ dispensing_from: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">開始タイミング</label>
                <select
                  className="field-input rx-input"
                  value={visitForm.medication_timing}
                  onChange={e => handleStartChange({ medication_timing: e.target.value })}
                >
                  <option value="">選択</option>
                  {TIMING_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rx-row">
              <div>
                <label className="field-label">終了日</label>
                <input
                  type="date" className="field-input rx-input"
                  value={visitForm.dispensing_to}
                  onChange={e => handleEndDateChange(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">終了タイミング</label>
                <select
                  className="field-input rx-input"
                  value={visitForm.medication_timing_end}
                  onChange={e => setVisitForm(f => ({ ...f, medication_timing_end: e.target.value }))}
                >
                  <option value="">選択</option>
                  {TIMING_OPTIONS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="rx-field-45">
              <label className="field-label">日数</label>
              <input
                type="number" inputMode="numeric" className="field-input rx-input" min="1"
                value={visitForm.days}
                onChange={e => handleDaysChange(e.target.value)}
                placeholder="自動"
              />
            </div>
            <div className="rx-field-45">
              <label className="field-label">次回受診日</label>
              <input
                type="date" className="field-input rx-input"
                value={visitForm.next_visit_date} onChange={upV('next_visit_date')}
              />
            </div>

            <div style={{ gridColumn: '1/-1' }}>
              <label className="field-label">備考</label>
              <textarea
                ref={notesRef}
                className="field-input rx-input"
                rows={1}
                style={{ resize: 'none', overflowY: 'hidden' }}
                value={visitForm.notes}
                onChange={handleNotesChange}
                placeholder="メモなど"
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
          onDo={() => openDoVisit(v)}
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
              onDo={() => openDoVisit(v)}
            />
          ))}
        </>
      )}
    </div>
  )
}

function VisitRow({ v, archived, onEdit, onArchive, onRestore, onDelete, onDo }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const from   = v.dispensing_from ?? v.dispensing_date ?? ''
  const to     = v.dispensing_to ?? ''
  const period = fmtPeriod(from, to)
  const endT   = v.medication_timing_end || (v.medication_timing ? (PREV_TIMING[v.medication_timing] ?? '') : '')
  const copyText = formatVisitText(v)

  // スマホ版 … メニューのアクション
  const mobileMenuActions = archived ? [
    { key: 'copy',    icon: '📋', label: 'コピー',      onClick: () => navigator.clipboard?.writeText(copyText) },
    { key: 'restore', icon: '↩️', label: '復元',        onClick: onRestore },
    { key: 'delete',  icon: '🗑️', label: '削除',        onClick: onDelete },
  ] : [
    { key: 'copy',    icon: '📋', label: 'コピー',      onClick: () => navigator.clipboard?.writeText(copyText) },
    { key: 'edit',    icon: '✏️', label: '編集',        onClick: onEdit },
    { key: 'archive', icon: '📂', label: 'アーカイブ',  onClick: onArchive },
    { key: 'delete',  icon: '🗑️', label: '削除',        onClick: onDelete },
  ]

  return (
    <div style={{
      background: 'white',
      borderLeft: '3px solid #c9a84c',
      borderRadius: 10, padding: '10px 12px', marginBottom: 6,
      boxShadow: '0 1px 4px rgba(15,31,78,0.06)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      opacity: archived ? 0.7 : 1,
    }}>
      {/* 受診情報 */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ color: archived ? '#94a3b8' : '#0f1f4e' }}>{v.hospital}</span>
          {v.department && (
            <span style={{ color: '#64748b', fontWeight: 400, fontSize: 11 }}>/ {v.department}</span>
          )}
          {archived && (
            <span style={{ fontSize: 9, color: '#94a3b8', fontStyle: 'italic', fontWeight: 400 }}>終了</span>
          )}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 3, display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>
          {period              && <span>📅 調剤：{period}</span>}
          {v.medication_timing && <span>💊 服用：{v.medication_timing}〜{endT}</span>}
          {v.next_visit_date   && <span style={{ color: '#1e3a8a', fontWeight: 500 }}>🔄 次回：{v.next_visit_date}</span>}
          {v.notes             && <span>📝 備考：{v.notes}</span>}
        </div>
      </div>

      {/* ── ボタンエリア ── */}
      <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'flex-start' }}>

        {/* PC版（769px+）：コピー ＋ Do ＋ 編集/アーカイブ/削除 */}
        <div className="row-actions-desktop">
          <CopyButton title="この受診記録をコピー" getText={() => copyText} />
          {!archived && (
            <button
              type="button"
              className="icon-btn"
              title="Do処方（前回のまま継続）"
              onClick={onDo}
              style={{ background: '#dbeafe', color: '#1e3a8a', border: '1px solid #bfdbfe' }}
            >
              <span aria-hidden="true">🔄</span>
              <span className="icon-btn-cap">Do</span>
            </button>
          )}
          {archived ? (
            <>
              <button type="button" className="icon-btn" title="復元（受診中に戻す）" onClick={onRestore}>
                <span aria-hidden="true">↩️</span>
                <span className="icon-btn-cap">復元</span>
              </button>
              <button type="button" className="icon-btn" title="完全削除" onClick={onDelete}>
                <span aria-hidden="true">🗑️</span>
                <span className="icon-btn-cap">削除</span>
              </button>
            </>
          ) : (
            <>
              <button type="button" className="icon-btn" title="編集" onClick={onEdit}>
                <span aria-hidden="true">✏️</span>
                <span className="icon-btn-cap">編集</span>
              </button>
              <button type="button" className="icon-btn" title="アーカイブ（終了した受診記録として保存）" onClick={onArchive}>
                <span aria-hidden="true">📂</span>
                <span className="icon-btn-cap">非表示</span>
              </button>
              <button type="button" className="icon-btn" title="完全削除" onClick={onDelete}>
                <span aria-hidden="true">🗑️</span>
                <span className="icon-btn-cap">削除</span>
              </button>
            </>
          )}
        </div>

        {/* スマホ版（768px-）：Doボタン（外）＋ … メニュー */}
        <div className="row-actions-mobile-flex">
          {!archived && (
            <button
              type="button"
              onClick={onDo}
              style={{
                background: '#dbeafe', color: '#1e3a8a',
                border: '1px solid #bfdbfe',
                borderRadius: 6, fontSize: 10, fontWeight: 700,
                padding: '5px 9px', cursor: 'pointer',
                fontFamily: 'inherit', whiteSpace: 'nowrap', lineHeight: 1,
              }}
            >🔄 Do</button>
          )}

          {/* … ドロップダウンメニュー */}
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="icon-btn"
              style={{ background: '#f1f5fb', border: '1px solid #dce4f0', color: '#64748b' }}
              title="メニュー"
              aria-label="メニュー"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(o => !o)}
            >
              <span aria-hidden="true">⋯</span>
            </button>
            {menuOpen && (
              <>
                <div className="row-menu-overlay" onClick={() => setMenuOpen(false)} />
                <div className="row-menu">
                  {mobileMenuActions.map(a => (
                    <button
                      key={a.key}
                      type="button"
                      className="row-menu-item"
                      onClick={() => { setMenuOpen(false); a.onClick() }}
                    >
                      <span aria-hidden="true">{a.icon}</span>{a.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
