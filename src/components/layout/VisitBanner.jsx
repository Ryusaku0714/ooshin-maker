import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'

function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}` }
function fmtFull(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function VisitBanner({ team, onVisitCalcChange }) {
  const today = fmtFull(new Date())
  const [visitDate, setVisitDate] = useState(today)
  const [rxDays,    setRxDays]    = useState(team?.default_rx_days ?? 14)
  const [graceDays, setGraceDays] = useState(team?.grace_days ?? 1)
  const [rxStart,   setRxStart]   = useState('')
  const [rxPeriod,  setRxPeriod]  = useState('—')
  const [nextVisit, setNextVisit] = useState('次回往診：—')
  const [rxEnd,     setRxEnd]     = useState('')
  const [saving,    setSaving]    = useState(false)

  // チーム切替時：保存済み設定を自動反映
  useEffect(() => {
    if (team) {
      setVisitDate(team.last_visit_date ?? fmtFull(new Date()))
      setRxDays(team.default_rx_days ?? 14)
      setGraceDays(team.grace_days ?? 1)
    }
  }, [team?.id])

  // 計算
  useEffect(() => {
    calc()
  }, [visitDate, rxDays, graceDays])

  // 変更をチームにリアルタイム保存（デバウンス800ms）
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
        <Field label="往診日" className="visit-date-field" style={{ flex: '2 1 120px', minWidth: 110 }}>
          <input
            type="date" value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方日数 */}
        <Field label="処方日数" className="rx-days-field" style={{ flex: '1 1 56px', minWidth: 52 }}>
          <input
            type="number" value={rxDays} min={1} max={90}
            onChange={e => setRxDays(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方ズレ日数 */}
        <Field label="処方ズレ日数" className="grace-days-field" style={{ flex: '1 1 68px', minWidth: 64 }}>
          <input
            type="number" value={graceDays} min={0} max={14}
            onChange={e => setGraceDays(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        {/* 処方開始（読み取り専用） */}
        <Field label="処方開始" className="rx-start-field" style={{ flex: '1 1 60px', minWidth: 56 }}>
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

        {/* 保存インジケーター */}
        {team && (
          <div className="save-indicator" style={{ fontSize: 9, color: saving ? 'var(--sky-300)' : 'rgba(255,255,255,0.35)', alignSelf: 'flex-end', paddingBottom: 4, whiteSpace: 'nowrap' }}>
            {saving ? '💾 保存中…' : '✓ 保存済'}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 375px) {
          .visit-banner { padding: 7px 10px !important; }
          .visit-banner-fields {
            display: grid !important;
            grid-template-columns: 1fr 1fr 1fr !important;
            gap: 5px !important;
            align-items: end !important;
          }
          .visit-date-field {
            grid-column: 1 / 2 !important;
            grid-row: 1 !important;
          }
          .rx-days-field {
            grid-column: 1 !important;
            grid-row: 2 !important;
          }
          .grace-days-field {
            grid-column: 2 !important;
            grid-row: 2 !important;
          }
          .rx-start-field {
            grid-column: 3 !important;
            grid-row: 2 !important;
          }
          .visit-banner-period {
            grid-column: 1 / -1 !important;
            grid-row: 3 !important;
          }
          .save-indicator {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}

function Field({ label, children, style, className }) {
  return (
    <div style={style} className={className}>
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
