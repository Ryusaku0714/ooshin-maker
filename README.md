# 往診資料メーカー

施設薬剤師の往診業務をサポートする Web アプリ。

## 機能
- 施設→チーム→患者の階層管理
- 往診日・処方日数・猶予日数から処方期間を自動計算
- 外用・頓用薬管理（追加薬日数計算ツール付き）
- 薬剤変更ログ
- フリーメモ
- Google ログイン（Supabase Auth）
- スマホ対応

## 技術スタック
React + Vite / Supabase (PostgreSQL + RLS) / Vercel

## セットアップ

1. Supabase プロジェクト作成 → `supabase/schema.sql` を実行
2. Google OAuth を Supabase Auth で有効化
3. `.env.example` を `.env.local` にコピーして URL・キーを設定
4. `npm install && npm run dev`
