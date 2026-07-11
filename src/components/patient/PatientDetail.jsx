import { useState, useRef, useEffect } from 'react'
import BasicInfoTab    from './BasicInfoTab'
import DrugsTab        from './DrugsTab'
import ChangeLogTab    from './ChangeLogTab'
import FreeMemoTab     from './FreeMemoTab'
import OtherVisitsTab  from './OtherVisitsTab'
import { usePatient }  from '../../hooks/useData'
import { fmtMMDD, formatChangeLogText } from '../../lib/changeLogFormat'
import { printWithAutoFit } from '../../lib/printFit'

// タブ順序：基本情報 → 変更ログ → 外用・頓用薬 → 他科受診 → フリーメモ
const TABS = [
  { key: 'basic',  label: '📋 基本情報' },
  { key: 'log',    label: '📝 日数計算・変更記録' },
  { key: 'drugs',  label: '💊 外用・頓用薬' },
  { key: 'visit',  label: '🏥 他科受診' },
  { key: 'free',   label: '📄 フリーメモ' },
]

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土']

// ボタン直下に常時表示する極小の説明ラベル
const ACTION_CAP_STYLE = { fontSize: 9, color: 'var(--gray-400)', lineHeight: 1, marginTop: 3, whiteSpace: 'nowrap' }
const ACTION_WRAP_STYLE = { display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }

