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
      // ボタンが画面左半分にある場合はボタン左端から右方向に展開し、
      // 右半分の場合はボタン右端から左方向に展開することで画面外への見切れを防ぐ
      const isLeftSide = r.left + r.width / 2 < window.innerWidth / 2
      setPos(
        isLeftSide
          ? { top: r.bottom + 4, left: Math.max(4, r.left) }
          : { top: r.bottom + 4, right: Math.max(4, window.innerWidth - r.right) }
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
              ...('left' in pos ? { left: pos.left } : { right: pos.right }),
              minWidth: 220,
            }}
          >
            {options.map((o, i) => (
              <button
                key={i}
                type="button"
                className="team-menu-item"
                onClick={() => { setOpen(false); o.onClick() }}
              >
                <span className="team-menu-item-label">{o.label}</span>
                {o.description && <span className="team-menu-item-desc">{o.description}</span>}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  )
}
