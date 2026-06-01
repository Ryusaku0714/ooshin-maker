import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function FreeMemoTab({ patient, onRefetch, printMode = false }) {
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

  // 印刷専用ビュー：textarea を使わず div で全文表示、空なら非表示
  if (printMode) {
    if (!patient?.free_memo?.trim()) return null
    return (
      <div className="card">
        <div className="card-title">📄 フリーメモ</div>
        <div style={{ fontSize: 11, whiteSpace: 'pre-wrap', lineHeight: 1.8, color: 'var(--gray-900)' }}>
          {patient.free_memo}
        </div>
      </div>
    )
  }

  return (
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
        style={{ minHeight: 200, lineHeight: 1.8 }}
        value={memo}
        onChange={e => setMemo(e.target.value)}
        placeholder="Nsからの報告、往診時の気づき、次回確認事項など"
      />
    </div>
  )
}
