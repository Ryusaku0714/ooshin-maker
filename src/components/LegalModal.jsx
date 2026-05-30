import { useState } from 'react'

export default function LegalModal({ type, onClose }) {
  const title = type === 'privacy' ? 'プライバシーポリシー' : '利用規約'

  return (
    <div
      className="modal-overlay"
      style={{ zIndex: 2000 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-box"
        style={{ maxWidth: 520, padding: 0, display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}
      >
        {/* ヘッダー */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: '1px solid var(--sky-100)', flexShrink: 0,
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--sky-800)' }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 18, color: 'var(--gray-400)', lineHeight: 1, padding: 2,
            }}
          >✕</button>
        </div>

        {/* コンテンツ */}
        <div style={{ overflowY: 'auto', padding: '16px 20px', flex: 1 }}>
          {type === 'privacy' ? <PrivacyContent /> : <TermsContent />}
        </div>

        {/* フッター */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid var(--sky-100)',
          display: 'flex', justifyContent: 'flex-end', flexShrink: 0,
        }}>
          <button className="btn btn-primary btn-sm" onClick={onClose}>閉じる</button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <p style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: 12, marginBottom: 6 }}>{title}</p>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', lineHeight: 1.9, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {children}
      </div>
    </div>
  )
}

function PrivacyContent() {
  return (
    <>
      <Section title="1. 収集する情報">
        <p>・Googleアカウント情報（メールアドレス・表示名）</p>
        <p>・入力されたデータ（施設名・チーム名・部屋番号・イニシャル・薬剤情報・変更記録）</p>
      </Section>

      <Section title="2. データの保存">
        <p>・データはSupabase（クラウドデータベース）に保存されます</p>
        <p>・データはログインアカウントごとに分離して管理されます</p>
        <p>・第三者への提供は行いません</p>
      </Section>

      <Section title="3. 個人情報の取り扱い">
        <p>・本サービスはイニシャル・部屋番号での入力を推奨しており、個人を特定できる情報の登録はお控えください</p>
        <p>・入力いただいた情報はサービス提供目的のみに使用します</p>
      </Section>

      <Section title="4. データの削除">
        <p>アカウント削除をご希望の場合は{' '}
          <a href="mailto:ph1@ryusaku.jp" style={{ color: 'var(--sky-600)', textDecoration: 'underline' }}>
            ph1@ryusaku.jp
          </a>{' '}
          までご連絡ください
        </p>
      </Section>

      <Section title="5. お問い合わせ">
        <p><a href="mailto:ph1@ryusaku.jp" style={{ color: 'var(--sky-600)', textDecoration: 'underline' }}>ph1@ryusaku.jp</a></p>
      </Section>
    </>
  )
}

function TermsContent() {
  return (
    <>
      <Section title="1. サービスの目的">
        <p>本サービスは施設薬剤師向けの往診同行資料作成・管理ツールです。</p>
      </Section>

      <Section title="2. 個人情報の入力について">
        <p>
          本サービスへの入力情報は部屋番号・イニシャル等の匿名情報に限定してください。
          特定の個人を識別できる情報（氏名・生年月日等）は入力しないようお願いします。
        </p>
      </Section>

      <Section title="3. 利用資格">
        <p>・医療・介護関係者を対象としています</p>
        <p>・Googleアカウントでのログインが必要です</p>
      </Section>

      <Section title="4. 禁止事項">
        <p>・他のユーザーのデータへの不正アクセス</p>
        <p>・患者の個人情報（フルネーム・生年月日等）の入力</p>
        <p>・商業目的での無断転用</p>
      </Section>

      <Section title="5. 免責事項">
        <p>・本サービスの利用により生じた損害について運営者は責任を負いません</p>
        <p>・システム障害・メンテナンス等によるサービス停止が生じる場合があります</p>
      </Section>

      <Section title="6. サービスの変更・終了">
        <p>運営者はサービス内容を予告なく変更・終了する場合があります</p>
      </Section>

      <Section title="7. お問い合わせ">
        <p><a href="mailto:ph1@ryusaku.jp" style={{ color: 'var(--sky-600)', textDecoration: 'underline' }}>ph1@ryusaku.jp</a></p>
      </Section>
    </>
  )
}
