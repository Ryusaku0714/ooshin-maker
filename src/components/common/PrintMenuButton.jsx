import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// 印刷ボタン：タップで印刷方法の選択メニュー（2択など）を表示する
// チームカードの overflow:hidden に見切れないよう document.body へポータル表示する
export default function PrintMenuButton({ icon = '🖨️', title, options, style }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      const right = Math.max(4, window.innerWidth - r.right)
      // 左側（サイドバー内など）ではメニュー幅をボタン右端で打ち切り画面外への見切れを防ぐ
      const isLeftSide = r.left + r.width / 2 < window.innerWidth / 2
      setPos(
        isLeftSide
          ? { top: r.bottom + 4, right, maxWidth: Math.max(160, r.right - 8), compact: true }
          : { top: r.bottom + 4, right }
      )
    }
    setOpen(o => !o)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        style={style}
      >{icon}</button>
      {open && pos && createPortal(
        <>
          <div className="row-menu-overlay" onClick={() => setOpen(false)} />
          <div
            className="row-menu"
            style={{
              position: 'fixed',
              top: pos.top,
              right: pos.right,
              minWidth: 160,
              ...(pos.maxWidth && { maxWidth: pos.maxWidth }),
            }}
          >
            {options.map((o, i) => (
              <button
                key={i}
                type="button"
                className="team-menu-item"
                onClick={() => { setOpen(false); o.onClick() }}
              >
                <span className="team-menu-item-label" style={pos.compact ? { whiteSpace: 'normal' } : undefined}>
                  {o.label}
                </span>
                {o.description && (
                  <span className="team-menu-item-desc" style={pos.compact ? { whiteSpace: 'normal' } : undefined}>
                    {o.description}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
