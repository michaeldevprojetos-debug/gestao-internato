TRUNCATE TABLE public.vinculo_operacional CASCADE;
TRUNCATE TABLE public.alunos RESTART IDENTITY CASCADE;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;