import { useState } from 'react'
import { db } from '../../hooks/useData'

const EMPTY_VISIT = {
  hospital: '', department: '', dispensing_date: '',
  medication_timing: '', next_visit_date: '',
}

export default function FreeMemoTab({ patient, onRefetch }) {
  // ── フリーメモ ─────────────────────────────────────────
  const [memo, setMemo]     = useState(patient?.free_memo ?? '')
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  const saveMemo = async () => {
    setSaving(true)
    await db.updatePatient(patient.id, { free_memo: memo })
    setSaving(false)
    setSaved(true)
    onRefetch?.()
    setTimeout(() => setSaved(false), 2000)
  }

  // ── 他科受診スケジュール ────────────────────────────────
  const [visits,        setVisits]        = useState(patient?.other_visits ?? [])
  const [showVisitForm, setShowVisitForm] = useState(false)
  const [editingId,     setEditingId]     = useState(null)
  const [visitForm,     setVisitForm]     = useState({ ...EMPTY_VISIT })
  const [savingVisit,   setSavingVisit]   = useState(false)

  const upV = k => e => setVisitForm(f => ({ ...f, [k]: e.target.value }))

  const openAddVisit = () => {
    setEditingId(null)
    setVisitForm({ ...EMPTY_VISIT })
    setShowVisitForm(true)
  }

  const openEditVisit = (v) => {
    setEditingId(v.id)
    setVisitForm({ ...v })
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
    <>
      {/* ── フリーメモ（メイン・上部） ── */}
      <div className="card">
        <div className="card-title">
          📄 フリーメモ
          <button
            className={`btn btn-sm ${saved ? 'btn-outline' : 'btn-primary'}`}
            onClick={saveMemo}
            disabled={saving}
          >
            {saving ? '保存中…' : saved ? '✅ 保存済' : '💾 保存'}
          </button>
        </div>
        <textarea
          className="field-input"
          style={{ minHeight: 160, lineHeight: 1.8 }}
          value={memo}
          onChange={e => setMemo(e.target.value)}
          placeholder="Nsからの報告、往診時の気づき、次回確認事項など"
        />
      </div>

      {/* ── 他科受診スケジュール（オプション・下部） ── */}
      <div className="card">
        <div className="card-title">
          🏥 他科受診スケジュール
          <button className="btn btn-outline btn-sm" onClick={openAddVisit}>＋ 追加</button>
        </div>

        {/* 追加・編集フォーム */}
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
                <label className="field-label">調剤日</label>
                <input
                  type="date" className="field-input"
                  value={visitForm.dispensing_date} onChange={upV('dispensing_date')}
                />
              </div>
              <div>
                <label className="field-label">服用タイミング</label>
                <input
                  className="field-input" value={visitForm.medication_timing}
                  onChange={upV('medication_timing')} placeholder="例：朝食後"
                />
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

        {visits.length === 0 && !showVisitForm && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '12px 0' }}>
            他科受診の登録はありません
          </p>
        )}

        {visits.map(v => (
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
                {v.dispensing_date   && <span>📅 調剤：{v.dispensing_date}</span>}
                {v.medication_timing && <span>💊 服用：{v.medication_timing}</span>}
                {v.next_visit_date   && <span>🔄 次回：{v.next_visit_date}</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="icon-btn" title="編集" onClick={() => openEditVisit(v)}>✏️</button>
              <button className="icon-btn" title="削除" onClick={() => deleteVisit(v.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
