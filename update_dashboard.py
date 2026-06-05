import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state for selectedMes
content = content.replace("""  const [selectedEspecialidade, setSelectedEspecialidade] = useState<string>("all");
  const [selectedPreceptor, setSelectedPreceptor] = useState<string>("all");""", """  const [selectedEspecialidade, setSelectedEspecialidade] = useState<string>("all");
  const [selectedPreceptor, setSelectedPreceptor] = useState<string>("all");
  const [selectedMes, setSelectedMes] = useState<string>("all");""")

# 2. Add dynamicMesesFiltro
content = content.replace("""  const dynamicEspecialidadesFiltro = useMemo(() => {""", """  const dynamicMesesFiltro = useMemo(() => {
    const meses = new Set<string>();
    alocacoes.forEach(a => { if (a.mes_referencia) meses.add(a.mes_referencia); });
    return Array.from(meses).sort();
  }, [alocacoes]);

  const dynamicEspecialidadesFiltro = useMemo(() => {""")

# 3. Update filteredAloc
content = content.replace("""      const passEspecialidade = selectedEspecialidade === "all" || aEspecialidade === selectedEspecialidade;
      
      return passUnidade && passEspecialidade && passPreceptor;
    });
  }, [alocacoes, selectedUnidade, selectedEspecialidade, selectedPreceptor]);""", """      const passEspecialidade = selectedEspecialidade === "all" || aEspecialidade === selectedEspecialidade;
      const passMes = selectedMes === "all" || a.mes_referencia === selectedMes;
      
      return passUnidade && passEspecialidade && passPreceptor && passMes;
    });
  }, [alocacoes, selectedUnidade, selectedEspecialidade, selectedPreceptor, selectedMes]);""")

# 4. Add custoAcumulado to KPIs
content = content.replace("""    const especialidadeMap = new Map<string, Set<string>>();
    const unidadeMap = new Map<string, { nome: string; count: Set<string> }>();""", """    const especialidadeMap = new Map<string, Set<string>>();
    const unidadeMap = new Map<string, { nome: string; count: Set<string> }>();
    let custoAcumulado = 0;""")

content = content.replace("""      if (a.aluno) alunosSet.add(a.aluno);
      if (a.preceptor_id) preceptoresSet.add(a.preceptor_id);
      if (a.unidade_id) unidadesSet.add(a.unidade_id);""", """      if (a.aluno) alunosSet.add(a.aluno);
      if (a.preceptor_id) preceptoresSet.add(a.preceptor_id);
      if (a.unidade_id) unidadesSet.add(a.unidade_id);
      
      const rowCost = Number(a.custo_total_rotacao || 0);
      const qtdAlunos = Number(a.qtd_alunos_alocacao || 1);
      custoAcumulado += (rowCost / (qtdAlunos > 0 ? qtdAlunos : 1));""")

content = content.replace("""      alertasPreceptor: aPrec,
      alertasUnidade: aUni,
    };
  }, [filteredAloc, limitePreceptor, limiteUnidade]);""", """      alertasPreceptor: aPrec,
      alertasUnidade: aUni,
      custoAcumulado,
    };
  }, [filteredAloc, limitePreceptor, limiteUnidade]);""")

# 5. Extract custoAcumulado from useMemo
content = content.replace("""    especialidadeData,
    alertasPreceptor,
    alertasUnidade,
  } = useMemo(() => {""", """    especialidadeData,
    alertasPreceptor,
    alertasUnidade,
    custoAcumulado,
  } = useMemo(() => {""")

# 6. Add "Mês de Referência" Select to filters
ui_filter = """          <Select value={selectedMes} onValueChange={setSelectedMes}>
            <SelectTrigger className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200">
              <SelectValue placeholder="Todos os Meses" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todos os Meses</SelectItem>
              {dynamicMesesFiltro.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

"""
content = content.replace("""        <div className="relative z-10 flex flex-wrap xl:flex-nowrap items-center gap-3">
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>""", """        <div className="relative z-10 flex flex-wrap xl:flex-nowrap items-center gap-3">
""" + ui_filter + """          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>""")

# 7. Add the Master Financial Card below the Stats grid
# Let's find the Stats grid.
grid_target = """        <Stat icon={Building2} value={totalUnidades} label="Unidades de Saúde" />
      </div>"""

financial_card = """      {/* ── MASTER FINANCIAL CARD ── */}
      <div className="mt-6 mb-6">
        <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-none shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Activity className="w-32 h-32 text-white" />
          </div>
          <CardContent className="p-8 flex flex-col justify-center relative z-10 text-white">
            <h2 className="text-emerald-100 text-sm uppercase tracking-widest font-bold mb-2">Custo Total Acumulado de Preceptoria</h2>
            <div className="text-5xl font-black tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(custoAcumulado)}
            </div>
            <p className="mt-2 text-emerald-100 font-medium">No período e filtros selecionados</p>
          </CardContent>
        </Card>
      </div>"""

content = content.replace(grid_target, grid_target + "\n\n" + financial_card)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard.tsx successfully.")
