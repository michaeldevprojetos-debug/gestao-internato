import re

with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. HospitaisPage state
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

# 3. Update PreceptorCard props
props_search = r"(onUpdateQuantidade:\s*\(vinculoId:\s*string\s*\|\s*null,\s*preceptorId:\s*string,\s*value:\s*number\)\s*=>\s*void;\s*\}\))"
props_replace = r"\1\n  onEdit?: () => void;"
code = re.sub(props_search, props_replace, code)

header_search = r"(<span className=\"font-semibold text-sm text-foreground\">\{p\.nome\}</span>\s*\{p\.especialidade && \(\s*<Badge variant=\"outline\" className=\"text-\[10px\] py-0\">\s*\{p\.especialidade\}\s*</Badge>\s*\)\})"
header_replace = r"""\1
          {onEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}"""
code = re.sub(header_search, header_replace, code)

with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
    f.write(code)
print("Regex replace applied")
