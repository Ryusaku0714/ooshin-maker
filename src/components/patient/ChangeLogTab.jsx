import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'
import CopyButton from '../common/CopyButton'
import RowActionsMenu from '../common/RowActionsMenu'
import {
  PREV_TIMING, fmtMMDD, fmtMD, addDaysToStr,
  computeTemporaryEnd, computeTemporaryDays, formatChangeLogText,
} from '../../lib/changeLogFormat'

// ── 追加薬 日数計算ツール（変更ログタブ上部） ──────────────
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** yyyy-MM-dd → "5/28（木）" */
function fmtWithDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth()+1}/${d.getDate()}（${DAY_LABELS[d.getDay()]}）`
}

function CalcTool({ visitCalc }) {
  const [addStart,    setAddStart]    = useState(visitCalc?.visitDate ?? '')
  const [startTiming, setStartTiming] = useState('朝')
  const [manualDays,  setManualDays]  = useState('')
  const [targetDate,  setTargetDate]  = useState('')
  const [open,        setOpen]        = useState(true)
  const [copiedPeriod, setCopiedPeriod] = useState(false)
  const [copiedTarget, setCopiedTarget] = useState(false)
  const rxEnd = visitCalc?.rxEnd ?? ''

  // スマホ判定（768px以下）— JSXインラインstyleで直接レイアウト制御するため
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false
  )
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const handler = (e) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (visitCalc?.visitDate) setAddStart(visitCalc.visitDate)
  }, [visitCalc?.visitDate])

  const calc50MobileStyle = { width: '45%' }

  const endTiming = PREV_TIMING[startTiming]
  const isManual  = manualDays.trim() !== '' && !isNaN(parseInt(manualDays)) && parseInt(manualDays) > 0

  let periodText = ''
  let daysText   = ''
  let periodCopyDays = ''

  if (addStart) {
    if (isManual) {
      const days = parseInt(manualDays)
      // 朝開始は同日の眠前で完結（+days-1日）、昼以降は翌日へまたぐ（+days日）
      const daysOffset = startTiming === '朝' ? days - 1 : days
      const endStr = addDaysToStr(addStart, daysOffset)
      periodText     = `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(endStr)}${endTiming}`
      daysText       = `${days}日分`
      periodCopyDays = `${days}日分`
    } else if (rxEnd) {
      const start = new Date(addStart + 'T00:00:00')
      const end   = new Date(rxEnd    + 'T00:00:00')
      const diff  = Math.ceil((end - start) / (1000*60*60*24)) + 1
      if (diff > 0) {
        // 朝開始以外は定期処方末日の翌日までまたがるため、末尾のタイミングは省き「+α」と表記する
        periodText     = startTiming === '朝'
          ? `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(rxEnd)}${endTiming}`
          : `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(rxEnd)}+α`
        daysText       = `定期に合わせた場合${diff}日分`
        periodCopyDays = `${diff}日分`
      }
    }
  }

  // 指定末日計算：指定末日の眠前を必ず含む日数・終了タイミングを求める
  let targetPeriodText = ''
  let targetDaysText   = ''
  if (addStart && targetDate) {
    const start    = new Date(addStart   + 'T00:00:00')
    const end      = new Date(targetDate + 'T00:00:00')
    const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24))
    const tDays = daysDiff + 1
    if (tDays > 0) {
      // 朝開始は指定末日当日の眠前で完結（+tDays-1日）、昼以降は翌日へまたぐ（+tDays日）
      const daysOffset = startTiming === '朝' ? tDays - 1 : tDays
      const endStr = addDaysToStr(addStart, daysOffset)
      targetPeriodText = `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(endStr)}${endTiming}`
      targetDaysText   = `${tDays}日分`
    }
  }

  function stripDow(str) {
    return str.replace(/（[日月火水木金土]）/g, '')
  }

  const handleCopyPeriod = async () => {
    if (!periodText || !periodCopyDays) return
    const text = `日数：${periodCopyDays}\n調剤：${stripDow(periodText)}`
    await navigator.clipboard.writeText(text)
    setCopiedPeriod(true)
    setTimeout(() => setCopiedPeriod(false), 1500)
  }

  const handleCopyTarget = async () => {
    if (!targetPeriodText || !targetDaysText) return
    const text = `日数：${targetDaysText}\n調剤：${stripDow(targetPeriodText)}`
    await navigator.clipboard.writeText(text)
    setCopiedTarget(true)
    setTimeout(() => setCopiedTarget(false), 1500)
  }

  return (
    <div className="calc-tool" style={{
      background: 'linear-gradient(135deg, var(--sky-800), var(--sky-900))',
      borderRadius: 10, padding: '10px 14px', marginBottom: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 8 : 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em' }}>
          ⚡ 日数計算ツール
        </div>
        {/* スマホのみ折りたたみボタンを表示 */}
        <button
          className="calc-tool-toggle"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? '折りたたむ' : '展開する'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--sky-200)', fontSize: 13, padding: '2px 4px', lineHeight: 1,
          }}
        >
          {open ? '▲' : '▼'}
        </button>
      </div>

      {/* 入力行＋結果を横並びでラップ */}
      {open && (
        <div className="calc-tool-fields" style={isMobile
          ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 6 }
          : { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }
        }>
          {/* 開始日・タイミングは完全50%固定（flex伸縮禁止） */}
          <div style={isMobile ? calc50MobileStyle : { flex: '1 1 110px', minWidth: 100 }}>
            <label style={calcLabelStyle}>開始日</label>
            <input type="date" value={addStart} onChange={e => setAddStart(e.target.value)} style={calcInputStyle} />
          </div>
          <div style={isMobile ? calc50MobileStyle : { flex: '1 1 75px', minWidth: 70 }}>
            <label style={calcLabelStyle}>タイミング</label>
            <select value={startTiming} onChange={e => setStartTiming(e.target.value)} style={calcSelectStyle}>
              <option value="朝">朝</option>
              <option value="昼">昼</option>
              <option value="夕">夕</option>
              <option value="眠前">眠前</option>
            </select>
          </div>
          <div style={isMobile ? { width: '45%' } : { flex: '1 1 80px', minWidth: 70 }}>
            <label style={calcLabelStyle}>定期処方末日</label>
            <input type="text" value={rxEnd} readOnly style={{ ...calcInputStyle, opacity: 0.7 }} />
          </div>
          <div style={isMobile ? calc50MobileStyle : { flex: '1 1 140px', minWidth: 130 }}>
            <label style={calcLabelStyle}>指定末日</label>
            <div style={{ display: 'flex', gap: 4 }}>
              <input
                type="date" value={targetDate}
                onChange={e => setTargetDate(e.target.value)}
                style={{ ...calcInputStyle, minWidth: 0, flex: 1 }}
              />
              {targetDate && (
                <button
                  type="button"
                  onClick={() => setTargetDate('')}
                  aria-label="指定末日を削除"
                  title="指定末日を削除"
                  style={calcClearBtnStyle}
                >×</button>
              )}
            </div>
          </div>
          <div style={isMobile ? { width: '45%' } : { flex: '1 1 65px', minWidth: 60 }}>
            <label style={calcLabelStyle}>日数（任意）</label>
            <input
              type="number" inputMode="numeric" value={manualDays}
              onChange={e => setManualDays(e.target.value)}
              placeholder="自動" min="1"
              style={calcInputStyle}
            />
          </div>

          {/* 定期末日・日数指定の結果：スマホは全幅・上ボーダー、PCは横並び・左ボーダー（指定末日入力中はやや薄く表示） */}
          {periodText && (
            <div style={{
              ...(isMobile
                ? { width: '100%', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }
                : { flex: '2 1 160px', minWidth: 140, paddingBottom: 2, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10 }),
              opacity: targetDate ? 0.4 : 1,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.5, wordBreak: 'break-all' }}>
                    {periodText}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--sky-200)', marginTop: 2 }}>
                    {daysText}
                  </div>
                </div>
                <button type="button" onClick={handleCopyPeriod} style={calcCopyBtnStyle}>
                  {copiedPeriod ? '✅' : '日付コピー'}
                </button>
              </div>
            </div>
          )}

          {/* 指定末日の結果 */}
          {targetPeriodText && (
            <div style={isMobile
              ? { width: '100%', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.2)' }
              : { flex: '2 1 160px', minWidth: 140, paddingBottom: 2, borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: 10 }
            }>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.5, wordBreak: 'break-all' }}>
                    {targetPeriodText}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--sky-200)', marginTop: 2 }}>
                    {targetDaysText}
                  </div>
                </div>
                <button type="button" onClick={handleCopyTarget} style={calcCopyBtnStyle}>
                  {copiedTarget ? '✅' : '日付コピー'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const calcLabelStyle = { fontSize: 9, color: 'var(--sky-200)', display: 'block', marginBottom: 3 }

const calcInputStyle = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'white',
  fontFamily: 'inherit', width: '100%', outline: 'none',
}

// 日付コピーボタン
const calcCopyBtnStyle = {
  flexShrink: 0,
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 5,
  color: 'white',
  fontSize: 9,
  fontWeight: 700,
  padding: '3px 7px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  lineHeight: 1.4,
  alignSelf: 'flex-start',
  marginTop: 2,
}

// 指定末日クリアボタン（×）
const calcClearBtnStyle = {
  flexShrink: 0, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, color: 'white', fontSize: 14, fontWeight: 700, lineHeight: 1,
  padding: '0 9px', cursor: 'pointer', fontFamily: 'inherit',
}

// select は option が白背景で見えなくなるため背景を濃く設定
const calcSelectStyle = {
  ...calcInputStyle,
  colorScheme: 'dark',
}

// 編集前の空フォーム（log_type で「定期変更」「臨時薬」を判別）
const BLANK_REGULAR_EDIT = { log_type: 'regular', changed_at: '', reason: '', start_date: '', content: '' }

function blankTempForm(instrDate) {
  return {
    changed_at: instrDate,
    reason: '',
    start_date: instrDate,
    start_timing: '朝',
    end_timing: PREV_TIMING['朝'],
    drug_name: '',
    days: '',
    end_date: '',
  }
}

// ── 臨時薬：入力フィールド群（追加・編集フォーム共通） ───────
function TemporaryLogFields({ value, onChange }) {
  // 日数入力 → 終了日・終了タイミングを再計算（分4ロジック）
  const recalcFromDays = (next) => {
    const n = parseInt(next.days)
    if (next.days?.toString().trim() !== '' && !isNaN(n) && n > 0 && next.start_date) {
      const { endDate, endTiming } = computeTemporaryEnd(next.start_date, next.start_timing, n)
      return { ...next, end_date: endDate, end_timing: endTiming }
    }
    return next
  }

  // 終了日入力 → 日数・終了タイミングを再計算（分4ロジック）
  const recalcFromEndDate = (next) => {
    if (next.end_date && next.start_date) {
      const { days, endTiming } = computeTemporaryDays(next.start_date, next.start_timing, next.end_date)
      if (days > 0) return { ...next, days: String(days), end_timing: endTiming }
    }
    return next
  }

  const handleDaysChange = (val) => onChange(recalcFromDays({ ...value, days: val }))
  const handleEndDateChange = (val) => onChange(recalcFromEndDate({ ...value, end_date: val }))

  // 開始日・開始タイミング変更時は、終了タイミングを再計算し、入力済みの日数／終了日を基準に再計算
  const handleStartChange = (patch) => {
    let next = { ...value, ...patch }
    if (patch.start_timing) next = { ...next, end_timing: PREV_TIMING[patch.start_timing] }
    if (next.days?.toString().trim() !== '') next = recalcFromDays(next)
    else if (next.end_date) next = recalcFromEndDate(next)
    onChange(next)
  }

  const line1 = value.changed_at
    ? `${fmtMD(value.changed_at)}　${value.reason?.trim() || '変更指示'}`
    : ''
  const line2 = (value.start_date && value.end_date && value.end_timing)
    ? `${fmtMD(value.start_date)}${value.start_timing}〜${fmtMD(value.end_date)}${value.end_timing}　${value.drug_name}`
    : ''

  return (
    <>
      <div>
        <label className="field-label">指示日</label>
        <input
          type="date" className="field-input"
          value={value.changed_at}
          onChange={e => onChange({ ...value, changed_at: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">症状・理由（空欄→「変更指示」）</label>
        <input
          type="text" className="field-input"
          value={value.reason}
          onChange={e => onChange({ ...value, reason: e.target.value })}
          placeholder="例：発熱・疼痛・便秘"
        />
      </div>
      <div>
        <label className="field-label">開始日</label>
        <input
          type="date" className="field-input"
          value={value.start_date}
          onChange={e => handleStartChange({ start_date: e.target.value })}
        />
      </div>
      <div>
        <label className="field-label">開始タイミング</label>
        <select
          className="field-input"
          value={value.start_timing}
          onChange={e => handleStartChange({ start_timing: e.target.value })}
        >
          <option value="朝">朝</option>
          <option value="昼">昼</option>
          <option value="夕">夕</option>
          <option value="眠前">眠前</option>
        </select>
      </div>
      <div>
        <label className="field-label">終了タイミング</label>
        <select
          className="field-input"
          value={value.end_timing}
          onChange={e => onChange({ ...value, end_timing: e.target.value })}
        >
          <option value="朝">朝</option>
          <option value="昼">昼</option>
          <option value="夕">夕</option>
          <option value="眠前">眠前</option>
        </select>
      </div>
      <div style={{ gridColumn: '1 / -1' }}>
        <label className="field-label">薬剤名・用法等</label>
        <input
          type="text" className="field-input"
          value={value.drug_name}
          onChange={e => onChange({ ...value, drug_name: e.target.value })}
          placeholder="例：ロキソプロフェン60mg 飲み切り / ムコスタ100mg 2錠 飲み切り"
        />
      </div>
      <div>
        <label className="field-label">日数</label>
        <input
          type="number" inputMode="numeric" className="field-input" min="1"
          value={value.days}
          onChange={e => handleDaysChange(e.target.value)}
          placeholder="自動"
        />
      </div>
      <div>
        <label className="field-label">終了日</label>
        <input
          type="date" className="field-input"
          value={value.end_date}
          onChange={e => handleEndDateChange(e.target.value)}
        />
      </div>
      {(line1 || line2) && (
        <div style={{ gridColumn: '1 / -1', fontSize: 12, fontWeight: 700, color: 'var(--sky-700)', lineHeight: 1.6 }}>
          <div>{line1}</div>
          {line2 && <div>{line2}</div>}
        </div>
      )}
    </>
  )
}

// ── メインコンポーネント ───────────────────────────────────
export default function ChangeLogTab({ patient, visitCalc, onRefetch }) {
  const today = new Date().toISOString().slice(0, 10)
  const [instrDate, setInstrDate]   = useState(visitCalc?.visitDate ?? today)
  const [reason,    setReason]      = useState('')
  const [startDate, setStartDate]   = useState('')
  const [content,   setContent]     = useState('')
  const [adding,      setAdding]      = useState(false)
  const [addMode,     setAddMode]     = useState(null) // null | 'regular' | 'temporary'
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [tempForm,    setTempForm]    = useState(() => blankTempForm(visitCalc?.visitDate ?? today))
  const [copied,      setCopied]      = useState(false)
  const [editingId,   setEditingId]   = useState(null)
  const [editForm,    setEditForm]    = useState(BLANK_REGULAR_EDIT)
  const [editSaving,  setEditSaving]  = useState(false)
  const [sortMode,    setSortMode]    = useState('date')
  const [showArchived, setShowArchived] = useState(false)

  // 往診日が変わったらデフォルト日付を同期
  useEffect(() => {
    if (visitCalc?.visitDate) setInstrDate(visitCalc.visitDate)
  }, [visitCalc?.visitDate])

  const sortedLogs = [...(patient?.om_change_logs ?? [])].sort((a, b) => {
    if (sortMode === 'date') {
      const diff = new Date(a.changed_at) - new Date(b.changed_at)
      if (diff !== 0) return diff
      return new Date(a.created_at) - new Date(b.created_at)
    }
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const logs         = sortedLogs.filter(l => !l.is_archived)
  const archivedLogs = sortedLogs.filter(l => l.is_archived)

  const resetForm = () => {
    setReason('')
    setStartDate('')
    setContent('')
  }

  const resetTempForm = () => setTempForm(blankTempForm(instrDate))

  const closeAddForm = () => {
    setAddMode(null)
    resetForm()
    resetTempForm()
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
    setAddMode(null)
    onRefetch?.()
  }

  const addTemporary = async () => {
    if (!tempForm.drug_name.trim() || !tempForm.end_date || !tempForm.end_timing) return
    setAdding(true)
    await db.addLog(patient.id, {
      changed_at:   tempForm.changed_at,
      log_type:     'temporary',
      reason:       tempForm.reason.trim() || '変更指示',
      drug_name:    tempForm.drug_name.trim(),
      start_timing: tempForm.start_timing,
      end_timing:   tempForm.end_timing,
      days:         tempForm.days.trim() !== '' ? parseInt(tempForm.days) : null,
      start_date:   tempForm.start_date,
      end_date:     tempForm.end_date,
      content:      tempForm.drug_name.trim(),
    })
    resetTempForm()
    setAdding(false)
    setAddMode(null)
    onRefetch?.()
  }

  const del = async (id) => {
    if (!confirm('このログを削除しますか？')) return
    await db.deleteLog(id)
    onRefetch?.()
  }

  const archiveLog = async (id) => {
    await db.updateLog(id, { is_archived: true })
    onRefetch?.()
  }

  const restoreLog = async (id) => {
    await db.updateLog(id, { is_archived: false })
    onRefetch?.()
  }

  const startEdit = (log) => {
    setEditingId(log.id)
    if (log.log_type === 'temporary') {
      const startTiming = log.start_timing ?? '朝'
      setEditForm({
        log_type:     'temporary',
        changed_at:   log.changed_at   ?? '',
        reason:       log.reason       ?? '',
        start_date:   log.start_date   ?? log.changed_at ?? '',
        start_timing: startTiming,
        end_timing:   log.end_timing   ?? PREV_TIMING[startTiming],
        drug_name:    log.drug_name    ?? '',
        days:         log.days != null ? String(log.days) : '',
        end_date:     log.end_date     ?? '',
      })
    } else {
      setEditForm({
        log_type:   'regular',
        changed_at: log.changed_at ?? '',
        reason:     log.reason     ?? '',
        start_date: log.start_date ?? '',
        content:    log.content    ?? '',
      })
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(BLANK_REGULAR_EDIT)
  }

  const saveEdit = async () => {
    if (editForm.log_type === 'temporary') {
      if (!editForm.drug_name.trim() || !editForm.end_date || !editForm.end_timing) return
      setEditSaving(true)
      await db.updateLog(editingId, {
        changed_at:   editForm.changed_at,
        reason:       editForm.reason.trim() || '変更指示',
        drug_name:    editForm.drug_name.trim(),
        start_timing: editForm.start_timing,
        end_timing:   editForm.end_timing,
        days:         editForm.days.trim() !== '' ? parseInt(editForm.days) : null,
        start_date:   editForm.start_date,
        end_date:     editForm.end_date,
        content:      editForm.drug_name.trim(),
      })
      setEditSaving(false)
      cancelEdit()
      onRefetch?.()
      return
    }
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
    const text = logs.map(formatChangeLogText).join('\n\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ログ1件分の表示行（使用中／アーカイブ共通）
  const renderLog = (log, i, arr, archived) => {
    const isEditing    = editingId === log.id
    const displayReason = log.reason?.trim() || '指示受け'
    const instrD       = fmtMMDD(log.changed_at)
    const hasStartDate = !!log.start_date
    const startD       = hasStartDate ? fmtMMDD(log.start_date) : null

    const actions = archived
      ? [
          { key: 'edit',    icon: '✏️', label: '編集', onClick: () => startEdit(log) },
          { key: 'restore', icon: '↩️', label: '復元', title: '復元（記録に戻す）', onClick: () => restoreLog(log.id) },
          { key: 'delete',  icon: '🗑️', label: '削除', title: '完全削除', onClick: () => del(log.id) },
        ]
      : [
          { key: 'edit',    icon: '✏️', label: '編集', onClick: () => startEdit(log) },
          { key: 'archive', icon: '📂', label: 'アーカイブ', title: 'アーカイブ（記録として保存）', onClick: () => archiveLog(log.id) },
          { key: 'delete',  icon: '🗑️', label: '削除', title: '完全削除', onClick: () => del(log.id) },
        ]

    return (
      <div key={log.id} style={{
        padding: isEditing ? 0 : '8px 0',
        borderBottom: (!isEditing && i < arr.length - 1) ? '1px solid var(--sky-50)' : 'none',
        marginBottom: isEditing ? 8 : 0,
        opacity: archived ? 0.7 : 1,
      }}>
        {isEditing ? (
          <div style={{
            background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
            borderRadius: 8, padding: 12,
          }}>
            <div className="log-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              {editForm.log_type === 'temporary' ? (
                <TemporaryLogFields value={editForm} onChange={setEditForm} />
              ) : (
                <>
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
                </>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={cancelEdit}>キャンセル</button>
              <button
                className="btn btn-primary btn-sm" onClick={saveEdit}
                disabled={editSaving || (editForm.log_type === 'temporary'
                  ? (!editForm.drug_name.trim() || !editForm.end_date || !editForm.end_timing)
                  : !editForm.content.trim())}
              >
                {editSaving ? '…' : '保存'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ flex: 1, fontSize: 12 }}>
              {log.log_type === 'temporary' ? (
                <>
                  <div className="log-instr-header" style={{ color: 'var(--sky-700)', fontWeight: 600, lineHeight: 1.7 }}>
                    <span className="log-badge-temp">臨時</span>
                    <span className="log-date-span" style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{fmtMD(log.changed_at)}</span>
                    　{log.reason?.trim() || '変更指示'}
                  </div>
                  <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ fontWeight: 700, color: 'var(--sky-600)' }}>
                      {fmtMD(log.start_date ?? log.changed_at)}{log.start_timing}〜{fmtMD(log.end_date)}{log.end_timing}
                    </span>
                    　{log.drug_name}
                  </div>
                </>
              ) : hasStartDate ? (
                <>
                  <div className="log-instr-header" style={{ color: 'var(--sky-700)', fontWeight: 600, lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{instrD}</span>
                    　{displayReason}
                  </div>
                  <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{startD}〜</span>
                    　{log.content}
                  </div>
                </>
              ) : (
                <div style={{ color: 'var(--gray-700)', lineHeight: 1.7 }}>
                  <span className="log-date-span" style={{ fontWeight: 700, color: 'var(--sky-600)' }}>{instrD}</span>
                  　{log.content}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              <CopyButton title="この記録をコピー" getText={() => formatChangeLogText(log)} />
              <RowActionsMenu actions={actions} />
            </div>
          </div>
        )}
      </div>
    )
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
            {archivedLogs.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowArchived(s => !s)}
                style={{ color: showArchived ? 'var(--sky-600)' : 'var(--gray-400)', borderColor: showArchived ? 'var(--sky-200)' : 'var(--gray-200)' }}
              >
                {showArchived ? '📂 アーカイブを隠す' : `📂 アーカイブを表示（${archivedLogs.length}件）`}
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => addMode ? closeAddForm() : setShowAddMenu(m => !m)}
              >
                {addMode ? '✕ 閉じる' : '＋ 追加'}
              </button>
              {showAddMenu && (
                <>
                  <div className="add-menu-overlay" onClick={() => setShowAddMenu(false)} />
                  <div className="add-menu">
                    <button className="add-menu-item" onClick={() => { setAddMode('regular'); setShowAddMenu(false) }}>
                      📋 定期変更
                    </button>
                    <button className="add-menu-item" onClick={() => { setAddMode('temporary'); setShowAddMenu(false) }}>
                      💊 臨時薬
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 入力フォーム：定期変更 */}
        {addMode === 'regular' && (
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
              <button className="btn btn-outline btn-sm" onClick={closeAddForm}>キャンセル</button>
              <button className="btn btn-primary btn-sm" onClick={add} disabled={adding || !content.trim()}>
                {adding ? '…' : '追加'}
              </button>
            </div>
          </div>
        )}

        {/* 入力フォーム：臨時薬 */}
        {addMode === 'temporary' && (
          <div style={{
            background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)',
            borderRadius: 8, padding: 12, marginBottom: 12,
          }}>
            <div className="log-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <TemporaryLogFields value={tempForm} onChange={setTempForm} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={closeAddForm}>キャンセル</button>
              <button
                className="btn btn-primary btn-sm" onClick={addTemporary}
                disabled={adding || !tempForm.drug_name.trim() || !tempForm.end_date || !tempForm.end_timing}
              >
                {adding ? '…' : '追加'}
              </button>
            </div>
          </div>
        )}

        {logs.length === 0 && !showArchived && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
            変更記録がまだありません
          </p>
        )}

        {/* ログ一覧 */}
        {logs.map((log, i) => renderLog(log, i, logs, false))}

        {showArchived && archivedLogs.length > 0 && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--gray-400)',
              margin: '10px 0 4px', paddingTop: 10,
              borderTop: '1px dashed var(--gray-200)',
              letterSpacing: '0.06em',
            }}>
              📂 アーカイブ（変更記録）
            </div>
            {archivedLogs.map((log, i) => renderLog(log, i, archivedLogs, true))}
          </>
        )}
      </div>
    </>
  )
}
