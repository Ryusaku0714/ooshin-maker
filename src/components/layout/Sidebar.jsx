import { useState } from 'react'
import AddFacilityModal from '../modals/AddFacilityModal'
import AddTeamModal from '../modals/AddTeamModal'
import AddPatientModal from '../modals/AddPatientModal'

const SORT_OPTIONS = [
  { key: 'room', label: '部屋順' },
  { key: 'kana', label: '五十音' },
  { key: 'recent', label: '最近' },
]

function sortPatients(patients, sort) {
  if (!patients) return []
  const arr = [...patients]
  if (sort === 'room')   return arr.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
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

  const toggleTeam = (teamId) => {
    setOpenTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }))
    onSelectTeam(teamId)
  }

  return (
    <>
      <div className="sidebar">
        {/* Header */}
        <div style={{
          padding: '12px', borderBottom: '1px solid var(--sky-200)', flexShrink: 0,
        }}>
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
        <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
          {facilities.map(facility => (
            <div key={facility.id} style={{ marginBottom: 12 }}>
              <div style={{
                fontSize: 11, fontWeight: 700, color: 'var(--sky-700)',
                padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🏠 {facility.name}
              </div>

              {(facility.teams ?? []).map(team => {
                const isOpen = openTeams[team.id] !== false // default open
                const patients = sortPatients(team.patients, sort)
                return (
                  <div key={team.id} style={{ marginBottom: 6 }}>
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
                      <span>🏥 {team.clinic_name} {team.team_name}</span>
                      <span style={{ fontSize: 9, color: 'var(--sky-500)', fontWeight: 400 }}>
                        {team.visit_schedule}
                      </span>
                    </div>
                    {isOpen && (
                      <div style={{ paddingLeft: 6 }}>
                        {patients.map(p => (
                          <div
                            key={p.id}
                            onClick={() => {
                              onSelectPatient(p.id)
                              onSelectTeam(team.id)
                              if (window.innerWidth <= 768) {
                                document.getElementById('mobileMain')?.classList.add('mobile-show')
                                document.getElementById('mobileSidebar')?.classList.remove('mobile-show')
                              }
                            }}
                            style={{
                              fontSize: 11, color: selectedPatientId === p.id ? 'white' : 'var(--sky-700)',
                              padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                              background: selectedPatientId === p.id ? 'var(--sky-600)' : 'transparent',
                              fontWeight: selectedPatientId === p.id ? 600 : 400,
                              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1,
                              transition: 'background 0.1s',
                            }}
                          >
                            👤 {p.room_number}{p.initial ? ` ${p.initial}` : ''}
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
        </div>
      </div>

      {showAddFacility && (
        <AddFacilityModal
          onClose={() => setShowAddFacility(false)}
          onSaved={onRefetch}
        />
      )}
      {addTeamFacilityId && (
        <AddTeamModal
          facilityId={addTeamFacilityId}
          onClose={() => setAddTeamFacilityId(null)}
          onSaved={onRefetch}
        />
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
