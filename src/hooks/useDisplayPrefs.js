// src/hooks/useDisplayPrefs.js
// 表示設定（文字サイズ倍率・患者リスト幅）を localStorage に永続化するフック。
// 既存の入力・データには一切触れず、表示スケールと幅のみを扱う。
import { useState, useCallback } from 'react'

const SCALE_KEY = 'om_scale'
const SBW_KEY = 'om_sbw'
export const DEFAULT_SCALE = 1.15          // 既定は「ゆとり」
export const DEFAULT_SBW = 260             // 既定の患者リスト幅(px)
export const MIN_SBW = 200
export const MAX_SBW = 400
export const SNAP_SBW = 260                // この幅の ±12px でスナップ
const ALLOWED_SCALES = [1, 1.15, 1.3]      // 標準 / ゆとり / 大

export function useDisplayPrefs() {
  const [scale, setScaleState] = useState(() => {
    const s = parseFloat(localStorage.getItem(SCALE_KEY))
    return ALLOWED_SCALES.includes(s) ? s : DEFAULT_SCALE
  })
  const [sbw, setSbwState] = useState(() => {
    const w = parseInt(localStorage.getItem(SBW_KEY), 10)
    return w >= MIN_SBW && w <= MAX_SBW ? w : DEFAULT_SBW
  })

  // 文字サイズ：即保存
  const setScale = useCallback((v) => {
    setScaleState(v)
    try { localStorage.setItem(SCALE_KEY, v) } catch (e) {}
  }, [])

  // 幅：ドラッグ中は保存せず state のみ更新（クランプ＋スナップ込み）
  const setSbw = useCallback((v) => {
    let w = Math.min(MAX_SBW, Math.max(MIN_SBW, Math.round(v)))
    if (Math.abs(w - SNAP_SBW) <= 12) w = SNAP_SBW
    setSbwState(w)
    return w
  }, [])

  // ドラッグ終了時などに現在幅を保存
  const persistSbw = useCallback((w) => {
    try { localStorage.setItem(SBW_KEY, w) } catch (e) {}
  }, [])

  // 仕切りダブルクリック：幅だけ既定に戻す
  const resetSbw = useCallback(() => {
    setSbwState(DEFAULT_SBW)
    try { localStorage.setItem(SBW_KEY, DEFAULT_SBW) } catch (e) {}
  }, [])

  // メニュー「表示を初期化」：文字サイズ・幅を両方リセットし保存値も削除
  const resetAll = useCallback(() => {
    setScaleState(DEFAULT_SCALE)
    setSbwState(DEFAULT_SBW)
    try {
      localStorage.removeItem(SCALE_KEY)
      localStorage.removeItem(SBW_KEY)
    } catch (e) {}
  }, [])

  return { scale, setScale, sbw, setSbw, persistSbw, resetSbw, resetAll }
}
