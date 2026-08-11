import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import AddFacilityModal from '../modals/AddFacilityModal'
import AddTeamModal from '../modals/AddTeamModal'
import AddPatientModal from '../modals/AddPatientModal'
import TaskModal from '../modals/TaskModal'
import TeamTaskModal from '../modals/TeamTaskModal'
import ImportModal from '../modals/ImportModal'
import { db } from '../../hooks/useData'
import LegalFooter from '../LegalFooter'
import { fmtMMDD, formatChangeLogText } from '../../lib/changeLogFormat'
import { exportTeamData } from '../../lib/teamExportImport'
import { fitFontSize, PRINT_PAGE_HEIGHT_PX, PRINT_PAGE_WIDTH_PX } from '../../lib/printFit'
import { TEAM_COLORS } from '../../lib/teamColors'
import TeamHeaderMenu from './TeamHeaderMenu'
import PrintMenuButton from '../common/PrintMenuButton'
import { loadCollapse, saveCollapse } from '../../lib/collapseStorage'
import { useMenuFlip } from '../../hooks/useMenuFlip'

const DOW_SIDEBAR = ['日', '月', '火', '水', '木', '金', '土']

function parseDateSidebar(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function fmtFullSidebar(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtWithDowSidebar(d) {
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}（${DOW_SIDEBAR[d.getDay()]}）`
}

async function printTeamLogs(team, facilityName) {
  const allPatients = team.om_patients ?? []
  const patientIds  = allPatients.map(p => p.id)
  if (patientIds.length === 0) { alert('患者が登録されていません'); return }

  const logs = await db.getFacilityLogs(patientIds)

  const logsByPatient = {}
  logs.forEach(log => {
    if (!logsByPatient[log.patient_id]) logsByPatient[log.patient_id] = []
    logsByPatient[log.patient_id].push(log)
  })

  const patientsHTML = allPatients.map(p => {
    const pLogs = logsByPatient[p.id] ?? []
    if (pLogs.length === 0) return ''
    const logsHTML = pLogs.map(log => {
      if (log.log_type === 'temporary') {
        return `<div class="le">
          <div><span class="bt">臨時</span> ${formatChangeLogText(log)}</div>
        </div>`
      }
      const reason   = log.reason?.trim() || '指示受け'
      const instrD   = fmtMMDD(log.changed_at)
      const startD   = log.start_date ? fmtMMDD(log.start_date) : null
      return `<div class="le">
        <div class="ld">${instrD}　${reason}</div>
        ${startD ? `<div><b>${startD}〜</b>　${log.content}</div>` : `<div>${log.content}</div>`}
      </div>`
    }).join('')
    return `<div class="ps">
      <h2>${p.room_number}${p.initial ? '　' + p.initial : ''}</h2>
      ${logsHTML}
    </div>`
  }).filter(Boolean).join('')

  const teamLabel = [team.clinic_name, team.team_name].filter(Boolean).join(' ') || '在宅患者'
  const now = new Date()
  const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>変更記録一括印刷 - ${facilityName} / ${teamLabel}</title>
<style>
  body{font-family:'Hiragino Sans','Noto Sans JP',sans-serif;font-size:11px;padding:20px;color:#0f172a}
  h1{font-size:14px;font-weight:700;border-bottom:2px solid #075985;padding-bottom:8px;margin-bottom:16px;color:#075985}
  h2{font-size:12px;font-weight:700;margin:14px 0 6px;padding:4px 8px;background:#e0f2fe;color:#0369a1;border-radius:4px}
  .ps{margin-bottom:16px;page-break-inside:avoid}
  .le{margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e0f2fe}
  .ld{font-weight:700;color:#0284c7;margin-bottom:2px}
  .bt{display:inline-block;font-size:9px;font-weight:700;padding:2px 6px;border-radius:10px;background:#fef3c7;color:#92400e;margin-right:4px;vertical-align:middle}
  @media print{body{padding:0}.ps{page-break-inside:avoid}}
</style></head><body>
<h1>📝 変更記録一括印刷 - ${facilityName} / ${teamLabel}　（${today}）</h1>
${patientsHTML || '<p>変更記録はありません</p>'}
</body></html>`

  const w = window.open('', '_blank', 'width=800,height=600')
  w.document.write(html)
  w.document.close()
  setTimeout(() => { w.focus(); w.print() }, 300)
}

function sliceDateSidebar(val) { return val ? String(val).slice(0, 10) : '' }
function isUnconfirmedDrugSidebar(d) {
  const ninety = new Date()
  ninety.setDate(ninety.getDate() - 90)
  const ref = d.last_confirmed_at || d.prescribed_at
  if (!ref) return true
  return new Date(sliceDateSidebar(ref)) < ninety
}

// チーム全患者印刷（往診準備用）：患者ごとに基本情報・変更記録・外用頓用薬・他科受診・フリーメモをまとめて印刷
// 各患者を1ページ目安で改ページしつつ、収まらない場合は自然に2枚目へ続く
async function printTeamAllPatients(team, facilityName) {
  const allPatients = team.om_patients ?? []
  const patientIds  = allPatients.map(p => p.id)
  if (patientIds.length === 0) { alert('患者が登録されていません'); return }

  const fullPatients = await db.getPatientsFull(patientIds)
  const order = new Map(allPatients.map((p, i) => [p.id, i]))
  fullPatients.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

  const sectionsHTML = fullPatients.map(p => {
    const logs = [...(p.om_change_logs ?? [])]
      .filter(l => !l.is_archived)
      .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
    const drugs  = (p.om_drugs ?? []).filter(d => !d.is_archived)
    const visits = (p.other_visits ?? []).filter(v => !(v.is_archived ?? false))

    const basicFields = [
      { label: '病歴・既往歴', value: p.medical_history },
      { label: 'アレルギー歴', value: p.allergy_history },
      { label: '入院歴',       value: p.hospitalization_history },
      { label: '定時薬',       value: p.regular_medication },
    ].filter(f => f.value?.trim())

    const basicHTML = basicFields.length ? `<div class="sec">
      <div class="sec-title">🏷️ 患者背景</div>
      ${basicFields.map(f => `<div class="${f.label === '定時薬' ? 'bf reg-med' : 'bf'}"><b>${f.label}：</b>${f.value}</div>`).join('')}
    </div>` : ''

    const logsHTML = logs.length ? `<div class="sec">
      <div class="sec-title">📝 変更記録</div>
      ${logs.map(log => {
        if (log.log_type === 'temporary') {
          return `<div class="le"><span class="bt">臨時</span>${formatChangeLogText(log).replace(/\n/g, '　')}</div>`
        }
        const reason = log.reason?.trim() || '指示受け'
        const instrD = fmtMMDD(log.changed_at)
        const startD = log.start_date ? fmtMMDD(log.start_date) : null
        return `<div class="le"><span class="ld">${instrD}　${reason}</span>${startD ? `　<b>${startD}〜</b>　${log.content ?? ''}` : `　${log.content ?? ''}`}</div>`
      }).join('')}
    </div>` : ''

    const drugsHTML = drugs.length ? `<div class="sec">
      <div class="sec-title">💊 外用・頓用薬</div>
      ${drugs.map(d => {
        const type = d.drug_type === 'gaiyou' ? '外用' : '頓用'
        const cd = sliceDateSidebar(d.last_confirmed_at)
        return `<div class="le">
          <span class="bt" style="background:${type === '外用' ? '#e0f2fe' : '#fef3c7'};color:${type === '外用' ? '#0369a1' : '#92400e'}">${type}</span>
          ${d.drug_name}${d.prescribed_quantity ? `　${d.prescribed_quantity}` : ''}${d.remaining_quantity ? `　残：${d.remaining_quantity}` : ''}${d.description ? `　${d.description}` : ''}${cd ? `　確認：${cd}` : ''}${isUnconfirmedDrugSidebar(d) ? '　⚠️未確認' : ''}
        </div>`
      }).join('')}
    </div>` : ''

    const visitsHTML = visits.length ? `<div class="sec">
      <div class="sec-title">🏥 他科受診</div>
      ${visits.map(v => {
        const from = v.dispensing_from ?? v.dispensing_date ?? ''
        const to = v.dispensing_to ?? ''
        const period = from && to ? `${from}〜${to}` : from ? `${from}〜` : to ? `〜${to}` : ''
        return `<div class="le">${v.hospital}${v.department ? `／${v.department}` : ''}${period ? `　調剤：${period}` : ''}${v.next_visit_date ? `　次回：${v.next_visit_date}` : ''}${v.notes ? `　備考：${v.notes}` : ''}</div>`
      }).join('')}
    </div>` : ''

    const memoHTML = p.free_memo?.trim() ? `<div class="sec">
      <div class="sec-title">📄 フリーメモ</div>
      <div class="bf" style="white-space:pre-wrap">${p.free_memo}</div>
    </div>` : ''

    const hasContent = basicHTML || logsHTML || drugsHTML || visitsHTML || memoHTML

    return `<div class="ps">
      <h2>${p.room_number}${p.initial ? '　' + p.initial : ''}</h2>
      ${basicHTML}${logsHTML}${drugsHTML}${visitsHTML}${memoHTML}
      ${hasContent ? '' : '<p class="empty">登録情報はありません</p>'}
    </div>`
  }).join('')

  const teamLabel = [team.clinic_name, team.team_name].filter(Boolean).join(' ') || '在宅患者'
  const now = new Date()
  const today = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`
  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>全患者印刷（往診準備用） - ${facilityName} / ${teamLabel}</title>
<style>
  * { box-sizing: border-box; }
  body{font-family:'Hiragino Sans','Noto Sans JP',sans-serif;color:#0f172a;padding:16px;width:${PRINT_PAGE_WIDTH_PX}px;margin:0 auto}
  h1{font-size:15px;font-weight:700;border-bottom:2px solid #075985;padding-bottom:8px;margin-bottom:10px;color:#075985}
  .ps{font-size:11px;line-height:1.4;margin-bottom:6px;page-break-after:always}
  .ps:last-child{page-break-after:auto}
  h2{font-size:1.15em;font-weight:700;margin:0 0 6px;padding:3px 7px;background:#e0f2fe;color:#0369a1;border-radius:4px;break-after:avoid;page-break-after:avoid}
  .sec{margin-bottom:6px;break-inside:avoid;page-break-inside:avoid}
  .sec-title{font-size:1em;font-weight:700;color:#0284c7;margin-bottom:2px;break-after:avoid;page-break-after:avoid}
  .bf{font-size:0.95em;margin-bottom:2px;white-space:pre-wrap}
  .reg-med{background:#e8f4fb;border-radius:4px;padding:4px 8px;font-weight:700;print-color-adjust:exact;-webkit-print-color-adjust:exact}
  .le{font-size:0.95em;margin-bottom:3px;padding-bottom:3px;border-bottom:1px solid #f1f5f9}
  .ld{font-weight:700;color:#0284c7}
  .bt{display:inline-block;font-size:0.8em;font-weight:700;padding:1px 5px;border-radius:8px;background:#fef3c7;color:#92400e;margin-right:4px;vertical-align:middle}
  .empty{color:#94a3b8;font-size:0.9em}
  @page{size:A4;margin:15mm}
  @media print{body{padding:0}.reg-med{background:#e8f4fb !important;print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<h1>📋 全患者印刷（往診準備用） - ${facilityName} / ${teamLabel}　（${today}）</h1>
${sectionsHTML || '<p>患者が登録されていません</p>'}
</body></html>`

  const w = window.open('', '_blank', 'width=800,height=600')
  w.document.write(html)
  w.document.close()

  // 患者ごとに1ページへ収まるようフォントサイズを自動縮小（最小10px、収まらない場合は自然に改ページ）
  w.document.querySelectorAll('.ps').forEach(sec => {
    fitFontSize(sec, { maxFontPx: 11, minFontPx: 10, targetHeightPx: PRINT_PAGE_HEIGHT_PX - 50 })
  })

  setTimeout(() => { w.focus(); w.print() }, 300)
}

const SORT_OPTIONS = [
  { key: 'room',   label: '部屋順' },
  { key: 'kana',   label: '五十音' },
  { key: 'recent', label: '最近' },
]

const toHalfNum = s => (s ?? '').replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))

