-- Script opcional para popular preceptores do prompt
INSERT INTO public.preceptores (nome, especialidade, ativo, tipo_remuneracao, valor_hora)
VALUES
('Amanda Oliveira de Carvalho', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Alceu Aguiar Pimentel', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Ana Cristina Lins e Lins', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Aurea de Fatima Batista de Carvalho', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Antonio Bezerra Viana Segundo', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Cristiana Silva Terto', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Daniela de Sá Lira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Edigard Mendes Neto', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Evônio de Carvalho Barros', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Eduardo Alisson Miranda Machado', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Emanuelly Correia Lemos', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Felipe Carvalho Torres', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Gilson Edmar Gonçalves e Silva', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Iraquitan Gonçalves de Oliveira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Jacqueline Carvalho de Oliveira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Jessica Diniz Ramos Silva', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('José Romero de Pontes Júnior', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Julliana Farias de Oliveira Marinho', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Joseilza Vieira de Melo', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Laila Bruna da Silva Ferreira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Leylanne de Cássia Barros Leal', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Luisa Oliveira Lira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Marcelo de Brito Ferreira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Maria Cleoneide Omena O. de Melo', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00),
('Marília Maniçoba Amorim de Oliveira', 'Ginecologia e Obstetrícia', true, 'Bolsa', 80.00)
ON CONFLICT DO NOTHING;
