import { useState } from 'react'

const ACCORDION_ITEMS = [
  {
    key: 'requirements',
    icon: '📋',
    title: '算定の4要件（すべて必須）',
    render: () => (
      <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li>残薬を確認（薬歴・患者・家族から情報収集）</li>
        <li>残薬の理由を確認（飲み忘れ・自己調整・入院・次回受診との兼ね合いなど）</li>
        <li>医師の指示または疑義照会</li>
        <li>調剤日数を変更（原則7日分以上）</li>
      </ol>
    ),
  },
  {
    key: 'exception',
    icon: '✅',
    title: '6日以下でも算定できる場合',
    render: () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p style={{ margin: 0 }}>
          高額薬による患者負担軽減・薬学的専門的な理由（副作用・服薬状況不良・治療変更予定など）
        </p>
        <div>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--sky-800)' }}>必須対応</p>
          <ul style={{ margin: '4px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <li>理由を調剤録明細書に記載</li>
            <li>次回受診日確認</li>
            <li>概要を薬剤服用歴に記録</li>
          </ul>
        </div>
      </div>
    ),
  },
  {
    key: 'ineligible',
    icon: '❌',
    title: '算定できない例',
    render: () => (
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <li>意図的に残薬を生じさせている場合</li>
        <li>認知機能に問題がなく継続的に同じ処方で7日を超える状況</li>
        <li>医師が同意しているだけで薬学的必要性がない場合</li>
      </ul>
    ),
  },
]

function AccordionItem({ icon, title, render, isOpen, onToggle }) {
  return (
    <div style={{
      border: '1.5px solid var(--sky-100)', borderRadius: 12,
      marginBottom: 10, overflow: 'hidden', background: 'white',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, padding: '12px 14px', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--sky-800)' }}>
          {icon} {title}
        </span>
        <span style={{
          fontSize: 12, color: 'var(--gray-400)', flexShrink: 0,
          transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
        }}>▼</span>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 14px 14px', fontSize: 12, color: 'var(--gray-700)', lineHeight: 1.8,
        }}>
          {render()}
        </div>
      )}
    </div>
  )
}

export default function ZanyakuKasanInfo() {
  const [openKey, setOpenKey] = useState(null)

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--sky-900)', marginBottom: 14 }}>
        💊 調剤時残薬調整加算（令和8年度）
      </div>

      {/* 点数カード① イ・ロ・ハ 50点 */}
      <div style={{
        background: 'var(--sky-900)', color: 'white',
        borderRadius: 12, padding: '14px 16px', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>イ・ロ・ハ</span>
          <span style={{ fontSize: 24, fontWeight: 700 }}>50点</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, lineHeight: 1.7, opacity: 0.95 }}>
          <p style={{ margin: 0 }}><strong>イ：</strong>在宅患者：処方箋交付前に提案し、反映された処方箋を受付</p>
          <p style={{ margin: 0 }}><strong>ロ：</strong>在宅患者：イ以外で調剤日数の変更を実施</p>
          <p style={{ margin: 0 }}><strong>ハ：</strong>かかりつけ薬剤師の患者（服薬管理指導料の注1に規定）</p>
        </div>
      </div>

      {/* 点数カード② ニ 30点 */}
      <div style={{
        background: 'var(--sky-100)', color: 'var(--sky-900)',
        borderRadius: 12, padding: '14px 16px', marginBottom: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>ニ</span>
          <span style={{ fontSize: 24, fontWeight: 700 }}>30点</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.7 }}>
          <strong>ニ：</strong>イ〜ハ以外の患者
        </p>
      </div>

      <p style={{ fontSize: 11, color: 'var(--gray-500)', marginBottom: 18 }}>
        ※処方箋受付1回につき1回のみ算定（複数処方でも1回）
      </p>

      {ACCORDION_ITEMS.map(item => (
        <AccordionItem
          key={item.key}
          icon={item.icon}
          title={item.title}
          render={item.render}
          isOpen={openKey === item.key}
          onToggle={() => setOpenKey(openKey === item.key ? null : item.key)}
        />
      ))}
    </div>
  )
}
