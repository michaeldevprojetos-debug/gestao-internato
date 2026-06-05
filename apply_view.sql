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
    nome TEXT NOT NULL,
    matricula TEXT UNIQUE,
    semestre INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alocacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
    preceptor_id UUID REFERENCES public.preceptores(id) ON DELETE CASCADE,
    unidade_id UUID REFERENCES public.unidades(id) ON DELETE CASCADE,
    especialidade_id UUID REFERENCES public.especialidades(id) ON DELETE SET NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    hora_inicio TIME,
    hora_fim TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP VIEW IF EXISTS public.vw_dashboard_preceptores CASCADE;

CREATE OR REPLACE VIEW public.vw_dashboard_preceptores AS
SELECT 
    p.id AS preceptor_id,
    p.nome AS preceptor_nome,
    e.nome AS especialidade_nome,
    u.id AS unidade_id,
    u.nome AS unidade_nome,
    u.tipo AS unidade_tipo,
    u.ativo AS unidade_ativa,
    COUNT(DISTINCT a.aluno_id) AS total_alunos
FROM public.preceptores p
LEFT JOIN public.especialidades e ON p.especialidade_id = e.id
LEFT JOIN public.alocacoes a ON p.id = a.preceptor_id 
    AND (a.data_fim IS NULL OR a.data_fim >= CURRENT_DATE)
LEFT JOIN public.unidades u ON a.unidade_id = u.id
GROUP BY 
    p.id, 
    p.nome, 
    e.nome,
    u.id, 
    u.nome, 
    u.tipo, 
    u.ativo;
