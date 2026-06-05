import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\preceptores.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add useQuery import
content = content.replace('import { useState, useEffect, useCallback, useRef } from "react";',
                          'import { useState, useEffect, useRef } from "react";\nimport { useQuery, useQueryClient } from "@tanstack/react-query";')

# Replace state and fetchData with useQuery
old_state_block = """  const [preceptores, setPreceptores] = useState<PreceptorRow[]>([]);
  const [filtered, setFiltered] = useState<PreceptorRow[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreceptor, setEditingPreceptor] = useState<PreceptorRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
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

      setPreceptores(rows);
      setFiltered(rows);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);"""

new_state_block = """  const queryClient = useQueryClient();

  const [filtered, setFiltered] = useState<PreceptorRow[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreceptor, setEditingPreceptor] = useState<PreceptorRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preceptoresData, isLoading: loading, error: queryError, refetch } = useQuery({
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
  });

  const preceptores = preceptoresData || [];
  const error = queryError ? (queryError as Error).message : null;

  // Force refetch on mount as requested
  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["preceptores"] });
  }, [queryClient]);"""

content = content.replace(old_state_block, new_state_block)

# Add invalidation to delete
content = content.replace("""      toast.success("Preceptor inativado com sucesso.");
      fetchData();""", """      toast.success("Preceptor inativado com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["preceptores"] });""")

# Update save to invalidate
content = content.replace("""        if (error) throw error;
        toast.success(isNew ? "Preceptor criado!" : "Preceptor atualizado!");
        setDialogOpen(false);
        fetchData();""", """        if (error) throw error;
        toast.success(isNew ? "Preceptor criado!" : "Preceptor atualizado!");
        setDialogOpen(false);
        queryClient.invalidateQueries({ queryKey: ["preceptores"] });""")

# Add Refetch Button next to "+ Adicionar"
content = content.replace("""          <Button variant="outline" className="hidden sm:flex" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {""", """          <Button variant="outline" className="hidden sm:flex" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => refetch()} title="Atualizar dados">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Atualizar
          </Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => {""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated preceptores.tsx with React Query.")
