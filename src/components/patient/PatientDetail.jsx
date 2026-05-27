import { useState } from 'react'
import BasicInfoTab from './BasicInfoTab'
import DrugsTab from './DrugsTab'
import ChangeLogTab from './ChangeLogTab'
import FreeMemoTab from './FreeMemoTab'
import { usePatient } from '../../hooks/useData'

// ① タブ順序：基本情報 → フリーメモ → 変更ログ → 外用・頓用薬
const TABS = [
  { key: 'basic', label: '📋 基本情報' },
  { key: 'free',  label: '📄 フリーメモ' },
  { key: 'log',   label: '📝 変更ログ' },
  { key: 'drugs', label: '💊 外用・頓用薬' },
]

// ── 日付ヘルパー ─────────────────────────────────────────
function fmtMMDD(dateStr) {
  if (!dateStr) return ''
  const [, mm, dd] = dateStr.split('-')
  return `${mm}/${dd}`
}

export default function PatientDetail({ patientId, visitCalc }) {
  const [activeTab, setActiveTab] = useState('basic')
  const [copied, setCopied] = useState(false)
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

  // ⑥ 患者テキストコピー
  const copyPatientText = async () => {
    const logs = [...(patient?.om_change_logs ?? [])].sort((a, b) =>
      new Date(b.changed_at) - new Date(a.changed_at)
    )
    const drugs = patient?.om_drugs ?? []
    const otherVisits = patient?.other_visits ?? []

    const formatLog = (log) => {
      const reason = log.reason?.trim() || '指示受け'
      const instrD = fmtMMDD(log.changed_at)
      if (log.start_date) {
        const startD = fmtMMDD(log.start_date)
        return `${instrD}　${reason}\n${startD}〜　${log.content}`
      }
      return `${instrD}　${log.content}`
    }

    let text = `${'═'.repeat(28)}\n`
    text += `往診資料　${patient.room_number}${patient.initial ? '　' + patient.initial : ''}\n`
    text += `${'═'.repeat(28)}\n`

    if (patient.medical_history)
      text += `\n【病歴・既往歴】\n${patient.medical_history}\n`
    if (patient.allergy_history)
      text += `\n【アレルギー歴】\n${patient.allergy_history}\n`
    if (patient.hospitalization_history)
      text += `\n【入院歴】\n${patient.hospitalization_history}\n`

    if (logs.length > 0) {
      text += `\n【変更ログ】\n`
      text += logs.map(formatLog).join('\n\n')
      text += '\n'
    }

    if (drugs.length > 0) {
      text += `\n【外用・頓用薬】\n`
      text += drugs.map(d => {
        const type = d.drug_type === 'gaiyou' ? '外用' : '頓用'
        let line = `・${d.drug_name}（${type}）`
        if (d.description) line += `　${d.description}`
        if (d.last_confirmed_at) line += `　✅確認：${d.last_confirmed_at}`
        return line
      }).join('\n')
      text += '\n'
    }

    if (patient.free_memo)
      text += `\n【フリーメモ】\n${patient.free_memo}\n`

    if (otherVisits.length > 0) {
      text += `\n【他科受診スケジュール】\n`
      text += otherVisits.map(v => {
        let line = `・${v.hospital}`
        if (v.department)       line += ` / ${v.department}`
        if (v.dispensing_date)  line += `　調剤：${v.dispensing_date}`
        if (v.medication_timing) line += `　服用：${v.medication_timing}`
        if (v.next_visit_date)  line += `　次回：${v.next_visit_date}`
        return line
      }).join('\n')
      text += '\n'
    }

    await navigator.clipboard.writeText(text.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      {/* 患者ヘッダー */}
      <div className="patient-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--sky-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {patient.room_number}
          {patient.initial && <span style={{ color: 'var(--sky-600)' }}>{patient.initial}</span>}
        </div>
        <div className="patient-actions" style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn btn-sm ${copied ? 'btn-outline' : 'btn-outline'}`}
            onClick={copyPatientText}
          >
            {copied ? '✅ コピー済' : '📋 テキストコピー'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ 印刷</button>
        </div>
      </div>

      {/* タブ */}
      <div className="tabs" style={{
        display: 'flex', gap: 2, background: 'var(--sky-100)',
        borderRadius: 10, padding: 3, marginBottom: 16,
        flexWrap: 'wrap',
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '7px 12px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
              border: 'none', fontFamily: 'inherit', transition: 'all 0.15s',
              background: activeTab === t.key ? 'white' : 'none',
              color: activeTab === t.key ? 'var(--sky-800)' : 'var(--sky-600)',
              fontWeight: activeTab === t.key ? 700 : 500,
              boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
              flex: '1 1 auto', whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="tab-content">
        {activeTab === 'basic' && <BasicInfoTab patient={patient} onSaved={refetch} />}
        {activeTab === 'free'  && <FreeMemoTab  patient={patient} onRefetch={refetch} />}
        {activeTab === 'log'   && <ChangeLogTab  patient={patient} visitCalc={visitCalc} onRefetch={refetch} />}
        {activeTab === 'drugs' && <DrugsTab      patient={patient} onRefetch={refetch} />}
      </div>

      {/* 印刷用：全タブコンテンツ */}
      <div className="print-all-tabs" style={{ display: 'none' }}>
        <div className="print-section"><BasicInfoTab patient={patient} onSaved={() => {}} /></div>
        <div className="print-section"><ChangeLogTab patient={patient} visitCalc={visitCalc} onRefetch={() => {}} /></div>
        <div className="print-section"><DrugsTab patient={patient} onRefetch={() => {}} /></div>
        <div className="print-section"><FreeMemoTab patient={patient} onRefetch={() => {}} /></div>
      </div>
    </div>
  )
}
