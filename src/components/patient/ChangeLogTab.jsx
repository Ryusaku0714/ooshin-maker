import { useState } from 'react'
import { db } from '../../hooks/useData'

export default function ChangeLogTab({ patient, onRefetch }) {
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10))
  const [newContent, setNewContent] = useState('')
  const [adding, setAdding] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const logs = [...(patient?.om_change_logs ?? [])].sort((a, b) =>
    new Date(b.changed_at) - new Date(a.changed_at)
  )

  const add = async () => {
    if (!newContent.trim()) return
    setAdding(true)
    await db.addLog(patient.id, { changed_at: newDate, content: newContent })
    setNewContent('')
    setAdding(false)
    setShowForm(false)
    onRefetch?.()
  }

  const del = async (id) => {
    if (!confirm('このログを削除しますか？')) return
    await db.deleteLog(id)
    onRefetch?.()
  }

  return (
    <div className="card">
      <div className="card-title">
        📝 薬剤変更ログ
        <button className="btn btn-outline btn-sm" onClick={() => setShowForm(s => !s)}>
          {showForm ? '✕ 閉じる' : '＋ 追加'}
        </button>
      </div>

      {showForm && (
        <div style={{
          background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
          borderRadius: 8, padding: 12, marginBottom: 10,
          display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8, alignItems: 'flex-end',
        }}>
          <div>
            <label className="field-label">日付</label>
            <input type="date" className="field-input" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">内容</label>
            <input
              type="text" className="field-input"
              value={newContent} onChange={e => setNewContent(e.target.value)}
              placeholder="例：バルサルタン80→40mgへ減量"
              onKeyDown={e => e.key === 'Enter' && add()}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={add} disabled={adding}>
            {adding ? '…' : '追加'}
          </button>
        </div>
      )}

      {logs.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
          変更ログがまだありません
        </p>
      )}

      {logs.map((log, i) => (
        <div key={log.id} style={{
          display: 'grid', gridTemplateColumns: '80px 1fr auto', gap: 10,
          padding: '8px 0', borderBottom: i < logs.length - 1 ? '1px solid var(--sky-50)' : 'none',
          alignItems: 'start',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky-600)' }}>
            {log.changed_at?.replace(/-/g, '/').slice(2)}
          </div>
          <div style={{ fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.6 }}>{log.content}</div>
          <button className="icon-btn" onClick={() => del(log.id)}>🗑️</button>
        </div>
      ))}
    </div>
  )
}
