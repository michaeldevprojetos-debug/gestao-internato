
-- alunos
DROP POLICY IF EXISTS "Permitir acesso total alunos" ON public.alunos;
REVOKE ALL ON public.alunos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
CREATE POLICY "Authenticated read alunos" ON public.alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert alunos" ON public.alunos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update alunos" ON public.alunos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete alunos" ON public.alunos FOR DELETE TO authenticated USING (true);

-- preceptores
DROP POLICY IF EXISTS "Permitir acesso total preceptores" ON public.preceptores;
REVOKE ALL ON public.preceptores FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.preceptores TO authenticated;
GRANT ALL ON public.preceptores TO service_role;
CREATE POLICY "Authenticated read preceptores" ON public.preceptores FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert preceptores" ON public.preceptores FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update preceptores" ON public.preceptores FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete preceptores" ON public.preceptores FOR DELETE TO authenticated USING (true);

-- vinculo_operacional
DROP POLICY IF EXISTS "Permitir acesso total vinculos" ON public.vinculo_operacional;
REVOKE ALL ON public.vinculo_operacional FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vinculo_operacional TO authenticated;
GRANT ALL ON public.vinculo_operacional TO service_role;
CREATE POLICY "Authenticated read vinculo_operacional" ON public.vinculo_operacional FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert vinculo_operacional" ON public.vinculo_operacional FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update vinculo_operacional" ON public.vinculo_operacional FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete vinculo_operacional" ON public.vinculo_operacional FOR DELETE TO authenticated USING (true);

-- rotacoes
DROP POLICY IF EXISTS "Permitir acesso total rotacoes" ON public.rotacoes;
REVOKE ALL ON public.rotacoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rotacoes TO authenticated;
GRANT ALL ON public.rotacoes TO service_role;
CREATE POLICY "Authenticated read rotacoes" ON public.rotacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated insert rotacoes" ON public.rotacoes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update rotacoes" ON public.rotacoes FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated delete rotacoes" ON public.rotacoes FOR DELETE TO authenticated USING (true);
