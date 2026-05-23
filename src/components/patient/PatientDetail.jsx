import { useState } from 'react'
import BasicInfoTab from './BasicInfoTab'
import DrugsTab from './DrugsTab'
import ChangeLogTab from './ChangeLogTab'
import FreeMemoTab from './FreeMemoTab'
import { usePatient } from '../../hooks/useData'

const TABS = [
  { key: 'basic', label: '📋 基本情報' },
  { key: 'drugs', label: '💊 外用・頓用薬' },
  { key: 'log',   label: '📝 変更ログ' },
  { key: 'free',  label: '📄 フリーメモ' },
]

export default function PatientDetail({ patientId, visitCalc }) {
  const [activeTab, setActiveTab] = useState('basic')
  const { patient, loading, refetch } = usePatient(patientId)

  if (!patientId) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)', flexDirection: 'column', gap: 8 }}>
        <span style={{ fontSize: 40 }}>👆</span>
        <span style={{ fontSize: 13 }}>左の患者一覧から患者を選択してください</span>
      </div>
    )
  }

  if (loading) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>読み込み中…</div>
  }

  if (!patient) {
    return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray-400)' }}>患者が見つかりません</div>
  }

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      {/* 患者ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--sky-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {patient.room_number}
          {patient.initial && <span style={{ color: 'var(--sky-600)' }}>{patient.initial}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => window.print()}>🖨️ 印刷</button>
        </div>
      </div>

      {/* タブ */}
      <div style={{
        display: 'flex', gap: 2, background: 'var(--sky-100)',
        borderRadius: 10, padding: 3, marginBottom: 16, width: 'fit-content',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '7px 14px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
              border: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
              background: activeTab === t.key ? 'white' : 'none',
              color: activeTab === t.key ? 'var(--sky-800)' : 'var(--sky-600)',
              fontWeight: activeTab === t.key ? 700 : 500,
              boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* タブコンテンツ */}
      {activeTab === 'basic' && <BasicInfoTab patient={patient} onSaved={refetch} />}
      {activeTab === 'drugs' && <DrugsTab patient={patient} visitCalc={visitCalc} onRefetch={refetch} />}
      {activeTab === 'log'   && <ChangeLogTab patient={patient} onRefetch={refetch} />}
      {activeTab === 'free'  && <FreeMemoTab patient={patient} onRefetch={refetch} />}
    </div>
  )
}
