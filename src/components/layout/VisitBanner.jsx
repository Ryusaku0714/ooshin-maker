import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}` }
function fmtWithDow(d) { return `${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）` }
function fmtFull(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function fmtFullWithDow(str) {
  const d = parseDate(str)
  if (!d) return ''
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}（${DOW[d.getDay()]}）`
}

export default function VisitBanner({ team, onVisitCalcChange }) {
  const today = fmtFull(new Date())
  const [visitDate, setVisitDate] = useState(today)
  const [rxDays,    setRxDays]    = useState(team?.default_rx_days ?? 14)
  const [graceDays, setGraceDays] = useState(team?.grace_days ?? 1)
  const [rxPeriod,  setRxPeriod]  = useState('—')
  const [nextVisit, setNextVisit] = useState('次回往診：—')
  const [rxEnd,     setRxEnd]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  // 処方開始日は visitDate + graceDays から導出（独立したstateを持たない）
  const rxStartDate = (() => {
    if (!visitDate) return ''
    const d = new Date(visitDate)
    d.setDate(d.getDate() + Number(graceDays))
    return fmtFull(d)
  })()

  useEffect(() => {
    if (team) {
      setVisitDate(team.last_visit_date ?? fmtFull(new Date()))
      setRxDays(team.default_rx_days ?? 14)
      setGraceDays(team.grace_days ?? 1)
    }
  }, [team?.id])

  useEffect(() => {
    calc()
  }, [visitDate, rxDays, graceDays])

  useEffect(() => {
    const teamId = team?.id
    if (!teamId) return
    const rxD = Number(rxDays)
    const grD = Number(graceDays)
    if (!visitDate || rxD < 1 || grD < 0) return

    const timer = setTimeout(async () => {
      setSaving(true)
      await db.updateTeam(teamId, {
        last_visit_date: visitDate,
        default_rx_days: rxD,
        grace_days:      grD,
      })
      setSaving(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [visitDate, rxDays, graceDays, team?.id])

  function calc() {
    if (!visitDate) return
    const visit = new Date(visitDate)
    const start = new Date(visit)
    start.setDate(start.getDate() + Number(graceDays))
    const end = new Date(start)
    end.setDate(end.getDate() + Number(rxDays) - 1)
    const next = new Date(visit)
    next.setDate(next.getDate() + Number(rxDays))

    setRxPeriod(`${fmtWithDow(start)}〜${fmtWithDow(end)}`)
    setNextVisit(`次回往診：${fmt(next)}`)
    setRxEnd(fmtFull(end))
    onVisitCalcChange?.({ visitDate, rxDays: Number(rxDays), graceDays: Number(graceDays), rxEnd: fmtFull(end) })
  }

  // 処方開始日を変更 → 往診日との差分から処方ズレ日数を逆算
  function handleRxStartDateChange(newDateStr) {
    if (!newDateStr || !visitDate) return
    const diffDays = Math.round((new Date(newDateStr) - new Date(visitDate)) / 86400000)
    if (diffDays >= 0 && diffDays <= 14) {
      setGraceDays(diffDays)
    }
  }

  return (
    <div className="visit-banner" style={{ background: 'var(--sky-800)', padding: '8px 14px', flexShrink: 0 }}>

      {/* モバイル用折りたたみヘッダー（768px以下のみ表示） */}
      <div
        className="visit-banner-mobile-header"
        onClick={() => setIsExpanded(prev => !prev)}
      >
        <span>往診日：{fmtFullWithDow(visitDate)}</span>
        <span className="visit-banner-chevron">{isExpanded ? '▲' : '▼'}</span>
      </div>

      {/* フィールド群 */}
      <div className={`visit-banner-fields${isExpanded ? ' is-open' : ''}`} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>

        <Field label="往診日" dow={visitDate ? `（${DOW[parseDate(visitDate).getDay()]}）` : ''} className="visit-date-field" style={{ flex: '2 1 120px', minWidth: 110 }}>
          <input
            type="date" value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        <Field label="処方日数" className="rx-days-field" style={{ flex: '1 1 56px', minWidth: 52 }}>
          <input
            type="number" value={rxDays} min={1} max={90}
            onChange={e => setRxDays(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        <Field label="処方ズレ日数" className="grace-days-field" style={{ flex: '1 1 68px', minWidth: 64 }}>
          <input
            type="number" value={graceDays} min={0} max={14}
            onChange={e => setGraceDays(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方開始日：処方ズレ日数と双方向連動 */}
        <Field label="処方開始日" dow={rxStartDate ? `（${DOW[parseDate(rxStartDate).getDay()]}）` : ''} className="rx-start-field" style={{ flex: '2 1 110px', minWidth: 100 }}>
          <input
            type="date" value={rxStartDate}
            onChange={e => handleRxStartDateChange(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        <div className="visit-banner-period" style={{
          flex: '2 1 150px', minWidth: 130,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8, padding: '6px 12px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 9, color: 'var(--sky-200)' }}>処方期間</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{rxPeriod}</div>
          <div style={{ fontSize: 9, color: 'var(--sky-300)', marginTop: 2 }}>（{rxDays}日分）　{nextVisit}</div>
        </div>

        {team && (
          <div className="save-indicator" style={{ fontSize: 9, color: saving ? 'var(--sky-300)' : 'rgba(255,255,255,0.35)', alignSelf: 'flex-end', paddingBottom: 4, whiteSpace: 'nowrap' }}>
            {saving ? '💾 保存中…' : '✓ 保存済'}
          </div>
        )}
      </div>

      <style>{`
        .visit-banner-mobile-header {
          display: none;
        }
        .visit-field-dow {
          display: none;
        }

        /* 768px以下：2カラムグリッドで縦積み（flex-wrapによる重なりを防止） */
        @media (max-width: 768px) {
          .visit-banner-mobile-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            color: white;
            font-size: 13px;
            font-weight: 700;
            user-select: none;
            padding: 2px 0;
          }
          .visit-banner-chevron {
            font-size: 11px;
            opacity: 0.8;
          }
          .visit-banner-fields {
            display: none !important;
          }
          .visit-banner-fields.is-open {
            display: grid !important;
            grid-template-columns: minmax(0, 140px) 1fr !important;
            gap: 6px !important;
            align-items: end !important;
            margin-top: 8px !important;
          }
          .visit-date-field {
            grid-column: 1 !important;
            grid-row: 1 !important;
          }
          .rx-days-field {
            grid-column: 2 !important;
            grid-row: 1 !important;
          }
          .grace-days-field {
            grid-column: 1 !important;
            grid-row: 2 !important;
          }
          .rx-start-field {
            grid-column: 2 !important;
            grid-row: 2 !important;
          }
          .visit-banner-period {
            grid-column: 1 / -1 !important;
            grid-row: 3 !important;
          }
          .save-indicator {
            display: none !important;
          }
          .visit-field-dow {
            display: inline;
            font-size: 8px;
            font-weight: 400;
            margin-left: 2px;
            opacity: 0.9;
          }
        }

        /* 375px以下：パディングとギャップの微調整（グリッドは上の768pxクエリから継承） */
        @media (max-width: 375px) {
          .visit-banner { padding: 7px 10px !important; }
          .visit-banner-fields.is-open { gap: 5px !important; }
        }
      `}</style>
    </div>
  )
}

function Field({ label, children, style, className, dow }) {
  return (
    <div style={style} className={className}>
      <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>
        {label}{dow && <span className="visit-field-dow">{dow}</span>}
      </label>
      {children}
    </div>
  )
}

const bannerInputStyle = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, padding: '5px 7px', fontSize: 12, color: 'white',
  fontFamily: 'inherit', outline: 'none', width: '100%',
}
