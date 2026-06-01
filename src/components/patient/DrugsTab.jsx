import { useState } from 'react'
import { db } from '../../hooks/useData'
import AddDrugModal from '../modals/AddDrugModal'

// YYYY-MM-DD に正規化（TIMESTAMPTZ → date string 対応）
function sliceDate(val) {
  return val ? String(val).slice(0, 10) : ''
}

// 90日未確認フラグ判定
function isUnconfirmed(drug) {
  const ninety = new Date()
  ninety.setDate(ninety.getDate() - 90)
  const ref = drug.last_confirmed_at || drug.prescribed_at
  if (!ref) return true
  return new Date(sliceDate(ref)) < ninety
}

export default function DrugsTab({ patient, onRefetch }) {
  const [showAdd,      setShowAdd]      = useState(false)
  const [editDrug,     setEditDrug]     = useState(null)
  const [showArchived, setShowArchived] = useState(false)

  const allDrugs      = patient?.om_drugs ?? []
  const activeDrugs   = allDrugs.filter(d => !d.is_archived)
  const archivedDrugs = allDrugs.filter(d => d.is_archived)

  const del = async (id) => {
    if (!confirm(
      'この薬を完全に削除しますか？\n\n' +
      '💡 完全に削除する前に、アーカイブ（終了薬として保存）することもできます。'
    )) return
    await db.deleteDrug(id)
    onRefetch?.()
  }

  const archive = async (id) => {
    await db.updateDrug(id, { is_archived: true })
    onRefetch?.()
  }

  const restore = async (id) => {
    await db.updateDrug(id, { is_archived: false })
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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {archivedDrugs.length > 0 && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowArchived(s => !s)}
                style={{ color: showArchived ? 'var(--sky-600)' : 'var(--gray-400)', borderColor: showArchived ? 'var(--sky-200)' : 'var(--gray-200)' }}
              >
                {showArchived ? '📂 アーカイブを隠す' : `📂 アーカイブを表示（${archivedDrugs.length}件）`}
              </button>
            )}
            <button className="btn btn-outline btn-sm" onClick={() => setShowAdd(true)}>＋ 追加</button>
          </div>
        </div>

        {activeDrugs.length === 0 && !showArchived && (
          <p style={{ fontSize: 12, color: 'var(--gray-400)', textAlign: 'center', padding: '20px 0' }}>
            使用中の薬剤がありません
          </p>
        )}

        {activeDrugs.map(drug => (
          <DrugRow
            key={drug.id}
            drug={drug}
            archived={false}
            onEdit={() => setEditDrug(drug)}
            onConfirm={() => confirmDate(drug)}
            onArchive={() => archive(drug.id)}
            onRestore={() => restore(drug.id)}
            onDelete={() => del(drug.id)}
          />
        ))}

        {showArchived && archivedDrugs.length > 0 && (
          <>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--gray-400)',
              margin: '10px 0 4px', paddingTop: 10,
              borderTop: '1px dashed var(--gray-200)',
              letterSpacing: '0.06em',
            }}>
              📂 アーカイブ（終了薬）
            </div>
            {archivedDrugs.map(drug => (
              <DrugRow
                key={drug.id}
                drug={drug}
                archived={true}
                onEdit={() => setEditDrug(drug)}
                onConfirm={() => confirmDate(drug)}
                onArchive={() => archive(drug.id)}
                onRestore={() => restore(drug.id)}
                onDelete={() => del(drug.id)}
              />
            ))}
          </>
        )}
      </div>

      {showAdd && (
        <AddDrugModal
          patientId={patient.id}
          onClose={() => setShowAdd(false)}
          onSaved={onRefetch}
        />
      )}

      {editDrug && (
        <AddDrugModal
          patientId={patient.id}
          drug={editDrug}
          onClose={() => setEditDrug(null)}
          onSaved={onRefetch}
        />
      )}
    </>
  )
}

