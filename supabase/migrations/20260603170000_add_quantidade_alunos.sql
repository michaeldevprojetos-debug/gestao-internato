-- ─── Migration: Adicionar quantidade_alunos em vinculo_operacional ────────────
-- Execute este script no painel SQL do Supabase

ALTER TABLE public.vinculo_operacional
  ADD COLUMN IF NOT EXISTS quantidade_alunos integer NOT NULL DEFAULT 0;
