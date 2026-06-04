-- ═══════════════════════════════════════════════════════════════════════
-- DASHBOARD EXECUTIVO AFYA — Schema completo (execute no SQL Editor)
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.unidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    tipo TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.preceptores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    especialidade_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alunos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula TEXT UNIQUE,
    nome TEXT NOT NULL,
    periodo INTEGER,
    turma TEXT,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alocacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    preceptor_id UUID REFERENCES public.preceptores(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    especialidade_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
    data_inicio DATE DEFAULT CURRENT_DATE,
    data_fim DATE,
    carga_horaria NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ETAPA 1: TABELA DE CONFIGURAÇÕES (ÚNICA FONTE DE VERDADE)
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
    chave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.configuracoes_sistema (chave, valor)
VALUES 
  ('limite_alunos_preceptor', '4'),
  ('limite_alunos_unidade', '20')
ON CONFLICT (chave) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════
-- RLS (Row Level Security) — CRÍTICO para que o frontend consiga ler/escrever
-- ═══════════════════════════════════════════════════════════════════════

-- Ativa RLS na tabela (seguro mas com policies permissivas para usuários autenticados)
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- Policy de SELECT: qualquer usuário autenticado pode ler configurações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Authenticated users can read config'
  ) THEN
    CREATE POLICY "Authenticated users can read config"
      ON public.configuracoes_sistema
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END
$$;

-- Policy de UPDATE: qualquer usuário autenticado pode alterar configurações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Authenticated users can update config'
  ) THEN
    CREATE POLICY "Authenticated users can update config"
      ON public.configuracoes_sistema
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- Policy para anon (caso o site funcione sem login em algum cenário)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Anon users can read config'
  ) THEN
    CREATE POLICY "Anon users can read config"
      ON public.configuracoes_sistema
      FOR SELECT
      TO anon
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Anon users can update config'
  ) THEN
    CREATE POLICY "Anon users can update config"
      ON public.configuracoes_sistema
      FOR UPDATE
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- VIEW PARA O DASHBOARD EXECUTIVO
-- ═══════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.vw_dashboard_preceptores CASCADE;
CREATE OR REPLACE VIEW public.vw_dashboard_preceptores AS
SELECT
    al.id AS alocacao_id,
    p.nome AS preceptor,
    e.nome AS especialidade,
    u.nome AS unidade,
    a.nome AS aluno,
    al.carga_horaria AS carga_horaria,
    p.id AS preceptor_id,
    u.id AS unidade_id,
    e.id AS especialidade_id
FROM public.alocacoes al
INNER JOIN public.alunos a ON a.id = al.aluno_id
INNER JOIN public.preceptores p ON p.id = al.preceptor_id
INNER JOIN public.unidades u ON u.id = al.unidade_id
LEFT JOIN public.especialidades e ON e.id = al.especialidade_id;

-- ═══════════════════════════════════════════════════════════════════════
-- REALTIME (apenas tabela nova — alocacoes já está na publication)
-- ═══════════════════════════════════════════════════════════════════════

-- Adiciona configuracoes_sistema ao Realtime (se ainda não estiver)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'configuracoes_sistema'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes_sistema;
  END IF;
END
$$;
