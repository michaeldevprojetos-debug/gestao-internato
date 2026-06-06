import os
import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\preceptores.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the useQuery to use valor_hora_preceptor and add error handling
query_block_old = """  const { data: preceptoresData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["preceptores"],
    queryFn: async () => {
      const [precRes, espRes] = await Promise.all([
        supabase
          .from("preceptores" as any)
          .select("id, nome, especialidade_id, ativo, tipo_remuneracao, valor_hora, especialidades(nome)")
          .order("nome"),
        supabase
          .from("especialidades" as any)
          .select("id, nome")
          .order("nome"),
      ]);

      if (precRes.error) throw precRes.error;
      if (espRes.error) throw espRes.error;

      setEspecialidades((espRes.data || []) as unknown as Especialidade[]);

      const rows: PreceptorRow[] = ((precRes.data || []) as any[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        especialidade_id: p.especialidade_id,
        especialidade_nome: p.especialidades?.nome || null,
        ativo: p.ativo ?? true,
        tipo_remuneracao: p.tipo_remuneracao || "Bolsa",
        valor_hora: p.valor_hora || 80.00,
      }));
      return rows;
    }
  });"""

query_block_new = """  const { data: preceptoresData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["preceptores"],
    queryFn: async () => {
      const [precRes, espRes] = await Promise.all([
        supabase
          .from("preceptores" as any)
          .select("id, nome, especialidade_id, ativo, tipo_remuneracao, valor_hora_preceptor, especialidades(nome)")
          .order("nome"),
        supabase
          .from("especialidades" as any)
          .select("id, nome")
          .order("nome"),
      ]);

      if (precRes.error) {
        console.error("Erro na busca de preceptores:", precRes.error);
        toast.error("Erro ao buscar preceptores: " + precRes.error.message);
        throw precRes.error;
      }
      if (espRes.error) {
        console.error("Erro na busca de especialidades:", espRes.error);
        toast.error("Erro ao buscar especialidades: " + espRes.error.message);
        throw espRes.error;
      }

      setEspecialidades((espRes.data || []) as unknown as Especialidade[]);

      const rows: PreceptorRow[] = ((precRes.data || []) as any[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        especialidade_id: p.especialidade_id,
        especialidade_nome: p.especialidades?.nome || null,
        ativo: p.ativo ?? true,
        tipo_remuneracao: p.tipo_remuneracao || "Bolsa",
        valor_hora: p.valor_hora_preceptor || 80.00,
      }));
      return rows;
    }
  });"""

content = content.replace(query_block_old, query_block_new)

# Fix loading state check
loading_block_old = """              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length > 0 ? ("""

loading_block_new = """              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length > 0 ? ("""

# wait, I don't need to change the loading block if it's already using `loading ? ... : paginatedData.length > 0 ? ...`!
# Ah, the user said:
# 3. ESTADO DE CARREGAMENTO:
# Verifique se o estado `isLoading` do React Query está sendo devidamente respeitado antes de renderizar "Nenhum preceptor encontrado". Renderize um Skeleton ou texto "Carregando preceptores..." enquanto a query não finaliza.
# My code already had: `loading ? Array.from... : paginatedData.length > 0 ? ... : <TableRow><TableCell><p>Nenhum preceptor encontrado.</p></TableCell></TableRow>`. So the loading state WAS respected. The reason it rendered "Nenhum preceptor encontrado." was simply because `loading` became false after the query failed!

# I also need to fix `handleSave` to use `valor_hora_preceptor` instead of `valor_hora`.
save_block_old = """        tipo_remuneracao: tipoRemuneracao,
        valor_hora: valorHora === "" ? 0 : Number(valorHora),"""

save_block_new = """        tipo_remuneracao: tipoRemuneracao,
        valor_hora_preceptor: valorHora === "" ? 0 : Number(valorHora),"""

content = content.replace(save_block_old, save_block_new)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated preceptores mapping")
