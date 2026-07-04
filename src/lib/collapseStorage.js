// サイドバー・上枠・ツール類の開閉状態をlocalStorageに保存/復元するための共通ヘルパー
// 値が未保存の場合（初回ログイン時など）はデフォルトで「開いた状態」を返す
const PREFIX = 'ooshin_collapse_'

export function loadCollapse(key) {
  try {
    const v = localStorage.getItem(PREFIX + key)
    if (v === null) return true
    return v === '1'
  } catch {
    return true
  }
}

export function saveCollapse(key, isOpen) {
  try {
    localStorage.setItem(PREFIX + key, isOpen ? '1' : '0')
  } catch {
    // localStorageが使用不可（プライベートモード等）の場合は何もしない
  }
}
