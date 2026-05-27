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
function CalcTool({ visitCalc }) {
  const [addStart, setAddStart] = useState(visitCalc?.visitDate ?? '')
  const [timing, setTiming] = useState('morning')
  const rxEnd = visitCalc?.rxEnd ?? ''

  useEffect(() => {
    if (visitCalc?.visitDate) setAddStart(visitCalc.visitDate)
  }, [visitCalc?.visitDate])

  let addDays = null
  let periodText = ''
  let alertText = ''

  if (addStart && rxEnd) {
    const start = new Date(addStart)
    const end   = new Date(rxEnd)
    const offset = timing === 'morning' ? 1 : timing === 'day2morning' ? 2 : 0
    const actualStart = new Date(start)
    actualStart.setDate(actualStart.getDate() + offset)
    const diff = Math.ceil((end - actualStart) / (1000*60*60*24)) + 1
    if (diff > 0) {
      addDays = diff
      const label = timing === 'morning' ? '翌朝' : timing === 'evening' ? '当日夕' : timing === 'noon' ? '当日昼' : '翌々朝'
      periodText = `${fmtDisp(actualStart)} ${label} 〜 ${fmtDisp(end)} 朝`
      if (timing === 'evening' || timing === 'noon') {
        alertText = `${fmtDisp(end)}分（朝）は定期処方と重複します。確認してください。`
      }
    }
  }

  return (
    <div className="calc-tool" style={{
      background: 'linear-gradient(135deg, var(--sky-800), var(--sky-900))',
      borderRadius: 12, padding: 16, marginBottom: 10,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em', marginBottom: 12 }}>
        ⚡ 追加薬 日数計算
      </div>
      <div className="calc-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
        <CalcField label="追加薬の開始日">
          <input type="date" value={addStart} onChange={e => setAddStart(e.target.value)} style={calcInputStyle} />
        </CalcField>
        <CalcField label="開始タイミング">
          <select value={timing} onChange={e => setTiming(e.target.value)} style={calcInputStyle}>
            <option value="morning">翌朝から</option>
            <option value="evening">当日夕から</option>
            <option value="noon">当日昼から</option>
            <option value="day2morning">翌々朝から</option>
          </select>
        </CalcField>
        <CalcField label="処方のお尻（定期処方最終日）">
          <input type="text" value={rxEnd} readOnly style={{ ...calcInputStyle, opacity: 0.7 }} />
        </CalcField>
        <div style={{
          background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
          borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 80,
        }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1 }}>{addDays ?? '—'}</div>
          <div style={{ fontSize: 9, color: 'var(--sky-200)', marginTop: 2 }}>日分</div>
        </div>
      </div>
      {alertText && (
        <div style={{ marginTop: 8, background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#fef08a', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠️ {alertText}
        </div>
      )}
      {periodText && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--sky-200)' }}>{periodText}</div>
      )}
    </div>
  )
}

function CalcField({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 9, color: 'var(--sky-200)', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const calcInputStyle = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'white',
  fontFamily: 'inherit', width: '100%', outline: 'none',
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
  const [adding,    setAdding]      = useState(false)
  const [showForm,  setShowForm]    = useState(false)
  const [copied,    setCopied]      = useState(false)

  // 往診日が変わったらデフォルト日付を同期
  useEffect(() => {
    if (visitCalc?.visitDate) setInstrDate(visitCalc.visitDate)
  }, [visitCalc?.visitDate])

  const logs = [...(patient?.om_change_logs ?? [])].sort((a, b) =>
    new Date(b.changed_at) - new Date(a.changed_at)
  )

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
          📝 薬剤変更ログ
          <div style={{ display: 'flex', gap: 6 }}>
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
                <label className="field-label">変更指示日</label>
                <input
                  type="date" className="field-input"
                  value={instrDate} onChange={e => setInstrDate(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">理由（空欄→「指示受け」）</label>
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
            変更ログがまだありません
          </p>
        )}

        {/* ログ一覧 */}
        {logs.map((log, i) => {
          const reason = log.reason?.trim() || '指示受け'
          const instrD = fmtMMDD(log.changed_at)
          const hasStartDate = !!log.start_date
          const startD = hasStartDate ? fmtMMDD(log.start_date) : null

          return (
            <div key={log.id} style={{
              padding: '8px 0',
              borderBottom: i < logs.length - 1 ? '1px solid var(--sky-50)' : 'none',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <div style={{ flex: 1, fontSize: 12 }}>
                {hasStartDate ? (
                  <>
                    <div style={{ color: 'var(--sky-700)', fontWeight: 600, lineHeight: 1.7 }}>
                      <span style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{instrD}</span>
                      　{reason}
                    </div>
                    <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                      <span style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{startD}〜</span>
                      　{log.content}
                    </div>
                  </>
                ) : (
                  // 旧形式バックワード互換
                  <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                    <span style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{instrD}</span>
                    　{log.content}
                  </div>
                )}
              </div>
              <button className="icon-btn" style={{ flexShrink: 0, marginTop: 2 }} onClick={() => del(log.id)}>🗑️</button>
            </div>
          )
        })}
      </div>
    </>
  )
}
