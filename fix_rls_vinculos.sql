-- Executar no SQL Editor do Supabase para restaurar as permissões
ALTER TABLE public.vinculo_operacional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin read vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Admin insert vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Admin update vinculo_operacional" ON public.vinculo_operacional;
DROP POLICY IF EXISTS "Admin delete vinculo_operacional" ON public.vinculo_operacional;

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
