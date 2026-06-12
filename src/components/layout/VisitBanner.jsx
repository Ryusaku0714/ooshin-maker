import { useEffect, useState } from 'react'
import { db } from '../../hooks/useData'
import CopyButton from '../common/CopyButton'

const DOW = ['日', '月', '火', '水', '木', '金', '土']

function parseDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function pad2(n) { return String(n).padStart(2, '0') }
function fmt(d) { return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}` }
function fmtWithDow(d) { return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}（${DOW[d.getDay()]}）` }
function fmtFull(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function fmtFullWithDow(str) {
  const d = parseDate(str)
  if (!d) return ''
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}（${DOW[d.getDay()]}）`
}

// 「（月）」などの曜日表記を取り除く
function stripDow(str) {
  return str.replace(/（[日月火水木金土]）/g, '')
}

export default function VisitBanner({ team, patientOverride, onVisitCalcChange }) {
  const today = fmtFull(new Date())
  const [visitDate, setVisitDate] = useState(today)
  const [rxDays,    setRxDays]    = useState(team?.default_rx_days ?? 14)
  const [graceDays, setGraceDays] = useState(team?.grace_days ?? 1)
  const [rxPeriod,  setRxPeriod]  = useState('—')
  const [nextVisit, setNextVisit] = useState('次回往診：—')
  const [rxEnd,     setRxEnd]     = useState('')
  const [saving,    setSaving]    = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

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

  // 個別設定ON（patientOverride）の患者を選択中は、その患者専用の値で計算する
  // ※ チーム単位の rxDays / graceDays state やその保存ロジックはそのまま
  const effRxDays    = patientOverride?.rxDays    ?? Number(rxDays)
  const effGraceDays = patientOverride?.graceDays ?? Number(graceDays)

  // 処方開始日は visitDate + 処方ズレ日数（個別設定があれば個別値）から導出（独立したstateを持たない）
  const rxStartDate = (() => {
    if (!visitDate) return ''
    const d = new Date(visitDate)
    d.setDate(d.getDate() + effGraceDays)
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
  }, [visitDate, rxDays, graceDays, patientOverride])

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
    start.setDate(start.getDate() + effGraceDays)
    const end = new Date(start)
    end.setDate(end.getDate() + effRxDays - 1)
    const next = new Date(visit)
    next.setDate(next.getDate() + effRxDays)

    setRxPeriod(`${fmtWithDow(start)}〜${fmtWithDow(end)}`)
    setNextVisit(`次回往診：${fmt(next)}`)
    setRxEnd(fmtFull(end))
    onVisitCalcChange?.({ visitDate, rxDays: effRxDays, graceDays: effGraceDays, rxEnd: fmtFull(end) })
  }

  // 処方開始日を変更 → 往診日との差分から処方ズレ日数を逆算
  function handleRxStartDateChange(newDateStr) {
    if (!newDateStr || !visitDate) return
    const diffDays = Math.round((new Date(newDateStr) - new Date(visitDate)) / 86400000)
    if (diffDays >= 0 && diffDays <= 14) {
      setGraceDays(diffDays)
    }
  }

  const mobileFieldStyle = { width: '45%' }

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
      <div
        className={`visit-banner-fields${isExpanded ? ' is-open' : ''}`}
        style={isMobile
          ? { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: 6, marginTop: 8 }
          : { display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }
        }
      >

        <Field label="往診日" dow={visitDate ? `（${DOW[parseDate(visitDate).getDay()]}）` : ''} className="visit-date-field"
          style={isMobile ? mobileFieldStyle : { flex: '2 1 120px', minWidth: 110 }}>
          <input
            type="date" value={visitDate}
            onChange={e => setVisitDate(e.target.value)}
            style={bannerInputStyle}
          />
        </Field>

        <Field label="処方日数" className="rx-days-field"
          style={isMobile ? mobileFieldStyle : { flex: '1 1 56px', minWidth: 52 }}>
          <input
            type="number" inputMode="numeric" value={patientOverride ? patientOverride.rxDays : rxDays} min={1} max={90}
            disabled={!!patientOverride}
            onChange={e => setRxDays(e.target.value)}
            style={patientOverride ? overrideInputStyle : bannerInputStyle}
            title={patientOverride ? '個別設定中：この患者の値は患者一覧の「個別設定」で編集してください' : undefined}
          />
        </Field>

        <Field label="処方ズレ日数" className="grace-days-field"
          style={isMobile ? mobileFieldStyle : { flex: '1 1 68px', minWidth: 64 }}>
          <input
            type="number" inputMode="numeric" value={patientOverride ? patientOverride.graceDays : graceDays} min={0} max={14}
            disabled={!!patientOverride}
            onChange={e => setGraceDays(e.target.value)}
            style={patientOverride ? overrideInputStyle : bannerInputStyle}
            title={patientOverride ? '個別設定中：この患者の値は患者一覧の「個別設定」で編集してください' : undefined}
          />
        </Field>

        {/* 処方開始日：処方ズレ日数と双方向連動（個別設定中は個別値から算出し編集不可） */}
        <Field label="処方開始日" dow={rxStartDate ? `（${DOW[parseDate(rxStartDate).getDay()]}）` : ''} className="rx-start-field"
          style={isMobile ? mobileFieldStyle : { flex: '2 1 110px', minWidth: 100 }}>
          <input
            type="date" value={rxStartDate}
            disabled={!!patientOverride}
            onChange={e => handleRxStartDateChange(e.target.value)}
            style={patientOverride ? overrideInputStyle : bannerInputStyle}
            title={patientOverride ? '個別設定中：この患者の値は患者一覧の「個別設定」で編集してください' : undefined}
          />
        </Field>

        <div className="visit-banner-period" style={{
          ...(isMobile
            ? { width: '100%', marginTop: 2 }
            : { flex: '2 1 150px', minWidth: 130 }
          ),
          background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)',
          borderRadius: 8, padding: '6px 12px', textAlign: 'center',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9, color: 'var(--sky-200)' }}>処方期間</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'white', lineHeight: 1.3 }}>{rxPeriod}</div>
            <div style={{ fontSize: 9, color: 'var(--sky-300)', marginTop: 2 }}>（{effRxDays}日分）　{nextVisit}</div>
          </div>
          {rxPeriod !== '—' && (
            <CopyButton
              variant="banner"
              title="処方期間をコピー"
              getText={() => `${stripDow(rxPeriod)}（${effRxDays}日分）${nextVisit}`}
            />
          )}
        </div>

        {/* 個別設定中バッジ：選択中の患者の個別値で計算していることを示す */}
        {patientOverride && (
          <div style={{
            ...(isMobile ? { width: '100%', marginTop: 2 } : { flex: '0 0 auto' }),
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            background: 'rgba(245,158,11,0.22)', border: '1px solid rgba(245,158,11,0.5)',
            borderRadius: 8, padding: '6px 10px',
            fontSize: 10, fontWeight: 700, color: '#fef3c7', whiteSpace: 'nowrap',
          }}>
            👤 個別設定を使用中
          </div>
        )}

        {team && !isMobile && (
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

        @media (max-width: 768px) {
          .visit-banner { padding-right: 22px !important; }
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
          /* デフォルトで非表示。is-open クラスで flex 表示（レイアウトはJSインラインstyle） */
          .visit-banner-fields {
            display: none !important;
          }
          .visit-banner-fields.is-open {
            display: flex !important;
          }
          .visit-field-dow {
            display: inline;
            font-size: 8px;
            font-weight: 400;
            margin-left: 2px;
            opacity: 0.9;
          }
        }

        @media (max-width: 375px) {
          .visit-banner { padding: 7px 10px !important; }
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

// 個別設定中（patientOverride）の患者を選択している間、編集不可であることを示す配色
const overrideInputStyle = {
  ...bannerInputStyle,
  background: 'rgba(245,158,11,0.22)', border: '1px solid rgba(245,158,11,0.5)',
  cursor: 'not-allowed', opacity: 0.9,
}
