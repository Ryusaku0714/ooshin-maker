import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFacilities } from './hooks/useData'
import Login from './components/auth/Login'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import VisitBanner from './components/layout/VisitBanner'
import PatientDetail from './components/patient/PatientDetail'

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const { facilities, loading: facLoading, refetch } = useFacilities()

  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [visitCalc, setVisitCalc] = useState(null)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'detail'

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--sky-600)' }}>
        読み込み中…
      </div>
    )
  }

  if (!user) {
    return <Login onLogin={signInWithGoogle} />
  }

  // 選択中チームを特定
  const selectedTeam = facilities
    .flatMap(f => f.teams ?? [])
    .find(t => t.id === selectedTeamId) ?? null

  const handleSelectPatient = (id) => {
    setSelectedPatientId(id)
    setMobileView('detail')
  }

  const handleSelectTeam = (id) => {
    setSelectedTeamId(id)
  }

  return (
    <>
      <Navbar user={user} onSignOut={signOut} />

      {/* モバイルタブ */}
      <div
        style={{
          display: 'none', background: 'var(--sky-800)',
          padding: '8px 12px', gap: 6, flexShrink: 0,
        }}
        className="mobile-tabs-bar"
      >
        {[
          { v: 'list', l: '👥 患者一覧' },
          { v: 'detail', l: '📋 詳細' },
        ].map(o => (
          <button
            key={o.v}
            onClick={() => setMobileView(o.v)}
            style={{
              flex: 1, padding: 8, borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none', fontFamily: 'inherit', cursor: 'pointer',
              background: mobileView === o.v ? 'white' : 'rgba(255,255,255,0.15)',
              color: mobileView === o.v ? 'var(--sky-800)' : 'white',
            }}
          >{o.l}</button>
        ))}
      </div>

      <div className="layout" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', flex: 1, overflow: 'hidden' }}>

        {/* サイドバー */}
        <div
          id="mobileSidebar"
          className="sidebar"
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--sky-100)', borderRight: '1px solid var(--sky-200)' }}
        >
          {facLoading ? (
            <div style={{ padding: 20, color: 'var(--gray-400)', fontSize: 12 }}>読み込み中…</div>
          ) : (
            <Sidebar
              facilities={facilities}
              selectedPatientId={selectedPatientId}
              selectedTeamId={selectedTeamId}
              onSelectPatient={handleSelectPatient}
              onSelectTeam={handleSelectTeam}
              onRefetch={refetch}
            />
          )}
        </div>

        {/* メインエリア */}
        <div id="mobileMain" className="main" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* 往診設定バナー */}
          <VisitBanner team={selectedTeam} onVisitCalcChange={setVisitCalc} />

          {/* 患者詳細 */}
          <PatientDetail patientId={selectedPatientId} visitCalc={visitCalc} />
        </div>
      </div>

      {/* モバイル対応スタイル */}
      <style>{`
        @media (max-width: 768px) {
          .layout { grid-template-columns: 1fr !important; }
          .mobile-tabs-bar { display: flex !important; }
          #mobileSidebar {
            display: ${mobileView === 'list' ? 'flex' : 'none'} !important;
            min-height: 0; max-height: 100%;
          }
          #mobileMain {
            display: ${mobileView === 'detail' ? 'flex' : 'none'} !important;
          }
        }
      `}</style>
    </>
  )
}
