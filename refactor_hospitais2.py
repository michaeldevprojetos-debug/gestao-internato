import re

with open("src/routes/hospitais_bak.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. State
state_search = r"(const \[editingLocal, setEditingLocal\] = useState<LocalRow \| null>\(null\);)"
state_replace = r"\1\n  const [editingPreceptor, setEditingPreceptor] = useState<{ preceptor: LocalRow[\"preceptoresList\"][number] | null, unidadeId: string } | null>(null);"
code = re.sub(state_search, state_replace, code)

# 2. Add Vincular Preceptor Button
button_search = r"(<h4 className=\"text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3\">\s*Distribuição de Preceptores e Alunos\s*</h4>)"
button_replace = r"""<div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Distribuição de Preceptores e Alunos
                                  </h4>
                                  <Button size="sm" variant="outline" onClick={() => setEditingPreceptor({ preceptor: null, unidadeId: u.id })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Vincular Preceptor
                                  </Button>
                                </div>"""
code = re.sub(button_search, button_replace, code)

# 3. Update PreceptorCard invocation
precep_invoc_search = r"(<PreceptorCard\s+key=\{p\.id\}\s+preceptor=\{p\}\s+students=\{students\}\s+exceeded=\{exceeded\}\s+limiteAlunos=\{limiteAlunos\}\s+onUpdateQuantidade=\{handleUpdateQuantidade\}\s+/>)"
precep_invoc_replace = r"""<PreceptorCard
                                          key={p.id}
                                          preceptor={p}
                                          students={students}
                                          exceeded={exceeded}
                                          limiteAlunos={limiteAlunos}
                                          onUpdateQuantidade={handleUpdateQuantidade}
                                          onEdit={() => setEditingPreceptor({ preceptor: p, unidadeId: u.id })}
                                        />"""
code = re.sub(precep_invoc_search, precep_invoc_replace, code)

# 4. Dialog rendering in HospitaisPage
dialog_search = r"(<GerenciarUnidadeDialog\s+open=\{dialogOpen\}\s+onOpenChange=\{setDialogOpen\}\s+local=\{editingLocal\}\s+allLocaisSimple=\{allLocaisSimple\}\s+allAlunos=\{allAlunos\}\s+onSaved=\{\(\) => \{\s+setDialogOpen\(false\);\s+fetchLocais\(\);\s+queryClient\.invalidateQueries\(\{ queryKey: \[\"dashboardData\"\] \}\);\s+queryClient\.invalidateQueries\(\{ queryKey: \[\"alocacoes\"\] \}\);\s+\}\}\s+/>)"
dialog_replace = r"""<GerenciarUnidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        local={editingLocal}
        allLocaisSimple={allLocaisSimple}
        onSaved={() => {
          setDialogOpen(false);
          fetchLocais();
          queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
        }}
      />
      
      {/* ── Modal Gerenciar Alocação do Preceptor ── */}
      <GerenciarAlocacaoPreceptorDialog
        open={!!editingPreceptor}
        onOpenChange={(o) => !o && setEditingPreceptor(null)}
        preceptor={editingPreceptor?.preceptor ?? null}
        unidadeId={editingPreceptor?.unidadeId ?? ""}
        allAlunos={allAlunos}
        allLocaisSimple={allLocaisSimple}
        onSaved={() => {
          setEditingPreceptor(null);
          fetchLocais();
          queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
        }}
      />"""
code = re.sub(dialog_search, dialog_replace, code)

# 5. PreceptorCard props definition
props_search = r"(function PreceptorCard\(\{\s*preceptor,\s*students,\s*exceeded,\s*limiteAlunos,\s*onUpdateQuantidade,\s*\}\:\s*\{\s*preceptor:\s*LocalRow\[\"preceptoresList\"\]\[number\];\s*students:\s*LocalRow\[\"alunosVinculados\"\];\s*exceeded:\s*boolean;\s*limiteAlunos:\s*number;\s*onUpdateQuantidade:\s*\(vinculoId:\s*string\s*\|\s*null,\s*preceptorId:\s*string,\s*value:\s*number\)\s*=>\s*void;\s*\})"
props_replace = r"function PreceptorCard({\n  preceptor,\n  students,\n  exceeded,\n  limiteAlunos,\n  onUpdateQuantidade,\n  onEdit,\n}: {\n  preceptor: LocalRow[\"preceptoresList\"][number];\n  students: LocalRow[\"alunosVinculados\"];\n  exceeded: boolean;\n  limiteAlunos: number;\n  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;\n  onEdit?: () => void;\n})"
code = re.sub(props_search, props_replace, code)

# 6. PreceptorCard Header Pencil button
header_search = r"(<span className=\"font-semibold text-sm text-foreground\">\{p\.nome\}</span>\s*\{p\.especialidade && \(\s*<Badge variant=\"outline\" className=\"text-\[10px\] py-0\">\s*\{p\.especialidade\}\s*</Badge>\s*\)\})"
header_replace = r"""\1
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}"""
code = re.sub(header_search, header_replace, code)

# Split and append new dialogs
parts = code.split("// ─── Modal: Gerenciar Unidade (Formulário Inteligente) ────────────────────────")
if len(parts) == 2:
    with open("src/routes/hospitais_new_dialogs.tsx", "r", encoding="utf-8") as f:
        new_dialogs = f.read()
    
    final_code = parts[0] + new_dialogs
    
    with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
        f.write(final_code)
    print("Successfully replaced and merged.")
else:
    print("Could not find split marker.")
