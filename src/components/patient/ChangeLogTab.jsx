import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'

// ── 日付ヘルパー ────────────────────────────────────────────
function fmtMMDD(dateStr) {
  if (!dateStr) return ''
  const [, mm, dd] = dateStr.split('-')
  return `${mm}/${dd}`
}
function fmtDisp(d) { return `${d.getMonth() + 1}/${d.getDate()}` }
function fmtFull(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// ── 追加薬 日数計算ツール（変更ログタブ上部） ──────────────
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']
const PREV_TIMING = { '朝': '眠前', '昼': '朝', '夕': '昼', '眠前': '夕' }

/** yyyy-MM-dd → "5/28（木）" */
function fmtWithDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth()+1}/${d.getDate()}（${DAY_LABELS[d.getDay()]}）`
}

/** dateStr に days 日加算した yyyy-MM-dd を返す */
function addDaysToStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function CalcTool({ visitCalc }) {
  const [addStart,    setAddStart]    = useState(visitCalc?.visitDate ?? '')
  const [startTiming, setStartTiming] = useState('朝')
  const [manualDays,  setManualDays]  = useState('')
  const rxEnd = visitCalc?.rxEnd ?? ''

  useEffect(() => {
    if (visitCalc?.visitDate) setAddStart(visitCalc.visitDate)
  }, [visitCalc?.visitDate])

  const endTiming = PREV_TIMING[startTiming]
  const isManual  = manualDays.trim() !== '' && !isNaN(parseInt(manualDays)) && parseInt(manualDays) > 0

  let periodText = ''
  let daysText   = ''

  if (addStart) {
    if (isManual) {
      const days = parseInt(manualDays)
      const endStr = addDaysToStr(addStart, days - 1)
      periodText = `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(endStr)}${endTiming}`
      daysText   = `${days}日分`
    } else if (rxEnd) {
      const start = new Date(addStart + 'T00:00:00')
      const end   = new Date(rxEnd    + 'T00:00:00')
      const diff  = Math.ceil((end - start) / (1000*60*60*24)) + 1
      if (diff > 0) {
        periodText = `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(rxEnd)}${endTiming}`
        daysText   = `定期に合わせた場合${diff}日分`
      }
    }
  }

  return (
    <div className="calc-tool" style={{
      background: 'linear-gradient(135deg, var(--sky-800), var(--sky-900))',
      borderRadius: 10, padding: '10px 14px', marginBottom: 10,
    }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em', marginBottom: 8 }}>
        ⚡ 追加薬 日数計算
      </div>

      {/* 入力行＋結果を横並びでラップ */}
      <div className="calc-tool-fields" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 110px', minWidth: 100 }}>
          <label style={calcLabelStyle}>開始日</label>
          <input type="date" value={addStart} onChange={e => setAddStart(e.target.value)} style={calcInputStyle} />
        </div>
        <div style={{ flex: '1 1 75px', minWidth: 70 }}>
          <label style={calcLabelStyle}>タイミング</label>
          <select value={startTiming} onChange={e => setStartTiming(e.target.value)} style={calcSelectStyle}>
            <option value="朝">朝</option>
            <option value="昼">昼</option>
            <option value="夕">夕</option>
            <option value="眠前">眠前</option>
          </select>
        </div>
        <div style={{ flex: '1 1 80px', minWidth: 70 }}>
          <label style={calcLabelStyle}>定期処方末日</label>
          <input type="text" value={rxEnd} readOnly style={{ ...calcInputStyle, opacity: 0.7 }} />
        </div>
        <div style={{ flex: '1 1 65px', minWidth: 60 }}>
          <label style={calcLabelStyle}>日数（任意）</label>
          <input
            type="number" value={manualDays}
            onChange={e => setManualDays(e.target.value)}
            placeholder="自動" min="1"
            style={calcInputStyle}
          />
        </div>

        {/* 結果：横に余裕があれば同行に展開 */}
        {periodText && (
          <div style={{
            flex: '2 1 160px', minWidth: 140, paddingBottom: 2,
            borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.5, wordBreak: 'break-all' }}>
              {periodText}
            </div>
            <div style={{ fontSize: 10, color: 'var(--sky-200)', marginTop: 2 }}>
              {daysText}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const calcLabelStyle = { fontSize: 9, color: 'var(--sky-200)', display: 'block', marginBottom: 3 }

const calcInputStyle = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'white',
  fontFamily: 'inherit', width: '100%', outline: 'none',
}

// select は option が白背景で見えなくなるため背景を濃く設定
const calcSelectStyle = {
  ...calcInputStyle,
  colorScheme: 'dark',
}

// ── ログのフォーマット ──────────────────────────────────────
function formatLogText(log) {
  const reason = log.reason?.trim() || '指示受け'
  const instrDate = fmtMMDD(log.changed_at)
  if (log.start_date) {
    const startDate = fmtMMDD(log.start_date)
    return `${instrDate}　${reason}\n${startDate}〜　${log.content}`
  }
  // 旧形式（start_date なし）のバックワード互換
  return `${instrDate}　${log.content}`
}

// ── メインコンポーネント ───────────────────────────────────
export default function ChangeLogTab({ patient, visitCalc, onRefetch }) {
  const today = new Date().toISOString().slice(0, 10)
  const [instrDate, setInstrDate]   = useState(visitCalc?.visitDate ?? today)
  const [reason,    setReason]      = useState('')
  const [startDate, setStartDate]   = useState('')
  const [content,   setContent]     = useState('')
  const [adding,      setAdding]      = useState(false)
  const [showForm,    setShowForm]    = useState(false)
  const [copied,      setCopied]      = useState(false)
  const [editingId,   setEditingId]   = useState(null)
  const [editForm,    setEditForm]    = useState({ changed_at: '', reason: '', start_date: '', content: '' })
  const [editSaving,  setEditSaving]  = useState(false)
  const [sortMode,    setSortMode]    = useState('date')

  // 往診日が変わったらデフォルト日付を同期
  useEffect(() => {
    if (visitCalc?.visitDate) setInstrDate(visitCalc.visitDate)
  }, [visitCalc?.visitDate])

  const logs = [...(patient?.om_change_logs ?? [])].sort((a, b) => {
    if (sortMode === 'date') {
      const diff = new Date(a.changed_at) - new Date(b.changed_at)
      if (diff !== 0) return diff
      return new Date(a.created_at) - new Date(b.created_at)
    }
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const resetForm = () => {
    setReason('')
    setStartDate('')
    setContent('')
  }

  const add = async () => {
    if (!content.trim()) return
    setAdding(true)
    await db.addLog(patient.id, {
      changed_at: instrDate,
      reason:     reason.trim(),
      start_date: startDate || instrDate,
      content:    content.trim(),
    })
    resetForm()
    setAdding(false)
    setShowForm(false)
    onRefetch?.()
  }

  const del = async (id) => {
    if (!confirm('このログを削除しますか？')) return
    await db.deleteLog(id)
    onRefetch?.()
  }

  const startEdit = (log) => {
    setEditingId(log.id)
    setEditForm({
      changed_at: log.changed_at ?? '',
      reason:     log.reason     ?? '',
      start_date: log.start_date ?? '',
      content:    log.content    ?? '',
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ changed_at: '', reason: '', start_date: '', content: '' })
  }

  const saveEdit = async () => {
    if (!editForm.content.trim()) return
    setEditSaving(true)
    await db.updateLog(editingId, {
      changed_at: editForm.changed_at,
      reason:     editForm.reason.trim(),
      start_date: editForm.start_date || editForm.changed_at,
      content:    editForm.content.trim(),
    })
    setEditSaving(false)
    cancelEdit()
    onRefetch?.()
  }

  const upEdit = k => e => setEditForm(f => ({ ...f, [k]: e.target.value }))

  const copyAll = async () => {
    const text = logs.map(formatLogText).join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <CalcTool visitCalc={visitCalc} />

      <div className="card">
        <div className="card-title">
          📝 薬剤変更記録
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                className={`btn btn-sm ${sortMode === 'date' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSortMode('date')}
              >日付順</button>
              <button
                className={`btn btn-sm ${sortMode === 'input' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSortMode('input')}
              >入力順</button>
            </div>
            {logs.length > 0 && (
              <button className="btn btn-outline btn-sm" onClick={copyAll}>
                {copied ? '✅ コピー済' : '📋 全コピー'}
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => setShowForm(s => !s)}>
              {showForm ? '✕ 閉じる' : '＋ 追加'}
            </button>
          </div>
        </div>

        {/* 入力フォーム */}
        {showForm && (
          <div style={{
            background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
            borderRadius: 8, padding: 12, marginBottom: 12,
          }}>
            <div className="log-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div>
                <label className="field-label" style={{ paddingLeft: '1em' }}>変更指示日</label>
                <input
                  type="date" className="field-input"
                  value={instrDate} onChange={e => setInstrDate(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label" style={{ paddingLeft: '1em' }}>理由（空欄→「指示受け」）</label>
                <input
                  type="text" className="field-input"
                  value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="例：傾眠あり"
                />
              </div>
              <div>
                <label className="field-label">開始日</label>
                <input
                  type="date" className="field-input"
                  value={startDate} onChange={e => setStartDate(e.target.value)}
                  placeholder={instrDate}
                />
              </div>
              <div>
                <label className="field-label">内容</label>
                <input
                  type="text" className="field-input"
                  value={content} onChange={e => setContent(e.target.value)}
                  placeholder="例：クエチアピン中止"
                  onKeyDown={e => e.key === 'Enter' && add()}
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={() => { setShowForm(false); resetForm() }}>キャンセル</button>
              <button className="btn btn-primary btn-sm" onClick={add} disabled={adding || !content.trim()}>
                {adding ? '…' : '追加'}
              </button>
            </div>
          </div>
        )}

        {logs.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
            変更記録がまだありません
          </p>
        )}

        {/* ログ一覧 */}
        {logs.map((log, i) => {
          const isEditing    = editingId === log.id
          const displayReason = log.reason?.trim() || '指示受け'
          const instrD       = fmtMMDD(log.changed_at)
          const hasStartDate = !!log.start_date
          const startD       = hasStartDate ? fmtMMDD(log.start_date) : null

          return (
            <div key={log.id} style={{
              padding: isEditing ? 0 : '8px 0',
              borderBottom: (!isEditing && i < logs.length - 1) ? '1px solid var(--sky-50)' : 'none',
              marginBottom: isEditing ? 8 : 0,
            }}>
              {isEditing ? (
                <div style={{
                  background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
                  borderRadius: 8, padding: 12,
                }}>
                  <div className="log-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <div>
                      <label className="field-label" style={{ paddingLeft: '1em' }}>変更指示日</label>
                      <input type="date" className="field-input" value={editForm.changed_at} onChange={upEdit('changed_at')} />
                    </div>
                    <div>
                      <label className="field-label" style={{ paddingLeft: '1em' }}>理由（空欄→「指示受け」）</label>
                      <input type="text" className="field-input" value={editForm.reason} onChange={upEdit('reason')} placeholder="例：傾眠あり" />
                    </div>
                    <div>
                      <label className="field-label">開始日</label>
                      <input type="date" className="field-input" value={editForm.start_date} onChange={upEdit('start_date')} />
                    </div>
                    <div>
                      <label className="field-label">内容</label>
                      <input
                        type="text" className="field-input"
                        value={editForm.content} onChange={upEdit('content')}
                        onKeyDown={e => e.key === 'Enter' && saveEdit()}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={cancelEdit}>キャンセル</button>
                    <button className="btn btn-primary btn-sm" onClick={saveEdit} disabled={editSaving || !editForm.content.trim()}>
                      {editSaving ? '…' : '保存'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, fontSize: 12 }}>
                    {hasStartDate ? (
                      <>
                        <div style={{ color: 'var(--sky-700)', fontWeight: 600, lineHeight: 1.7 }}>
                          <span style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{instrD}</span>
                          　{displayReason}
                        </div>
                        <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                          <span style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{startD}〜</span>
                          　{log.content}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                        <span style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{instrD}</span>
                        　{log.content}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2 }}>
                    <button className="icon-btn" title="編集" onClick={() => startEdit(log)}>✏️</button>
                    <button className="icon-btn" title="削除" onClick={() => del(log.id)}>🗑️</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
