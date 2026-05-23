-- ============================================================
-- 往診資料メーカー Supabase Schema
-- ============================================================

-- ① 施設 (Facilities)
CREATE TABLE facilities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ② チーム (Teams) ― 往診設定を保持
CREATE TABLE teams (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id          UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  clinic_name          TEXT NOT NULL,
  team_name            TEXT NOT NULL,
  -- 往診スケジュール: '第1・3週水曜' など, または 'custom'
  visit_schedule       TEXT,
  visit_schedule_custom TEXT,
  default_rx_days      INTEGER NOT NULL DEFAULT 14,
  grace_days           INTEGER NOT NULL DEFAULT 1,
  pharmacist_name      TEXT,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ③ 患者 (Patients)
CREATE TABLE patients (
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
CREATE TABLE drugs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id         UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  drug_type          TEXT NOT NULL CHECK (drug_type IN ('gaiyou', 'ton')),
  drug_name          TEXT NOT NULL,
  description        TEXT,
  prescribed_at      DATE,
  last_confirmed_at  DATE,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order         INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⑤ 薬剤変更ログ (Change Logs)
CREATE TABLE change_logs (
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

CREATE TRIGGER patients_updated_at
  BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE facilities   ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drugs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_logs  ENABLE ROW LEVEL SECURITY;

-- facilities: 自分のレコードのみ
CREATE POLICY "facilities_owner" ON facilities
  USING (user_id = auth.uid());

-- teams: 自分の施設に紐付くチームのみ
CREATE POLICY "teams_owner" ON teams
  USING (facility_id IN (
    SELECT id FROM facilities WHERE user_id = auth.uid()
  ));

-- patients: 自分のチームに紐付く患者のみ
CREATE POLICY "patients_owner" ON patients
  USING (team_id IN (
    SELECT t.id FROM teams t
    JOIN facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- drugs: 自分の患者に紐付く薬のみ
CREATE POLICY "drugs_owner" ON drugs
  USING (patient_id IN (
    SELECT p.id FROM patients p
    JOIN teams t ON p.team_id = t.id
    JOIN facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- change_logs: 自分の患者に紐付くログのみ
CREATE POLICY "change_logs_owner" ON change_logs
  USING (patient_id IN (
    SELECT p.id FROM patients p
    JOIN teams t ON p.team_id = t.id
    JOIN facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));
