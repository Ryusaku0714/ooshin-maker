import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// ── 施設一覧（チーム・患者含む） ───────────────────────────
export function useFacilities() {
  const [facilities, setFacilities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('om_facilities')
      .select(`
        *,
        om_teams (
          *,
          om_patients ( id, room_number, initial, sort_order, updated_at )
        )
      `)
      .order('sort_order')
      .order('sort_order', { referencedTable: 'om_teams' })
      .order('sort_order', { referencedTable: 'om_teams.om_patients' })
    if (!error) setFacilities(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { facilities, loading, refetch: fetch }
}

// ── 患者詳細（薬・ログ含む） ──────────────────────────────
export function usePatient(patientId) {
  const [patient, setPatient] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!patientId) { setPatient(null); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('om_patients')
      .select(`*, om_drugs(*), om_change_logs(*)`)
      .eq('id', patientId)
      .order('sort_order', { referencedTable: 'om_drugs' })
      .order('changed_at', { referencedTable: 'om_change_logs', ascending: false })
      .single()
    if (!error) setPatient(data)
    setLoading(false)
  }, [patientId])

  useEffect(() => { fetch() }, [fetch])
  return { patient, loading, refetch: fetch }
}

// ── 汎用 CRUD ────────────────────────────────────────────
export const db = {
  // 施設
  addFacility: (name) =>
    supabase.from('om_facilities').insert({ name }).select().single(),
  updateFacility: (id, data) =>
    supabase.from('om_facilities').update(data).eq('id', id),
  deleteFacility: (id) =>
    supabase.from('om_facilities').delete().eq('id', id),

  // チーム
  addTeam: (facilityId, payload) =>
    supabase.from('om_teams').insert({ facility_id: facilityId, ...payload }).select().single(),
  updateTeam: (id, data) =>
    supabase.from('om_teams').update(data).eq('id', id),
  deleteTeam: (id) =>
    supabase.from('om_teams').delete().eq('id', id),

  // 患者
  addPatient: (teamId, payload) =>
    supabase.from('om_patients').insert({ team_id: teamId, ...payload }).select().single(),
  updatePatient: (id, data) =>
    supabase.from('om_patients').update(data).eq('id', id),
  deletePatient: (id) =>
    supabase.from('om_patients').delete().eq('id', id),

  // 薬
  addDrug: (patientId, payload) =>
    supabase.from('om_drugs').insert({ patient_id: patientId, ...payload }).select().single(),
  updateDrug: (id, data) =>
    supabase.from('om_drugs').update(data).eq('id', id),
  deleteDrug: (id) =>
    supabase.from('om_drugs').delete().eq('id', id),

  // 変更ログ
  addLog: (patientId, payload) =>
    supabase.from('om_change_logs').insert({ patient_id: patientId, ...payload }).select().single(),
  updateLog: (id, data) =>
    supabase.from('om_change_logs').update(data).eq('id', id),
  deleteLog: (id) =>
    supabase.from('om_change_logs').delete().eq('id', id),
}
