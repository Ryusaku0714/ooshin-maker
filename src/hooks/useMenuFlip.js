import { useLayoutEffect, useRef, useState } from 'react'

// 固定ナビバー高さ＋セーフエリア分の予約領域を実測する（--bottom-nav-height + env(safe-area-inset-bottom)）
function getReservedBottomSpace() {
  const probe = document.createElement('div')
  probe.className = 'safe-bottom-probe'
  document.body.appendChild(probe)
  const value = parseFloat(getComputedStyle(probe).paddingBottom) || 0
  document.body.removeChild(probe)
  return value
}

// 「…」メニューを開く際、トリガー位置と画面下端の残り高さを比較し、
// 下に十分なスペースがなければ上向きに開くよう判定する
// triggerRect: { top, bottom } — メニューを開いた瞬間のトリガー要素のgetBoundingClientRect()相当
export function useMenuFlip(open, triggerRect) {
  const menuRef = useRef(null)
  const [openUpward, setOpenUpward] = useState(false)

  useLayoutEffect(() => {
    // menuRefは開いている間のみDOMに存在するため、閉じている時は判定不要
    // （openUpwardは呼び出し側でopen===trueの時にしか参照されない）
    if (!open || !triggerRect || !menuRef.current) return
    const reserved = getReservedBottomSpace()
    const menuHeight = menuRef.current.getBoundingClientRect().height
    const spaceBelow = window.innerHeight - triggerRect.bottom
    setOpenUpward(spaceBelow < menuHeight + reserved)
  }, [open, triggerRect])

  return { menuRef, openUpward }
}
