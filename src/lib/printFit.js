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
 * 変更後：縮小は行わず、常に scale=1 を設定する。
 * 1ページに収まらない内容は、CSSの break-inside:avoid に従って
 * カード単位を保ったまま自然に2ページ目以降へ送られる。
 */
export function fitPrintScale(doc /*, measureEl, opts */) {
  if (!doc) return 1
  doc.documentElement.style.setProperty('--print-scale', 1)
  return 1
}

export function printWithAutoFit(containerSelector = '.print-all-tabs') {
  document.body.classList.add('printing')
  fitPrintScale(document)
  window.print()
}
