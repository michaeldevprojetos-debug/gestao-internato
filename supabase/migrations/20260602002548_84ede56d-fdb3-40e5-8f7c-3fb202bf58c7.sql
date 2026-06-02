DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'super_admin');
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = 'admin'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'admin';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'app_role' AND e.enumlabel = 'super_admin'
    ) THEN
      ALTER TYPE public.app_role ADD VALUE 'super_admin';
    END IF;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_admin_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'super_admin'::public.app_role)
$$;

DROP POLICY IF EXISTS "Admins can read user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can manage user roles" ON public.user_roles;

CREATE POLICY "Admins can read user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Super admins can manage user roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));

CREATE OR REPLACE VIEW public.alunos_safe
WITH (security_invoker = on) AS
SELECT id, nome, semestre, status, created_at, matricula
FROM public.alunos;

GRANT SELECT ON public.alunos_safe TO authenticated;
GRANT ALL ON public.alunos_safe TO service_role;
REVOKE ALL ON public.alunos_safe FROM anon;

REVOKE ALL ON public.alunos FROM anon;
REVOKE ALL ON public.preceptores FROM anon;
REVOKE ALL ON public.rotacoes FROM anon;
REVOKE ALL ON public.vinculo_operacional FROM anon;
REVOKE ALL ON public.user_roles FROM anon;

DROP POLICY IF EXISTS "Authenticated read alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated insert alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated update alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated delete alunos" ON public.alunos;
DROP POLICY IF EXISTS "Authenticated read preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Authenticated insert preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Authenticated update preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Authenticated delete preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Authenticated read rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Authenticated insert rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Authenticated update rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Authenticated delete rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Authenticated read vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Authenticated insert vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Authenticated update vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Authenticated delete vinculo_operacional" ON public.vinculo_operacional;

DROP POLICY IF EXISTS "Admin read alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin insert alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin update alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin delete alunos" ON public.alunos;
DROP POLICY IF EXISTS "Admin read preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Admin insert preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Admin update preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Admin delete preceptores" ON public.preceptores;
DROP POLICY IF EXISTS "Admin read rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Admin insert rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Admin update rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Admin delete rotacoes" ON public.rotacoes;
DROP POLICY IF EXISTS "Admin read vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Admin insert vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Admin update vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Admin delete vinculo_operacional" ON public.vinculo_operacional;

CREATE POLICY "Admin read alunos"
ON public.alunos
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin insert alunos"
ON public.alunos
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin update alunos"
ON public.alunos
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin delete alunos"
ON public.alunos
FOR DELETE
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin read preceptores"
ON public.preceptores
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin insert preceptores"
ON public.preceptores
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin update preceptores"
ON public.preceptores
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin delete preceptores"
ON public.preceptores
FOR DELETE
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin read rotacoes"
ON public.rotacoes
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin insert rotacoes"
ON public.rotacoes
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin update rotacoes"
ON public.rotacoes
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin delete rotacoes"
ON public.rotacoes
FOR DELETE
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin read vinculo_operacional"
ON public.vinculo_operacional
FOR SELECT
TO authenticated
USING (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin insert vinculo_operacional"
ON public.vinculo_operacional
FOR INSERT
TO authenticated
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin update vinculo_operacional"
ON public.vinculo_operacional
FOR UPDATE
TO authenticated
USING (public.has_admin_access(auth.uid()))
WITH CHECK (public.has_admin_access(auth.uid()));

CREATE POLICY "Admin delete vinculo_operacional"
ON public.vinculo_operacional
FOR DELETE
TO authenticated
USING (public.has_admin_access(auth.uid()));