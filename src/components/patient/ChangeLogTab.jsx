import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'
import CopyButton from '../common/CopyButton'
import RowActionsMenu from '../common/RowActionsMenu'
import {
  PREV_TIMING, fmtMMDD, addDaysToStr,
  computeTemporaryEnd, computeTemporaryDays, formatChangeLogText,
} from '../../lib/changeLogFormat'
import { loadCollapse, saveCollapse } from '../../lib/collapseStorage'

// ── 追加薬 日数計算ツール（変更ログタブ上部） ──────────────
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** yyyy-MM-dd → "05/28（木）" */
function fmtWithDay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${DAY_LABELS[d.getDay()]}）`
}

const TIMING_OPTIONS = [['なし', ''], ['朝', '朝'], ['昼', '昼'], ['夕', '夕'], ['眠前', '眠前']]

// タイミング選択：常時5ボタンではなく、タップで開く1個のチップ＋ドロップダウン
function CalcTimingChip({ value, onChange, mobile }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        width: '100%', height: mobile ? 34 : 40, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: mobile ? 6 : 8, padding: mobile ? '0 6px' : '0 10px',
        fontSize: mobile ? 10.5 : 13, fontFamily: 'inherit', color: '#e2e8f0', cursor: 'pointer',
      }}>
        <span>{value || 'なし'}</span><span style={{ fontSize: mobile ? 7 : 9, color: '#93c5fd' }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, minWidth: mobile ? 90 : 100,
            background: 'white', border: '1px solid #dce4f0', borderRadius: 8,
            boxShadow: '0 6px 20px rgba(15,31,78,0.25)', zIndex: 100, overflow: 'hidden',
          }}>
            {TIMING_OPTIONS.map(([label, val], i, arr) => (
              <button key={label} type="button" onClick={() => { onChange(val); setOpen(false) }} style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'white', border: 'none',
                borderBottom: i < arr.length - 1 ? '1px solid #f1f5fb' : 'none',
                padding: mobile ? '7px 10px' : '8px 12px', fontSize: mobile ? 11 : 12, fontWeight: 600,
                color: '#1e293b', cursor: 'pointer', fontFamily: 'inherit',
              }}>{label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// スマホの日付欄：見た目は年省略の短い自前表示、実体は透明化した<input type="date">を重ねる
// （font-size 16px以上にしてiOS Safariの自動ズームを防止）
function CompactDateField({ value, onChange, fmt }) {
  return (
    <div style={{
      position: 'relative', height: 34, background: 'rgba(255,255,255,0.08)',
      border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, display: 'flex',
      alignItems: 'center', padding: '0 8px', fontSize: 12, color: '#e2e8f0',
      whiteSpace: 'nowrap', overflow: 'hidden',
    }}>
      {value ? fmt(value) : '選択'}
      <input type="date" value={value} onChange={e => onChange(e.target.value)} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        opacity: 0, fontSize: 16, border: 'none', padding: 0, margin: 0,
      }} />
    </div>
  )
}

function calcFieldLabelStyle(mobile) {
  return {
    fontSize: mobile ? 8.5 : 10, color: '#93c5fd', fontWeight: 600,
    display: 'block', marginBottom: mobile ? 3 : 5, whiteSpace: 'nowrap',
    overflow: mobile ? 'hidden' : 'visible', textOverflow: mobile ? 'ellipsis' : 'clip',
  }
}

function calcFieldInputStyle(mobile) {
  return {
    width: '100%', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.2)', borderRadius: mobile ? 6 : 8,
    padding: mobile ? '0 8px' : '9px 8px', fontSize: mobile ? 12 : 13, color: '#e2e8f0',
    fontFamily: 'inherit', outline: 'none', height: mobile ? 34 : 40,
  }
}

function calcStepperBtnStyle(mobile) {
  return {
    width: mobile ? 24 : 38, height: '100%', border: 'none',
    background: 'rgba(255,255,255,0.06)', color: '#e2e8f0',
    fontSize: mobile ? 13 : 17, fontWeight: 700, cursor: 'pointer', flexShrink: 0, fontFamily: 'inherit',
  }
}

function calcPillBtnStyle(mobile, bg, color = 'white') {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, border: 'none',
    borderRadius: 20, color, padding: mobile ? '4px 9px' : '5px 11px',
    fontSize: mobile ? 9.5 : 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
  }
}

function calcResultLabelStyle(mobile) {
  return { fontSize: mobile ? 9 : 10, color: '#93c5fd', fontWeight: 700, letterSpacing: '0.04em' }
}

function CalcTool({ visitCalc, onUseForTemp, onUseForRegular, onUseForOtherVisit }) {
  const [addStart,    setAddStart]    = useState(visitCalc?.visitDate ?? '')
  const [startTiming, setStartTiming] = useState('') // '' = なし（デフォルト）
  const [manualDays,  setManualDays]  = useState('')
  const [targetDate,  setTargetDate]  = useState(visitCalc?.nextVisitDate ?? '') // デフォルトは次回往診日（編集前提）
  const [calcMode,    setCalcMode]    = useState('A') // 'A' | 'B' | 'C'
  const [open,        setOpen]        = useState(() => loadCollapse('calctool'))

  // モード切替時、他モードの入力をクリアして結果の混線を防ぐ
  const switchMode = (mode) => {
    setCalcMode(mode)
    if (mode !== 'B') setManualDays('')
    if (mode !== 'C') setTargetDate('')
    else if (!targetDate) setTargetDate(visitCalc?.nextVisitDate ?? '')
  }
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

  // タイミング未選択（なし）は「朝」相当（同日換算）で日数計算し、表記には何も付けない
  const endTiming = startTiming ? PREV_TIMING[startTiming] : ''
  const isManual  = manualDays.trim() !== '' && !isNaN(parseInt(manualDays)) && parseInt(manualDays) > 0

  // モードB：±ステッパー（1〜90日）。文字列のまま保持し既存の計算ロジック（manualDays.trim()等）と互換を保つ
  const stepManualDays = (delta) => {
    setManualDays(d => String(Math.min(90, Math.max(1, (parseInt(d, 10) || 0) + delta))))
  }
  // 数字部分は直接タップ入力も可能（90日分など±連打が非現実的なケースに対応）。入力中は数字のみ許容し、確定時（blur）に1〜90へ丸める
  const handleManualDaysInput = (raw) => setManualDays(raw.replace(/[^0-9]/g, ''))
  const handleManualDaysBlur = () => {
    setManualDays(d => d.trim() === '' ? '' : String(Math.min(90, Math.max(1, parseInt(d, 10) || 0))))
  }
  const modeBLabel = isManual ? `処方期間（${manualDays}日分）` : '処方期間（定期末日まで自動）'

  let periodText = ''
  let daysText   = ''
  let periodCopyDays = ''
  let periodEndDate   = ''
  let periodEndTiming = ''
  let daysUntilEnd = 0 // モードA：ヒーロー表示用（開始日〜定期処方末日、両端含む）

  if (addStart) {
    if (isManual) {
      const days = parseInt(manualDays)
      // 朝開始（またはなし）は同日の眠前で完結（+days-1日）、昼以降は翌日へまたぐ（+days日）
      const daysOffset = (startTiming === '朝' || startTiming === '') ? days - 1 : days
      const endStr = addDaysToStr(addStart, daysOffset)
      periodText     = `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(endStr)}${endTiming}`
      daysText       = `${days}日分`
      periodCopyDays = `${days}日分`
      periodEndDate   = endStr
      periodEndTiming = endTiming
    } else if (rxEnd) {
      const start = new Date(addStart + 'T00:00:00')
      const end   = new Date(rxEnd    + 'T00:00:00')
      const diff  = Math.ceil((end - start) / (1000*60*60*24)) + 1
      daysUntilEnd = Math.max(0, diff)
      if (diff > 0) {
        // 朝開始（またはなし）以外は定期処方末日の翌日までまたがるため、末尾のタイミングは省き「+α」と表記する
        periodText     = (startTiming === '朝' || startTiming === '')
          ? `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(rxEnd)}${endTiming}`
          : `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(rxEnd)}+α`
        daysText       = `定期に合わせた場合${diff}日分`
        periodCopyDays = `${diff}日分`
        periodEndDate   = rxEnd
        periodEndTiming = endTiming
      }
    }
  }

  // 指定末日計算：指定末日の眠前を必ず含む日数・終了タイミングを求める
  let targetPeriodText = ''
  let targetDaysText   = ''
  let targetEndDate    = ''
  let targetEndTiming  = ''
  let neededDays = 0 // モードC：ヒーロー表示用
  if (addStart && targetDate) {
    const start    = new Date(addStart   + 'T00:00:00')
    const end      = new Date(targetDate + 'T00:00:00')
    const daysDiff = Math.round((end - start) / (1000 * 60 * 60 * 24))
    const tDays = daysDiff + 1
    neededDays = Math.max(0, tDays)
    if (tDays > 0) {
      // 朝開始（またはなし）は指定末日当日の眠前で完結（+tDays-1日）、昼以降は翌日へまたぐ（+tDays日）
      const daysOffset = (startTiming === '朝' || startTiming === '') ? tDays - 1 : tDays
      const endStr = addDaysToStr(addStart, daysOffset)
      targetPeriodText = `${fmtWithDay(addStart)}${startTiming}〜${fmtWithDay(endStr)}${endTiming}`
      targetDaysText   = `${tDays}日分`
      targetEndDate    = endStr
      targetEndTiming  = endTiming
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

  const handleUseForTempPeriod = () => {
    if (!periodEndDate) return
    onUseForTemp?.({ startDate: addStart, startTiming, endDate: periodEndDate, endTiming: periodEndTiming })
  }

  const handleUseForTempTarget = () => {
    if (!targetEndDate) return
    onUseForTemp?.({ startDate: addStart, startTiming, endDate: targetEndDate, endTiming: targetEndTiming })
  }

  const handleUseForRegular = () => {
    if (!addStart) return
    onUseForRegular?.({ startDate: addStart })
  }

  const handleUseForOtherVisit = () => {
    if (!periodEndDate) return
    onUseForOtherVisit?.({ startDate: addStart, startTiming, endDate: periodEndDate, endTiming: periodEndTiming })
  }

  const handleUseForOtherVisitTarget = () => {
    if (!targetEndDate) return
    onUseForOtherVisit?.({ startDate: addStart, startTiming, endDate: targetEndDate, endTiming: targetEndTiming })
  }

  return (
    <div className="calc-tool" style={{
      background: '#0f1f4e',
      borderRadius: 12, padding: '10px 14px', marginBottom: 10,
      boxShadow: '0 4px 16px rgba(15,31,78,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: open ? 8 : 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em' }}>
          ⚡ 日数計算ツール
        </div>
        {/* スマホのみ折りたたみボタンを表示 */}
        <button
          className="calc-tool-toggle"
          onClick={() => setOpen(o => {
            const next = !o
            saveCollapse('calctool', next)
            return next
          })}
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
          ? { display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', width: '100%', gap: 5 }
          : { display: 'flex', gap: 14, alignItems: 'stretch', flexWrap: 'wrap' }
        }>
          {/* 3モードタブ */}
          <div style={{ display: 'flex', gap: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 3, marginBottom: 8, flex: '1 1 100%' }}>
            {[['A', '定期末までの日数'], ['B', '処方期間を出す'], ['C', '必要日数を出す']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => switchMode(key)} style={{
                flex: 1, padding: '6px 8px', borderRadius: 6, border: 'none',
                fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer',
                background: calcMode === key ? '#2563eb' : 'transparent',
                color: calcMode === key ? '#ffffff' : 'var(--sky-200)',
              }}>{label}</button>
            ))}
          </div>

          {/* 開始日：全モード共通 */}
          <div style={isMobile ? { flex: '0 0 100px', minWidth: 0 } : { flex: '1.3 1 150px', minWidth: 130 }}>
            <label style={calcFieldLabelStyle(isMobile)}>開始日</label>
            {isMobile
              ? <CompactDateField value={addStart} onChange={setAddStart} fmt={fmtWithDay} />
              : <input type="date" value={addStart} onChange={e => setAddStart(e.target.value)} style={calcFieldInputStyle(false)} />
            }
          </div>

          {/* タイミング：タップで開く1個のチップ＋ドロップダウン */}
          <div style={isMobile ? { flex: '0 0 56px', minWidth: 0 } : { flex: '0.5 1 110px', minWidth: 100 }}>
            <label style={calcFieldLabelStyle(isMobile)}>タイミング</label>
            <CalcTimingChip value={startTiming} onChange={setStartTiming} mobile={isMobile} />
          </div>

          {/* モードA：定期処方末日（参考表示のみ） */}
          {calcMode === 'A' && (
            <div style={isMobile ? { flex: '0 0 100px', minWidth: 0 } : { flex: '0.8 1 130px', minWidth: 120 }}>
              <label style={calcFieldLabelStyle(isMobile)}>定期処方末日</label>
              <div style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: isMobile ? 6 : 8, height: isMobile ? 34 : 40,
                display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start',
                padding: isMobile ? '0 4px' : '9px 8px', fontSize: isMobile ? 9.5 : 13, color: '#93c5fd',
                whiteSpace: 'nowrap',
              }}>{rxEnd ? fmtWithDay(rxEnd) : '—'}</div>
            </div>
          )}

          {/* モードB：日数を電卓風±ステッパーに */}
          {calcMode === 'B' && (
            <div style={isMobile ? { flex: '0 0 100px', minWidth: 0 } : { flex: '1.1 1 170px', minWidth: 160 }}>
              <label style={calcFieldLabelStyle(isMobile)}>{isMobile ? '日数（任意）' : '日数'}</label>
              <div style={{
                display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)', borderRadius: isMobile ? 6 : 8,
                height: isMobile ? 34 : 40, overflow: 'hidden',
              }}>
                <button type="button" onClick={() => stepManualDays(-1)} style={calcStepperBtnStyle(isMobile)}>−</button>
                <div style={{ flex: 1, display: 'flex', alignItems: 'baseline', justifyContent: 'center', minWidth: 0 }}>
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={2}
                    value={manualDays}
                    onChange={e => handleManualDaysInput(e.target.value)}
                    onBlur={handleManualDaysBlur}
                    placeholder="—"
                    style={{
                      width: isMobile ? 28 : 34, textAlign: 'center', fontWeight: 900, color: 'white',
                      fontVariantNumeric: 'tabular-nums', fontSize: isMobile ? 16 : 19,
                      background: 'transparent', border: 'none', outline: 'none', padding: 0,
                      fontFamily: 'inherit', minWidth: 0,
                    }}
                  />
                  <span style={{ fontSize: isMobile ? 8 : 11, fontWeight: 600, color: '#93c5fd', marginLeft: isMobile ? 1 : 3, flexShrink: 0 }}>日</span>
                </div>
                <button type="button" onClick={() => stepManualDays(1)} style={calcStepperBtnStyle(isMobile)}>＋</button>
              </div>
            </div>
          )}

          {/* モードC：指定末日 */}
          {calcMode === 'C' && (
            <div style={isMobile ? { flex: '1 1 auto', minWidth: 120 } : { flex: '1.1 1 150px', minWidth: 140, maxWidth: 220 }}>
              <label style={calcFieldLabelStyle(isMobile)}>指定末日</label>
              <div style={{ display: 'flex', gap: isMobile ? 3 : 4 }}>
                {isMobile
                  ? <div style={{ flex: 1, minWidth: 0 }}><CompactDateField value={targetDate} onChange={setTargetDate} fmt={fmtWithDay} /></div>
                  : <input
                      type="date" value={targetDate}
                      onChange={e => setTargetDate(e.target.value)}
                      style={{ ...calcFieldInputStyle(false), minWidth: 0, flex: 1 }}
                    />
                }
                {targetDate && (
                  <button
                    type="button"
                    onClick={() => setTargetDate('')}
                    aria-label="指定末日を削除"
                    title="指定末日を削除"
                    style={calcClearBtnStyle(isMobile)}
                  >×</button>
                )}
              </div>
            </div>
          )}

          {/* 定期末日・日数指定の結果：モードAはヒーロー数字、モードBは範囲を強調 */}
          {calcMode !== 'C' && periodText && (
            <div style={isMobile
              ? { width: '100%', marginTop: 8, background: 'rgba(56,189,248,0.1)', borderLeft: '3px dashed #c9a84c', borderRadius: '0 8px 8px 0', padding: '9px 11px' }
              : { flex: '2 1 320px', minWidth: 300, background: 'rgba(56,189,248,0.1)', borderLeft: '3px dashed #c9a84c', borderRadius: '0 10px 10px 0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }
            }>
              {calcMode === 'A' ? (
                isMobile ? (
                  <>
                    <div style={calcResultLabelStyle(true)}>定期処方末日に合わせた場合</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, margin: '4px 0' }}>
                      <span style={{ fontSize: 34, fontWeight: 900, color: '#ffd97a', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{daysUntilEnd}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#ffd97a' }}>日分</span>
                    </div>
                    <div title={daysText} style={{ fontSize: 10, color: '#e2e8f0', marginBottom: 9 }}>{periodText}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleCopyPeriod} style={calcPillBtnStyle(true, '#2563eb')}>
                        {copiedPeriod ? '✅' : '📋 日付コピー'}
                      </button>
                      <button type="button" onClick={handleUseForRegular} style={calcPillBtnStyle(true, '#334155', '#e2e8f0')}>
                        📋 定期処方変更へ
                      </button>
                      <button type="button" onClick={handleUseForTempPeriod} style={calcPillBtnStyle(true, '#ea580c')}>
                        📋 臨時処方変更へ
                      </button>
                      <button type="button" onClick={handleUseForOtherVisit} style={calcPillBtnStyle(true, '#0d9488')}>
                        📋 他科受診へ
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0,
                      paddingRight: 14, borderRight: '1px solid rgba(255,255,255,0.15)',
                      whiteSpace: 'nowrap', minWidth: 78,
                    }}>
                      <span style={{ fontSize: 44, fontWeight: 900, color: '#ffd97a', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{daysUntilEnd}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#ffd97a' }}>日分</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={calcResultLabelStyle(false)}>定期処方末日に合わせた場合</div>
                      <div title={daysText} style={{ fontSize: 11.5, color: '#e2e8f0', marginTop: 2 }}>{periodText}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                        <button type="button" onClick={handleUseForRegular} style={calcPillBtnStyle(false, '#334155', '#e2e8f0')}>
                          📋 定期処方変更へ
                        </button>
                        <button type="button" onClick={handleUseForTempPeriod} style={calcPillBtnStyle(false, '#ea580c')}>
                          📋 臨時処方変更へ
                        </button>
                        <button type="button" onClick={handleUseForOtherVisit} style={calcPillBtnStyle(false, '#0d9488')}>
                          📋 他科受診へ
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={handleCopyPeriod} style={{
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8, color: '#e2e8f0', padding: '7px 10px', fontSize: 11,
                      cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap', alignSelf: 'flex-start',
                    }}>
                      {copiedPeriod ? '✅' : '📋 日付コピー'}
                    </button>
                  </>
                )
              ) : (
                isMobile ? (
                  <>
                    <div style={calcResultLabelStyle(true)}>{modeBLabel}</div>
                    <div title={daysText} style={{ fontSize: 15, fontWeight: 800, color: 'white', lineHeight: 1.4, marginBottom: 9 }}>{periodText}</div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button type="button" onClick={handleCopyPeriod} style={calcPillBtnStyle(true, '#2563eb')}>
                        {copiedPeriod ? '✅' : '📋 日付コピー'}
                      </button>
                      <button type="button" onClick={handleUseForRegular} style={calcPillBtnStyle(true, '#334155', '#e2e8f0')}>
                        📋 定期処方変更へ
                      </button>
                      <button type="button" onClick={handleUseForTempPeriod} style={calcPillBtnStyle(true, '#ea580c')}>
                        📋 臨時処方変更へ
                      </button>
                      <button type="button" onClick={handleUseForOtherVisit} style={calcPillBtnStyle(true, '#0d9488')}>
                        📋 他科受診へ
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={calcResultLabelStyle(false)}>{modeBLabel}</div>
                      <div title={daysText} style={{ fontSize: 17, fontWeight: 800, color: 'white', lineHeight: 1.4, marginTop: 2 }}>{periodText}</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        <button type="button" onClick={handleUseForRegular} style={calcPillBtnStyle(false, '#334155', '#e2e8f0')}>
                          📋 定期処方変更へ
                        </button>
                        <button type="button" onClick={handleUseForTempPeriod} style={calcPillBtnStyle(false, '#ea580c')}>
                          📋 臨時処方変更へ
                        </button>
                        <button type="button" onClick={handleUseForOtherVisit} style={calcPillBtnStyle(false, '#0d9488')}>
                          📋 他科受診へ
                        </button>
                      </div>
                    </div>
                    <button type="button" onClick={handleCopyPeriod} style={{
                      background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 8, color: '#e2e8f0', padding: '7px 10px', fontSize: 11,
                      cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap', alignSelf: 'flex-start',
                    }}>
                      {copiedPeriod ? '✅' : '📋 日付コピー'}
                    </button>
                  </>
                )
              )}
            </div>
          )}

          {/* モードC：指定末日の結果（ヒーロー数字はグリーン） */}
          {calcMode === 'C' && targetPeriodText && (
            <div style={isMobile
              ? { width: '100%', marginTop: 8, background: 'rgba(56,189,248,0.1)', borderLeft: '3px dashed #c9a84c', borderRadius: '0 8px 8px 0', padding: '9px 11px' }
              : { flex: '2 1 320px', minWidth: 300, background: 'rgba(56,189,248,0.1)', borderLeft: '3px dashed #c9a84c', borderRadius: '0 10px 10px 0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }
            }>
              {isMobile ? (
                <>
                  <div style={calcResultLabelStyle(true)}>指定末日までに必要な日数</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, margin: '4px 0' }}>
                    <span style={{ fontSize: 28, fontWeight: 900, color: '#86efac', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{neededDays}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#86efac' }}>日分</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#e2e8f0', marginBottom: 9 }}>{targetPeriodText}</div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button type="button" onClick={handleCopyTarget} style={calcPillBtnStyle(true, '#2563eb')}>
                      {copiedTarget ? '✅' : '📋 日付コピー'}
                    </button>
                    <button type="button" onClick={handleUseForRegular} style={calcPillBtnStyle(true, '#334155', '#e2e8f0')}>
                      📋 定期処方変更へ
                    </button>
                    <button type="button" onClick={handleUseForTempTarget} style={calcPillBtnStyle(true, '#ea580c')}>
                      📋 臨時処方変更へ
                    </button>
                    <button type="button" onClick={handleUseForOtherVisitTarget} style={calcPillBtnStyle(true, '#0d9488')}>
                      📋 他科受診へ
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{
                    display: 'flex', alignItems: 'baseline', gap: 6, flexShrink: 0,
                    paddingRight: 14, borderRight: '1px solid rgba(255,255,255,0.15)',
                    whiteSpace: 'nowrap', minWidth: 90,
                  }}>
                    <span style={{ fontSize: 36, fontWeight: 900, color: '#86efac', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{neededDays}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#86efac' }}>日分</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={calcResultLabelStyle(false)}>指定末日までに必要な日数</div>
                    <div style={{ fontSize: 11.5, color: '#e2e8f0', marginTop: 2 }}>{targetPeriodText}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7 }}>
                      <button type="button" onClick={handleUseForRegular} style={calcPillBtnStyle(false, '#334155', '#e2e8f0')}>
                        📋 定期処方変更へ
                      </button>
                      <button type="button" onClick={handleUseForTempTarget} style={calcPillBtnStyle(false, '#ea580c')}>
                        📋 臨時処方変更へ
                      </button>
                      <button type="button" onClick={handleUseForOtherVisitTarget} style={calcPillBtnStyle(false, '#0d9488')}>
                        📋 他科受診へ
                      </button>
                    </div>
                  </div>
                  <button type="button" onClick={handleCopyTarget} style={{
                    background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 8, color: '#e2e8f0', padding: '7px 10px', fontSize: 11,
                    cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, whiteSpace: 'nowrap', alignSelf: 'flex-start',
                  }}>
                    {copiedTarget ? '✅' : '📋 日付コピー'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// 指定末日クリアボタン（×）
function calcClearBtnStyle(mobile) {
  return {
    flexShrink: 0, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: mobile ? 6 : 6, color: mobile ? '#93c5fd' : 'white', fontSize: mobile ? 11 : 14,
    fontWeight: 700, lineHeight: 1, cursor: 'pointer', fontFamily: 'inherit',
    width: mobile ? 20 : undefined, height: mobile ? 34 : undefined,
    padding: mobile ? 0 : '0 9px',
  }
}

// ── 日付タップ選択フィールド（変更ログ入力フォーム共通） ─────────
function DateTapField({ label, caption, value, options, onChange }) {
  const [open, setOpen] = useState(false)
  const [hover, setHover] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 2 }}>{label}</label>
      {caption && <div style={{ fontSize: 9.5, color: '#c9a84c', marginBottom: 4 }}>{caption}</div>}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          border: 'none', borderBottom: '2px solid #94a3b8', borderRadius: '4px 4px 0 0', padding: '5px 6px',
          fontSize: 13, fontFamily: 'inherit', color: value ? '#1e293b' : '#94a3b8',
          background: hover ? '#f8fafc' : 'transparent', cursor: 'pointer',
          transition: 'background 0.15s',
        }}>
        <span>{value ? fmtMMDD(value) : '選択してください'}</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'white', border: '1px solid #dce4f0', borderRadius: 10,
            boxShadow: '0 6px 20px rgba(15,31,78,0.18)', zIndex: 100, overflow: 'hidden',
          }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', fontSize: 12.5, fontWeight: 600, borderBottom: options?.length ? '1px solid #f1f5fb' : 'none', cursor: 'pointer', position: 'relative' }}>
              📅 カレンダーで選ぶ
              <input type="date" onChange={e => { onChange(e.target.value); setOpen(false) }}
                style={{ position: 'absolute', inset: 0, opacity: 0, width: '100%', cursor: 'pointer' }} />
            </label>
            {(options ?? []).map((o, i) => (
              <button key={i} type="button" onClick={() => { onChange(o.value); setOpen(false) }} style={{
                display: 'block', width: '100%', textAlign: 'left', background: 'white', border: 'none',
                borderBottom: i < options.length - 1 ? '1px solid #f1f5fb' : 'none',
                padding: '10px 12px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>{o.icon} {o.label}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── タイミング（朝/昼/夕/眠前）チップ（臨時薬フォーム用） ────────
function TimingChip({ label, value, onChange }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{
        fontSize: 9.5, padding: '2px 7px', borderRadius: 9, border: '1px solid #dce4f0',
        background: value ? '#0f1f4e' : '#f8fafc', color: value ? 'white' : '#94a3b8',
        cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
      }}>{value ? value : `＋${label}`}</button>
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          title="タイミングを未選択に戻す"
          aria-label="タイミングを未選択に戻す"
          style={{
            width: 14, height: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9, lineHeight: 1, padding: 0, borderRadius: '50%',
            border: '1px solid #dce4f0', background: '#f8fafc', color: '#94a3b8',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >×</button>
      )}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 90 }} />
          <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 100, display: 'flex', gap: 4, background: 'white', border: '1px solid #dce4f0', borderRadius: 8, padding: 4, boxShadow: '0 4px 14px rgba(15,31,78,0.15)' }}>
            {['朝', '昼', '夕', '眠前'].map(t => (
              <button key={t} type="button" onClick={() => { onChange(t); setOpen(false) }} style={{
                padding: '5px 8px', borderRadius: 6, border: 'none', fontSize: 11, fontWeight: 700,
                fontFamily: 'inherit', cursor: 'pointer',
                background: value === t ? '#0f1f4e' : 'white', color: value === t ? 'white' : '#64748b',
              }}>{t}</button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const quickChipStyle = {
  padding: '4px 10px', borderRadius: 14, fontSize: 10.5, fontWeight: 700,
  fontFamily: 'inherit', cursor: 'pointer', whiteSpace: 'nowrap',
  border: '1px solid #dce4f0', background: '#f8fafc', color: '#64748b',
}

// プレビュー用の見本色・フォーカスハイライト（変更ログ入力フォーム共通）
const PREVIEW_GHOST = '#cbd5e1'
const previewHi = (active) => active ? { background: '#fef3c7', borderRadius: 3, padding: '1px 3px', boxShadow: '0 0 0 1px #fcd34d' } : {}

// 編集前の空フォーム（log_type で「定期変更」「臨時薬」を判別）
const BLANK_REGULAR_EDIT = { log_type: 'regular', changed_at: '', reason: '', start_date: '', content: '' }

function blankTempForm(instrDate) {
  return {
    changed_at: instrDate,
    reason: '',
    start_date: instrDate,
    start_timing: '',
    end_timing: '',
    drug_name: '',
    days: '',
    end_date: '',
  }
}

// ── 臨時薬：入力フィールド群（追加・編集フォーム共通） ───────
function TemporaryLogFields({ value, onChange }) {
  const today = new Date().toISOString().slice(0, 10)
  const [focusField, setFocusField] = useState(null) // 'instr' | 'reason' | 'drug' | null

  // 日数入力 → 終了日・終了タイミングを再計算（分4ロジック）
  // タイミング未選択（分1など）の場合は「朝」相当（同日換算）で日数計算し、終了タイミングは空欄のまま維持する
  const recalcFromDays = (next) => {
    const n = parseInt(next.days)
    if (next.days?.toString().trim() !== '' && !isNaN(n) && n > 0 && next.start_date) {
      const { endDate, endTiming } = computeTemporaryEnd(next.start_date, next.start_timing || '朝', n)
      return { ...next, end_date: endDate, end_timing: next.start_timing ? endTiming : next.end_timing }
    }
    return next
  }

  // 終了日入力 → 日数・終了タイミングを再計算（分4ロジック）
  const recalcFromEndDate = (next) => {
    if (next.end_date && next.start_date) {
      const { days, endTiming } = computeTemporaryDays(next.start_date, next.start_timing || '朝', next.end_date)
      if (days > 0) return { ...next, days: String(days), end_timing: next.start_timing ? endTiming : next.end_timing }
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

  return (
    <>
      <div>
        <label className="field-label">指示日</label>
        <input
          type="date" className="field-input rx-input"
          value={value.changed_at}
          onChange={e => onChange({ ...value, changed_at: e.target.value })}
          onFocus={() => setFocusField('instr')}
          onBlur={() => setFocusField(null)}
        />
      </div>
      <div>
        <label className="field-label">症状・理由（空欄→「変更指示」）</label>
        <input
          type="text" className="field-input rx-input"
          value={value.reason}
          onChange={e => onChange({ ...value, reason: e.target.value })}
          onFocus={() => setFocusField('reason')}
          onBlur={() => setFocusField(null)}
          placeholder="例：発熱・疼痛・便秘"
        />
      </div>

      <div className="rx-row">
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label className="field-label" style={{ marginBottom: 0 }}>開始日</label>
            <TimingChip label="朝昼夕" value={value.start_timing} onChange={t => handleStartChange({ start_timing: t })} />
          </div>
          <DateTapField
            label=""
            value={value.start_date}
            options={[
              { icon: '☀️', label: `指示日と同じ（${fmtMMDD(value.changed_at)}）`, value: value.changed_at },
              { icon: '🌅', label: `翌日から（${fmtMMDD(addDaysToStr(value.changed_at || today, 1))}）`, value: addDaysToStr(value.changed_at || today, 1) },
            ]}
            onChange={v => handleStartChange({ start_date: v })}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <label className="field-label" style={{ marginBottom: 0 }}>終了日</label>
            <TimingChip label="朝昼夕" value={value.end_timing} onChange={t => onChange({ ...value, end_timing: t })} />
          </div>
          <DateTapField
            label=""
            value={value.end_date}
            options={[]}
            onChange={v => handleEndDateChange(v)}
          />
        </div>
      </div>

      <div className="rx-field-45">
        <label className="field-label">日数</label>
        <input
          type="number" inputMode="numeric" className="field-input rx-input" min="1"
          value={value.days}
          onChange={e => handleDaysChange(e.target.value)}
          placeholder="自動"
        />
      </div>
      <div>
        <label className="field-label">薬剤名・用法等</label>
        <input
          type="text" className="field-input rx-input"
          value={value.drug_name}
          onChange={e => onChange({ ...value, drug_name: e.target.value })}
          onFocus={() => setFocusField('drug')}
          onBlur={() => setFocusField(null)}
          placeholder="例：ロキソプロフェン60mg 飲み切り / ムコスタ100mg 2錠 飲み切り"
        />
      </div>

      {/* プレビュー（一覧にはこう記録されるかを常時表示） */}
      <div style={{
        gridColumn: '1 / -1', background: '#f8fafc', borderLeft: '3px solid #c9a84c',
        borderRadius: '0 8px 8px 0', padding: '10px 14px',
      }}>
        <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>
          プレビュー（一覧にはこう記録されます）
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.6 }}>
          <span style={{ ...previewHi(focusField === 'instr'), color: value.changed_at ? '#0f1f4e' : PREVIEW_GHOST }}>
            {value.changed_at ? fmtMMDD(value.changed_at) : '07/09'}
          </span>
          <span style={{ marginLeft: '1em', ...previewHi(focusField === 'reason'), color: value.reason ? '#0f1f4e' : PREVIEW_GHOST }}>
            {value.reason || '変更指示'}
          </span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.6 }}>
          <span style={{ color: (value.start_date && value.end_date) ? '#1e293b' : PREVIEW_GHOST }}>
            {value.start_date ? `${fmtMMDD(value.start_date)}${value.start_timing}` : '07/10朝'}〜{value.end_date ? `${fmtMMDD(value.end_date)}${value.end_timing}` : '07/16眠前'}
          </span>
          <span style={{ marginLeft: '1em', ...previewHi(focusField === 'drug'), color: value.drug_name ? '#1e293b' : PREVIEW_GHOST }}>
            {value.drug_name || 'ロキソプロフェン60mg'}
          </span>
        </div>
      </div>
    </>
  )
}

// ── メインコンポーネント ───────────────────────────────────
export default function ChangeLogTab({ patient, visitCalc, onRefetch, onUseForOtherVisit }) {
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
  const [focusField,  setFocusField]  = useState(null) // 'instr' | 'start' | 'content' | 'reason' | null
  const [editFocusField, setEditFocusField] = useState(null) // 編集フォーム（定期変更）用のプレビューフォーカス

  // 定期処方開始日（往診日＋処方ズレ日数）：visitCalc に rxStart が無いため同等の値を算出
  const rxStart = (visitCalc?.visitDate && visitCalc?.graceDays != null)
    ? addDaysToStr(visitCalc.visitDate, visitCalc.graceDays)
    : ''

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

  // 日数計算ツールの結果を臨時薬追加フォームに反映
  const useCalcResultForTemp = ({ startDate, startTiming, endDate, endTiming }) => {
    const computed = computeTemporaryDays(startDate, startTiming || '朝', endDate)
    setTempForm({
      ...blankTempForm(instrDate),
      start_date:   startDate,
      start_timing: startTiming,
      end_date:     endDate,
      end_timing:   endTiming,
      days:         computed.days > 0 ? String(computed.days) : '',
    })
    setShowAddMenu(false)
    setAddMode('temporary')
  }

  // 日数計算ツールの結果を定期変更追加フォームに反映
  const useCalcResultForRegular = ({ startDate }) => {
    setShowAddMenu(false)
    setAddMode('regular')
    setStartDate(startDate)
  }

  const closeAddForm = () => {
    setAddMode(null)
    resetForm()
    resetTempForm()
  }

  const add = async () => {
    if (!instrDate) return
    setAdding(true)
    await db.addLog(patient.id, {
      changed_at: instrDate,
      reason:     reason.trim(),
      start_date: startDate || null,
      content:    content.trim(),
    })
    resetForm()
    setAdding(false)
    setAddMode(null)
    onRefetch?.()
  }

  const addTemporary = async () => {
    if (!tempForm.drug_name.trim() || !tempForm.end_date) return
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
      if (!editForm.drug_name.trim() || !editForm.end_date) return
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
    const hasContent   = !!log.content?.trim()

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
        background: 'white',
        borderRadius: 10,
        boxShadow: '0 1px 4px rgba(15,31,78,0.06)',
        borderLeft: `3px solid ${log.log_type === 'temporary' ? '#dc2626' : '#dce4f0'}`,
        marginBottom: 8,
        padding: isEditing ? 0 : '10px 12px',
        opacity: archived ? 0.7 : 1,
      }}>
        {isEditing ? (
          <div style={{
            background: '#f1f5fb', border: '1px solid #dce4f0',
            borderRadius: 8, padding: 12,
          }}>
            {editForm.log_type === 'temporary' ? (
              <div
                className="log-form-grid temp-log-grid"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}
              >
                <TemporaryLogFields value={editForm} onChange={setEditForm} />
              </div>
            ) : (
              <>
                {/* 指示日・開始日を横並び＋注釈、タップメニュー化（新規追加フォームと同じ構造） */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <DateTapField
                    label="指示日" caption="＝指示を受けた日"
                    value={editForm.changed_at}
                    options={[
                      { icon: '☀️', label: `今日（${fmtMMDD(today)}）`, value: today },
                      { icon: '🚗', label: `往診日（${fmtMMDD(visitCalc?.visitDate ?? '')}）`, value: visitCalc?.visitDate },
                    ]}
                    onChange={v => setEditForm(f => ({ ...f, changed_at: v }))}
                  />
                  <DateTapField
                    label="開始日" caption="＝変更を始める日"
                    value={editForm.start_date}
                    options={[
                      { icon: '🌅', label: `翌朝から（${fmtMMDD(addDaysToStr(editForm.changed_at || today, 1))}）`, value: addDaysToStr(editForm.changed_at || today, 1) },
                      { icon: '💊', label: `定期処方開始日（${fmtMMDD(rxStart)}）`, value: rxStart },
                    ]}
                    onChange={v => setEditForm(f => ({ ...f, start_date: v }))}
                  />
                </div>

                {/* 内容：主役 */}
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12.5, color: '#0f1f4e', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                    変更内容 <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    className="field-input" value={editForm.content} onChange={upEdit('content')}
                    onFocus={() => setEditFocusField('content')}
                    onBlur={() => setEditFocusField(null)}
                    placeholder="例：クエチアピン中止"
                    style={{ border: 'none', borderBottom: '2px solid #0f1f4e', borderRadius: 0, background: 'transparent', fontSize: 14.5 }}
                    onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  />
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                    {['中止', '増量', '減量', '開始'].map(w => (
                      <button key={w} type="button" onClick={() => setEditForm(f => ({ ...f, content: f.content ? f.content + w : w }))}
                        style={quickChipStyle}>＋{w}</button>
                    ))}
                  </div>
                </div>

                {/* 理由：脇役 */}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                    理由（任意・症状など）
                  </label>
                  <input
                    className="field-input" value={editForm.reason} onChange={upEdit('reason')}
                    onFocus={() => setEditFocusField('reason')}
                    onBlur={() => setEditFocusField(null)}
                    placeholder="例：傾眠あり"
                    style={{ width: '60%', border: 'none', borderBottom: '2px solid #94a3b8', borderRadius: 0, background: 'transparent', fontSize: 13, color: '#64748b' }}
                  />
                </div>

                {/* プレビュー（一覧にはこう記録されるかを常時表示） */}
                <div style={{ background: '#f8fafc', borderLeft: '3px solid #c9a84c', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 14 }}>
                  <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>プレビュー（一覧にはこう記録されます）</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.6, color: editForm.changed_at ? '#0f1f4e' : PREVIEW_GHOST }}>
                    <span style={previewHi(editFocusField === 'instr')}>{editForm.changed_at ? fmtMMDD(editForm.changed_at) : '07/09'}</span>
                    <span style={{ marginLeft: '1em', ...previewHi(editFocusField === 'reason'), color: editForm.reason ? '#0f1f4e' : PREVIEW_GHOST }}>{editForm.reason || '傾眠あり'}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.6 }}>
                    <span style={{ ...previewHi(editFocusField === 'start'), color: editForm.start_date ? '#1e293b' : PREVIEW_GHOST }}>{editForm.start_date ? fmtMMDD(editForm.start_date) : '07/10'}〜</span>
                    <span style={{ ...previewHi(editFocusField === 'content'), color: editForm.content ? '#1e293b' : PREVIEW_GHOST }}>{editForm.content || 'クエチアピン中止'}</span>
                  </div>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={cancelEdit}>キャンセル</button>
              <button
                className="btn btn-primary btn-sm" onClick={saveEdit}
                disabled={editSaving || (editForm.log_type === 'temporary'
                  ? (!editForm.drug_name.trim() || !editForm.end_date)
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
                  <div className="log-instr-header" style={{ color: '#0f1f4e', fontWeight: 700, lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ color: '#0f1f4e', fontWeight: 700 }}>{fmtMMDD(log.changed_at)}</span>
                    　{log.reason?.trim() || '変更指示'}
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ color: '#0f1f4e', fontWeight: 700 }}>
                      {fmtMMDD(log.start_date ?? log.changed_at)}{log.start_timing}〜{fmtMMDD(log.end_date)}{log.end_timing}
                    </span>
                    　{log.drug_name}
                  </div>
                </>
              ) : hasContent && hasStartDate ? (
                <>
                  <div className="log-instr-header" style={{ color: '#0f1f4e', fontWeight: 700, lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ color: '#0f1f4e', fontWeight: 700 }}>{instrD}</span>
                    　{displayReason}
                  </div>
                  <div style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.7 }}>
                    <span className="log-date-span" style={{ color: '#0f1f4e', fontWeight: 700 }}>{startD}〜</span>
                    　{log.content}
                  </div>
                </>
              ) : hasContent ? (
                <div style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.7 }}>
                  <span className="log-date-span" style={{ color: '#0f1f4e', fontWeight: 700 }}>{instrD}</span>
                  　{log.content}
                </div>
              ) : (
                <div style={{ color: '#1e293b', fontWeight: 500, lineHeight: 1.7 }}>
                  <span className="log-date-span" style={{ color: '#0f1f4e', fontWeight: 700 }}>{instrD}</span>
                  　{displayReason}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginTop: 2, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'flex-start' }}>
              {log.log_type === 'temporary' && (
                <span className="log-badge-temp" style={{ margin: 0, alignSelf: 'center' }}>臨時</span>
              )}
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
      <CalcTool
        visitCalc={visitCalc}
        onUseForTemp={useCalcResultForTemp}
        onUseForRegular={useCalcResultForRegular}
        onUseForOtherVisit={onUseForOtherVisit}
      />

      <div className="card" style={{ borderTop: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="card-title">
          📝 薬剤変更記録
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                className="btn btn-sm"
                onClick={() => setSortMode('date')}
                style={sortMode === 'date'
                  ? { background: '#dbeafe', color: '#1e3a8a', border: 'none' }
                  : { background: 'white', color: '#94a3b8', border: '1.5px solid #dce4f0' }}
              >日付順</button>
              <button
                className="btn btn-sm"
                onClick={() => setSortMode('input')}
                style={sortMode === 'input'
                  ? { background: '#dbeafe', color: '#1e3a8a', border: 'none' }
                  : { background: 'white', color: '#94a3b8', border: '1.5px solid #dce4f0' }}
              >入力順</button>
            </div>
            {logs.length > 0 && (
              <button
                className="btn btn-sm"
                onClick={copyAll}
                style={{ background: 'white', color: '#94a3b8', border: '1.5px solid #dce4f0' }}
              >
                {copied ? '✅ コピー済' : '📋 全コピー'}
              </button>
            )}
            {archivedLogs.length > 0 && (
              <button
                className="btn btn-sm"
                onClick={() => setShowArchived(s => !s)}
                style={{
                  background: showArchived ? '#dbeafe' : 'white',
                  color: showArchived ? '#1e3a8a' : '#94a3b8',
                  border: showArchived ? 'none' : '1.5px solid #dce4f0',
                }}
              >
                {showArchived ? '📂 アーカイブを隠す' : `📂 アーカイブを表示（${archivedLogs.length}件）`}
              </button>
            )}
            <div style={{ position: 'relative' }}>
              <button
                className="btn btn-sm"
                onClick={() => addMode ? closeAddForm() : setShowAddMenu(m => !m)}
                style={addMode
                  ? { background: 'white', color: '#94a3b8', border: '1.5px solid #dce4f0' }
                  : { background: '#0f1f4e', color: 'white', border: 'none' }}
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
            background: '#f1f5fb', border: '1px solid #dce4f0',
            borderRadius: 8, padding: 12, marginBottom: 12,
          }}>
            {/* 指示日・開始日を横並び＋注釈、タップメニュー化 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <DateTapField
                label="指示日" caption="＝指示を受けた日"
                value={instrDate}
                options={[
                  { icon: '☀️', label: `今日（${fmtMMDD(today)}）`, value: today },
                  { icon: '🚗', label: `往診日（${fmtMMDD(visitCalc?.visitDate ?? '')}）`, value: visitCalc?.visitDate },
                ]}
                onChange={setInstrDate}
              />
              <DateTapField
                label="開始日" caption="＝変更を始める日"
                value={startDate}
                options={[
                  { icon: '🌅', label: `翌朝から（${fmtMMDD(addDaysToStr(instrDate, 1))}）`, value: addDaysToStr(instrDate, 1) },
                  { icon: '💊', label: `定期処方開始日（${fmtMMDD(rxStart)}）`, value: rxStart },
                ]}
                onChange={setStartDate}
              />
            </div>

            {/* 内容：主役 */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, color: '#0f1f4e', fontWeight: 700, display: 'block', marginBottom: 6 }}>
                変更内容 <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                className="field-input" value={content} onChange={e => setContent(e.target.value)}
                onFocus={() => setFocusField('content')}
                onBlur={() => setFocusField(null)}
                placeholder="例：クエチアピン中止"
                style={{ border: 'none', borderBottom: '2px solid #0f1f4e', borderRadius: 0, background: 'transparent', fontSize: 14.5 }}
                onKeyDown={e => e.key === 'Enter' && add()}
              />
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                {['中止', '増量', '減量', '開始'].map(w => (
                  <button key={w} type="button" onClick={() => setContent(c => c ? c + w : w)}
                    style={quickChipStyle}>＋{w}</button>
                ))}
              </div>
            </div>

            {/* 理由：脇役 */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500, display: 'block', marginBottom: 4 }}>
                理由（任意・症状など）
              </label>
              <input
                className="field-input" value={reason} onChange={e => setReason(e.target.value)}
                onFocus={() => setFocusField('reason')}
                onBlur={() => setFocusField(null)}
                placeholder="例：傾眠あり"
                style={{ width: '60%', border: 'none', borderBottom: '2px solid #94a3b8', borderRadius: 0, background: 'transparent', fontSize: 13, color: '#64748b' }}
              />
            </div>

            {/* プレビュー（一覧にはこう記録されるかを常時表示） */}
            <div style={{ background: '#f8fafc', borderLeft: '3px solid #c9a84c', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 9.5, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em', marginBottom: 4 }}>プレビュー（一覧にはこう記録されます）</div>
              <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.6, color: instrDate ? '#0f1f4e' : PREVIEW_GHOST }}>
                <span style={previewHi(focusField === 'instr')}>{instrDate ? fmtMMDD(instrDate) : '07/09'}</span>
                <span style={{ marginLeft: '1em', ...previewHi(focusField === 'reason'), color: reason ? '#0f1f4e' : PREVIEW_GHOST }}>{reason || '傾眠あり'}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.6 }}>
                <span style={{ ...previewHi(focusField === 'start'), color: startDate ? '#1e293b' : PREVIEW_GHOST }}>{startDate ? fmtMMDD(startDate) : '07/10'}〜</span>
                <span style={{ ...previewHi(focusField === 'content'), color: content ? '#1e293b' : PREVIEW_GHOST }}>{content || 'クエチアピン中止'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={closeAddForm}>キャンセル</button>
              <button className="btn btn-primary btn-sm" onClick={add} disabled={adding || !instrDate}>
                {adding ? '…' : '追加'}
              </button>
            </div>
          </div>
        )}

        {/* 入力フォーム：臨時薬 */}
        {addMode === 'temporary' && (
          <div className="rx-form-box">
            <div className="log-form-grid temp-log-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 }}>
              <TemporaryLogFields value={tempForm} onChange={setTempForm} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
              <button className="btn btn-outline btn-sm" onClick={closeAddForm}>キャンセル</button>
              <button
                className="btn btn-primary btn-sm" onClick={addTemporary}
                disabled={adding || !tempForm.drug_name.trim() || !tempForm.end_date}
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
