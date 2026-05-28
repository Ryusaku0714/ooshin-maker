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
  const [showHelp,   setShowHelp]   = useState(false)

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
    .flatMap(f => f.om_teams ?? [])
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

      {/* ④ モバイルタブバー */}
      <div
        style={{ display: 'none', background: 'var(--sky-800)', padding: '8px 12px', gap: 6, flexShrink: 0 }}
        className="mobile-tabs-bar"
      >
        {[
          { v: 'list',   l: '👥 患者一覧' },
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

      <div
        className="layout"
        style={{ display: 'grid', gridTemplateColumns: '240px 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}
      >

        {/* サイドバー */}
        <div
          id="mobileSidebar"
          className="sidebar-wrap"
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
        <div
          id="mobileMain"
          className="main"
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}
        >
          {/* 往診設定バナー */}
          <VisitBanner team={selectedTeam} onVisitCalcChange={setVisitCalc} />

          {/* 患者詳細 */}
          <PatientDetail patientId={selectedPatientId} visitCalc={visitCalc} />
        </div>
      </div>

      {/* ヘルプボタン（固定） */}
      <button
        onClick={() => setShowHelp(true)}
        style={{
          position: 'fixed', bottom: 20, right: 20, zIndex: 200,
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--sky-600)', color: 'white',
          border: 'none', fontSize: 20, fontWeight: 700,
          cursor: 'pointer', boxShadow: '0 4px 16px rgba(2,132,199,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit', transition: 'background 0.15s',
        }}
        onMouseOver={e => e.currentTarget.style.background = 'var(--sky-800)'}
        onMouseOut={e => e.currentTarget.style.background = 'var(--sky-600)'}
        title="使い方ガイド"
      >?</button>

      {/* ヘルプモーダル */}
      {showHelp && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, padding: 16,
          }}
          onClick={e => e.target === e.currentTarget && setShowHelp(false)}
        >
          <div style={{
            background: 'white', borderRadius: 16, padding: 24,
            width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sky-800)' }}>
                はじめての方へ
              </div>
              <button
                onClick={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--gray-400)', lineHeight: 1 }}
              >✕</button>
            </div>
            {[
              {
                step: 'STEP 1',
                title: '施設・チームを作る',
                body: '左の「＋施設を追加」から施設名を入力。続けてチーム名・往診日・処方日数を設定。',
              },
              {
                step: 'STEP 2',
                title: '患者一覧を作る',
                body: 'チームの中に「＋患者を追加」で部屋番号・イニシャルだけ入力してOK。詳細は往診しながら少しずつ埋めればOK。',
              },
              {
                step: 'STEP 3',
                title: '往診当日に記録する',
                body: '変更があった患者だけ変更記録を入力。コピペボタンで薬歴にそのまま貼れます。',
              },
              {
                step: 'STEP 4',
                title: '慣れてきたら',
                body: '外用薬・他科受診も登録していくと往診資料として完成度が上がります。',
              },
            ].map(({ step, title, body }) => (
              <div key={step} style={{
                display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-start',
              }}>
                <div style={{
                  flexShrink: 0, width: 56, textAlign: 'center',
                  background: 'var(--sky-600)', color: 'white',
                  borderRadius: 8, padding: '4px 0', fontSize: 10, fontWeight: 700,
                  lineHeight: 1.4,
                }}>
                  {step}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--sky-900)', marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.7 }}>{body}</div>
                </div>
              </div>
            ))}
            <div style={{
              background: 'var(--sky-50)', border: '1px solid var(--sky-100)',
              borderRadius: 10, padding: '10px 14px',
              fontSize: 12, color: 'var(--sky-800)', lineHeight: 1.7,
            }}>
              💡 完璧に埋めなくてOK！まず一覧を作るだけで十分使えます。
            </div>
          </div>
        </div>
      )}

      {/* ④ モバイル対応スタイル */}
      <style>{`
        @media (max-width: 768px) {
          body { overflow: auto !important; height: auto !important; }
          .layout {
            grid-template-columns: 1fr !important;
            overflow: visible !important;
            flex: none !important;
          }
          .mobile-tabs-bar { display: flex !important; }
          #mobileSidebar {
            display: ${mobileView === 'list' ? 'flex' : 'none'} !important;
            min-height: 300px;
            max-height: 60vh;
          }
          #mobileMain {
            display: ${mobileView === 'detail' ? 'flex' : 'none'} !important;
            overflow: visible !important;
            min-height: 0;
          }
          .main {
            overflow: visible !important;
          }
          .main-scroll {
            overflow: visible !important;
          }
        }
      `}</style>
    </>
  )
}
