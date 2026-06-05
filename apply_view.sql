-- 1. Cria as colunas de calendário e horário que o front-end está tentando ler e gravar
ALTER TABLE public.alocacoes ADD COLUMN IF NOT EXISTS data_inicio DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.alocacoes ADD COLUMN IF NOT EXISTS data_fim DATE;
ALTER TABLE public.alocacoes ADD COLUMN IF NOT EXISTS hora_inicio TIME WITHOUT TIME ZONE;
ALTER TABLE public.alocacoes ADD COLUMN IF NOT EXISTS hora_fim TIME WITHOUT TIME ZONE;
ALTER TABLE public.alocacoes ADD COLUMN IF NOT EXISTS carga_horaria INTEGER;

-- 2. Limpa de forma absoluta qualquer registro fantasma para zerar os testes
TRUNCATE TABLE public.alocacoes CASCADE;

-- 3. Recria a View de forma limpa acompanhando os novos campos de data
DROP VIEW IF EXISTS public.vw_dashboard_preceptores CASCADE;
CREATE OR REPLACE VIEW public.vw_dashboard_preceptores AS
SELECT
    al.id AS alocacao_id,
    p.nome AS preceptor,
    e.nome AS especialidade,
    u.nome AS unidade,
    a.nome AS aluno,
    al.carga_horaria AS carga_horaria,
    al.data_inicio,
    al.data_fim,
    al.hora_inicio,
    al.hora_fim,
    p.id AS preceptor_id,
    u.id AS unidade_id,
    e.id AS especialidade_id
FROM public.alocacoes al
INNER JOIN public.alunos a ON a.id = al.aluno_id
INNER JOIN public.preceptores p ON p.id = al.preceptor_id
INNER JOIN public.unidades u ON u.id = al.unidade_id
LEFT JOIN public.especialidades e ON e.id = al.especialidade_id;

-- 4. Notifica o cache do Supabase para atualizar o Schema imediatamente
NOTIFY pgrst, 'reload schema';