function sortPatients(patients, sort) {
  if (!patients) return []
  const arr = [...patients]
  if (sort === 'room') {
    return arr.sort((a, b) => {
      const an = parseInt(toHalfNum(a.room_number), 10)
      const bn = parseInt(toHalfNum(b.room_number), 10)
      if (!isNaN(an) && !isNaN(bn)) return an - bn
      return toHalfNum(a.room_number).localeCompare(toHalfNum(b.room_number), 'ja')
    })
  }
  if (sort === 'kana')   return arr.sort((a, b) => (a.initial ?? '').localeCompare(b.initial ?? '', 'ja'))
  if (sort === 'recent') return arr.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
  return arr
}

// 施設カードのカラースキーム
const FAC_STYLE = {
  cardBg: 'white',
  cardBorder: 'var(--sky-200)',
  headerBg: 'var(--sky-50)',
  accentBorder: 'var(--sky-500)',
  labelColor: 'var(--sky-500)',
  nameColor: 'var(--sky-800)',
  addLinkColor: 'var(--sky-400)',
  teamHeaderBg: 'var(--sky-50)',
  teamHeaderSelectedBg: 'var(--sky-100)',
  teamHeaderColor: 'var(--sky-700)',
  teamBorder: 'var(--sky-100)',
  patientAddColor: 'var(--sky-400)',
}
const HOME_STYLE = {
  cardBg: '#f0fdf4',
  cardBorder: '#86efac',
  headerBg: '#dcfce7',
  accentBorder: '#16a34a',
  labelColor: '#16a34a',
  nameColor: '#14532d',
  addLinkColor: '#16a34a',
  teamHeaderBg: '#f0fdf4',
  teamHeaderSelectedBg: '#bbf7d0',
  teamHeaderColor: '#166534',
  teamBorder: '#bbf7d0',
  patientAddColor: '#16a34a',
}

