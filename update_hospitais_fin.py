import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add valor_hora to PreceptorSimple
content = content.replace("""type PreceptorSimple = {
  id: string;
  nome: string;
  especialidade: string | null;
  units?: string[];
};""", """type PreceptorSimple = {
  id: string;
  nome: string;
  especialidade: string | null;
  valor_hora?: number | null;
  units?: string[];
};""")

# Add valor_hora to LocalRow preceptoresList
content = content.replace("""    horas_realizadas: number | null;
  }>;""", """    horas_realizadas: number | null;
    valor_hora: number | null;
  }>;""")

# Add valor_hora to query
content = content.replace("""        .select("id, nome, especialidade")
        .order("nome")) as { data: any[] | null; error: any };""", """        .select("id, nome, especialidade, valor_hora")
        .order("nome")) as { data: any[] | null; error: any };""")

# Add valor_hora to preceptoresList map
content = content.replace("""              ch_prevista: pqtd?.ch_prevista ?? null,
              horas_realizadas: pqtd?.horas_realizadas ?? null,
            };""", """              ch_prevista: pqtd?.ch_prevista ?? null,
              horas_realizadas: pqtd?.horas_realizadas ?? null,
              valor_hora: p.valor_hora ?? 0,
            };""")

# Render costs in PreceptorCard
ui_code = """
        {/* Custos Financeiros */}
        <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Custo Total Rotação</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((p.horas_realizadas || 0) * (p.valor_hora || 0))}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Custo Prop. por Aluno</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {p.quantidadeAlunos > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((p.horas_realizadas || 0) * (p.valor_hora || 0)) / p.quantidadeAlunos) : 'R$ 0,00'}
            </span>
          </div>
        </div>
"""

content = content.replace("""        <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/40 border border-border/50">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Quantidade de alunos por preceptor(a):
          </Label>
          <Input
            type="number"
            min={0}
            value={localQtd}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-16 h-7 text-center text-sm font-bold"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>""", f"""        <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/40 border border-border/50">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Quantidade de alunos por preceptor(a):
          </Label>
          <Input
            type="number"
            min={{0}}
            value={{localQtd}}
            onChange={{(e) => handleChange(Number(e.target.value))}}
            className="w-16 h-7 text-center text-sm font-bold"
            onClick={{(e) => e.stopPropagation()}}
          />
        </div>
{ui_code}
      </div>""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated hospitais.tsx financials successfully.")
