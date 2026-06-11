import { useState } from 'react'

// 汎用コピーボタン：クリックでクリップボードへコピーし、1.5秒間✅表示に切り替える
// variant: 'icon'（一覧の編集/削除ボタン横）/ 'btn'（保存ボタン横）/ 'banner'（往診バナー内・ダーク背景）
export default function CopyButton({ getText, title = 'コピー', variant = 'icon', style }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async (e) => {
    e?.stopPropagation?.()
    const text = typeof getText === 'function' ? getText() : getText
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (variant === 'banner') {
    return (
      <button type="button" title={title} onClick={handleCopy} style={{ ...bannerCopyBtnStyle, ...style }}>
        {copied ? '✅' : '📋'}
      </button>
    )
  }

  if (variant === 'btn') {
    return (
      <button type="button" className="btn btn-outline btn-sm" title={title} onClick={handleCopy} style={style}>
        {copied ? '✅' : '📋'}
      </button>
    )
  }

  return (
    <button type="button" className="icon-btn" title={title} onClick={handleCopy} style={style}>
      <span aria-hidden="true">{copied ? '✅' : '📋'}</span>
      <span className="icon-btn-cap">{copied ? 'コピー済' : 'コピー'}</span>
    </button>
  )
}

const bannerCopyBtnStyle = {
  flexShrink: 0,
  background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.25)',
  borderRadius: 6,
  color: 'white',
  fontSize: 13,
  padding: '4px 8px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  lineHeight: 1,
}
