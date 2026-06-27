import { useState, useRef } from 'react'
import { useAuth } from './hooks/useAuth'
import { useFacilities } from './hooks/useData'
import Login from './components/auth/Login'
import Navbar from './components/layout/Navbar'
import Sidebar from './components/layout/Sidebar'
import VisitBanner from './components/layout/VisitBanner'
import PatientDetail from './components/patient/PatientDetail'
import ZanyakuKasanInfo from './components/modals/ZanyakuKasanInfo'

function InfoModal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,31,78,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 300, padding: 16,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white', borderRadius: 12, padding: 0,
        width: '90%', maxWidth: 480, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 40px rgba(15,31,78,0.2)',
        overflow: 'hidden',
      }}>
        <div style={{
          background: '#0f1f4e', borderBottom: '2px solid #c9a84c',
          padding: '14px 20px', borderRadius: '12px 12px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0,
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
            {title}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, fontFamily: 'inherit' }}
          >✕</button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const { facilities, loading: facLoading, refetch } = useFacilities()

  const [selectedPatientId, setSelectedPatientId] = useState(null)
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [visitCalc, setVisitCalc] = useState(null)
  const [mobileView, setMobileView] = useState('list') // 'list' | 'detail'
  const [showGuide,   setShowGuide]   = useState(false)
  const [showZanyaku, setShowZanyaku] = useState(false)

  // 未保存変更の追跡（PatientDetail から通知される）
  const isDirtyRef = useRef(false)

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

  // 選択中患者を特定し、個別設定（custom_days / custom_offset）がONなら上部バーへ伝える
  const selectedPatient = facilities
    .flatMap(f => f.om_teams ?? [])
    .flatMap(t => t.om_patients ?? [])
    .find(p => p.id === selectedPatientId) ?? null

  const patientOverride = (selectedPatient?.custom_days != null && selectedPatient?.custom_offset != null)
    ? { rxDays: selectedPatient.custom_days, graceDays: selectedPatient.custom_offset }
    : null

  const handleSelectPatient = (id) => {
    if (isDirtyRef.current && id !== selectedPatientId) {
      if (!window.confirm('保存されていない変更があります。\nこの患者から移動してよいですか？（変更は保存されません）')) {
        return
      }
    }
    isDirtyRef.current = false
    setSelectedPatientId(id)
    setMobileView('detail')
  }

  const handleSelectTeam = (id) => {
    setSelectedTeamId(id)
  }

  return (
    <>
      <Navbar
        user={user}
        onSignOut={signOut}
        onOpenZanyaku={() => setShowZanyaku(true)}
      />

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
          style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#ffffff', borderRight: '1px solid #dce4f0' }}
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
          <VisitBanner team={selectedTeam} patientOverride={patientOverride} onVisitCalcChange={setVisitCalc} />

          {/* 患者詳細 */}
          <PatientDetail
            patientId={selectedPatientId}
            visitCalc={visitCalc}
            onDirtyChange={d => { isDirtyRef.current = d }}
          />
        </div>
      </div>

      {/* ヘルプボタン（固定） */}
      <button
        onClick={() => setShowGuide(true)}
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

      {/* 使い方ガイドモーダル */}
      {showGuide && (
        <InfoModal title="📘 使い方ガイド" onClose={() => setShowGuide(false)}>
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
                background: '#0f1f4e', color: 'white',
                borderRadius: 8, padding: '4px 0', fontSize: 10, fontWeight: 700,
                lineHeight: 1.4,
              }}>
                {step}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f4e', marginBottom: 3 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>{body}</div>
              </div>
            </div>
          ))}
          <div style={{
            background: '#f1f5fb', border: '1px solid #dce4f0',
            borderRadius: 10, padding: '10px 14px',
            fontSize: 12, color: '#1e3a8a', lineHeight: 1.7,
          }}>
            💡 完璧に埋めなくてOK！まず一覧を作るだけで十分使えます。
          </div>
        </InfoModal>
      )}

      {/* 加算確認モーダル */}
      {showZanyaku && (
        <InfoModal title="💊 加算確認" onClose={() => setShowZanyaku(false)}>
          <ZanyakuKasanInfo />
        </InfoModal>
      )}

      {/* ④ モバイル対応スタイル */}
      <style>{`
        @media (max-width: 768px) {
          .layout {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 !important;
            overflow: hidden !important;
            min-height: 0 !important;
          }
          .mobile-tabs-bar { display: flex !important; }
          #mobileSidebar {
            display: ${mobileView === 'list' ? 'flex' : 'none'} !important;
            overflow: hidden !important;
            flex: 1 !important;
            min-height: 0 !important;
          }
          #mobileMain {
            display: ${mobileView === 'detail' ? 'flex' : 'none'} !important;
            overflow: hidden !important;
            flex: 1 !important;
            min-height: 0 !important;
          }
          .main {
            overflow: hidden !important;
            flex: 1 !important;
            min-height: 0 !important;
          }
          .main-scroll {
            overflow-y: auto !important;
            flex: 1 !important;
            min-height: 0 !important;
          }
        }
      `}</style>
    </>
  )
}
