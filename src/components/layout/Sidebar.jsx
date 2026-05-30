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
  const [editTeamClinic,     setEditTeamClinic]     = useState('')
  const [editTeamName,       setEditTeamName]       = useState('')
  const [editTeamVisitNotes, setEditTeamVisitNotes] = useState('')

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

  const startEditTeam = (e, team) => {
    e.stopPropagation()
    setEditTeamId(team.id)
    setEditTeamClinic(team.clinic_name)
    setEditTeamName(team.team_name)
    setEditTeamVisitNotes(team.visit_schedule_custom ?? '')
  }
  const saveTeamName = async (id) => {
    if (!editTeamClinic.trim() || !editTeamName.trim()) { setEditTeamId(null); return }
    await db.updateTeam(id, {
      clinic_name: editTeamClinic.trim(),
      team_name: editTeamName.trim(),
      visit_schedule_custom: editTeamVisitNotes.trim(),
    })
    setEditTeamId(null)
    onRefetch()
  }

  // ③ チーム削除
  const deleteTeam = async (e, team) => {
    e.stopPropagation()
    if (!confirm(`「${team.clinic_name} ${team.team_name}」を削除しますか？\n患者データ・変更記録・外用頓用薬もすべて削除されます。`)) return
    await db.deleteTeam(team.id)
    if (selectedTeamId === team.id) onSelectTeam(null)
    onRefetch()
  }

  // ③ 患者削除
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

  return (
    <>
      <div className="sidebar">
        {/* Header */}
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

        {/* Scroll area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 8px' }}>
          {facilities.map(facility => (
            <div key={facility.id} style={{ marginBottom: 12 }}>

              {/* ② 施設ラベル */}
              <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--sky-400)', paddingLeft: 8, paddingTop: 2, letterSpacing: '0.05em' }}>
                🏠 施設
              </div>

              {/* 施設名 */}
              {editFacId === facility.id ? (
                <div style={{ display: 'flex', gap: 4, padding: '4px 8px', alignItems: 'center' }}>
                  <input
                    value={editFacName}
                    onChange={e => setEditFacName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveFacilityName(facility.id); if (e.key === 'Escape') setEditFacId(null) }}
                    autoFocus
                    placeholder="施設名 / 個人在宅"
                    style={{
                      flex: 1, fontSize: 11, fontWeight: 700, color: 'var(--sky-700)',
                      border: '1.5px solid var(--sky-400)', borderRadius: 4,
                      padding: '2px 6px', fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                  <button
                    onClick={() => saveFacilityName(facility.id)}
                    style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: 'none', background: 'var(--sky-600)', color: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                  >✅</button>
                  <button
                    onClick={() => setEditFacId(null)}
                    style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, border: '1px solid var(--gray-200)', background: 'white', cursor: 'pointer', fontFamily: 'inherit' }}
                  >✕</button>
                </div>
              ) : (
                <div style={{
                  fontSize: 11, fontWeight: 700, color: 'var(--sky-700)',
                  padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ flex: 1 }}>🏠 {facility.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); printFacilityLogs(facility) }}
                    title="変更記録一括印刷"
                    style={{ fontSize: 11, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >🖨️</button>
                  <button
                    onClick={e => startEditFacility(e, facility)}
                    title="施設名を編集"
                    style={{ fontSize: 11, padding: '1px 5px', borderRadius: 4, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                  >✏️</button>
                </div>
              )}

              {(facility.om_teams ?? []).map(team => {
                const isOpen = openTeams[team.id] !== false // default open
                const patients = sortPatients(team.om_patients, sort)
                return (
                  <div key={team.id} style={{ marginBottom: 6 }}>

                    {/* ② 往診チームラベル */}
                    <div style={{ fontSize: 9, fontWeight: 600, color: 'var(--sky-500)', paddingLeft: 14, letterSpacing: '0.05em' }}>
                      往診チーム
                    </div>

                    {/* チーム名 */}
                    {editTeamId === team.id ? (
                      <div style={{ padding: '4px 8px' }}>
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
                          fontSize: 10, fontWeight: 700, color: 'var(--sky-600)',
                          padding: '4px 8px',
                          background: selectedTeamId === team.id ? 'var(--sky-200)' : 'var(--sky-50)',
                          borderRadius: 6, marginBottom: 2,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          cursor: 'pointer', border: '1px solid var(--sky-200)',
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🏥 {team.clinic_name} {team.team_name}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          {team.visit_schedule_custom && (
                            <span style={{ fontSize: 9, color: 'var(--sky-500)', fontWeight: 400 }}>
                              {team.visit_schedule_custom}
                            </span>
                          )}
                          <button
                            onClick={e => startEditTeam(e, team)}
                            title="チームを編集"
                            style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid var(--sky-200)', background: 'white', color: 'var(--sky-600)', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                          >✏️</button>
                          {/* ③ チーム削除 */}
                          <button
                            onClick={e => deleteTeam(e, team)}
                            title="チームを削除"
                            style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid #fca5a5', background: 'white', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                          >🗑️</button>
                        </div>
                      </div>
                    )}

                    {isOpen && (
                      <div style={{ paddingLeft: 6 }}>
                        {patients.map(p => (
                          <div
                            key={p.id}
                            style={{
                              fontSize: 11, color: selectedPatientId === p.id ? 'white' : 'var(--sky-700)',
                              padding: '4px 8px', borderRadius: 6,
                              background: selectedPatientId === p.id ? 'var(--sky-600)' : 'transparent',
                              fontWeight: selectedPatientId === p.id ? 600 : 400,
                              display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1,
                              transition: 'background 0.1s',
                            }}
                          >
                            <div
                              onClick={() => { onSelectPatient(p.id); onSelectTeam(team.id) }}
                              style={{ flex: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                            >
                              👤 {p.room_number}{p.initial ? `　${p.initial}` : ''}
                            </div>
                            {/* ③ 患者削除 */}
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
                        ))}
                        <div
                          onClick={() => setAddPatientTeamId(team.id)}
                          className="add-link"
                          style={{ fontSize: 10, color: 'var(--sky-400)', padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          ＋ 患者を追加
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              <div
                onClick={() => setAddTeamFacilityId(facility.id)}
                className="add-link"
                style={{ fontSize: 10, color: 'var(--sky-400)', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                ＋ チームを追加
              </div>
            </div>
          ))}

          <div
            onClick={() => setShowAddFacility(true)}
            className="add-link"
            style={{ fontSize: 10, color: 'var(--sky-400)', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          >
            🏠 ＋ 施設を追加
          </div>

          <LegalFooter />
        </div>
      </div>

      {showAddFacility && (
        <AddFacilityModal onClose={() => setShowAddFacility(false)} onSaved={onRefetch} />
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
