import re

with open('src/routes/hospitais.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

handle_limpar_def = """function HospitaisPage() {
  const handleLimparPreceptor = async (unidadeId: string, preceptorId: string) => {
    if (!window.confirm("Deseja limpar o registro deste preceptor nesta unidade? Os alunos vinculados a ele neste bloco também serão desvinculados.")) return;
    try {
      const { error } = await supabase
        .from("alocacoes")
        .delete()
        .eq("unidade_id", unidadeId)
        .eq("preceptor_id", preceptorId);
      if (error) throw error;
      toast.success("Vínculo do preceptor removido do bloco.");
      queryClient.invalidateQueries({ queryKey: ["hospitaisData"] });
    } catch (e: any) {
      toast.error("Erro ao limpar vínculo: " + e.message);
    }
  };
"""

code = code.replace("function HospitaisPage() {", handle_limpar_def)

with open('src/routes/hospitais.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Injected handleLimparPreceptor into HospitaisPage")
