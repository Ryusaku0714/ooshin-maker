-- ============================================================
-- 往診資料メーカー Supabase Schema
-- ※ 冪等設計: 何度実行しても安全 (IF NOT EXISTS / DROP IF EXISTS)
-- ============================================================

-- ① 施設 (Facilities)
CREATE TABLE IF NOT EXISTS facilities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ② チーム (Teams) ― 往診設定を保持
-- visit_schedule の値例: 第1・3週水曜, 第2・4週水曜, 毎週水曜, custom
CREATE TABLE IF NOT EXISTS teams (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id           UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  clinic_name           TEXT NOT NULL,
  team_name             TEXT NOT NULL,
  visit_schedule        TEXT,
  visit_schedule_custom TEXT,
  default_rx_days       INTEGER NOT NULL DEFAULT 14,
  grace_days            INTEGER NOT NULL DEFAULT 1,
  pharmacist_name       TEXT,
  sort_order            INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ③ 患者 (Patients)
CREATE TABLE IF NOT EXISTS patients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                 UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  room_number             TEXT NOT NULL,
  initial                 TEXT,
  medical_history         TEXT,
  allergy_history         TEXT,
  hospitalization_history TEXT,
  free_memo               TEXT,
  sort_order              INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ④ 外用・頓用薬 (Drugs)
CREATE TABLE IF NOT EXISTS drugs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drug_type         TEXT NOT NULL CHECK (drug_type IN ('gaiyou', 'ton')),
  drug_name         TEXT NOT NULL,
  description       TEXT,
  prescribed_at     DATE,
  last_confirmed_at DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⑤ 薬剤変更ログ (Change Logs)
CREATE TABLE IF NOT EXISTS change_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  changed_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- トリガーは CREATE OR REPLACE が使えないため DROP IF EXISTS してから作成
DROP TRIGGER IF EXISTS patients_updated_at ON patients;
CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY は冪等なのでそのまま
-- ============================================================
ALTER TABLE facilities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs ENABLE ROW LEVEL SECURITY;

-- ポリシーは DROP IF EXISTS してから再作成（上書き不可のため）
DROP POLICY IF EXISTS "facilities_owner" ON facilities;
CREATE POLICY "facilities_owner" ON facilities
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "teams_owner" ON teams;
CREATE POLICY "teams_owner" ON teams
  USING (facility_id IN (
    SELECT id FROM facilities WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "patients_owner" ON patients;
CREATE POLICY "patients_owner" ON patients
  USING (team_id IN (
    SELECT t.id FROM teams t
    JOIN facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "drugs_owner" ON drugs;
CREATE POLICY "drugs_owner" ON drugs
  USING (patient_id IN (
    SELECT p.id FROM patients p
    JOIN teams t ON p.team_id = t.id
    JOIN facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "change_logs_owner" ON change_logs;
CREATE POLICY "change_logs_owner" ON change_logs
  USING (patient_id IN (
    SELECT p.id FROM patients p
    JOIN teams t ON p.team_id = t.id
    JOIN facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));
