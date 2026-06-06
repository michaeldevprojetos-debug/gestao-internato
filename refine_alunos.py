import re

with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update AlunoSimple type
type_search = r"(type AlunoSimple = \{\s*id: string;\s*nome: string;\s*semestre: number \| null;\s*\};)"
type_replace = r"type AlunoSimple = {\n  id: string;\n  nome: string;\n  semestre: number | null;\n  matricula?: string | null;\n  isOcupado?: boolean;\n  ocupadoLocal?: string;\n};"
code = re.sub(type_search, type_replace, code)

# 2. Replace AlunoMultiSelect component
# We find it by regex
component_pattern = r"(function AlunoMultiSelect\(\{.*?)(?=// ─── Modal: Gerenciar Unidade \(Formulário Inteligente\) ────────────────────────)"
# Wait, this regex is too broad, it might capture too much.
# Let's split by // ─── Modal: Gerenciar Unidade
parts = code.split("// ─── Modal: Gerenciar Unidade (Formulário Inteligente) ────────────────────────")
part1 = parts[0]
part2 = parts[1] if len(parts) > 1 else ""

# In part1, find AlunoMultiSelect
# It starts with "function AlunoMultiSelect({"
# and ends right before the split.
# Wait, let's just replace it using string split.
part1_split = part1.split("function AlunoMultiSelect({")
if len(part1_split) > 1:
    before_multiselect = part1_split[0]
    
    with open("src/components/AlunoMultiSelect_new.tsx", "r", encoding="utf-8") as f:
        new_multiselect = f.read()
    
    # We append the new multiselect and then part2
    # But part2 contains the Modal Gerenciar Unidade.
    # What about the invocation in part2?
    code = before_multiselect + new_multiselect + "\n// ─── Modal: Gerenciar Unidade (Formulário Inteligente) ────────────────────────\n" + part2
    
    # Now update the invocation in GerenciarAlocacaoPreceptorDialog
    invoc_search = r"(<AlunoMultiSelect\s*allAlunos=\{allAlunos\}\s*selectedAlunoIds=\{alunoIds\}\s*onChangeAlunoIds=\{setAlunoIds\}\s*preceptorNome=\{selectedPreceptor\.nome\}\s*/>)"
    invoc_replace = r"""<AlunoMultiSelect
                  allAlunos={allAlunos}
                  selectedAlunoIds={alunoIds}
                  onChangeAlunoIds={setAlunoIds}
                  preceptorNome={selectedPreceptor.nome}
                  dataInicio={dataInicio}
                  dataFim={dataFim}
                  horaInicio={horaInicio}
                  horaFim={horaFim}
                  unidadeId={unidadeId}
                />"""
    code = re.sub(invoc_search, invoc_replace, code)

    with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
        f.write(code)
    print("Done replacing AlunoMultiSelect")
else:
    print("AlunoMultiSelect not found")
