// 薬剤変更記録（om_change_logs）の表示テキスト生成・日数計算ヘルパー
// ChangeLogTab / PatientDetail から共通利用する

// 各タイミングの「ひとつ前」のタイミング（＝臨時薬の終了タイミング算出に使用）
export const PREV_TIMING = { '朝': '眠前', '昼': '朝', '夕': '昼', '眠前': '夕' }

/** "yyyy-MM-dd" → "MM/DD"（ゼロ埋め） */
export function fmtMMDD(dateStr) {
  if (!dateStr) return ''
  const [, mm, dd] = dateStr.split('-')
  return `${mm}/${dd}`
}

/** "yyyy-MM-dd" に days 日加算した "yyyy-MM-dd" を返す */
export function addDaysToStr(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 臨時薬：開始日・開始タイミング・日数 → 終了日・終了タイミング（分4前提）
 * 朝開始：末日当日の眠前が終了（末日+0日）
 * 昼／夕／眠前開始：末日翌日の対応タイミングが終了（末日+1日）
 */
export function computeTemporaryEnd(startDate, startTiming, days) {
  const endTiming = PREV_TIMING[startTiming]
  const daysOffset = startTiming === '朝' ? days - 1 : days
  const endDate = addDaysToStr(startDate, daysOffset)
  return { endDate, endTiming }
}

/** 臨時薬：開始日・開始タイミング・終了日 → 日数・終了タイミング */
export function computeTemporaryDays(startDate, startTiming, endDate) {
  const endTiming = PREV_TIMING[startTiming]
  const start = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  const daysOffset = Math.round((end - start) / (1000 * 60 * 60 * 24))
  const days = startTiming === '朝' ? daysOffset + 1 : daysOffset
  return { days, endTiming }
}

/** 変更記録1件分の表示・コピー用テキストを生成 */
export function formatChangeLogText(log) {
  if (log.log_type === 'temporary') {
    const instrDate = fmtMMDD(log.changed_at)
    const reason = log.reason?.trim() || '変更指示'
    const start = fmtMMDD(log.start_date ?? log.changed_at)
    const end = fmtMMDD(log.end_date)
    return `${instrDate}　${reason}\n${start}${log.start_timing}〜${end}${log.end_timing}　${log.drug_name ?? log.content ?? ''}`
  }
  const reason = log.reason?.trim() || '指示受け'
  const instrDate = fmtMMDD(log.changed_at)
  const content = log.content?.trim()
  if (!content) {
    return `${instrDate}　${reason}`
  }
  if (log.start_date) {
    const startDate = fmtMMDD(log.start_date)
    return `${instrDate}　${reason}\n${startDate}〜${content}`
  }
  // 旧形式（start_date なし）のバックワード互換
  return `${instrDate}　${content}`
}
