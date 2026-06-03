-- ─── Migration: Criar tabela locais e vincular a preceptores ─────────────────
-- Execute este script no painel SQL do Supabase (https://supabase.com/dashboard)

-- 1. Criar a tabela locais
CREATE TABLE IF NOT EXISTS public.locais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Outro',
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Adicionar coluna local_id em preceptores (FK para locais)
ALTER TABLE public.preceptores
  ADD COLUMN IF NOT EXISTS local_id uuid REFERENCES public.locais(id) ON DELETE SET NULL;

-- 3. Habilitar RLS na tabela locais
ALTER TABLE public.locais ENABLE ROW LEVEL SECURITY;

-- 4. Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locais TO authenticated;
GRANT ALL ON public.locais TO service_role;
REVOKE ALL ON public.locais FROM anon;

-- 5. Políticas RLS
DROP POLICY IF EXISTS "Admin read locais"   ON public.locais;
DROP POLICY IF EXISTS "Admin insert locais" ON public.locais;
DROP POLICY IF EXISTS "Admin update locais" ON public.locais;
DROP POLICY IF EXISTS "Admin delete locais" ON public.locais;

CREATE POLICY "Admin read locais"
  ON public.locais FOR SELECT TO authenticated
  USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin insert locais"
  ON public.locais FOR INSERT TO authenticated
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin update locais"
  ON public.locais FOR UPDATE TO authenticated
  USING (public.has_admin_access(auth.uid()))
  WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin delete locais"
  ON public.locais FOR DELETE TO authenticated
  USING (public.has_admin_access(auth.uid()));

-- 6. Popular com as unidades reais (só executa se a tabela estiver vazia)
INSERT INTO public.locais (nome, tipo)
SELECT nome, tipo FROM (VALUES
  ('Obras Sociais Irmã Dulce',             'Hospital'),
  ('Hospital Municipal',                   'Hospital'),
  ('Hospital Martagão Gesteira',           'Hospital'),
  ('Hospital Manoel Victorino',            'Hospital'),
  ('Menandro de Farias',                   'Hospital'),
  ('2 de Julho',                           'Hospital'),
  ('Maternidade José Maria de Magalhães',  'Maternidade'),
  ('Maternidade Regional de Camaçari',     'Maternidade'),
  ('UPA Marback',                          'UPA'),
  ('UPA Pirajá',                           'UPA'),
  ('CAPS Águas Claras',                    'CAPS'),
  ('CAPS São Caetano Valeria',             'CAPS'),
  ('CAPS Liberdade',                       'CAPS'),
  ('CAPS Maria Celia da Rocha',            'CAPS'),
  ('Clínica Escola Civil Trade',           'Clínica'),
  ('Núcleo Médico Ocular',                 'Clínica'),
  ('USF Arraial do Retiro',                'UBS'),
  ('USF Beira Mangue',                     'UBS'),
  ('USF Alto do Coquerinho',               'UBS'),
  ('USF Estrada da COCISA',                'UBS'),
  ('USF Vista Alegre',                     'UBS'),
  ('UBS Periperi',                         'UBS'),
  ('USF Alto do Congo',                    'UBS'),
  ('USF Areal',                            'UBS'),
  ('USF São Gonçalo',                      'UBS'),
  ('UBS Ramiro de Azevedo',                'UBS'),
  ('UBS Barbalho',                         'UBS'),
  ('Gestão Metropolitano',                 'Outro'),
  ('Atendimento Móvel de Urgência',        'Outro'),
  ('Pronto Atendimento Psiquiátrico PAP',  'Outro')
) AS v(nome, tipo)
WHERE NOT EXISTS (SELECT 1 FROM public.locais LIMIT 1);
