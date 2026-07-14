import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMenuFlip } from '../../hooks/useMenuFlip'

// チームヘッダーの操作メニュー（スマホ版用）
// PC・タブレット（769px以上）：呼び出し側で横並びボタンをそのまま表示（本コンポーネントは非表示）
// スマホ（768px以下）：「…」ボタン1つにまとめ、タップで各項目＋説明文をドロップダウン表示
// 項目に options（印刷方法の2択など）がある場合は、同じドロップダウン内でサブメニューに切り替える
// メニューはチームカードの overflow:hidden に見切れないよう document.body へポータル表示する
export default function TeamHeaderMenu({ actions, triggerStyle }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const [submenu, setSubmenu] = useState(null)
  const btnRef = useRef(null)
  const { menuRef, openUpward } = useMenuFlip(open, pos)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const right = Math.max(4, window.innerWidth - r.right)
      const isLeftSide = r.left + r.width / 2 < window.innerWidth / 2
      setPos(
        isLeftSide
          ? { top: r.top, bottom: r.bottom, right, maxWidth: Math.max(160, r.right - 8) }
          : { top: r.top, bottom: r.bottom, right }
      )
    }
    setOpen(o => !o)
    setSubmenu(null)
  }

  const close = () => { setOpen(false); setSubmenu(null) }

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
          <div className="row-menu-overlay" onClick={close} />
          <div
            ref={menuRef}
            className="row-menu"
            style={{
              position: 'fixed',
              ...(openUpward
                ? { top: 'auto', bottom: window.innerHeight - pos.top + 4 }
                : { top: pos.bottom + 4, bottom: 'auto' }),
              right: pos.right,
              minWidth: 210,
              ...(pos.maxWidth && { maxWidth: pos.maxWidth }),
            }}
          >
            {submenu ? (
              <>
                <button type="button" className="team-menu-item" onClick={() => setSubmenu(null)}>
                  <span className="team-menu-item-label">←　戻る</span>
                </button>
                {submenu.options.map((o, i) => (
                  <button
                    key={i}
                    type="button"
                    className="team-menu-item"
                    onClick={() => { close(); o.onClick() }}
                  >
                    <span className="team-menu-item-label">{o.label}</span>
                    {o.description && <span className="team-menu-item-desc">{o.description}</span>}
                  </button>
                ))}
              </>
            ) : (
              actions.map(a => (
                <button
                  key={a.key}
                  type="button"
                  className="team-menu-item"
                  onClick={e => { a.options ? setSubmenu(a) : (close(), a.onClick(e)) }}
                >
                  <span className="team-menu-item-label">
                    <span aria-hidden="true">{a.icon}</span>{a.label}{a.options ? '　▸' : ''}
                  </span>
                  <span className="team-menu-item-desc">{a.description}</span>
                </button>
              ))
            )}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
