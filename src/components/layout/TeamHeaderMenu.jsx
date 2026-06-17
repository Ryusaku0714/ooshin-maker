import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// チームヘッダーの操作メニュー（スマホ版用）
// PC・タブレット（769px以上）：呼び出し側で横並びボタンをそのまま表示（本コンポーネントは非表示）
// スマホ（768px以下）：「…」ボタン1つにまとめ、タップで各項目＋説明文をドロップダウン表示
// メニューはチームカードの overflow:hidden に見切れないよう document.body へポータル表示する
export default function TeamHeaderMenu({ actions, triggerStyle }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
    setOpen(o => !o)
  }

  return (
    <div className="row-actions-mobile">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title="メニュー"
        aria-label="メニュー"
        aria-expanded={open}
        style={{ fontSize: 11, padding: '1px 6px', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, ...triggerStyle }}
      >⋯</button>
      {open && pos && createPortal(
        <>
          <div className="row-menu-overlay" onClick={() => setOpen(false)} />
          <div className="row-menu" style={{ position: 'fixed', top: pos.top, right: pos.right, minWidth: 210 }}>
            {actions.map(a => (
              <button
                key={a.key}
                type="button"
                className="team-menu-item"
                onClick={e => { setOpen(false); a.onClick(e) }}
              >
                <span className="team-menu-item-label"><span aria-hidden="true">{a.icon}</span>{a.label}</span>
                <span className="team-menu-item-desc">{a.description}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
