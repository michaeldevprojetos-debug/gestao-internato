import re

with open('src/routes/hospitais.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Define handleLimparPreceptor inside HospitaisPage
handle_limpar_def = """  const handleDeleteLocal = async (id: string, nome: string) => {
    if (!window.confirm(`Deseja realmente excluir a unidade "${nome}"?`)) return;
    try {
      const { error } = await supabase.from("unidades").delete().eq("id", id);
      if (error) throw error;
      toast.success("Unidade excluída com sucesso!");
      fetchLocais();
    } catch (error: any) {
      toast.error("Erro ao excluir unidade: " + error.message);
    }
  };

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
  };"""

# Replace the original handleDeleteLocal with the new one that includes handleLimparPreceptor
if "const handleLimparPreceptor =" not in code:
    code = re.sub(
        r'  const handleDeleteLocal = async \(id: string, nome: string\) => \{.*?  \};\n',
        handle_limpar_def + '\n',
        code,
        flags=re.DOTALL
    )


# 2. Add handleLimparPreceptor to PreceptorCard invocation
old_invocation = """                                          onUpdateQuantidade={handleUpdateQuantidade}
                                          onEdit={() => setEditingPreceptor({ preceptor: p, unidadeId: u.id })}
                                        />"""
new_invocation = """                                          onUpdateQuantidade={handleUpdateQuantidade}
                                          onEdit={() => setEditingPreceptor({ preceptor: p, unidadeId: u.id })}
                                          handleLimparPreceptor={(id) => handleLimparPreceptor(u.id, id)}
                                        />"""
if "handleLimparPreceptor={" not in code:
    code = code.replace(old_invocation, new_invocation)


# 3. Modify PreceptorCard definition to accept handleLimparPreceptor and remove onClear
old_def1 = """  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;
  onEdit?: () => void;
  onClear?: () => void;
}) {"""
new_def1 = """  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;
  onEdit?: () => void;
  handleLimparPreceptor?: (id: string) => void;
}) {"""
code = code.replace(old_def1, new_def1)

old_def2 = """  onUpdateQuantidade,
  onEdit,
  onClear,
}: {"""
new_def2 = """  onUpdateQuantidade,
  onEdit,
  handleLimparPreceptor,
}: {"""
code = code.replace(old_def2, new_def2)


# 4. Modify PreceptorCard header buttons
old_buttons = """          <div className="ml-auto flex items-center gap-2">
            {onClear && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); onClear(); }} title="Limpar registro deste preceptor no bloco">
                <Eraser className="w-4 h-4 mr-2" /> <span>Limpar</span>
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>"""

new_buttons = """          <div className="ml-auto flex items-center gap-2">
            {handleLimparPreceptor && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); handleLimparPreceptor(p.id); }} title="Limpar registro deste preceptor no bloco">
                <Eraser className="w-4 h-4 mr-2" /> <span>Limpar</span>
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>"""

code = code.replace(old_buttons, new_buttons)


with open('src/routes/hospitais.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied strict changes")
