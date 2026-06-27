import { useRef, useState } from 'react'
import { getImportPreview, importTeamData, parseImportFile } from '../../lib/teamExportImport'

export default function ImportModal({ onClose, onImported }) {
  const [phase, setPhase]       = useState('select') // select | preview | importing | done | error
  const [importData, setImportData] = useState(null)
  const [preview, setPreview]   = useState(null)
  const [result, setResult]     = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const fileRef = useRef()

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = parseImportFile(ev.target.result)
        setImportData(data)
        setPreview(getImportPreview(data))
        setPhase('preview')
      } catch (err) {
        setErrorMsg(err.message)
        setPhase('error')
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const handleImport = async () => {
    setPhase('importing')
    try {
      const res = await importTeamData(importData)
      setResult(res)
      setPhase('done')
      onImported()
    } catch (err) {
      setErrorMsg(err.message ?? String(err))
      setPhase('error')
    }
  }

  const canClose = phase !== 'importing'

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15,31,78,0.4)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 400, padding: 16,
      }}
      onClick={e => canClose && e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'white', borderRadius: 12, padding: 0,
        width: '90%', maxWidth: 440,
        boxShadow: '0 8px 40px rgba(15,31,78,0.2)',
        overflow: 'hidden',
      }}>
        {/* ヘッダー */}
        <div style={{
          background: '#0f1f4e', borderBottom: '2px solid #c9a84c',
          padding: '14px 20px', borderRadius: '12px 12px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>
            📥 チームデータのインポート
          </div>
          {canClose && (
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', lineHeight: 1, padding: 0, fontFamily: 'inherit' }}
            >✕</button>
          )}
        </div>

        {/* コンテンツ */}
        <div style={{ padding: '20px 24px' }}>
          {/* ── ファイル選択 ── */}
          {phase === 'select' && (
            <>
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7, marginBottom: 20 }}>
                別のアカウントからエクスポートしたJSONファイルを選択してください。
                チーム・患者・変更記録・外用頓用薬のデータをインポートします。
              </p>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileRef.current?.click()}
                onKeyDown={e => e.key === 'Enter' && fileRef.current?.click()}
                style={{
                  border: '2px dashed #dce4f0', borderRadius: 12,
                  padding: '32px 20px', textAlign: 'center', cursor: 'pointer',
                  background: '#f1f5fb', transition: 'border-color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = '#1e3a8a'}
                onMouseOut={e => e.currentTarget.style.borderColor = '#dce4f0'}
              >
                <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0f1f4e', marginBottom: 4 }}>
                  クリックしてJSONファイルを選択
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  チーム名_YYYYMMDD.json
                </div>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </>
          )}

          {/* ── プレビュー＋確認 ── */}
          {phase === 'preview' && preview && (
            <>
              <div style={{
                background: '#f1f5fb', border: '1px solid #dce4f0',
                borderRadius: 10, padding: '14px 16px', marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', marginBottom: 10, letterSpacing: '0.04em' }}>
                  インポート内容のプレビュー
                </div>
                <div style={{ fontSize: 12, color: '#0f1f4e', lineHeight: 2 }}>
                  <div>🏥 チーム：<strong>{preview.teamLabel}</strong></div>
                  {preview.facilityName && <div>📁 施設名：{preview.facilityName}</div>}
                  <div>👥 患者：<strong>{preview.patientCount}名</strong></div>
                  <div>📝 変更記録：<strong>{preview.logCount}件</strong></div>
                  <div>💊 外用頓用薬：<strong>{preview.drugCount}件</strong></div>
                </div>
              </div>

              <div style={{
                background: '#fef9c3', border: '1px solid #fde68a',
                borderRadius: 8, padding: '9px 13px', marginBottom: 18,
                fontSize: 11, color: '#78350f', lineHeight: 1.7,
              }}>
                ⚠️ 既存のpatient_idと重複するデータはスキップされます。旧アカウントのデータは削除されません。
              </div>

              <p style={{ fontSize: 13, color: '#334155', textAlign: 'center', marginBottom: 16, lineHeight: 1.7 }}>
                このチームのデータをインポートします。よろしいですか？
              </p>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={onClose}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8,
                    border: '1.5px solid #dce4f0', background: 'white',
                    fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#64748b',
                  }}
                >キャンセル</button>
                <button
                  onClick={handleImport}
                  style={{
                    flex: 2, padding: '10px 0', borderRadius: 8,
                    border: 'none', background: '#0f1f4e',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'inherit', color: 'white',
                  }}
                >📥 インポート開始</button>
              </div>
            </>
          )}

          {/* ── インポート中 ── */}
          {phase === 'importing' && (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>⏳</div>
              <div style={{ fontSize: 14, color: '#1e3a8a', fontWeight: 600 }}>インポート中...</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6 }}>しばらくお待ちください</div>
            </div>
          )}

          {/* ── 完了 ── */}
          {phase === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>✅</div>
              <div style={{ fontSize: 15, color: '#15803d', fontWeight: 700, marginBottom: 6 }}>
                {result.importedCount}件の患者データをインポートしました
              </div>
              {result.skippedCount > 0 && (
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                  （うち{result.skippedCount}名は重複のためスキップ）
                </div>
              )}
              <button
                onClick={onClose}
                style={{
                  marginTop: 12, padding: '10px 36px', borderRadius: 8,
                  border: 'none', background: '#0f1f4e',
                  fontSize: 13, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'inherit', color: 'white',
                }}
              >閉じる</button>
            </div>
          )}

          {/* ── エラー ── */}
          {phase === 'error' && (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>❌</div>
              <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>
                インポートに失敗しました
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>
                データは保存されていません。
              </div>
              {errorMsg && (
                <div style={{
                  fontSize: 11, color: '#dc2626',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  borderRadius: 6, padding: '8px 12px', margin: '0 0 16px',
                  textAlign: 'left', wordBreak: 'break-all',
                }}>
                  {errorMsg}
                </div>
              )}
              <button
                onClick={onClose}
                style={{
                  padding: '10px 36px', borderRadius: 8,
                  border: '1.5px solid #dce4f0', background: 'white',
                  fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', color: '#64748b',
                }}
              >閉じる</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
