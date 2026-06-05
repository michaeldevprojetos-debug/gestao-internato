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

-- Migrar dados de locais para unidades (mantém os mesmos IDs)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'locais') THEN
    INSERT INTO public.unidades (id, nome, tipo)
    SELECT id, nome, tipo FROM public.locais
    ON CONFLICT (nome) DO NOTHING;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.especialidades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir especialidades obrigatórias
INSERT INTO public.especialidades (nome) VALUES 
  ('Clínica Médica'),
  ('Cirurgia Geral'),
  ('Pediatria'),
  ('Ginecologia e Obstetrícia'),
  ('Ortopedia'),
  ('Cardiologia'),
  ('Neurologia'),
  ('Psiquiatria'),
  ('Dermatologia'),
  ('Oftalmologia'),
  ('Otorrinolaringologia'),
  ('Urologia'),
  ('Anestesiologia'),
  ('Medicina de Família'),
  ('Saúde Mental'),
  ('Emergência'),
  ('Outra')
ON CONFLICT (nome) DO NOTHING;

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

-- Migrar vinculos_operacionais para alocacoes
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'vinculo_operacional') THEN
    INSERT INTO public.alocacoes (aluno_id, preceptor_id, unidade_id, carga_horaria)
    SELECT 
      v.aluno_id, 
      v.preceptor_id, 
      p.local_id, 
      v.horas_realizadas
    FROM public.vinculo_operacional v
    JOIN public.preceptores p ON p.id = v.preceptor_id
    WHERE v.aluno_id IS NOT NULL AND v.preceptor_id IS NOT NULL
    -- Considerando apenas registros mais recentes ou simplificando. A inserção não gera conflito único por padrão.
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- NOVO MÓDULO: AGENDA DE PRECEPTORIA
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.agenda_preceptoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    preceptor_id UUID REFERENCES public.preceptores(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    especialidade_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
    data DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fim TIME NOT NULL,
    status TEXT DEFAULT 'ativo' CHECK (status IN ('ativo', 'cancelado', 'concluído')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.agenda_preceptoria ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_preceptoria' AND policyname = 'Authenticated users can manage agenda') THEN
    CREATE POLICY "Authenticated users can manage agenda"
      ON public.agenda_preceptoria
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'agenda_preceptoria' AND policyname = 'Anon users can manage agenda') THEN
    CREATE POLICY "Anon users can manage agenda"
      ON public.agenda_preceptoria
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;


-- ═══════════════════════════════════════════════════════════════════════
-- ETAPA 1: TABELA DE CONFIGURAÇÕES (ÚNICA FONTE DE VERDADE)
-- ═══════════════════════════════════════════════════════════════════════
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

ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Authenticated users can read config') THEN
    CREATE POLICY "Authenticated users can read config" ON public.configuracoes_sistema FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Authenticated users can update config') THEN
    CREATE POLICY "Authenticated users can update config" ON public.configuracoes_sistema FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Anon users can read config') THEN
    CREATE POLICY "Anon users can read config" ON public.configuracoes_sistema FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'configuracoes_sistema' AND policyname = 'Anon users can update config') THEN
    CREATE POLICY "Anon users can update config" ON public.configuracoes_sistema FOR UPDATE TO anon USING (true) WITH CHECK (true);
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
-- REALTIME
-- ═══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'configuracoes_sistema') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.configuracoes_sistema;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'agenda_preceptoria') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_preceptoria;
  END IF;
END
$$;
