import { useState, useEffect } from 'react'
import { db } from '../../hooks/useData'

const COLORS = [
  '#3b82f6', '#22c55e', '#f97316', '#ef4444',
  '#a855f7', '#ec4899', '#eab308', '#94a3b8',
]

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtMMDD(str) {
  if (!str) return ''
  const [, m, d] = str.split('-')
  return `${Number(m)}/${Number(d)}`
}

function isOverdue(deadline) {
  if (!deadline) return false
  return deadline < todayStr()
}

export default function TaskModal({ facility, onClose }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompleted, setShowCompleted] = useState(false)

  const [color, setColor] = useState(COLORS[0])
  const [roomInput, setRoomInput] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [memo, setMemo] = useState('')
  const [deadline, setDeadline] = useState('')
  const [adding, setAdding] = useState(false)
  const [copyingId, setCopyingId] = useState(null)

  const allPatients = (facility.om_teams ?? []).flatMap(t => t.om_patients ?? [])

  const fetchTasks = async () => {
    setLoading(true)
    const data = await db.getFacilityTasks(facility.id)
    setTasks(data)
    setLoading(false)
  }

  useEffect(() => { fetchTasks() }, [facility.id])

  useEffect(() => {
    if (!roomInput.trim()) { setSuggestions([]); return }
    const q = roomInput.trim().toLowerCase()
    const matched = allPatients.filter(p =>
      (p.room_number ?? '').toLowerCase().includes(q) ||
      (p.initial ?? '').toLowerCase().includes(q)
    ).slice(0, 5)
    setSuggestions(matched)
  }, [roomInput])

  const handleSelectPatient = (p) => {
    setSelectedPatient(p)
    setRoomInput(`${p.room_number}${p.initial ? '　' + p.initial : ''}`)
    setSuggestions([])
  }

  const handleAdd = async () => {
    if (!memo.trim()) return
    setAdding(true)
    await db.addTask(facility.id, {
      patient_id: selectedPatient?.id ?? null,
      color,
      memo: memo.trim(),
      input_date: todayStr(),
      deadline: deadline || null,
    })
    setMemo('')
    setDeadline('')
    setRoomInput('')
    setSelectedPatient(null)
    await fetchTasks()
    setAdding(false)
  }

  const handleComplete = async (task) => {
    await db.updateTask(task.id, { is_completed: true, completed_date: todayStr() })
    await fetchTasks()
  }

  const handleUncomplete = async (task) => {
    await db.updateTask(task.id, { is_completed: false, completed_date: null })
    await fetchTasks()
  }

  const handleDelete = async (task) => {
    if (!confirm('このタスクを削除しますか？')) return
    await db.deleteTask(task.id)
    await fetchTasks()
  }

  const handleCopy = async (task) => {
    try {
      await navigator.clipboard.writeText(task.memo)
    } catch {
      const el = document.createElement('textarea')
      el.value = task.memo
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopyingId(task.id)
    setTimeout(() => setCopyingId(null), 1500)
  }

  const handleMemoChange = (e) => {
    setMemo(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.max(52, e.target.scrollHeight) + 'px'
  }

  const incompleteTasks = tasks.filter(t => !t.is_completed)
  const completedTasks = tasks.filter(t => t.is_completed)

  const renderTask = (task, isCompleted) => {
    const overdue = !isCompleted && isOverdue(task.deadline)
    const patient = task.patient_id ? allPatients.find(p => p.id === task.patient_id) : null

    return (
      <div
        key={task.id}
        style={{
          display: 'flex',
          gap: 8,
          padding: '9px 10px',
          borderBottom: '1px solid #e2e8f0',
          background: isCompleted ? '#f8fafc' : 'white',
          alignItems: 'flex-start',
        }}
      >
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: task.color, flexShrink: 0, marginTop: 5,
        }} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            {patient && (
              <span style={{
                fontSize: 10, padding: '1px 6px', borderRadius: 10,
                background: '#eff6ff', color: '#1d4ed8',
                border: '1px solid #bfdbfe', fontWeight: 600, whiteSpace: 'nowrap',
              }}>
                🏠 {patient.room_number}{patient.initial ? '　' + patient.initial : ''}
              </span>
            )}
            <span style={{ fontSize: 10, color: '#64748b' }}>
              入力：{fmtMMDD(task.input_date)}
            </span>
            {task.deadline && (
              <span style={{
                fontSize: 10, padding: '1px 5px', borderRadius: 4,
                background: overdue ? '#fee2e2' : '#f1f5f9',
                color: overdue ? '#dc2626' : '#475569',
                fontWeight: overdue ? 700 : 400,
              }}>
                期限：{fmtMMDD(task.deadline)}
              </span>
            )}
            {isCompleted && task.completed_date && (
              <span style={{ fontSize: 10, color: '#94a3b8' }}>
                完了：{fmtMMDD(task.completed_date)}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 12, lineHeight: 1.65,
            color: isCompleted ? '#94a3b8' : '#1e293b',
            whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            textDecoration: isCompleted ? 'line-through' : 'none',
          }}>
            {task.memo}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}>
          {!isCompleted ? (
            <button
              onClick={() => handleComplete(task)}
              title="完了にする"
              style={{
                fontSize: 10, padding: '2px 5px', borderRadius: 4,
                border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >✓完了</button>
          ) : (
            <button
              onClick={() => handleUncomplete(task)}
              title="未完了に戻す"
              style={{
                fontSize: 10, padding: '2px 5px', borderRadius: 4,
                border: '1px solid #e2e8f0', background: '#f8fafc', color: '#64748b',
                cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >↩戻す</button>
          )}
          <button
            onClick={() => handleCopy(task)}
            title="メモをコピー"
            style={{
              fontSize: 10, padding: '2px 5px', borderRadius: 4,
              border: '1px solid #e2e8f0',
              background: copyingId === task.id ? '#f0fdf4' : 'white',
              color: copyingId === task.id ? '#16a34a' : '#64748b',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >{copyingId === task.id ? '✓' : '📋'}</button>
          <button
            onClick={() => handleDelete(task)}
            title="削除"
            style={{
              fontSize: 10, padding: '2px 5px', borderRadius: 4,
              border: '1px solid #fca5a5', background: 'white', color: '#ef4444',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >🗑️</button>
        </div>
      </div>
    )
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div
        style={{
          background: 'white',
          borderRadius: 14,
          width: '100%',
          maxWidth: 560,
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          background: '#0f1f4e',
          borderBottom: '2px solid #c9a84c',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'white', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📝 引継ぎ・タスク表　{facility.name}
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none',
              color: 'rgba(255,255,255,0.7)', fontSize: 16,
              cursor: 'pointer', padding: '0 2px', lineHeight: 1, flexShrink: 0, marginLeft: 8,
            }}
          >✕</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 16px' }}>
          {/* Add form */}
          <div style={{
            marginBottom: 14,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 12,
          }}>
            {/* Color picker */}
            <div style={{ marginBottom: 9 }}>
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 500, marginBottom: 5 }}>担当カラー</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`カラー ${c}`}
                    style={{
                      width: 22, height: 22, borderRadius: '50%', background: c,
                      border: color === c ? '3px solid #0f1f4e' : '3px solid transparent',
                      outline: color === c ? `2px solid ${c}` : 'none',
                      outlineOffset: 2,
                      cursor: 'pointer', padding: 0, flexShrink: 0,
                      transition: 'border-color 0.1s, outline 0.1s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Room / patient */}
            <div style={{ marginBottom: 8, position: 'relative' }}>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 3 }}>
                部屋番号（任意）
              </label>
              <input
                type="text"
                value={roomInput}
                onChange={e => {
                  setRoomInput(e.target.value)
                  if (!e.target.value.trim()) setSelectedPatient(null)
                }}
                placeholder="入力すると患者を絞り込み表示"
                style={{
                  width: '100%', fontSize: 12,
                  border: '1.5px solid #e2e8f0', borderRadius: 6,
                  padding: '6px 8px', fontFamily: 'inherit', outline: 'none',
                  boxSizing: 'border-box',
                  background: selectedPatient ? '#eff6ff' : 'white',
                  color: '#1e293b',
                }}
                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                onBlur={e => { e.target.style.borderColor = '#e2e8f0'; setTimeout(() => setSuggestions([]), 200) }}
              />
              {suggestions.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: 6,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden',
                }}>
                  {suggestions.map(p => (
                    <button
                      key={p.id}
                      onMouseDown={() => handleSelectPatient(p)}
                      style={{
                        width: '100%', textAlign: 'left', padding: '7px 10px',
                        border: 'none', borderBottom: '1px solid #f1f5f9',
                        background: 'white', cursor: 'pointer',
                        fontFamily: 'inherit', fontSize: 12, color: '#1e293b', display: 'block',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'white'}
                    >
                      🏠 {p.room_number}{p.initial ? '　' + p.initial : ''}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Memo textarea */}
            <div style={{ marginBottom: 8 }}>
              <label style={{ fontSize: 10, color: '#64748b', fontWeight: 500, display: 'block', marginBottom: 3 }}>
                メモ・タスク内容
              </label>
              <textarea
                value={memo}
                onChange={handleMemoChange}
                placeholder="タスク内容を入力してください"
                rows={2}
                style={{
                  width: '100%', fontSize: 12,
                  border: '1.5px solid #e2e8f0', borderRadius: 6,
                  padding: '6px 8px', fontFamily: 'inherit', outline: 'none',
                  resize: 'none', boxSizing: 'border-box',
                  lineHeight: 1.65, minHeight: 52, overflow: 'hidden',
                  color: '#1e293b',
                }}
                onFocus={e => e.target.style.borderColor = '#38bdf8'}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>

            {/* Deadline */}
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 500, flexShrink: 0 }}>期限（任意）</span>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                style={{
                  fontSize: 12, border: '1.5px solid #e2e8f0', borderRadius: 6,
                  padding: '5px 8px', fontFamily: 'inherit', outline: 'none',
                  color: deadline ? '#1e293b' : '#94a3b8',
                }}
              />
              {deadline && (
                <button
                  onClick={() => setDeadline('')}
                  style={{
                    fontSize: 10, padding: '2px 5px', borderRadius: 4,
                    border: '1px solid #e2e8f0', background: 'white', color: '#94a3b8',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >✕</button>
              )}
            </div>

            <button
              onClick={handleAdd}
              disabled={adding || !memo.trim()}
              style={{
                width: '100%', padding: '8px 0', borderRadius: 6, border: 'none',
                background: adding || !memo.trim() ? '#cbd5e1' : '#0f1f4e',
                color: 'white', fontSize: 13, fontWeight: 600,
                cursor: adding || !memo.trim() ? 'default' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >
              {adding ? '追加中…' : '＋ 追加'}
            </button>
          </div>

          {/* Incomplete tasks */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 }}>
              読み込み中…
            </div>
          ) : incompleteTasks.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: 14, color: '#94a3b8', fontSize: 12,
              border: '1px dashed #e2e8f0', borderRadius: 8, marginBottom: 12,
            }}>
              未完了のタスクはありません
            </div>
          ) : (
            <div style={{
              border: '1px solid #e2e8f0', borderRadius: 10,
              overflow: 'hidden', marginBottom: 12,
            }}>
              {incompleteTasks.map(t => renderTask(t, false))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(v => !v)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 11, color: '#64748b',
                  padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                {showCompleted ? '▲' : '▼'} 完了済み（{completedTasks.length}件）を{showCompleted ? '折りたたむ' : '表示'}
              </button>
              {showCompleted && (
                <div style={{
                  border: '1px solid #e2e8f0', borderRadius: 10,
                  overflow: 'hidden', marginTop: 6,
                }}>
                  {completedTasks.map(t => renderTask(t, true))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
