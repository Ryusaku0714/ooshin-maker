// 印刷時、コンテンツが1ページに収まるようフォントサイズを段階的に縮小するための共通ヘルパー
// 最小フォントサイズに達しても収まらない場合は呼び出し側で縮小を止め、自然な改ページに任せる

// A4・上下左右マージン15mmの印刷可能領域（96dpi基準のCSS px換算）
export const PRINT_PAGE_HEIGHT_PX = Math.round((297 - 30) * 96 / 25.4) // ≈1009px
export const PRINT_PAGE_WIDTH_PX  = Math.round((210 - 30) * 96 / 25.4) // ≈680px

/**
 * 要素自身のフォントサイズ(px)を縮小して高さを収める
 * 子要素が em / % 等の相対単位でフォントサイズを指定している場合に使用する
 */
export function fitFontSize(el, { maxFontPx = 11, minFontPx = 10, targetHeightPx = PRINT_PAGE_HEIGHT_PX, step = 0.5 } = {}) {
  if (!el) return maxFontPx
  let font = maxFontPx
  el.style.fontSize = `${font}px`
  while (font > minFontPx && el.scrollHeight > targetHeightPx) {
    font = Math.max(minFontPx, font - step)
    el.style.fontSize = `${font}px`
  }
  return font
}

/**
 * CSS変数 --print-scale を段階的に縮小し、対象要素が1ページに収まる最大のスケールを探す
 * 既存CSSの固定px指定を calc(基準px * var(--print-scale)) に書き換えて利用する想定
 */
export function fitPrintScale(doc, measureEl, { targetHeightPx = PRINT_PAGE_HEIGHT_PX, minScale = 10 / 11, step = 0.02 } = {}) {
  if (!doc || !measureEl) return 1
  const root = doc.documentElement
  let scale = 1
  root.style.setProperty('--print-scale', scale)
  while (scale > minScale && measureEl.scrollHeight > targetHeightPx) {
    scale = Math.max(minScale, scale - step)
    root.style.setProperty('--print-scale', scale)
  }
  return scale
}

/**
 * メイン画面の印刷用クラス（body.printing）を付与し、患者全体印刷コンテンツがあれば
 * 1ページに収まるようフォントサイズを自動縮小してから window.print() を呼ぶ。
 * 後始末（クラス・スケールのリセット）は呼び出し側で afterprint イベントを監視すること。
 */
export function printWithAutoFit(containerSelector = '.print-all-tabs') {
  document.body.classList.add('printing')
  const target = document.querySelector(containerSelector)
  if (target) fitPrintScale(document, target, { targetHeightPx: PRINT_PAGE_HEIGHT_PX })
  window.print()
}
