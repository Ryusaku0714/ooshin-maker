-- ============================================================
-- 往診資料メーカー Supabase Schema
-- ※ 冪等設計: 何度実行しても安全 (IF NOT EXISTS / DROP IF EXISTS)
-- ※ テーブル名は om_ プレフィックスで facility-note と分離
-- ============================================================

-- ① 施設 (om_facilities)
CREATE TABLE IF NOT EXISTS om_facilities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ② チーム (om_teams) ― 往診設定を保持
-- visit_schedule の値例: 第1・3週水曜, 第2・4週水曜, 毎週水曜, custom
CREATE TABLE IF NOT EXISTS om_teams (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id           UUID NOT NULL REFERENCES om_facilities(id) ON DELETE CASCADE,
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

-- ③ 患者 (om_patients)
CREATE TABLE IF NOT EXISTS om_patients (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id                 UUID NOT NULL REFERENCES om_teams(id) ON DELETE CASCADE,
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

-- ④ 外用・頓用薬 (om_drugs)
CREATE TABLE IF NOT EXISTS om_drugs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id        UUID NOT NULL REFERENCES om_patients(id) ON DELETE CASCADE,
  drug_type         TEXT NOT NULL CHECK (drug_type IN ('gaiyou', 'ton')),
  drug_name         TEXT NOT NULL,
  description       TEXT,
  prescribed_at     DATE,
  last_confirmed_at DATE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ⑤ 薬剤変更ログ (om_change_logs)
CREATE TABLE IF NOT EXISTS om_change_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id  UUID NOT NULL REFERENCES om_patients(id) ON DELETE CASCADE,
  changed_at  DATE NOT NULL DEFAULT CURRENT_DATE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- updated_at 自動更新トリガー
-- ============================================================
CREATE OR REPLACE FUNCTION om_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS om_patients_updated_at ON om_patients;
CREATE TRIGGER om_patients_updated_at
  BEFORE UPDATE ON om_patients
  FOR EACH ROW EXECUTE FUNCTION om_update_updated_at();

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE om_facilities  ENABLE ROW LEVEL SECURITY;
ALTER TABLE om_teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE om_patients    ENABLE ROW LEVEL SECURITY;
ALTER TABLE om_drugs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE om_change_logs ENABLE ROW LEVEL SECURITY;

-- om_facilities: 自分のレコードのみ
DROP POLICY IF EXISTS "om_facilities_owner" ON om_facilities;
CREATE POLICY "om_facilities_owner" ON om_facilities
  USING (user_id = auth.uid());

-- om_teams: 自分の施設に紐付くチームのみ
DROP POLICY IF EXISTS "om_teams_owner" ON om_teams;
CREATE POLICY "om_teams_owner" ON om_teams
  USING (facility_id IN (
    SELECT id FROM om_facilities WHERE user_id = auth.uid()
  ));

-- om_patients: 自分のチームに紐付く患者のみ
DROP POLICY IF EXISTS "om_patients_owner" ON om_patients;
CREATE POLICY "om_patients_owner" ON om_patients
  USING (team_id IN (
    SELECT t.id FROM om_teams t
    JOIN om_facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- om_drugs: 自分の患者に紐付く薬のみ
DROP POLICY IF EXISTS "om_drugs_owner" ON om_drugs;
CREATE POLICY "om_drugs_owner" ON om_drugs
  USING (patient_id IN (
    SELECT p.id FROM om_patients p
    JOIN om_teams t ON p.team_id = t.id
    JOIN om_facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- om_change_logs: 自分の患者に紐付くログのみ
DROP POLICY IF EXISTS "om_change_logs_owner" ON om_change_logs;
CREATE POLICY "om_change_logs_owner" ON om_change_logs
  USING (patient_id IN (
    SELECT p.id FROM om_patients p
    JOIN om_teams t ON p.team_id = t.id
    JOIN om_facilities f ON t.facility_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- ============================================================
-- ★ ホワイトリスト不要・オープン登録の設計方針
-- ============================================================
-- ・Googleログインしたユーザーは全員即時アカウント作成される
-- ・事前メール登録・管理者承認は一切不要
-- ・各ユーザーは自分のデータのみアクセス可能 (user_id = auth.uid())
-- ・facility-note のようなメールアドレス制限は導入しない

-- ============================================================
-- 既存 DB へのマイグレーション
-- ※ テーブルが既に存在する場合に user_id デフォルトを追加する
-- ============================================================
ALTER TABLE om_facilities
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ============================================================
-- v2 マイグレーション：変更ログ拡張 & 他科受診スケジュール
-- ============================================================

-- om_change_logs: 変更指示日(changed_at 流用), 理由, 開始日を追加
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS reason     TEXT;
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS start_date DATE;

-- om_patients: 他科受診スケジュール（JSONB配列）を追加
ALTER TABLE om_patients ADD COLUMN IF NOT EXISTS other_visits JSONB NOT NULL DEFAULT '[]'::jsonb;

-- ============================================================
-- v3 マイグレーション：チームごとの往診日を保存
-- ============================================================

-- om_teams: 最後に設定した往診日を保持
ALTER TABLE om_teams ADD COLUMN IF NOT EXISTS last_visit_date DATE;

-- ============================================================
-- v4 マイグレーション：外用・頓用薬に処方量・残数を追加
-- ============================================================

-- om_drugs: 処方量・残数を追加
ALTER TABLE om_drugs ADD COLUMN IF NOT EXISTS prescribed_quantity TEXT;
ALTER TABLE om_drugs ADD COLUMN IF NOT EXISTS remaining_quantity  TEXT;

-- ============================================================
-- v5 マイグレーション：外用・頓用薬にアーカイブフラグを追加
-- ============================================================

-- om_drugs: アーカイブフラグ（終了薬として保存）
ALTER TABLE om_drugs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- v6 メモ：他科受診アーカイブ
-- ============================================================
-- other_visits は om_patients.other_visits (JSONB配列) に格納されているため
-- テーブルへの ALTER は不要。各要素オブジェクトに is_archived: boolean を追加する。
-- SQL マイグレーションなし。

-- ============================================================
-- v7 マイグレーション：個人在宅モード追加
-- ============================================================
-- om_facilities: 個人在宅フラグを追加
ALTER TABLE om_facilities ADD COLUMN IF NOT EXISTS is_home_care BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- v8 マイグレーション：施設・チームメモ機能追加
-- ============================================================
ALTER TABLE om_facilities ADD COLUMN IF NOT EXISTS memo TEXT;
ALTER TABLE om_teams      ADD COLUMN IF NOT EXISTS memo TEXT;

-- ============================================================
-- v9 マイグレーション：患者ごとの処方日数・処方ズレ日数の個別設定
-- ============================================================
-- どちらも NULL の場合は個別設定OFF（チームのデフォルト値を使用）。
-- 両方に値が入っている場合のみ個別設定ONとして扱う。
ALTER TABLE om_patients ADD COLUMN IF NOT EXISTS custom_days   INTEGER;
ALTER TABLE om_patients ADD COLUMN IF NOT EXISTS custom_offset INTEGER;

-- ============================================================
-- v10 マイグレーション：基本情報に「定時薬」欄を追加
-- ============================================================
ALTER TABLE om_patients ADD COLUMN IF NOT EXISTS regular_medication TEXT;

-- ============================================================
-- v11 マイグレーション：薬剤変更記録に「臨時薬」モードを追加
-- ============================================================
-- log_type: 'regular'（定期変更・既定値・既存データもこの扱い） / 'temporary'（臨時薬）
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS log_type     TEXT NOT NULL DEFAULT 'regular';
-- 臨時薬：薬剤名・用量（自由テキスト）
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS drug_name    TEXT;
-- 臨時薬：開始タイミング（朝／昼／夕／眠前）
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS start_timing TEXT;
-- 臨時薬：終了タイミング（自動計算結果を保存）
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS end_timing   TEXT;
-- 臨時薬：日数
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS days         INTEGER;
-- 臨時薬：終了日
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS end_date     DATE;

-- ============================================================
-- v12 マイグレーション：薬剤変更記録にアーカイブ機能を追加
-- ============================================================
ALTER TABLE om_change_logs ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE;
