import { useState } from 'react'
import BasicInfoTab    from './BasicInfoTab'
import DrugsTab        from './DrugsTab'
import ChangeLogTab    from './ChangeLogTab'
import FreeMemoTab     from './FreeMemoTab'
import OtherVisitsTab  from './OtherVisitsTab'
import { usePatient }  from '../../hooks/useData'

// タブ順序：基本情報 → 変更ログ → 外用・頓用薬 → 他科受診 → フリーメモ
const TABS = [
  { key: 'basic',  label: '📋 基本情報' },
  { key: 'log',    label: '📝 日数計算・変更記録' },
  { key: 'drugs',  label: '💊 外用・頓用薬' },
  { key: 'visit',  label: '🏥 他科受診' },
  { key: 'free',   label: '📄 フリーメモ' },
]

function fmtMMDD(dateStr) {
  if (!dateStr) return ''
  const [, mm, dd] = dateStr.split('-')
  return `${mm}/${dd}`
}

function sliceDate(val) { return val ? String(val).slice(0, 10) : '' }
function isUnconfirmedDrug(d) {
  const ninety = new Date()
  ninety.setDate(ninety.getDate() - 90)
  const ref = d.last_confirmed_at || d.prescribed_at
  if (!ref) return true
  return new Date(sliceDate(ref)) < ninety
}

function generatePatientMonthHTML(patient, logs) {
  const logsHTML = logs.map(log => {
    const reason = log.reason?.trim() || '指示受け'
    const instrDate = fmtMMDD(log.changed_at)
    const startDate = log.start_date ? fmtMMDD(log.start_date) : null
    return `<div class="log-entry">
      <div class="log-date">${instrDate}　${reason}</div>
      ${startDate
        ? `<div><strong>${startDate}〜</strong>　${log.content}</div>`
        : `<div>${log.content}</div>`}
    </div>`
  }).join('')

  const title = `変更記録（直近1ヶ月）- ${patient.room_number}${patient.initial ? '　' + patient.initial : ''}`
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; font-size: 12px; padding: 20px; color: #0f172a; }
    h1 { font-size: 15px; font-weight: 700; border-bottom: 2px solid #075985; padding-bottom: 8px; margin-bottom: 16px; color: #075985; }
    .log-entry { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0f2fe; }
    .log-date { font-weight: 700; color: #0284c7; margin-bottom: 3px; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${logsHTML || '<p style="color:#94a3b8;">直近1ヶ月の変更記録はありません</p>'}
</body>
</html>`
}

export default function PatientDetail({ patientId, visitCalc }) {
  const [activeTab, setActiveTab] = useState('basic')
  const [copied, setCopied]       = useState(false)
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

  // テキストコピー
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
      text += `\n【変更記録】\n`
      text += logs.map(formatLog).join('\n\n')
      text += '\n'
    }

    const activeDrugs = drugs.filter(d => !d.is_archived)
    if (activeDrugs.length > 0) {
      text += `\n【外用・頓用薬】\n`
      text += activeDrugs.map(d => {
        const type = d.drug_type === 'gaiyou' ? '外用' : '頓用'
        let line = `・${d.drug_name}（${type}）`
        if (d.prescribed_quantity) line += `　${d.prescribed_quantity}`
        if (d.remaining_quantity)  line += `　残：${d.remaining_quantity}`
        if (d.description)         line += `　${d.description}`
        const cd = sliceDate(d.last_confirmed_at)
        if (cd) line += `　✅確認：${cd}`
        if (isUnconfirmedDrug(d)) line += `　⚠️未確認`
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
        if (v.department) line += ` / ${v.department}`
        const from = v.dispensing_from ?? v.dispensing_date ?? ''
        const to   = v.dispensing_to ?? ''
        if (from && to)  line += `　調剤：${from}〜${to}`
        else if (from)   line += `　調剤：${from}〜`
        else if (to)     line += `　調剤：〜${to}`
        if (v.medication_timing) {
          const PREV = { '朝': '眠前', '昼': '朝', '夕': '昼', '眠前': '夕' }
          const endT = v.medication_timing_end || (PREV[v.medication_timing] ?? '')
          line += `　服用：${v.medication_timing}〜${endT}`
        }
        if (v.next_visit_date)   line += `　次回：${v.next_visit_date}`
        if (v.notes)             line += `　備考：${v.notes}`
        return line
      }).join('\n')
      text += '\n'
    }

    await navigator.clipboard.writeText(text.trim())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 患者の直近1ヶ月分変更ログを別ウィンドウで印刷
  const printPatientMonth = () => {
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
    const allLogs = [...(patient?.om_change_logs ?? [])].sort((a, b) =>
      new Date(b.changed_at) - new Date(a.changed_at)
    )
    const recentLogs = allLogs.filter(l => new Date(l.changed_at) >= oneMonthAgo)
    const html = generatePatientMonthHTML(patient, recentLogs)
    const w = window.open('', '_blank', 'width=800,height=600')
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 300)
  }

  return (
    <div className="main-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 52px' }}>
      {/* 患者ヘッダー */}
      <div className="patient-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--sky-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
          {patient.room_number}
          {patient.initial && <span style={{ color: 'var(--sky-600)' }}>{patient.initial}</span>}
        </div>
        <div className="patient-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn-outline btn-sm"
            onClick={copyPatientText}
          >
            {copied ? '✅ コピー済' : '📋 テキストコピー'}
          </button>
          <button className="btn btn-outline btn-sm" onClick={printPatientMonth}>🖨️ 1ヶ月分</button>
          <button className="btn btn-primary btn-sm" onClick={() => window.print()}>🖨️ 全体印刷</button>
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
              padding: '7px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
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
        {activeTab === 'basic'  && <BasicInfoTab   patient={patient} onSaved={refetch} />}
        {activeTab === 'log'    && <ChangeLogTab   patient={patient} visitCalc={visitCalc} onRefetch={refetch} />}
        {activeTab === 'drugs'  && <DrugsTab       patient={patient} onRefetch={refetch} />}
        {activeTab === 'visit'  && <OtherVisitsTab patient={patient} onRefetch={refetch} />}
        {activeTab === 'free'   && <FreeMemoTab    patient={patient} onRefetch={refetch} />}
      </div>

      {/* 印刷用：全タブコンテンツ */}
      <div className="print-all-tabs" style={{ display: 'none' }}>
        <div className="print-section"><BasicInfoTab   patient={patient} onSaved={() => {}} /></div>
        <div className="print-section"><ChangeLogTab   patient={patient} visitCalc={visitCalc} onRefetch={() => {}} /></div>
        <div className="print-section"><DrugsTab       patient={patient} onRefetch={() => {}} /></div>
        <div className="print-section"><OtherVisitsTab patient={patient} onRefetch={() => {}} /></div>
        <div className="print-section"><FreeMemoTab    patient={patient} onRefetch={() => {}} /></div>
      </div>
    </div>
  )
}
