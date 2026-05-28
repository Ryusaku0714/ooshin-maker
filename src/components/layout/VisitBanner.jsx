import { useEffect, useState } from 'react'

function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}` }
function fmtFull(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function VisitBanner({ team, onVisitCalcChange }) {
  const today = fmtFull(new Date())
  const [visitDate, setVisitDate] = useState(today)
  const [rxDays, setRxDays] = useState(team?.default_rx_days ?? 14)
  const [graceDays, setGraceDays] = useState(team?.grace_days ?? 1)
  const [rxStart, setRxStart] = useState('')
  const [rxPeriod, setRxPeriod] = useState('—')
  const [nextVisit, setNextVisit] = useState('次回往診：—')
  const [rxEnd, setRxEnd] = useState('')

  // ⑤ チーム切替時に自動反映
  useEffect(() => {
    if (team) {
      setRxDays(team.default_rx_days ?? 14)
      setGraceDays(team.grace_days ?? 1)
      setVisitDate(fmtFull(new Date()))
    }
  }, [team?.id])

  useEffect(() => {
    calc()
  }, [visitDate, rxDays, graceDays])

  function calc() {
    if (!visitDate) return
    const visit = new Date(visitDate)
    const start = new Date(visit)
    start.setDate(start.getDate() + Number(graceDays))
    const end = new Date(start)
    end.setDate(end.getDate() + Number(rxDays) - 1)
    const next = new Date(visit)
    next.setDate(next.getDate() + Number(rxDays))

    setRxStart(fmt(start))
    setRxPeriod(`${fmt(start)}〜${fmt(end)}（${rxDays}日分）`)
    setNextVisit(`次回往診：${fmt(next)}`)
    setRxEnd(fmtFull(end))
    onVisitCalcChange?.({ visitDate, rxDays: Number(rxDays), graceDays: Number(graceDays), rxEnd: fmtFull(end) })
  }

  return (
    <div className="visit-banner" style={{ background: 'var(--sky-800)', padding: '8px 14px', flexShrink: 0 }}>
      <div className="visit-banner-fields" style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>

        {/* 往診日 */}
        <Field label="往診日" style={{ flex: '2 1 120px', minWidth: 110 }}>
          <input
            type="date" value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方日数 */}
        <Field label="処方日数" style={{ flex: '1 1 56px', minWidth: 52 }}>
          <input
            type="number" value={rxDays} min={1} max={90}
            onChange={e => setRxDays(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方ズレ日数 */}
        <Field label="処方ズレ日数" style={{ flex: '1 1 68px', minWidth: 64 }}>
          <input
            type="number" value={graceDays} min={0} max={14}
            onChange={e => setGraceDays(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方開始（読み取り専用） */}
        <Field label="処方開始" style={{ flex: '1 1 60px', minWidth: 56 }}>
          <input
            type="text" value={rxStart} readOnly
            style={{ ...bannerInputStyle, cursor: 'default', opacity: 0.8 }}
          />
        </Field>

        {/* 処方期間（結果表示） */}
        <div className="visit-banner-period" style={{
          flex: '2 1 150px', minWidth: 130,
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8, padding: '6px 12px', textAlign: 'center', whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 9, color: 'var(--sky-200)' }}>処方期間</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>{rxPeriod}</div>
          <div style={{ fontSize: 9, color: 'var(--sky-300)', marginTop: 1 }}>{nextVisit}</div>
        </div>
      </div>

      <style>{`
        @media (max-width: 375px) {
          .visit-banner-fields {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 6px !important;
          }
          .visit-banner-period {
            grid-column: 1 / -1 !important;
          }
        }
      `}</style>
    </div>
  )
}

function Field({ label, children, style }) {
  return (
    <div style={style}>
      <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>
        {label}
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