function parseLocalDate(str) {
  if (!str) return null
  const [y, m, d] = str.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function pad2(n) { return String(n).padStart(2, '0') }

function fmtVisitCalcInfo(visitCalc) {
  if (!visitCalc?.visitDate) return ''
  const vDate = parseLocalDate(visitCalc.visitDate)
  const visitStr = `${vDate.getFullYear()}/${pad2(vDate.getMonth() + 1)}/${pad2(vDate.getDate())}（${DOW_JP[vDate.getDay()]}）`
  const start = new Date(vDate)
  start.setDate(start.getDate() + (visitCalc.graceDays ?? 0))
  const startStr = `${pad2(start.getMonth() + 1)}/${pad2(start.getDate())}（${DOW_JP[start.getDay()]}）`
  const end = parseLocalDate(visitCalc.rxEnd)
  const endStr = `${pad2(end.getMonth() + 1)}/${pad2(end.getDate())}（${DOW_JP[end.getDay()]}）`
  return `往診日：${visitStr}｜処方日数：${visitCalc.rxDays}日｜処方期間：${startStr}〜${endStr}`
}

function sliceDate(val) { return val ? String(val).slice(0, 10) : '' }
function isUnconfirmedDrug(d) {
  const ninety = new Date()
  ninety.setDate(ninety.getDate() - 90)
  const ref = d.last_confirmed_at || d.prescribed_at
  if (!ref) return true
  return new Date(sliceDate(ref)) < ninety
}

function generatePatientMonthHTML(patient, logs, visitCalc) {
  const logsHTML = logs.map(log => {
    if (log.log_type === 'temporary') {
      return `<div class="log-entry">
        <div><span class="log-badge-temp">臨時</span> ${formatChangeLogText(log)}</div>
      </div>`
    }
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
  const visitInfo = fmtVisitCalcInfo(visitCalc)
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; font-size: 12px; padding: 20px; color: #0f172a; }
    h1 { font-size: 15px; font-weight: 700; border-bottom: 2px solid #075985; padding-bottom: 8px; margin-bottom: 6px; color: #075985; }
    .vi { font-size: 10px; color: #475569; margin: 0 0 14px; }
    .log-entry { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0f2fe; }
    .log-date { font-weight: 700; color: #0284c7; margin-bottom: 3px; }
    .log-badge-temp {
      display: inline-block; font-size: 9px; font-weight: 700;
      padding: 2px 6px; border-radius: 10px;
      background: #fef3c7; color: #92400e; margin-right: 4px; vertical-align: middle;
    }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${visitInfo ? `<p class="vi">${visitInfo}</p>` : ''}
  ${logsHTML || '<p style="color:#94a3b8;">直近1ヶ月の変更記録はありません</p>'}
</body>
</html>`
}

// 現在表示中の外用・頓用薬一覧（DrugsTab既定の処方日順）を別ウィンドウで印刷
function generatePatientDrugsHTML(patient) {
  const drugs = [...(patient?.om_drugs ?? [])]
    .filter(d => !d.is_archived)
    .sort((a, b) => {
      const aDate = a.prescribed_at ? new Date(a.prescribed_at) : null
      const bDate = b.prescribed_at ? new Date(b.prescribed_at) : null
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return bDate - aDate
    })

  const drugsHTML = drugs.map(d => {
    const type = d.drug_type === 'gaiyou' ? '外用' : '頓用'
    const cd = sliceDate(d.last_confirmed_at)
    return `<div class="log-entry">
      <div class="log-date">${d.drug_name}　<span class="log-badge-temp" style="background:${type === '外用' ? '#e0f2fe' : '#fef3c7'};color:${type === '外用' ? '#0369a1' : '#92400e'};">${type}</span></div>
      <div>${[
        d.prescribed_quantity ? `数量：${d.prescribed_quantity}` : '',
        d.remaining_quantity  ? `残：${d.remaining_quantity}`   : '',
        d.description         || '',
        cd                    ? `✅確認：${cd}` : '',
        isUnconfirmedDrug(d)   ? '⚠️未確認'      : '',
      ].filter(Boolean).join('　')}</div>
    </div>`
  }).join('')

  const title = `外用・頓用薬一覧 - ${patient.room_number}${patient.initial ? '　' + patient.initial : ''}`
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Hiragino Sans', 'Noto Sans JP', sans-serif; font-size: 12px; padding: 20px; color: #0f172a; }
    h1 { font-size: 15px; font-weight: 700; border-bottom: 2px solid #075985; padding-bottom: 8px; margin-bottom: 14px; color: #075985; }
    .log-entry { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e0f2fe; }
    .log-date { font-weight: 700; color: #0284c7; margin-bottom: 3px; }
    .log-badge-temp {
      display: inline-block; font-size: 9px; font-weight: 700;
      padding: 2px 6px; border-radius: 10px;
      background: #fef3c7; color: #92400e; vertical-align: middle;
    }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  ${drugsHTML || '<p style="color:#94a3b8;">登録されている外用・頓用薬はありません</p>'}
</body>
</html>`
}

export default function PatientDetail({ patientId, visitCalc, onDirtyChange }) {
  const [activeTab, setActiveTab] = useState('basic')
  const [copied, setCopied]       = useState(false)
  const [showLogMenu, setShowLogMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [showPrintPicker, setShowPrintPicker] = useState(false)
  const [otherVisitPrefill, setOtherVisitPrefill] = useState(null)
  const [printSections, setPrintSections] = useState({
    basic: true, log: true, drugs: true, visit: true, free: true,
  })
  const togglePrintSection = (key) =>
    setPrintSections(s => ({ ...s, [key]: !s[key] }))
  const { patient, loading, refetch } = usePatient(patientId)

  // 未保存変更の追跡：コンポーネント名をキーに保持し、いずれかが dirty なら親へ通知
  const dirtySet = useRef(new Set())
  const reportDirty = (name, dirty) => {
    if (dirty) dirtySet.current.add(name)
    else dirtySet.current.delete(name)
    onDirtyChange?.(dirtySet.current.size > 0)
  }

  // 患者が切り替わったら dirty 状態とアクティブタブをリセット
  useEffect(() => {
    setActiveTab('basic')
    dirtySet.current.clear()
    onDirtyChange?.(false)
  }, [patientId])

  // 全体印刷で付与した印刷用クラス・縮小スケールを、印刷ダイアログを閉じた後に必ず元へ戻す
  useEffect(() => {
    const reset = () => {
      document.body.classList.remove('printing')
      document.documentElement.style.removeProperty('--print-scale')
    }
    window.addEventListener('afterprint', reset)
    return () => window.removeEventListener('afterprint', reset)
  }, [])

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
    const logs = [...(patient?.om_change_logs ?? [])]
      .filter(l => !l.is_archived)
      .sort((a, b) => new Date(b.changed_at) - new Date(a.changed_at))
    const drugs = patient?.om_drugs ?? []
    const otherVisits = patient?.other_visits ?? []

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
      text += logs.map(formatChangeLogText).join('\n\n')
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
    const recentLogs = allLogs.filter(l => !l.is_archived && new Date(l.changed_at) >= oneMonthAgo)
    const html = generatePatientMonthHTML(patient, recentLogs, visitCalc)
    const w = window.open('', '_blank', 'width=800,height=600')
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 300)
  }

  // 現在表示中の外用・頓用薬一覧を別ウィンドウで印刷
  const printPatientDrugs = () => {
    const html = generatePatientDrugsHTML(patient)
    const w = window.open('', '_blank', 'width=800,height=600')
    w.document.write(html)
    w.document.close()
    setTimeout(() => { w.focus(); w.print() }, 300)
  }

  // 1患者の全タブ情報を印刷：1ページに収まるようフォントサイズを自動縮小（最小10px、収まらない場合は自然に改ページ）
  const printFullPatient = () => printWithAutoFit('.print-all-tabs')

  return (
    <div className="main-scroll" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* 患者ヘッダー */}
      <div className="patient-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0, flexWrap: 'wrap', gap: 8, background: '#ffffff', borderBottom: '1px solid #dce4f0', borderLeft: '4px solid #0f1f4e', padding: '14px 20px', flexShrink: 0 }}>
        {/* 患者名（flex:1 で残スペースを占有し … ボタンを右端に押し出す） */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', minWidth: 0, flex: 1 }}>
          {patient.initial ? (
            <>
              <span style={{ fontSize: 13, fontWeight: 400, color: '#94a3b8' }}>{patient.room_number}</span>
              <span style={{ fontSize: 22, fontWeight: 700, color: '#0f1f4e' }}>{patient.initial}</span>
            </>
          ) : (
            <span style={{ fontSize: 22, fontWeight: 700, color: '#0f1f4e' }}>{patient.room_number}</span>
          )}
        </div>

        {/* スマホ版（≤768px）… ボタン：常に右端固定 */}
        <div className="patient-actions-mobile" style={{ position: 'relative', flexShrink: 0 }}>
          <button
            onClick={() => setShowMobileMenu(m => !m)}
            style={{
              background: 'white', border: '1.5px solid #dce4f0', borderRadius: 6,
              padding: '5px 10px', fontSize: 16, lineHeight: 1,
              cursor: 'pointer', color: '#64748b', fontFamily: 'inherit',
            }}
          >…</button>
          {showMobileMenu && (
            <>
              <div className="row-menu-overlay" onClick={() => setShowMobileMenu(false)} />
              <div className="row-menu" style={{ minWidth: 200 }}>
                <button className="team-menu-item" onClick={() => { setShowMobileMenu(false); copyPatientText() }}>
                  <span className="team-menu-item-label">📋 テキストコピー</span>
                  <span className="team-menu-item-desc">1患者情報全コピー</span>
                </button>
                <button className="team-menu-item" onClick={() => { setShowMobileMenu(false); printPatientMonth() }}>
                  <span className="team-menu-item-label">🖨️ 1ヶ月分</span>
                  <span className="team-menu-item-desc">直近1ヶ月変更ログ</span>
                </button>
                <button className="team-menu-item" onClick={() => { setShowMobileMenu(false); setShowPrintPicker(true) }}>
                  <span className="team-menu-item-label">🖨️ 全体印刷</span>
                  <span className="team-menu-item-desc">1患者情報印刷</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* PC版（≥769px）アクションボタン群 */}
        <div className="patient-actions" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={ACTION_WRAP_STYLE}>
            <button
              className="btn btn-sm"
              onClick={copyPatientText}
              style={{ background: 'white', color: '#64748b', border: '1.5px solid #dce4f0', borderRadius: 6 }}
            >
              {copied ? '✅ コピー済' : '📋 テキストコピー'}
            </button>
            <span style={ACTION_CAP_STYLE}>1患者情報全コピー</span>
          </span>
          <span style={{ ...ACTION_WRAP_STYLE, position: 'relative' }}>
            <button className="btn btn-sm" onClick={() => setShowLogMenu(m => !m)} style={{ background: '#dbeafe', color: '#1e3a8a', border: 'none', borderRadius: 6 }}>🖨️ 1ヶ月分</button>
            <span style={ACTION_CAP_STYLE}>ログ印刷メニュー</span>
            {showLogMenu && (
              <>
                <div className="add-menu-overlay" onClick={() => setShowLogMenu(false)} />
                <div className="add-menu">
                  <button className="add-menu-item" onClick={() => { setShowLogMenu(false); printPatientMonth() }}>
                    📝 変更ログのみ（1ヶ月分）
                  </button>
                  <button className="add-menu-item" onClick={() => { setShowLogMenu(false); printPatientDrugs() }}>
                    💊 外用・頓用薬（表示全部）
                  </button>
                </div>
              </>
            )}
          </span>
          <span style={ACTION_WRAP_STYLE}>
            <button className="btn btn-sm" onClick={() => setShowPrintPicker(true)} style={{ background: '#0f1f4e', color: 'white', border: 'none', borderRadius: 6 }}>🖨️ 全体印刷</button>
            <span style={ACTION_CAP_STYLE}>1患者情報印刷</span>
          </span>
        </div>
      </div>

      {/* 往診情報（印刷専用） */}
      {visitCalc && (
        <div className="visit-info-print">
          {fmtVisitCalcInfo(visitCalc)}
        </div>
      )}

      {/* タブ */}
      <div className="tabs" style={{
        display: 'flex', background: '#ffffff',
        borderBottom: '2px solid #dce4f0',
        padding: '0 20px', marginBottom: 0,
        flexWrap: 'wrap', flexShrink: 0,
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              padding: '8px 10px', fontSize: 11, cursor: 'pointer',
              border: 'none', borderRadius: 0, fontFamily: 'inherit', transition: 'color 0.15s',
              background: 'transparent',
              color: activeTab === t.key ? '#0f1f4e' : '#94a3b8',
              fontWeight: 700,
              borderBottom: activeTab === t.key ? '3px solid #c9a84c' : '3px solid transparent',
              marginBottom: '-2px',
              boxShadow: 'none',
              flex: '1 1 auto', whiteSpace: 'nowrap',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* タブコンテンツ独立スクロールエリア：患者ヘッダー・タブバーを固定してコンテンツのみスクロール */}
      <div className="tab-scroll-area" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingBottom: 52 }}>
        {/* タブコンテンツ：常時マウント＋display切替でタブ移動時の入力内容を保持 */}
        {/* key={patient?.id} により患者切り替え時のみリマウントして状態リセット */}
        <div className="tab-content">
          <div style={{ display: activeTab === 'basic' ? 'block' : 'none' }}>
            <BasicInfoTab
              key={patient?.id}
              patient={patient}
              onSaved={refetch}
              onDirtyChange={d => reportDirty('basic', d)}
            />
          </div>
          <div style={{ display: activeTab === 'log' ? 'block' : 'none' }}>
            <ChangeLogTab
              key={patient?.id}
              patient={patient}
              visitCalc={visitCalc}
              onRefetch={refetch}
              onUseForOtherVisit={(payload) => { setOtherVisitPrefill(payload); setActiveTab('visit') }}
            />
          </div>
          <div style={{ display: activeTab === 'drugs' ? 'block' : 'none' }}>
            <DrugsTab key={patient?.id} patient={patient} onRefetch={refetch} />
          </div>
          <div style={{ display: activeTab === 'visit' ? 'block' : 'none' }}>
            <OtherVisitsTab
              key={patient?.id}
              patient={patient}
              onRefetch={refetch}
              prefill={otherVisitPrefill}
              onPrefillConsumed={() => setOtherVisitPrefill(null)}
            />
          </div>
          <div style={{ display: activeTab === 'free' ? 'block' : 'none' }}>
            <FreeMemoTab
              key={patient?.id}
              patient={patient}
              onRefetch={refetch}
              onDirtyChange={d => reportDirty('free', d)}
            />
          </div>
        </div>

        {/* 印刷用：全タブコンテンツ */}
        <div className="print-all-tabs" style={{ display: 'none' }}>
          <div className="print-repeat-header">{patient.room_number}{patient.initial ? `　${patient.initial}` : ''}</div>
          {printSections.basic && <div className="print-section"><BasicInfoTab   patient={patient} onSaved={() => {}} printMode={true} /></div>}
          {printSections.log   && <div className="print-section"><ChangeLogTab   patient={patient} visitCalc={visitCalc} onRefetch={() => {}} /></div>}
          {printSections.drugs && <div className="print-section"><DrugsTab       patient={patient} onRefetch={() => {}} /></div>}
          {printSections.visit && <div className="print-section"><OtherVisitsTab patient={patient} onRefetch={() => {}} /></div>}
          {printSections.free  && <div className="print-section"><FreeMemoTab    patient={patient} onRefetch={() => {}} printMode={true} /></div>}
        </div>
      </div>

      {showPrintPicker && (
        <>
          <div className="row-menu-overlay" onClick={() => setShowPrintPicker(false)} />
          <div data-print-picker-modal style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
            background: 'white', borderRadius: 12, border: '1px solid #dce4f0',
            boxShadow: '0 8px 32px rgba(15,31,78,0.25)', padding: 20, width: 280, zIndex: 300,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1f4e', marginBottom: 4 }}>印刷する項目を選択</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12 }}>チェックを外すと印刷から除外されます</div>
            {[
              ['basic', '🏷️ 患者背景（基本情報）'],
              ['log',   '📝 薬剤変更記録'],
              ['drugs', '💊 外用・頓用薬'],
              ['visit', '🏥 他科受診'],
              ['free',  '📄 フリーメモ'],
            ].map(([key, label]) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 2px', borderBottom: '1px solid #f1f5fb', cursor: 'pointer' }}>
                <input type="checkbox" checked={printSections[key]} onChange={() => togglePrintSection(key)}
                  style={{ width: 15, height: 15, accentColor: '#0f1f4e', cursor: 'pointer' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: printSections[key] ? '#0f1f4e' : '#94a3b8' }}>{label}</span>
              </label>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button className="btn btn-sm" onClick={() => setShowPrintPicker(false)} style={{ flex: 1, background: 'white', color: '#64748b', border: '1.5px solid #dce4f0', borderRadius: 6 }}>キャンセル</button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  // モーダルを閉じてから印刷。state更新は非同期なので
                  // requestAnimationFrame で再描画を待ってから window.print() 系を呼ぶ
                  // （閉じる前に印刷するとモーダルごと印刷される不具合の対策）
                  setShowPrintPicker(false)
                  requestAnimationFrame(() => requestAnimationFrame(printFullPatient))
                }}
                disabled={!Object.values(printSections).some(Boolean)}
                style={{ flex: 1, background: '#0f1f4e', color: 'white', border: 'none', borderRadius: 6, opacity: Object.values(printSections).some(Boolean) ? 1 : 0.5 }}
              >🖨️ 印刷する</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
