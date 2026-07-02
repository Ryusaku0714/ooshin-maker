import { supabase } from './supabaseClient'

// ── エクスポート ──────────────────────────────────────────────
export async function exportTeamData(team, facilityName) {
  const patientIds = (team.om_patients ?? []).map(p => p.id)

  let patients = []
  let drugs = []
  let changeLogs = []

  if (patientIds.length > 0) {
    const [pRes, dRes, lRes] = await Promise.all([
      supabase.from('om_patients').select('*').in('id', patientIds),
      supabase.from('om_drugs').select('*').in('patient_id', patientIds),
      supabase.from('om_change_logs').select('*').in('patient_id', patientIds),
    ])
    patients = pRes.data ?? []
    drugs = dRes.data ?? []
    changeLogs = lRes.data ?? []
  }

  const drugsByPatient = groupBy(drugs, 'patient_id')
  const logsByPatient  = groupBy(changeLogs, 'patient_id')

  const exportData = {
    version: '1.0',
    exported_at: new Date().toISOString(),
    facility_name: facilityName,
    team: {
      clinic_name:           team.clinic_name ?? null,
      team_name:             team.team_name ?? '',
      visit_schedule:        team.visit_schedule ?? null,
      visit_schedule_custom: team.visit_schedule_custom ?? null,
      default_rx_days:       team.default_rx_days ?? 14,
      grace_days:            team.grace_days ?? 1,
      pharmacist_name:       team.pharmacist_name ?? null,
      last_visit_date:       team.last_visit_date ?? null,
      memo:                  team.memo ?? null,
      sort_order:            team.sort_order ?? 0,
    },
    patients: patients.map(p => ({
      _original_id:            p.id,
      room_number:             p.room_number,
      initial:                 p.initial ?? null,
      medical_history:         p.medical_history ?? null,
      allergy_history:         p.allergy_history ?? null,
      hospitalization_history: p.hospitalization_history ?? null,
      free_memo:               p.free_memo ?? null,
      other_visits:            p.other_visits ?? [],
      sort_order:              p.sort_order ?? 0,
      custom_days:             p.custom_days ?? null,
      custom_offset:           p.custom_offset ?? null,
      individual_visit_date:   p.individual_visit_date ?? null,
      regular_medication:      p.regular_medication ?? null,
      drugs:       (drugsByPatient[p.id] ?? []).map(omitMeta),
      change_logs: (logsByPatient[p.id]  ?? []).map(omitMeta),
    })),
  }

  const json = JSON.stringify(exportData, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  const dateStr   = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const teamLabel = [team.clinic_name, team.team_name].filter(Boolean).join('_') || 'チーム'
  a.download = `${teamLabel}_${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function omitMeta({ id: _id, patient_id: _pid, created_at: _ca, ...rest }) {
  return rest
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

// ── インポートヘルパー ────────────────────────────────────────
export function parseImportFile(jsonStr) {
  let data
  try {
    data = JSON.parse(jsonStr)
  } catch {
    throw new Error('JSONの解析に失敗しました。ファイルが破損していないか確認してください。')
  }
  if (!data.version || !data.team || !Array.isArray(data.patients)) {
    throw new Error('無効なファイル形式です。往診資料メーカーからエクスポートしたJSONファイルを選択してください。')
  }
  return data
}

export function getImportPreview(data) {
  const patientCount = data.patients.length
  const drugCount    = data.patients.reduce((s, p) => s + (p.drugs?.length ?? 0), 0)
  const logCount     = data.patients.reduce((s, p) => s + (p.change_logs?.length ?? 0), 0)
  const teamLabel    = [data.team.clinic_name, data.team.team_name].filter(Boolean).join(' ') || 'チーム'
  return { patientCount, drugCount, logCount, teamLabel, facilityName: data.facility_name ?? '' }
}

// ── インポート本体（擬似トランザクション） ──────────────────────
export async function importTeamData(data) {
  const { facility_name, team: teamData, patients } = data

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です')

  let facilityId     = null
  let teamId         = null
  let createdFacility = false

  try {
    // 1. 施設：同名があれば再利用、なければ新規作成
    const { data: existingFacs } = await supabase
      .from('om_facilities')
      .select('id')
      .eq('name', facility_name ?? '')

    if (existingFacs?.length > 0) {
      facilityId = existingFacs[0].id
    } else {
      const { data: newFac, error: facErr } = await supabase
        .from('om_facilities')
        .insert({ name: facility_name || 'インポート', user_id: user.id })
        .select()
        .single()
      if (facErr) throw facErr
      facilityId     = newFac.id
      createdFacility = true
    }

    // 2. チーム新規作成
    const { sort_order: _so, ...teamPayload } = teamData
    const { data: newTeam, error: teamErr } = await supabase
      .from('om_teams')
      .insert({ facility_id: facilityId, ...teamPayload })
      .select()
      .single()
    if (teamErr) throw teamErr
    teamId = newTeam.id

    // 3. 重複チェック（既存patient_idをセットに）
    const originalIds = patients.map(p => p._original_id).filter(Boolean)
    const existingIds = new Set()
    if (originalIds.length > 0) {
      const { data: existing } = await supabase
        .from('om_patients')
        .select('id')
        .in('id', originalIds)
      existing?.forEach(p => existingIds.add(p.id))
    }

    // 4. 患者・薬・変更記録を順次保存
    let importedCount = 0
    let skippedCount  = 0

    for (const p of patients) {
      if (p._original_id && existingIds.has(p._original_id)) {
        skippedCount++
        continue
      }

      const { _original_id: _oid, drugs, change_logs, ...patientPayload } = p
      const { data: newPatient, error: pErr } = await supabase
        .from('om_patients')
        .insert({ team_id: teamId, ...patientPayload })
        .select()
        .single()
      if (pErr) throw pErr

      importedCount++

      if (drugs?.length > 0) {
        const { error: dErr } = await supabase
          .from('om_drugs')
          .insert(drugs.map(d => ({ patient_id: newPatient.id, ...d })))
        if (dErr) throw dErr
      }

      if (change_logs?.length > 0) {
        const { error: lErr } = await supabase
          .from('om_change_logs')
          .insert(change_logs.map(l => ({ patient_id: newPatient.id, ...l })))
        if (lErr) throw lErr
      }
    }

    return { importedCount, skippedCount }

  } catch (err) {
    // ロールバック：チーム削除（CASCADE で患者・薬・ログも消える）
    try {
      if (teamId) await supabase.from('om_teams').delete().eq('id', teamId)
      if (createdFacility && facilityId) await supabase.from('om_facilities').delete().eq('id', facilityId)
    } catch (rollbackErr) {
      console.error('rollback failed:', rollbackErr)
    }
    throw err
  }
}