function DrugRow({ drug, archived, onEdit, onConfirm, onArchive, onRestore, onDelete }) {
  const needsAlert    = !archived && isUnconfirmed(drug)
  const confirmedDate = sliceDate(drug.last_confirmed_at)

  const detailParts = [
    drug.description,
    drug.prescribed_at && `処方：${drug.prescribed_at}`,
  ].filter(Boolean)

  const badgeBg    = archived ? '#f1f5f9' : (drug.drug_type === 'gaiyou' ? 'var(--sky-100)' : '#fef3c7')
  const badgeColor = archived ? 'var(--gray-400)' : (drug.drug_type === 'gaiyou' ? 'var(--sky-700)' : '#92400e')

  const cardBg     = archived ? '#f8fafc' : (needsAlert ? '#fffbeb' : 'var(--sky-50)')
  const cardBorder = archived ? 'var(--gray-200)' : (needsAlert ? '#fcd34d' : 'var(--sky-100)')

  return (
    <div
      className={`drug-card${needsAlert ? ' drug-unconfirmed' : ''}`}
      style={{
        background: cardBg,
        border: `1.5px solid ${cardBorder}`,
        borderRadius: 8,
        padding: '8px 10px', marginBottom: 5,
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'start',
        opacity: archived ? 0.7 : 1,
      }}
    >
      {/* 種別バッジ */}
      <span className="drug-badge" style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
        whiteSpace: 'nowrap', marginTop: 3, flexShrink: 0,
        background: badgeBg, color: badgeColor,
      }}>
        {drug.drug_type === 'gaiyou' ? '外用' : '頓用'}
      </span>

      {/* 薬剤情報 */}
      <div className="drug-content">
        <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: '0 8px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: archived ? 'var(--gray-400)' : 'var(--gray-900)' }}>
            {drug.drug_name}
          </span>
          {drug.prescribed_quantity && (
            <span className="drug-qty-span" style={{ fontSize: 10, color: archived ? 'var(--gray-400)' : 'var(--sky-700)', fontWeight: 600 }}>
              {drug.prescribed_quantity}
            </span>
          )}
          {drug.remaining_quantity && (
            <span style={{ fontSize: 10, color: archived ? 'var(--gray-400)' : '#d97706', fontWeight: 600 }}>
              残：{drug.remaining_quantity}
            </span>
          )}
          {archived && (
            <span style={{ fontSize: 9, color: 'var(--gray-400)', fontStyle: 'italic' }}>終了</span>
          )}
        </div>
        {detailParts.length > 0 && (
          <div className="drug-detail" style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>
            {detailParts.join('　')}
          </div>
        )}
        {/* 印刷時のみ表示する未確認ラベル */}
        {needsAlert && (
          <div className="drug-alert-print" style={{ display: 'none', fontSize: 9, color: '#b45309', fontWeight: 700, marginTop: 2 }}>
            ⚠️ 3ヶ月以上未確認
          </div>
        )}
      </div>

      {/* アクション（残量確認ボタンを削除し確認エリアに統合） */}
      <div className="drug-actions" style={{ display: 'flex', gap: 4 }}>
        {archived ? (
          <>
            <button className="icon-btn" title="編集" onClick={onEdit}>✏️</button>
            <button
              className="icon-btn"
              title="復元（使用中に戻す）"
              onClick={onRestore}
              style={{ fontSize: 11 }}
            >↩️</button>
            <button className="icon-btn" title="完全削除" onClick={onDelete}>🗑️</button>
          </>
        ) : (
          <>
            <button className="icon-btn" title="編集" onClick={onEdit}>✏️</button>
            <button
              className="icon-btn"
              title="アーカイブ（終了薬として保存）"
              onClick={onArchive}
              style={{ fontSize: 11 }}
            >📂</button>
            <button className="icon-btn" title="完全削除" onClick={onDelete}>🗑️</button>
          </>
        )}
      </div>

      {/* 確認エリア（アクティブ薬のみ・グリッド全幅） */}
      {!archived && (
        <div className="drug-confirm-area" style={{
          gridColumn: '1 / -1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: needsAlert ? 'space-between' : 'flex-end',
          paddingTop: 5,
          borderTop: `1px dashed ${needsAlert ? '#fde68a' : 'var(--sky-100)'}`,
        }}>
          {needsAlert && (
            <span style={{ fontSize: 9, color: '#b45309', fontWeight: 700 }}>
              ⚠️ 3ヶ月以上未確認
            </span>
          )}
          <button
            onClick={onConfirm}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 10, fontFamily: 'inherit', padding: '2px 0',
              color: confirmedDate ? 'var(--sky-600)' : 'var(--gray-400)',
            }}
          >
            {confirmedDate ? `✅ 最終確認：${confirmedDate}` : '□ 確認する'}
          </button>
        </div>
      )}
    </div>
  )
}