// アイコンボタン直下に常時表示する極小の説明ラベル
const ICON_CAP_STYLE = { fontSize: 9, lineHeight: 1, fontWeight: 400, color: 'var(--gray-400)', whiteSpace: 'nowrap', marginTop: 1 }
const ICON_WRAP_STYLE = { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }

// 患者ごとの「個別設定」トグル＋往診日・処方日数・処方ズレ日数の入力欄
// custom_days / custom_offset の両方に値が入っている場合のみ個別設定ONとして扱う
// （individual_visit_date は空欄可：空の場合は上枠の共通往診日にフォールバックする）
function PatientRow({ patient: p, team, selected, isHomeCare, onSelect, onDelete, onRefetch }) {
  const isCustom = p.custom_days != null && p.custom_offset != null

  const [days,   setDays]   = useState(p.custom_days   ?? team.default_rx_days ?? 14)
  const [offset, setOffset] = useState(p.custom_offset ?? team.grace_days ?? 1)
  const [visitDateInput, setVisitDateInput] = useState(p.individual_visit_date ?? '')

  // 患者切り替え・サーバ側の値変化に追従
  useEffect(() => {
    setDays(p.custom_days ?? team.default_rx_days ?? 14)
    setOffset(p.custom_offset ?? team.grace_days ?? 1)
    setVisitDateInput(p.individual_visit_date ?? '')
  }, [p.id, p.custom_days, p.custom_offset, p.individual_visit_date])

  // 個別設定ON時のみ、入力値をデバウンスして自動保存
  useEffect(() => {
    if (!isCustom) return
    const d = Number(days)
    const o = Number(offset)
    if (!(d >= 1) || !(o >= 0)) return
    if (d === p.custom_days && o === p.custom_offset) return

    const timer = setTimeout(() => {
      // 上部情報バー（個別値で計算）に最新値を反映するため、保存後に一覧を再取得する
      db.updatePatient(p.id, { custom_days: d, custom_offset: o }).then(() => onRefetch())
    }, 800)
    return () => clearTimeout(timer)
  }, [days, offset, isCustom, p.id, p.custom_days, p.custom_offset, onRefetch])

  // 個別往診日をデバウンスして自動保存（空欄＝共通往診日を使用、として null 保存）
  useEffect(() => {
    if (!isCustom) return
    const current = p.individual_visit_date ?? ''
    if (visitDateInput === current) return

    const timer = setTimeout(() => {
      db.updatePatient(p.id, { individual_visit_date: visitDateInput || null }).then(() => onRefetch())
    }, 800)
    return () => clearTimeout(timer)
  }, [visitDateInput, isCustom, p.id, p.individual_visit_date, onRefetch])

  const toggleCustom = async (e) => {
    e.stopPropagation()
    if (isCustom) {
      await db.updatePatient(p.id, { custom_days: null, custom_offset: null, individual_visit_date: null })
    } else {
      await db.updatePatient(p.id, {
        custom_days:   team.default_rx_days ?? 14,
        custom_offset: team.grace_days ?? 1,
      })
    }
    onRefetch()
  }

  return (
    <div style={{ margin: '1px 4px' }}>
      <div
        className={`patient-row-item${selected ? ' patient-row-selected' : ''}`}
        style={{
          padding: '3px 6px 3px 12px',
          borderRadius: 6,
          background: selected ? '#0f1f4e' : (isHomeCare ? '#eef2ff' : 'transparent'),
          display: 'flex', alignItems: 'center', gap: 4,
          transition: 'background 0.1s',
          borderLeft: selected ? '2px solid #c9a84c' : '2px solid transparent',
        }}
      >
        <div
          onClick={onSelect}
          style={{ flex: 1, minWidth: 0, cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 6 }}
        >
          <span style={{ fontSize: 10, color: selected ? '#c9a84c' : (isHomeCare ? '#a5b4fc' : '#94a3b8'), flexShrink: 0 }}>{p.room_number}</span>
          {p.initial && (
            <span style={{ fontSize: 11, fontWeight: selected ? 700 : 500, color: selected ? '#ffffff' : (isHomeCare ? '#312e81' : '#64748b'), overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.initial}
            </span>
          )}
        </div>

        {/* 個別設定トグル（小さめのスイッチ） */}
        <button
          onClick={toggleCustom}
          title={isCustom ? '個別設定：ON（クリックでOFFに戻す）' : '個別設定：OFF（クリックでこの患者専用の処方日数・処方ズレ日数を設定）'}
          style={{
            flexShrink: 0, width: 26, height: 14, borderRadius: 7, border: 'none', padding: 0,
            position: 'relative', cursor: 'pointer',
            background: isCustom ? '#f59e0b' : (selected ? 'rgba(255,255,255,0.25)' : 'rgba(15,23,42,0.12)'),
            transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 1.5, left: isCustom ? 13.5 : 1.5,
            width: 11, height: 11, borderRadius: '50%', background: 'white',
            transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
          }} />
        </button>

        <span style={ICON_WRAP_STYLE}>
          <button
            onClick={onDelete}
            title="患者を削除"
            style={{
              fontSize: 10, padding: '1px 3px', borderRadius: 3,
              border: selected ? '1px solid rgba(255,255,255,0.4)' : '1px solid #fca5a5',
              background: 'transparent',
              color: selected ? 'rgba(255,255,255,0.7)' : '#ef4444',
              cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, lineHeight: 1,
            }}
          >🗑️</button>
          <span style={{ ...ICON_CAP_STYLE, color: selected ? 'rgba(255,255,255,0.7)' : ICON_CAP_STYLE.color }}>削除</span>
        </span>
      </div>

      {/* 個別設定ON時：この患者専用の処方日数・処方ズレ日数 */}
      {isCustom && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6,
            margin: '2px 0 3px 19px', padding: '4px 7px',
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 5,
            fontSize: 10, color: '#92400e',
          }}
        >
          <span style={{ fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>👤個別設定</span>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            往診日
            <input
              type="date"
              value={visitDateInput || team.last_visit_date || ''}
              onChange={e => setVisitDateInput(e.target.value)}
              title="空欄（クリアボタン）にすると上枠の共通往診日を使用します"
              style={{ width: 118, fontSize: 10, border: '1px solid #fcd34d', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            処方日数
            <input
              type="number" inputMode="numeric" value={days} min={1} max={90}
              onChange={e => setDays(e.target.value)}
              style={{ width: 36, fontSize: 10, border: '1px solid #fcd34d', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            日
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            ズレ日数
            <input
              type="number" inputMode="numeric" value={offset} min={0} max={14}
              onChange={e => setOffset(e.target.value)}
              style={{ width: 32, fontSize: 10, border: '1px solid #fcd34d', borderRadius: 3, padding: '1px 4px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
            />
            日
          </label>
        </div>
      )}
    </div>
  )
}

export default function Sidebar({
  facilities, selectedPatientId, selectedTeamId,
  onSelectPatient, onSelectTeam, onRefetch,
}) {
  const [sort, setSort] = useState('room')
  const [openTeams, setOpenTeams] = useState({})
  const [openFacilities, setOpenFacilities] = useState({})
  const [showAddFacility, setShowAddFacility] = useState(false)
  const [addTeamFacilityId, setAddTeamFacilityId] = useState(null)
  const [addPatientTeamId, setAddPatientTeamId] = useState(null)
  const [showImport, setShowImport] = useState(false)

  // 施設名インライン編集
  const [editFacId,   setEditFacId]   = useState(null)
  const [editFacName, setEditFacName] = useState('')

  // チーム名インライン編集
  const [editTeamId,         setEditTeamId]         = useState(null)
  const [editTeamIsHomeCare, setEditTeamIsHomeCare] = useState(false)
  const [editTeamClinic,     setEditTeamClinic]     = useState('')
  const [editTeamName,       setEditTeamName]       = useState('')
  const [editTeamVisitNotes, setEditTeamVisitNotes] = useState('')
  const [editTeamRxDays,    setEditTeamRxDays]    = useState(14)
  const [editTeamGraceDays, setEditTeamGraceDays] = useState(1)
  const [editTeamPharmacist, setEditTeamPharmacist] = useState('')
  const [editTeamVisitDate, setEditTeamVisitDate] = useState('')
  const [editTeamColor, setEditTeamColor] = useState(TEAM_COLORS[0])
  const [taskFacilityTarget, setTaskFacilityTarget] = useState(null)
  const [taskSummaries, setTaskSummaries] = useState({})
  // teamTaskTarget = { facility, team } | null — チームタスクモーダルの表示対象
  const [teamTaskTarget, setTeamTaskTarget] = useState(null)
  const [teamTaskSummaries, setTeamTaskSummaries] = useState({})
  // facGear: { id, pos } | null — ⚙ドロップダウンの対象施設IDと表示位置
  const [facGear, setFacGear] = useState(null)
  const { menuRef: facGearMenuRef, openUpward: facGearOpenUpward } = useMenuFlip(!!facGear, facGear?.pos)

  useEffect(() => {
    db.getFacilityTaskSummaries().then(s => setTaskSummaries(s))
  }, [facilities])

  // チームタスクの件数集計：チーム自身のタスク＋そのチームの患者に紐づく施設タスク（未完了分）を合算
  const refreshTeamTaskSummaries = async () => {
    const [teamSummaries, facTasks] = await Promise.all([db.getTeamTaskSummaries(), db.getFacilityTaskPatientMap()])
    const today = new Date().toISOString().slice(0, 10)
    const combined = {}
    facilities.forEach(f => (f.om_teams ?? []).forEach(t => {
      const teamPatientIds = new Set((t.om_patients ?? []).map(p => p.id))
      const relevant = facTasks.filter(ft => teamPatientIds.has(ft.patient_id))
      const base = teamSummaries[t.id] ?? { count: 0, overdue: 0 }
      combined[t.id] = {
        count: base.count + relevant.length,
        overdue: base.overdue + relevant.filter(ft => ft.deadline && ft.deadline < today).length,
      }
    }))
    setTeamTaskSummaries(combined)
  }

  useEffect(() => { refreshTeamTaskSummaries() }, [facilities])

  // 施設・チームの開閉状態をlocalStorageから復元（未保存のIDはデフォルトで開いた状態のまま）
  useEffect(() => {
    setOpenFacilities(prev => {
      const next = { ...prev }
      let changed = false
      facilities.forEach(f => {
        if (!(f.id in next)) {
          next[f.id] = loadCollapse(`facility_${f.id}`)
          changed = true
        }
      })
      return changed ? next : prev
    })
    setOpenTeams(prev => {
      const next = { ...prev }
      let changed = false
      facilities.forEach(f => (f.om_teams ?? []).forEach(t => {
        if (!(t.id in next)) {
          next[t.id] = loadCollapse(`team_${t.id}`)
          changed = true
        }
      }))
      return changed ? next : prev
    })
  }, [facilities])

  const startEditFacility = (e, fac) => {
    e.stopPropagation()
    setEditFacId(fac.id)
    setEditFacName(fac.name)
  }
  const saveFacilityName = async (id) => {
    if (!editFacName.trim()) { setEditFacId(null); return }
    await db.updateFacility(id, { name: editFacName.trim() })
    setEditFacId(null)
    onRefetch()
  }

  const deleteFacility = async (e, facility) => {
    e.stopPropagation()
    if (!confirm(`この施設を削除しますか？\n施設内のチーム・患者・全データが削除されます。この操作は取り消せません。アーカイブをご検討ください。`)) return
    const teamIds = (facility.om_teams ?? []).map(t => t.id)
    const patientIds = (facility.om_teams ?? []).flatMap(t => t.om_patients ?? []).map(p => p.id)
    if (teamIds.includes(selectedTeamId)) onSelectTeam(null)
    if (patientIds.includes(selectedPatientId)) onSelectPatient(null)
    await db.deleteFacility(facility.id)
    onRefetch()
  }

  const startEditTeam = (e, team, isHomeCare = false) => {
    e.stopPropagation()
    setEditTeamId(team.id)
    setEditTeamIsHomeCare(isHomeCare)
    setEditTeamClinic(team.clinic_name ?? '')
    setEditTeamName(team.team_name ?? '')
    setEditTeamVisitNotes(team.visit_schedule_custom ?? '')
    setEditTeamRxDays(team.default_rx_days ?? 14)
    setEditTeamGraceDays(team.grace_days ?? 1)
    setEditTeamPharmacist(team.pharmacist_name ?? '')
    setEditTeamVisitDate(team.last_visit_date ?? fmtFullSidebar(new Date()))
    setEditTeamColor(team.color ?? TEAM_COLORS[TEAM_COLORS.length - 1])
  }
  const saveTeamName = async (id) => {
    if (editTeamIsHomeCare) {
      await db.updateTeam(id, {
        last_visit_date: editTeamVisitDate || null,
        default_rx_days: Number(editTeamRxDays),
        grace_days: Number(editTeamGraceDays),
        pharmacist_name: editTeamPharmacist.trim(),
      })
      setEditTeamId(null)
      onRefetch()
      return
    }
    if (!editTeamClinic.trim() || !editTeamName.trim()) { setEditTeamId(null); return }
    await db.updateTeam(id, {
      clinic_name: editTeamClinic.trim(),
      team_name: editTeamName.trim(),
      visit_schedule_custom: editTeamVisitNotes.trim(),
      color: editTeamColor,
    })
    setEditTeamId(null)
    onRefetch()
  }

  const deleteTeam = async (e, team) => {
    e.stopPropagation()
    const label = [team.clinic_name, team.team_name].filter(Boolean).join(' ') || team.team_name
    if (!confirm(`「${label}」を削除しますか？\n患者データ・変更記録・外用頓用薬もすべて削除されます。`)) return
    await db.deleteTeam(team.id)
    if (selectedTeamId === team.id) onSelectTeam(null)
    onRefetch()
  }

  const deletePatient = async (e, patient) => {
    e.stopPropagation()
    if (!confirm(`「${patient.room_number}${patient.initial ? ' ' + patient.initial : ''}」を削除しますか？\n変更記録・外用頓用薬もすべて削除されます。`)) return
    await db.deletePatient(patient.id)
    if (selectedPatientId === patient.id) onSelectPatient(null)
    onRefetch()
  }

  const toggleTeam = (teamId) => {
    setOpenTeams(prev => {
      const next = prev[teamId] === false
      saveCollapse(`team_${teamId}`, next)
      return { ...prev, [teamId]: next }
    })
    onSelectTeam(teamId)
  }

  const toggleFacility = (facilityId) => {
    setOpenFacilities(prev => {
      const next = prev[facilityId] === false
      saveCollapse(`facility_${facilityId}`, next)
      return { ...prev, [facilityId]: next }
    })
  }

  // チームヘッダーのボタン（印刷・チームメモ・編集・エクスポート・削除）の項目＋説明文
  // スマホ版の「…」メニューとPC版のツールチップで共通利用する
  const teamMenuActions = (team, facility, isHomeCare) => [
    {
      key: 'export', icon: '📤', label: 'エクスポート', description: '患者データをJSON出力',
      onClick: () => exportTeamData(team, facility.name).catch(err => alert('エクスポートに失敗しました: ' + err.message)),
    },
    {
      key: 'print', icon: '🖨️', label: '印刷', description: '変更ログ印刷／全患者印刷を選択',
      options: [
        {
          label: '📝 変更ログ印刷（1ヶ月分）', description: '変更記録を一括印刷',
          onClick: () => printTeamLogs(team, facility.name),
        },
        {
          label: '📋 全患者印刷（往診準備用）', description: 'チーム全患者の情報をまとめて印刷',
          onClick: () => printTeamAllPatients(team, facility.name),
        },
      ],
    },
    {
      key: 'edit', icon: isHomeCare ? '⚙️' : '✏️', label: '編集',
      description: isHomeCare ? '処方設定を変更' : 'チーム名・設定を変更',
      onClick: e => startEditTeam(e, team, isHomeCare),
    },
    {
      key: 'delete', icon: '🗑️', label: '削除', description: 'このチームを削除',
      onClick: e => deleteTeam(e, team),
    },
  ]

  const teamMenuTip = a => `${a.icon} ${a.label}　${a.description}`

  // 在宅処方設定フォームの派生値（editTeamVisitDate / editTeamGraceDays / editTeamRxDays から計算）
  const editRxStartDate = (() => {
    if (!editTeamVisitDate) return ''
    const d = parseDateSidebar(editTeamVisitDate)
    if (!d) return ''
    d.setDate(d.getDate() + Number(editTeamGraceDays))
    return fmtFullSidebar(d)
  })()

  const editRxPeriod = (() => {
    if (!editTeamVisitDate) return '—'
    const visit = parseDateSidebar(editTeamVisitDate)
    if (!visit) return '—'
    const start = new Date(visit)
    start.setDate(start.getDate() + Number(editTeamGraceDays))
    const end = new Date(start)
    end.setDate(end.getDate() + Number(editTeamRxDays) - 1)
    return `${fmtWithDowSidebar(start)}〜${fmtWithDowSidebar(end)}`
  })()

  const handleEditRxStartDateChange = (newDateStr) => {
    if (!newDateStr || !editTeamVisitDate) return
    const diffDays = Math.round((parseDateSidebar(newDateStr) - parseDateSidebar(editTeamVisitDate)) / 86400000)
    if (diffDays >= 0 && diffDays <= 14) setEditTeamGraceDays(diffDays)
  }

  const renderPatientRow = (p, team, isHomeCare) => (
    <PatientRow
      key={p.id}
      patient={p}
      team={team}
      selected={selectedPatientId === p.id}
      isHomeCare={isHomeCare}
      onSelect={() => { onSelectPatient(p.id); onSelectTeam(team.id) }}
      onDelete={e => deletePatient(e, p)}
      onRefetch={onRefetch}
    />
  )

  return (
    <>
      <div className="sidebar">
        {/* ヘッダー */}
        <div style={{ padding: '12px', borderBottom: '1px solid #dce4f0', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
            施設・チーム・患者
          </div>
          <div style={{ display: 'flex', gap: 2, background: '#f1f5fb', borderRadius: 8, padding: 3 }}>
            {SORT_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => setSort(o.key)}
                style={{
                  flex: 1, fontSize: 11, padding: '3px 8px', borderRadius: 6,
                  border: 'none',
                  background: sort === o.key ? 'white' : 'transparent',
                  color: sort === o.key ? '#0f1f4e' : '#94a3b8',
                  fontWeight: sort === o.key ? 700 : 500,
                  boxShadow: sort === o.key ? '0 1px 3px rgba(15,31,78,0.08)' : 'none',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >{o.label}</button>
            ))}
          </div>
        </div>

        {/* スクロールエリア */}
        <div className="sidebar-list-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 0 12px' }}>
          {facilities.length === 0 && (
            <div style={{
              margin: '10px 12px 14px',
              border: '1.5px dashed #c9a84c',
              background: '#eef2fb',
              borderRadius: 10,
              padding: '16px 14px',
              textAlign: 'center',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: '#0f1f4e', color: '#c9a84c',
                border: '1.5px solid #c9a84c',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, margin: '0 auto 8px',
              }}>1</div>
              <div style={{ fontSize: 12, color: '#334155', fontWeight: 600, lineHeight: 1.5 }}>
                まずは施設または個人在宅をひとつ追加してみましょう
              </div>
              <div style={{ color: '#c9a84c', fontSize: 16, marginTop: 6, lineHeight: 1 }}>↓</div>
            </div>
          )}
          {facilities.map(facility => {
            const isHomeCare = !!facility.is_home_care
            const cs = isHomeCare ? HOME_STYLE : FAC_STYLE
            const facOpen = openFacilities[facility.id] !== false
            const isEditingFacility = editFacId === facility.id

            return (
              <div
                key={facility.id}
                style={{
                  margin: '4px 8px 8px',
                  border: `1px solid ${isHomeCare ? '#c7d2fe' : '#dce4f0'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  background: 'white',
                }}
              >
                {/* ── 施設ヘッダー ── */}
                <div
                  onClick={() => {
                    if (isEditingFacility) return
                    if (isHomeCare) {
                      // 個人在宅：施設名クリック＝患者詳細に遷移
                      const team = facility.om_teams?.[0]
                      const patient = team?.om_patients?.[0]
                      if (patient) { onSelectPatient(patient.id); onSelectTeam(team.id) }
                      // 患者がいない場合は開閉トグルにフォールバック
                      if (!patient) toggleFacility(facility.id)
                    } else {
                      toggleFacility(facility.id)
                    }
                  }}
                  style={{
                    padding: '7px 10px',
                    background: isHomeCare ? '#eef2ff' : '#eff6ff',
                    borderBottom: `1px solid ${isHomeCare ? '#c7d2fe' : '#dce4f0'}`,
                    borderLeft: `3px solid ${isHomeCare ? '#4338ca' : '#c9a84c'}`,
                    cursor: isEditingFacility ? 'default' : 'pointer',
                  }}
                >
                  {/* タイプラベル */}
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: '#94a3b8',
                    marginBottom: 3, letterSpacing: '1px', textTransform: 'uppercase',
                  }}>
                    {isHomeCare ? '🏠 個人在宅' : '🏥 施設 / 在宅'}
                  </div>

                  {/* 施設名行 */}
                  {editFacId === facility.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <input
                        value={editFacName}
                        onChange={e => setEditFacName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveFacilityName(facility.id); if (e.key === 'Escape') setEditFacId(null) }}
                        autoFocus
                        placeholder="施設名 / 個人在宅"
                        style={{
                          flex: 1, fontSize: 11, fontWeight: 700, color: cs.nameColor,
                          border: `1.5px solid ${cs.accentBorder}`, borderRadius: 4,
                          padding: '2px 6px', fontFamily: 'inherit', outline: 'none', background: 'white',
                        }}
                      />
                      <button
                        onClick={() => saveFacilityName(facility.id)}
                        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: 'none', background: cs.accentBorder, color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                      >✅</button>
                      <button
                        onClick={() => setEditFacId(null)}
                        style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                      >✕</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: cs.accentBorder, flexShrink: 0, width: 11, textAlign: 'center' }}>
                        {facOpen ? '▼' : '▶'}
                      </span>
                      <span style={{
                        flex: 1, fontSize: 11, fontWeight: 700, color: isHomeCare ? '#312e81' : '#0f1f4e',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                      }}>
                        {facility.name}
                      </span>

                      {/* 📝タスクボタン（大きめ） */}
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                          onClick={e => { e.stopPropagation(); setTaskFacilityTarget(facility) }}
                          title={
                            taskSummaries[facility.id]?.overdue
                              ? `期限切れタスクあり（${taskSummaries[facility.id].overdue}件）`
                              : (taskSummaries[facility.id]?.count ?? 0) > 0
                                ? `未完了タスク ${taskSummaries[facility.id].count}件`
                                : '引継ぎ・タスク表'
                          }
                          style={{
                            fontSize: 10, padding: '4px 10px', borderRadius: 6, border: 'none',
                            fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer', color: 'white',
                            background: taskSummaries[facility.id]?.overdue
                              ? '#dc2626'
                              : (taskSummaries[facility.id]?.count ?? 0) > 0
                                ? '#ea580c'
                                : (isHomeCare ? '#4338ca' : '#0f1f4e'),
                            whiteSpace: 'nowrap',
                          }}
                        >
                          📝 {(taskSummaries[facility.id]?.count ?? 0) > 0
                            ? `タスク（${taskSummaries[facility.id].count}）`
                            : 'タスク'}
                        </button>
                        {(taskSummaries[facility.id]?.count ?? 0) > 0 && (
                          <span style={{
                            position: 'absolute', top: -3, right: -3,
                            width: 7, height: 7, borderRadius: '50%',
                            background: taskSummaries[facility.id]?.overdue ? '#dc2626' : '#ea580c',
                            border: '1.5px solid white', pointerEvents: 'none',
                          }} />
                        )}
                      </div>

                      {/* ⚙ボタン＋ドロップダウン（createPortal で overflow:hidden を回避） */}
                      <div style={{ flexShrink: 0 }}>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (facGear?.id === facility.id) {
                              setFacGear(null)
                            } else {
                              const r = e.currentTarget.getBoundingClientRect()
                              setFacGear({ id: facility.id, pos: { top: r.top, bottom: r.bottom, right: Math.max(4, window.innerWidth - r.right) } })
                            }
                          }}
                          title="施設の設定"
                          style={{
                            fontSize: 13, padding: '2px 6px', borderRadius: 5, lineHeight: 1,
                            border: `1px solid ${isHomeCare ? '#c7d2fe' : '#dce4f0'}`, background: 'transparent',
                            color: isHomeCare ? '#4338ca' : '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
                          }}
                        >⚙</button>
                        {facGear?.id === facility.id && createPortal(
                          <>
                            <div className="row-menu-overlay" onClick={() => setFacGear(null)} />
                            <div
                              ref={facGearMenuRef}
                              className="row-menu"
                              style={{
                                position: 'fixed',
                                ...(facGearOpenUpward
                                  ? { top: 'auto', bottom: window.innerHeight - facGear.pos.top + 4 }
                                  : { top: facGear.pos.bottom + 4, bottom: 'auto' }),
                                right: facGear.pos.right,
                                minWidth: 140,
                              }}
                            >
                              {isHomeCare && facility.om_teams?.[0] && (
                                <button
                                  type="button"
                                  className="team-menu-item"
                                  onClick={e => { setFacGear(null); startEditTeam(e, facility.om_teams[0], true) }}
                                >
                                  <span className="team-menu-item-label">⚙️ 在宅処方設定</span>
                                </button>
                              )}
                              <button
                                type="button"
                                className="team-menu-item"
                                onClick={e => { setFacGear(null); startEditFacility(e, facility) }}
                              >
                                <span className="team-menu-item-label">✏️ 施設を編集</span>
                              </button>
                              <button
                                type="button"
                                className="team-menu-item"
                                style={{ color: '#dc2626' }}
                                onClick={e => { setFacGear(null); deleteFacility(e, facility) }}
                              >
                                <span className="team-menu-item-label" style={{ color: '#dc2626' }}>🗑 施設を削除</span>
                              </button>
                            </div>
                          </>,
                          document.body
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── チーム＆患者エリア ── */}
                {facOpen && (
                <div style={{ padding: '2px 0 4px' }}>
                  {(facility.om_teams ?? []).map(team => {
                    const isOpen = openTeams[team.id] !== false
                    const patients = sortPatients(team.om_patients, sort)
                    const hasPatients = patients.length > 0
                    const menuActions = teamMenuActions(team, facility, isHomeCare)
                    const [expA, printA, editA, delA] = menuActions
                    const teamTaskSummary = teamTaskSummaries[team.id]
                    const teamHasOverdueTasks = (teamTaskSummary?.overdue ?? 0) > 0
                    const teamHasIncompleteTasks = (teamTaskSummary?.count ?? 0) > 0
                    const openTeamTasks = () => setTeamTaskTarget({ facility, team })

                    return (
                      <div
                        key={team.id}
                        style={isHomeCare ? {} : {
                          margin: '3px 4px',
                          marginBottom: 3,
                          border: '1px solid #e8eef8',
                          borderRadius: 7,
                          overflow: 'hidden',
                          background: '#f8faff',
                        }}
                      >
                        {isHomeCare ? (
                          /* ─── 個人在宅：チーム行なし、設定フォームのみ ─── */
                          editTeamId === team.id ? (
                            <div style={{ margin: '0 8px 4px', border: '1px solid #86efac', borderRadius: 8, padding: '8px', background: '#f0fdf4', overflow: 'hidden' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                                ⚙️ 在宅処方設定
                              </div>

                              {/* 往診日 */}
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>往診日</div>
                                <input
                                  type="date"
                                  value={editTeamVisitDate}
                                  onChange={e => setEditTeamVisitDate(e.target.value)}
                                  autoFocus
                                  style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                />
                              </div>

                              {/* 処方日数 + 処方ズレ日数 */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>処方日数</div>
                                  <input
                                    type="number" inputMode="numeric"
                                    value={editTeamRxDays}
                                    onChange={e => setEditTeamRxDays(e.target.value)}
                                    min={1} max={90}
                                    style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>処方ズレ日数</div>
                                  <input
                                    type="number" inputMode="numeric"
                                    value={editTeamGraceDays}
                                    onChange={e => setEditTeamGraceDays(e.target.value)}
                                    min={0} max={14}
                                    style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>

                              {/* 処方開始日（往診日＋処方ズレ日数と双方向連動） */}
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>処方開始日</div>
                                <input
                                  type="date"
                                  value={editRxStartDate}
                                  onChange={e => handleEditRxStartDateChange(e.target.value)}
                                  style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                />
                              </div>

                              {/* 処方期間（表示のみ） */}
                              <div style={{ marginBottom: 6, background: 'rgba(22,163,74,0.08)', border: '1px solid #bbf7d0', borderRadius: 6, padding: '5px 8px' }}>
                                <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>処方期間</div>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#14532d', lineHeight: 1.4 }}>{editRxPeriod}</div>
                              </div>

                              {/* 担当薬剤師 */}
                              <div style={{ marginBottom: 8 }}>
                                <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>担当薬剤師</div>
                                <input
                                  value={editTeamPharmacist}
                                  onChange={e => setEditTeamPharmacist(e.target.value)}
                                  placeholder="例：山田T"
                                  onKeyDown={e => { if (e.key === 'Enter') saveTeamName(team.id); if (e.key === 'Escape') setEditTeamId(null) }}
                                  style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                />
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                <button
                                  onClick={() => saveTeamName(team.id)}
                                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                                >✅ 保存</button>
                                <button
                                  onClick={() => setEditTeamId(null)}
                                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                                >✕</button>
                              </div>
                            </div>
                          ) : (
                            /* 個人在宅：チーム行は非表示（⚙ドロップダウンから設定にアクセス） */
                            null
                          )
                        ) : (
                          /* ─── 通常施設：チーム行 ─── */
                          editTeamId === team.id ? (
                            <div style={{ padding: '6px 8px', background: 'var(--sky-50)' }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--sky-500)', marginBottom: 6, letterSpacing: '0.05em' }}>
                                ✏️ チーム編集
                              </div>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                                <input
                                  value={editTeamClinic}
                                  onChange={e => setEditTeamClinic(e.target.value)}
                                  placeholder="クリニック名"
                                  autoFocus
                                  style={{ flex: 1, fontSize: 10, border: '1.5px solid var(--sky-400)', borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit', outline: 'none' }}
                                />
                                <input
                                  value={editTeamName}
                                  onChange={e => setEditTeamName(e.target.value)}
                                  placeholder="往診名称"
                                  style={{ flex: 1, fontSize: 10, border: '1.5px solid var(--sky-400)', borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit', outline: 'none' }}
                                />
                              </div>
                              <div style={{ marginBottom: 4 }}>
                                <input
                                  value={editTeamVisitNotes}
                                  onChange={e => setEditTeamVisitNotes(e.target.value)}
                                  placeholder="往診間隔（自由記載）"
                                  onKeyDown={e => { if (e.key === 'Enter') saveTeamName(team.id); if (e.key === 'Escape') setEditTeamId(null) }}
                                  style={{ width: '100%', fontSize: 10, border: '1.5px solid var(--sky-400)', borderRadius: 4, padding: '2px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                />
                              </div>
                              <div style={{ marginBottom: 6 }}>
                                <div style={{ fontSize: 9, color: 'var(--sky-500)', marginBottom: 3 }}>チームカラー</div>
                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                  {TEAM_COLORS.map(c => (
                                    <button
                                      key={c}
                                      onClick={() => setEditTeamColor(c)}
                                      aria-label={`カラー ${c}`}
                                      style={{
                                        width: 18, height: 18, borderRadius: '50%', background: c,
                                        border: editTeamColor === c ? '2px solid var(--sky-700)' : '2px solid transparent',
                                        outline: editTeamColor === c ? `1.5px solid ${c}` : 'none',
                                        outlineOffset: 2,
                                        cursor: 'pointer', padding: 0, flexShrink: 0,
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                                <button
                                  onClick={() => saveTeamName(team.id)}
                                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: 'none', background: 'var(--sky-600)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                                >✅ 保存</button>
                                <button
                                  onClick={() => setEditTeamId(null)}
                                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 4, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                                >✕</button>
                              </div>
                            </div>
                          ) : (
                            <div
                              onClick={() => toggleTeam(team.id)}
                              className="team-row"
                              style={{
                                fontSize: 10, fontWeight: 700,
                                color: '#64748b',
                                padding: '5px 8px',
                                background: '#f0f4ff',
                                borderLeft: '2px solid #c9a84c',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                                cursor: 'pointer',
                              }}
                            >
                              {/* チーム名＋往診間隔 */}
                              <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                                <span style={{ fontSize: 9, color: 'var(--sky-400)', flexShrink: 0, width: 11, textAlign: 'center', marginTop: 1 }}>
                                  {isOpen ? '▼' : '▶'}
                                </span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{
                                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                                      background: team.color ?? '#94a3b8',
                                    }} />
                                    🏥 {team.clinic_name} {team.team_name}
                                  </div>
                                  {team.visit_schedule_custom && (
                                    <div style={{ fontSize: 9, color: 'var(--sky-400)', fontWeight: 400, marginTop: 2 }}>
                                      {team.visit_schedule_custom}
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* 1行ボタングループ */}
                              <div
                                className="team-row-actions"
                                onClick={e => e.stopPropagation()}
                                style={{ display: 'flex', gap: 2, flexShrink: 0, alignItems: 'center' }}
                              >
                                <div className="row-actions-desktop" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                  <button
                                    onClick={expA.onClick}
                                    title={teamMenuTip(expA)}
                                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                  >📤</button>
                                  <PrintMenuButton
                                    icon="🖨️"
                                    title={teamMenuTip(printA)}
                                    options={printA.options}
                                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                  />
                                  <button
                                    onClick={openTeamTasks}
                                    title={
                                      teamHasOverdueTasks
                                        ? `期限切れタスクあり（${teamTaskSummary.overdue}件）`
                                        : teamHasIncompleteTasks
                                          ? `未完了タスク ${teamTaskSummary.count}件`
                                          : 'チームタスクを管理'
                                    }
                                    style={{
                                      fontSize: 10, padding: '1px 4px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                                      border: teamHasOverdueTasks ? '1px solid #fecaca' : teamHasIncompleteTasks ? '1px solid #fed7aa' : '1px solid var(--sky-200)',
                                      background: teamHasOverdueTasks ? '#fee2e2' : teamHasIncompleteTasks ? '#fff7ed' : 'white',
                                      color: teamHasOverdueTasks ? '#dc2626' : teamHasIncompleteTasks ? '#ea580c' : 'var(--sky-600)',
                                    }}
                                  >📋 {teamHasIncompleteTasks ? `タスク(${teamTaskSummary.count})` : 'タスク'}</button>
                                  <button
                                    onClick={editA.onClick}
                                    title={teamMenuTip(editA)}
                                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                  >✏️</button>
                                  <button
                                    onClick={delA.onClick}
                                    title={teamMenuTip(delA)}
                                    style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                  >🗑️</button>
                                </div>
                                <button
                                  className="row-actions-mobile"
                                  onClick={openTeamTasks}
                                  title={
                                    teamHasIncompleteTasks
                                      ? `未完了タスク ${teamTaskSummary.count}件`
                                      : 'チームタスクを管理'
                                  }
                                  style={{
                                    fontSize: 10, padding: '1px 6px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                                    border: teamHasIncompleteTasks ? '1px solid #fed7aa' : '1px solid #dce4f0',
                                    background: teamHasIncompleteTasks ? '#fff7ed' : '#f1f5fb',
                                    color: teamHasIncompleteTasks ? '#ea580c' : '#64748b',
                                  }}
                                >📋{teamHasIncompleteTasks ? `(${teamTaskSummary.count})` : ''}</button>
                                <TeamHeaderMenu actions={menuActions} triggerStyle={{ border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)' }} />
                              </div>
                            </div>
                          )
                        )}

                        {/* 患者リスト（個人在宅は常時展開、通常施設は isOpen に従う） */}
                        {(isOpen || isHomeCare) && (
                          <div style={{ padding: '2px 0 3px' }}>
                            {patients.map(p => renderPatientRow(p, team, isHomeCare))}
                            {!(isHomeCare && hasPatients) && (
                              <div
                                onClick={() => setAddPatientTeamId(team.id)}
                                className="add-link"
                              >
                                <span className="add-link-plus">＋</span> 患者を追加
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* チーム追加リンク（個人在宅は非表示） */}
                  {!isHomeCare && (
                    <div
                      onClick={() => setAddTeamFacilityId(facility.id)}
                      className="add-link"
                    >
                      <span className="add-link-plus">＋</span> チームを追加
                    </div>
                  )}
                </div>
                )}
              </div>
            )
          })}

          <div
            onClick={() => setShowAddFacility(true)}
            className="add-link"
            style={facilities.length === 0 ? { background: '#fff7e6', border: '1px solid #c9a84c', fontWeight: 700 } : undefined}
          >
            🏠 <span className="add-link-plus">＋</span> 施設 / 個人在宅を追加
          </div>

          <div
            onClick={() => setShowImport(true)}
            className="add-link"
          >
            📥 <span className="add-link-plus">＋</span> インポート
          </div>

          <LegalFooter />
        </div>
      </div>

      {showAddFacility && (
        <AddFacilityModal
          onClose={() => setShowAddFacility(false)}
          onSaved={onRefetch}
          onHomeCareCreated={(teamId) => setAddPatientTeamId(teamId)}
        />
      )}
      {addTeamFacilityId && (
        <AddTeamModal facilityId={addTeamFacilityId} onClose={() => setAddTeamFacilityId(null)} onSaved={onRefetch} />
      )}
      {addPatientTeamId && (
        <AddPatientModal
          teamId={addPatientTeamId}
          onClose={() => setAddPatientTeamId(null)}
          onSaved={(patientId) => { onRefetch(); onSelectPatient(patientId) }}
        />
      )}
      {taskFacilityTarget && (
        <TaskModal
          facility={taskFacilityTarget}
          onClose={() => {
            setTaskFacilityTarget(null)
            db.getFacilityTaskSummaries().then(s => setTaskSummaries(s))
            refreshTeamTaskSummaries()
          }}
        />
      )}
      {teamTaskTarget && (
        <TeamTaskModal
          facility={teamTaskTarget.facility}
          team={teamTaskTarget.team}
          onClose={() => {
            setTeamTaskTarget(null)
            refreshTeamTaskSummaries()
          }}
        />
      )}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); onRefetch() }}
        />
      )}
    </>
  )
}
