import { useState } from 'react'
import { db } from '../../hooks/useData'
import AddDrugModal from '../modals/AddDrugModal'

function fmt(d) { return `${d.getMonth() + 1}/${d.getDate()}` }
function fmtFull(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function CalcTool({ visitCalc }) {
  const [addStart, setAddStart] = useState(visitCalc?.visitDate ?? '')
  const [timing, setTiming] = useState('morning')

  const rxEnd = visitCalc?.rxEnd ?? ''

  let addDays = null
  let periodText = ''
  let alertText = ''

  if (addStart && rxEnd) {
    const start = new Date(addStart)
    const end = new Date(rxEnd)
    let offset = timing === 'morning' ? 1 : timing === 'day2morning' ? 2 : 0
    const actualStart = new Date(start)
    actualStart.setDate(actualStart.getDate() + offset)
    const diff = Math.ceil((end - actualStart) / (1000*60*60*24)) + 1
    if (diff > 0) {
      addDays = diff
      const startLabel = timing === 'morning' ? '翌朝' : timing === 'evening' ? '当日夕' : timing === 'noon' ? '当日昼' : '翌々朝'
      periodText = `${fmt(actualStart)} ${startLabel} 〜 ${fmt(end)} 朝`
      if (timing === 'evening' || timing === 'noon') {
        alertText = `${fmt(end)}分（朝）は定期処方と重複します。確認してください。`
      }
    }
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--sky-800), var(--sky-900))',
      borderRadius: 12, padding: 16, marginBottom: 10,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--sky-200)', letterSpacing: '0.08em', marginBottom: 12 }}>
        ⚡ 追加薬 日数計算
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10, alignItems: 'flex-end' }}>
        <CalcField label="追加薬の開始日">
          <input type="date" value={addStart} onChange={e => setAddStart(e.target.value)} style={calcInputStyle} />
        </CalcField>
        <CalcField label="開始タイミング">
          <select value={timing} onChange={e => setTiming(e.target.value)} style={calcInputStyle}>
            <option value="morning">翌朝から</option>
            <option value="evening">当日夕から</option>
            <option value="noon">当日昼から</option>
            <option value="day2morning">翌々朝から</option>
          </select>
        </CalcField>
        <CalcField label="処方のお尻（定期処方最終日）">
          <input type="text" value={rxEnd} readOnly style={{ ...calcInputStyle, opacity: 0.7 }} />
        </CalcField>
        <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', minWidth: 80 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'white', lineHeight: 1 }}>
            {addDays ?? '—'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--sky-200)', marginTop: 2 }}>日分</div>
        </div>
      </div>
      {alertText && (
        <div style={{ marginTop: 8, background: 'rgba(251,191,36,0.2)', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 6, padding: '6px 10px', fontSize: 10, color: '#fef08a', display: 'flex', alignItems: 'center', gap: 6 }}>
          ⚠️ {alertText}
        </div>
      )}
      {periodText && (
        <div style={{ marginTop: 8, fontSize: 10, color: 'var(--sky-200)' }}>{periodText}</div>
      )}
    </div>
  )
}

function CalcField({ label, children }) {
  return (
    <div>
      <label style={{ fontSize: 9, color: 'var(--sky-200)', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  )
}

const calcInputStyle = {
  background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: 6, padding: '6px 8px', fontSize: 12, color: 'white',
  fontFamily: 'inherit', width: '100%', outline: 'none',
}

export default function DrugsTab({ patient, visitCalc, onRefetch }) {
  const [showAdd, setShowAdd] = useState(false)
  const drugs = patient?.drugs ?? []

  const del = async (id) => {
    if (!confirm('この薬を削除しますか？')) return
    await db.deleteDrug(id)
    onRefetch?.()
  }

  const confirmDate = async (drug) => {
    await db.updateDrug(drug.id, { last_confirmed_at: new Date().toISOString().slice(0, 10) })
    onRefetch?.()
  }

  return (
    <>
      <CalcTool visitCalc={visitCalc} />

      <div className="card">
        <div className="card-title">
          💊 使用中の外用・頓用薬
          <button className="btn btn-outline btn-sm" onClick={() => setShowAdd(true)}>＋ 追加</button>
        </div>

        {drugs.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
            薬剤がまだ登録されていません
          </p>
        )}

        {drugs.map(drug => (
          <div key={drug.id} style={{
            background: 'var(--sky-50)', border: '1.5px solid var(--sky-100)', borderRadius: 8,
            padding: '10px 12px', marginBottom: 6,
            display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 10, alignItems: 'start',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '3px 7px', borderRadius: 10, whiteSpace: 'nowrap', marginTop: 2,
              background: drug.drug_type === 'gaiyou' ? 'var(--sky-100)' : '#fef3c7',
              color: drug.drug_type === 'gaiyou' ? 'var(--sky-700)' : '#92400e',
            }}>
              {drug.drug_type === 'gaiyou' ? '外用' : '頓用'}
            </span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-900)' }}>{drug.drug_name}</div>
              <div style={{ fontSize: 10, color: 'var(--gray-500)', marginTop: 2 }}>
                {drug.description}
                {drug.prescribed_at && ` 処方：${drug.prescribed_at}`}
                {drug.last_confirmed_at && ` ✅ 最終確認：${drug.last_confirmed_at}`}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="icon-btn" title="残量確認" onClick={() => confirmDate(drug)}>✅</button>
              <button className="icon-btn" title="削除" onClick={() => del(drug.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {showAdd && (
        <AddDrugModal
          patientId={patient.id}
          onClose={() => setShowAdd(false)}
          onSaved={onRefetch}
        />
      )}
    </>
  )
}
