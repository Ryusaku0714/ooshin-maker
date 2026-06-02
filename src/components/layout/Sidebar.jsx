import { useState } from 'react'
import AddFacilityModal from '../modals/AddFacilityModal'
import AddTeamModal from '../modals/AddTeamModal'
import AddPatientModal from '../modals/AddPatientModal'
import { db } from '../../hooks/useData'
import LegalFooter from '../LegalFooter'

function fmtMMDD(dateStr) {
  if (!dateStr) return ''
  const [, mm, dd] = dateStr.split('-')
  return `${mm}/${dd}`
}

async function printFacilityLogs(facility) {
  const allPatients = (facility.om_teams ?? []).flatMap(t => t.om_patients ?? [])
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

  const today = new Date().toLocaleDateString('ja-JP')
  const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="utf-8">
<title>変更記録一括印刷 - ${facility.name}</title>
<style>
  body{font-family:'Hiragino Sans','Noto Sans JP',sans-serif;font-size:11px;padding:20px;color:#0f172a}
  h1{font-size:14px;font-weight:700;border-bottom:2px solid #075985;padding-bottom:8px;margin-bottom:16px;color:#075985}
  h2{font-size:12px;font-weight:700;margin:14px 0 6px;padding:4px 8px;background:#e0f2fe;color:#0369a1;border-radius:4px}
  .ps{margin-bottom:16px;page-break-inside:avoid}
  .le{margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #e0f2fe}
  .ld{font-weight:700;color:#0284c7;margin-bottom:2px}
  @media print{body{padding:0}.ps{page-break-inside:avoid}}
</style></head><body>
<h1>📝 変更記録一括印刷 - ${facility.name}　（${today}）</h1>
${patientsHTML || '<p>変更記録はありません</p>'}
</body></html>`

  const w = window.open('', '_blank', 'width=800,height=600')
  w.document.write(html)
  w.document.close()
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

export default function Sidebar({
  facilities, selectedPatientId, selectedTeamId,
  onSelectPatient, onSelectTeam, onRefetch,
}) {
  const [sort, setSort] = useState('room')
  const [openTeams, setOpenTeams] = useState({})
  const [showAddFacility, setShowAddFacility] = useState(false)
  const [addTeamFacilityId, setAddTeamFacilityId] = useState(null)
  const [addPatientTeamId, setAddPatientTeamId] = useState(null)

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
  }
  const saveTeamName = async (id) => {
    if (editTeamIsHomeCare) {
      await db.updateTeam(id, {
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
    setOpenTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }))
    onSelectTeam(teamId)
  }

  const renderPatientRow = (p, team) => (
    <div
      key={p.id}
      style={{
        fontSize: 11,
        color: selectedPatientId === p.id ? 'white' : 'var(--sky-700)',
        padding: '4px 6px',
        borderRadius: 5,
        background: selectedPatientId === p.id ? 'var(--sky-600)' : 'transparent',
        fontWeight: selectedPatientId === p.id ? 600 : 400,
        display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1,
        transition: 'background 0.1s',
      }}
    >
      <div
        onClick={() => { onSelectPatient(p.id); onSelectTeam(team.id) }}
        style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <span style={{ opacity: 0.6, fontSize: 10 }}>👤</span>
        {p.room_number}{p.initial ? `　${p.initial}` : ''}
      </div>
      <button
        onClick={e => deletePatient(e, p)}
        title="患者を削除"
        style={{
          fontSize: 10, padding: '1px 3px', borderRadius: 3,
          border: selectedPatientId === p.id ? '1px solid rgba(255,255,255,0.4)' : '1px solid #fca5a5',
          background: 'transparent',
          color: selectedPatientId === p.id ? 'rgba(255,255,255,0.7)' : '#ef4444',
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, lineHeight: 1,
        }}
      >🗑️</button>
    </div>
  )

  return (
    <>
      <div className="sidebar">
        {/* ヘッダー */}
        <div style={{ padding: '12px', borderBottom: '1px solid var(--sky-200)', flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky-700)', marginBottom: 6 }}>
            施設・チーム・患者
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {SORT_OPTIONS.map(o => (
              <button
                key={o.key}
                onClick={() => setSort(o.key)}
                style={{
                  fontSize: 10, padding: '3px 8px', borderRadius: 6,
                  border: '1px solid var(--sky-200)',
                  background: sort === o.key ? 'var(--sky-600)' : 'white',
                  color: sort === o.key ? 'white' : 'var(--sky-600)',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >{o.label}</button>
            ))}
          </div>
        </div>

        {/* スクロールエリア */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 12px' }}>
          {facilities.map(facility => {
            const isHomeCare = !!facility.is_home_care
            const cs = isHomeCare ? HOME_STYLE : FAC_STYLE

            return (
              <div
                key={facility.id}
                style={{
                  marginBottom: 10,
                  borderRadius: 8,
                  border: `1px solid ${cs.cardBorder}`,
                  background: cs.cardBg,
                  overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* ── 施設ヘッダー ── */}
                <div style={{
                  background: cs.headerBg,
                  borderLeft: `3px solid ${cs.accentBorder}`,
                  padding: '5px 8px 5px',
                }}>
                  {/* タイプラベル */}
                  <div style={{
                    fontSize: 9, fontWeight: 700, color: cs.labelColor,
                    marginBottom: 3, letterSpacing: '0.06em',
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{
                        flex: 1, fontSize: 11, fontWeight: 700, color: cs.nameColor,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
                      }}>
                        {facility.name}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); printFacilityLogs(facility) }}
                        title="変更記録一括印刷"
                        style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: `1px solid ${cs.cardBorder}`, background: 'white', color: cs.accentBorder, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                      >🖨️</button>
                      <button
                        onClick={e => startEditFacility(e, facility)}
                        title="施設名を編集"
                        style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: `1px solid ${cs.cardBorder}`, background: 'white', color: cs.accentBorder, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                      >✏️</button>
                      <button
                        onClick={e => deleteFacility(e, facility)}
                        title="施設を削除"
                        style={{ fontSize: 10, padding: '1px 4px', borderRadius: 4, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                      >🗑️</button>
                    </div>
                  )}
                </div>

                {/* ── チーム＆患者エリア ── */}
                <div style={{ padding: '5px 6px 4px' }}>
                  {(facility.om_teams ?? []).map(team => {
                    const isOpen = openTeams[team.id] !== false
                    const patients = sortPatients(team.om_patients, sort)
                    const hasPatients = patients.length > 0

                    return (
                      <div
                        key={team.id}
                        style={{
                          marginBottom: 4,
                          borderRadius: 6,
                          border: `1px solid ${cs.teamBorder}`,
                          background: 'white',
                          overflow: 'hidden',
                        }}
                      >
                        {isHomeCare ? (
                          /* ─── 個人在宅：設定行 ─── */
                          editTeamId === team.id ? (
                            <div style={{ padding: '8px', background: '#f0fdf4' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 8 }}>
                                ⚙️ 在宅処方設定
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                                <div>
                                  <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>処方日数</div>
                                  <input
                                    type="number"
                                    value={editTeamRxDays}
                                    onChange={e => setEditTeamRxDays(e.target.value)}
                                    min={1} max={90}
                                    autoFocus
                                    style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: 9, color: '#16a34a', marginBottom: 2 }}>処方ズレ日数</div>
                                  <input
                                    type="number"
                                    value={editTeamGraceDays}
                                    onChange={e => setEditTeamGraceDays(e.target.value)}
                                    min={0} max={14}
                                    style={{ width: '100%', fontSize: 11, border: '1.5px solid #86efac', borderRadius: 4, padding: '3px 6px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                                  />
                                </div>
                              </div>
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
                            /* 個人在宅 コンパクト操作行 */
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              padding: '5px 8px',
                              background: '#f0fdf4',
                              borderBottom: hasPatients ? `1px solid ${cs.teamBorder}` : 'none',
                            }}>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#16a34a', flex: 1, minWidth: 0 }}>
                                🏠 在宅患者
                                {team.pharmacist_name && (
                                  <span style={{ fontSize: 9, color: '#4ade80', fontWeight: 400, marginLeft: 6 }}>
                                    👤 {team.pharmacist_name}
                                  </span>
                                )}
                              </span>
                              <button
                                onClick={e => startEditTeam(e, team, true)}
                                title="処方設定を編集"
                                style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, border: '1px solid #86efac', background: 'white', color: '#16a34a', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                              >⚙️</button>
                              <button
                                onClick={e => deleteTeam(e, team)}
                                title="在宅を削除"
                                style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                              >🗑️</button>
                            </div>
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
                              style={{
                                fontSize: 10, fontWeight: 700,
                                color: selectedTeamId === team.id ? 'var(--sky-800)' : 'var(--sky-700)',
                                padding: '5px 8px',
                                background: selectedTeamId === team.id ? 'var(--sky-100)' : 'var(--sky-50)',
                                borderBottom: (isOpen && hasPatients) ? '1px solid var(--sky-100)' : 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                cursor: 'pointer',
                              }}
                            >
                              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                🏥 {team.clinic_name} {team.team_name}
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                                {team.visit_schedule_custom && (
                                  <span style={{ fontSize: 9, color: 'var(--sky-400)', fontWeight: 400 }}>
                                    {team.visit_schedule_custom}
                                  </span>
                                )}
                                <button
                                  onClick={e => startEditTeam(e, team, false)}
                                  title="チームを編集"
                                  style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                >✏️</button>
                                <button
                                  onClick={e => deleteTeam(e, team)}
                                  title="チームを削除"
                                  style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                                >🗑️</button>
                              </div>
                            </div>
                          )
                        )}

                        {/* 患者リスト（チームブロック内にインデント） */}
                        {(isHomeCare || isOpen) && (
                          <div style={{ padding: '4px 6px 3px 14px' }}>
                            {patients.map(p => renderPatientRow(p, team))}
                            {!(isHomeCare && hasPatients) && (
                              <div
                                onClick={() => setAddPatientTeamId(team.id)}
                                className="add-link"
                                style={{
                                  fontSize: 10, color: cs.patientAddColor,
                                  padding: '3px 4px', cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: 4,
                                }}
                              >
                                ＋ 患者を追加
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
                      style={{
                        fontSize: 10, color: cs.addLinkColor,
                        padding: '3px 6px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 4,
                      }}
                    >
                      ＋ チームを追加
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div
            onClick={() => setShowAddFacility(true)}
            className="add-link"
            style={{ fontSize: 10, color: 'var(--sky-400)', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🏠 ＋ 施設 / 個人在宅を追加
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
    </>
  )
}
