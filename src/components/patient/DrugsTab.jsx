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

// 薬剤1件分のテキスト（コピー用）
function formatDrugText(drug) {
  const type = drug.drug_type === 'gaiyou' ? '外用' : '頓用'
  let line = `・${drug.drug_name}（${type}）`
  if (drug.prescribed_quantity) line += `　${drug.prescribed_quantity}`
  if (drug.remaining_quantity)  line += `　残：${drug.remaining_quantity}`
  if (drug.description)         line += `　${drug.description}`
  const cd = sliceDate(drug.last_confirmed_at)
  if (cd) line += `　✅確認：${cd}`
  if (isUnconfirmed(drug)) line += `　⚠️未確認`
  return line
}

// 「確認する」「コピー」共通のチェックボックス風ボタンスタイル
function checkboxBtnStyle(active) {
  return {
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 10, fontFamily: 'inherit', padding: '2px 0',
    color: active ? 'var(--sky-600)' : 'var(--gray-400)',
  }
}

export default function DrugsTab({ patient, onRefetch }) {
  const [showAdd,      setShowAdd]      = useState(false)
  const [editDrug,     setEditDrug]     = useState(null)
  const [showArchived, setShowArchived] = useState(false)
  const [sortOrder,    setSortOrder]    = useState('prescription') // 'prescription' | 'edit'

  const allDrugs      = patient?.om_drugs ?? []
  const activeDrugs   = allDrugs.filter(d => !d.is_archived)
  const archivedDrugs = allDrugs.filter(d => d.is_archived)

  const sortedActiveDrugs = [...activeDrugs].sort((a, b) => {
    if (sortOrder === 'prescription') {
      const aDate = a.prescribed_at ? new Date(a.prescribed_at) : null
      const bDate = b.prescribed_at ? new Date(b.prescribed_at) : null
      if (!aDate && !bDate) return 0
      if (!aDate) return 1
      if (!bDate) return -1
      return bDate - aDate
    }
    return new Date(a.created_at ?? 0) - new Date(b.created_at ?? 0)
  })

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
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                className={`btn btn-sm ${sortOrder === 'prescription' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSortOrder('prescription')}
              >処方日順</button>
              <button
                className={`btn btn-sm ${sortOrder === 'edit' ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setSortOrder('edit')}
              >編集順</button>
            </div>
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

        {sortedActiveDrugs.map(drug => (
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
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    const text = formatDrugText(drug)
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

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

      {/* アクション（コピーボタンは確認エリアに移動） */}
      <div className="drug-actions" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {archived ? (
          <>
            <button className="icon-btn" title="編集" onClick={onEdit}>
              <span aria-hidden="true">✏️</span>
              <span className="icon-btn-cap">編集</span>
            </button>
            <button className="icon-btn" title="復元（使用中に戻す）" onClick={onRestore}>
              <span aria-hidden="true" style={{ fontSize: 11 }}>↩️</span>
              <span className="icon-btn-cap">復元</span>
            </button>
            <button className="icon-btn" title="完全削除" onClick={onDelete}>
              <span aria-hidden="true">🗑️</span>
              <span className="icon-btn-cap">削除</span>
            </button>
          </>
        ) : (
          <>
            <button className="icon-btn" title="編集" onClick={onEdit}>
              <span aria-hidden="true">✏️</span>
              <span className="icon-btn-cap">編集</span>
            </button>
            <button className="icon-btn" title="アーカイブ（終了薬として保存）" onClick={onArchive}>
              <span aria-hidden="true" style={{ fontSize: 11 }}>📂</span>
              <span className="icon-btn-cap">非表示</span>
            </button>
            <button className="icon-btn" title="完全削除" onClick={onDelete}>
              <span aria-hidden="true">🗑️</span>
              <span className="icon-btn-cap">削除</span>
            </button>
          </>
        )}
      </div>

      {/* 確認エリア（確認チェック＋コピーチェック・グリッド全幅） */}
      <div className="drug-confirm-area" style={{
        gridColumn: '1 / -1',
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 4,
        justifyContent: needsAlert ? 'space-between' : 'flex-end',
        paddingTop: 5,
        borderTop: `1px dashed ${needsAlert ? '#fde68a' : (archived ? 'var(--gray-200)' : 'var(--sky-100)')}`,
      }}>
        {needsAlert && (
          <span style={{ fontSize: 9, color: '#b45309', fontWeight: 700 }}>
            ⚠️ 3ヶ月以上未確認
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {!archived && (
            <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <button onClick={onConfirm} style={checkboxBtnStyle(!!confirmedDate)}>
                {confirmedDate ? `✅ 最終確認：${confirmedDate}` : '□ 確認する'}
              </button>
              <span className="icon-btn-cap">確認済み</span>
            </span>
          )}
          <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <button onClick={handleCopy} style={checkboxBtnStyle(copied)}>
              {copied ? '✅ コピー' : '□ コピー'}
            </button>
            <span className="icon-btn-cap">コピー</span>
          </span>
        </div>
      </div>
    </div>
  )
}
