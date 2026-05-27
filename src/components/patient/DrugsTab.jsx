import { useState } from 'react'
import { db } from '../../hooks/useData'
import AddDrugModal from '../modals/AddDrugModal'

export default function DrugsTab({ patient, onRefetch }) {
  const [showAdd, setShowAdd] = useState(false)
  const drugs = patient?.om_drugs ?? []

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
