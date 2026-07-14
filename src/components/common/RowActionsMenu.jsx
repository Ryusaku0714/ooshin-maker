import { useState } from 'react'
import { useMenuFlip } from '../../hooks/useMenuFlip'

// レコード単位のアクション（編集・削除・アーカイブ等）
// PC・タブレット（769px以上）：icon-btn を横並び表示
// スマホ（768px以下）：「…」ボタン1つにまとめ、タップでドロップダウン表示
export default function RowActionsMenu({ actions }) {
  const [open, setOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState(null)
  const { menuRef, openUpward } = useMenuFlip(open, triggerRect)

  const toggle = (e) => {
    if (!open) setTriggerRect(e.currentTarget.getBoundingClientRect())
    setOpen(o => !o)
  }

  return (
    <>
      <div className="row-actions-desktop">
        {actions.map(a => (
          <button key={a.key} className="icon-btn" title={a.title ?? a.label} onClick={a.onClick}>
            <span aria-hidden="true">{a.icon}</span>
            <span className="icon-btn-cap">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="row-actions-mobile">
        <button
          type="button"
          className="icon-btn"
          title="メニュー"
          aria-label="メニュー"
          aria-expanded={open}
          onClick={toggle}
        >
          <span aria-hidden="true">⋯</span>
        </button>
        {open && (
          <>
            <div className="row-menu-overlay" onClick={() => setOpen(false)} />
            <div ref={menuRef} className={`row-menu${openUpward ? ' row-menu--up' : ''}`}>
              {actions.map(a => (
                <button
                  key={a.key}
                  type="button"
                  className="row-menu-item"
                  onClick={() => { setOpen(false); a.onClick() }}
                >
                  <span aria-hidden="true">{a.icon}</span>{a.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  )
}
