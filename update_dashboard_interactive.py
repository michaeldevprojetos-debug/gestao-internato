import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace('  CheckCircle2,\n} from "lucide-react";', '  CheckCircle2,\n  User,\n  X,\n} from "lucide-react";')
content = content.replace('  Table,\n} from "lucide-react";', '') # just in case
if 'import { Badge }' not in content:
    content = content.replace('import { ClientOnly } from "@/components/client-only";', 'import { ClientOnly } from "@/components/client-only";\nimport { Badge } from "@/components/ui/badge";\nimport { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";')

# 2. Add detailedPreceptorName state
content = content.replace("""  const [selectedPreceptor, setSelectedPreceptor] = useState<string>("all");
  const [selectedMes, setSelectedMes] = useState<string>("all");""", """  const [selectedPreceptor, setSelectedPreceptor] = useState<string>("all");
  const [selectedMes, setSelectedMes] = useState<string>("all");
  const [detailedPreceptorName, setDetailedPreceptorName] = useState<string | null>(null);""")

# 3. Update useMemo for KPIs
old_kpi_start = """    const preceptorMap = new Map<string, { nome: string; count: Set<string>; turnos: Set<string>; especialidades: Set<string> }>();
    const especialidadeMap = new Map<string, Set<string>>();
    const unidadeMap = new Map<string, { nome: string; count: Set<string> }>();
    let custoAcumulado = 0;"""

new_kpi_start = """    const preceptorMap = new Map<string, { nome: string; count: Set<string>; listaAlunos: Set<string>; turnos: Set<string>; especialidades: Set<string>; unidades: Set<string>; ch_total: number }>();
    const especialidadeMap = new Map<string, Set<string>>();
    const unidadeMap = new Map<string, { nome: string; count: Set<string> }>();
    const distribuicaoMap = new Map<string, { unidade: string; especialidade: string; preceptor: string; alunos: Set<string> }>();
    let custoAcumulado = 0;"""
content = content.replace(old_kpi_start, new_kpi_start)

old_preceptor_loop = """      if (a.preceptor_id) {
        if (!preceptorMap.has(a.preceptor_id)) {
          preceptorMap.set(a.preceptor_id, {
            nome: a.preceptor || "Desconhecido",
            count: new Set(),
            turnos: new Set(),
            especialidades: new Set(),
          });
        }
        if (a.aluno) preceptorMap.get(a.preceptor_id)!.count.add(a.aluno);
        const pEsp = a.text_especialidade || a.especialidade;
        if (pEsp && pEsp !== "Sem Especialidade") preceptorMap.get(a.preceptor_id)!.especialidades.add(pEsp);
        
        // Add turno string
        if (a.hora_inicio && a.hora_fim) {
          const h = parseInt(a.hora_inicio.split(":")[0], 10);
          let turnoLabel = "";
          if (h >= 0 && h <= 12) turnoLabel = "☀️ Manhã";
          else if (h > 12 && h < 18) turnoLabel = "🌤️ Tarde";
          else turnoLabel = "🌙 Noite";
          
          const timeLabel = `${turnoLabel} (${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)})`;
          preceptorMap.get(a.preceptor_id)!.turnos.add(timeLabel);
        }
      }"""

new_preceptor_loop = """      if (a.preceptor_id) {
        if (!preceptorMap.has(a.preceptor_id)) {
          preceptorMap.set(a.preceptor_id, {
            nome: a.preceptor || "Desconhecido",
            count: new Set(),
            listaAlunos: new Set(),
            turnos: new Set(),
            especialidades: new Set(),
            unidades: new Set(),
            ch_total: 0,
          });
        }
        const pObj = preceptorMap.get(a.preceptor_id)!;
        if (a.aluno) {
          pObj.count.add(a.aluno);
          pObj.listaAlunos.add(a.aluno);
        }
        const pEsp = a.text_especialidade || a.especialidade;
        if (pEsp && pEsp !== "Sem Especialidade") pObj.especialidades.add(pEsp);
        if (a.unidade) pObj.unidades.add(a.unidade);
        
        pObj.ch_total += Number(a.ch_prevista || a.carga_horaria || 0) / Number(a.qtd_alunos_alocacao || 1);
        
        if (a.hora_inicio && a.hora_fim) {
          const h = parseInt(a.hora_inicio.split(":")[0], 10);
          let turnoLabel = "";
          if (h >= 0 && h <= 12) turnoLabel = "☀️ Manhã";
          else if (h > 12 && h < 18) turnoLabel = "🌤️ Tarde";
          else turnoLabel = "🌙 Noite";
          
          const timeLabel = `${turnoLabel} (${a.hora_inicio.slice(0, 5)} - ${a.hora_fim.slice(0, 5)})`;
          pObj.turnos.add(timeLabel);
        }
      }
      
      // Distribuicao Academica
      if (a.unidade && a.preceptor) {
        const dKey = `${a.unidade}_${a.text_especialidade || a.especialidade}_${a.preceptor}`;
        if (!distribuicaoMap.has(dKey)) {
          distribuicaoMap.set(dKey, {
            unidade: a.unidade,
            especialidade: a.text_especialidade || a.especialidade || "Sem Especialidade",
            preceptor: a.preceptor,
            alunos: new Set()
          });
        }
        if (a.aluno) distribuicaoMap.get(dKey)!.alunos.add(a.aluno);
      }"""
content = content.replace(old_preceptor_loop, new_preceptor_loop)

old_rdata = """    const rData = Array.from(preceptorMap.values())
      .map((p) => ({ 
        preceptor: p.nome, 
        alunos: p.count.size,
        turnos: Array.from(p.turnos),
        text_especialidade: Array.from(p.especialidades).join(', ') || "Sem Especialidade"
      }))
      .sort((a, b) => b.alunos - a.alunos)
      .slice(0, 10);"""

new_rdata = """    const rankingDataFull = Array.from(preceptorMap.values())
      .map((p) => ({ 
        preceptor: p.nome, 
        alunos: p.count.size,
        turnos: Array.from(p.turnos),
        text_especialidade: Array.from(p.especialidades).join(', ') || "Sem Especialidade",
        unidades: Array.from(p.unidades),
        ch_total: p.ch_total,
        listaAlunos: Array.from(p.listaAlunos)
      }))
      .sort((a, b) => b.alunos - a.alunos);
      
    const rData = rankingDataFull.slice(0, 10);
    
    const dData = Array.from(distribuicaoMap.values()).map(d => ({
      unidade: d.unidade,
      especialidade: d.especialidade,
      preceptor: d.preceptor,
      alunos: d.alunos.size
    })).sort((a, b) => a.unidade.localeCompare(b.unidade) || b.alunos - a.alunos);"""
content = content.replace(old_rdata, new_rdata)

old_usememo_return = """    return {
      totalAlunos: filteredAloc.length,
      totalPreceptores: preceptoresSet.size,
      totalUnidades: unidadesSet.size,
      rankingData: rData,
      especialidadeData: eData,
      alertasPreceptor: aPrec,
      alertasUnidade: aUni,
      custoAcumulado,
    };"""
new_usememo_return = """    return {
      totalAlunos: filteredAloc.length,
      totalPreceptores: preceptoresSet.size,
      totalUnidades: unidadesSet.size,
      rankingData: rData,
      rankingDataFull,
      distribuicaoData: dData,
      especialidadeData: eData,
      alertasPreceptor: aPrec,
      alertasUnidade: aUni,
      custoAcumulado,
    };"""
content = content.replace(old_usememo_return, new_usememo_return)

content = content.replace("    alertasUnidade,\n    custoAcumulado,\n  } = useMemo", "    alertasUnidade,\n    custoAcumulado,\n    rankingDataFull,\n    distribuicaoData,\n  } = useMemo")

# 4. Insert Painel Detalhamento
old_alert_end = """              </div>
            )}
          </CardContent>
        </Card>
      </div>"""

detailed_panel = """              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── PAINEL DE DETALHAMENTO (POWER BI STYLE) ── */}
      {detailedPreceptorName && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 mt-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-4 right-4 text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => setDetailedPreceptorName(null)}
          >
            <X className="h-5 w-5" />
          </Button>
          
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-emerald-400" /> Detalhamento Operacional: {detailedPreceptorName}
          </h2>
          
          {(() => {
            const pData = rankingDataFull.find(p => p.preceptor === detailedPreceptorName);
            if (!pData) return <p className="text-slate-400">Dados não encontrados para os filtros atuais.</p>;
            
            return (
              <div className="flex flex-col lg:flex-row gap-8">
                <div className="space-y-4 flex-1">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">🏥 Unidade(s)</p>
                    <p className="text-sm text-slate-300">{pData.unidades.join(', ') || "Nenhuma"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">🩺 Especialidade(s)</p>
                    <p className="text-sm text-slate-300">{pData.text_especialidade}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">🕐 Escala / Turno</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {pData.turnos.map(t => <Badge key={t} variant="secondary" className="bg-slate-800 text-slate-300 border-none">{t}</Badge>)}
                      {pData.turnos.length === 0 && <span className="text-sm text-slate-500">Não informado</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">👨‍🎓 Alunos Totais</p>
                      <p className="text-3xl font-black text-emerald-400">{pData.alunos}</p>
                    </div>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">⏱ Carga Horária</p>
                      <p className="text-3xl font-black text-blue-400">{Math.round(pData.ch_total)}h</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 sticky top-0 bg-slate-950/90 py-1 backdrop-blur-sm z-10">Lista de Alunos Vinculados ({pData.listaAlunos.length})</p>
                  {pData.listaAlunos.length > 0 ? (
                    <ul className="space-y-2">
                      {pData.listaAlunos.map(aluno => (
                        <li key={aluno} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-900/50 p-2 rounded">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div> {aluno}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 italic">Nenhum aluno vinculado no filtro atual.</p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}"""
content = content.replace(old_alert_end, detailed_panel)

# 5. Update Bar onClick
old_bar = """<Bar dataKey="alunos" fill="#10b981" radius={[0, 4, 4, 0]} barSize={32}>"""
new_bar = """<Bar 
                    dataKey="alunos" 
                    fill="#10b981" 
                    radius={[0, 4, 4, 0]} 
                    barSize={32}
                    cursor="pointer"
                    onClick={(data) => {
                      if (data && data.preceptor) {
                        setDetailedPreceptorName(data.preceptor);
                      }
                    }}
                  >"""
content = content.replace(old_bar, new_bar)

# 6. Append Distribuição Acadêmica Table at the end
dist_table = """
      {/* ── DISTRIBUIÇÃO ACADÊMICA ── */}
      <Card className="card-glow shadow-sm border-white/10 dark:bg-slate-900/40 bg-white overflow-hidden mt-6">
        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 pb-4">
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Distribuição Acadêmica
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visualização detalhada da operação cruzando Unidades, Especialidades e Preceptores.
          </p>
        </CardHeader>
        <CardContent className="p-0 max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader className="bg-slate-100 dark:bg-slate-900/80 sticky top-0 z-10">
              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Preceptor</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {distribuicaoData.length > 0 ? (
                distribuicaoData.map((d, idx) => (
                  <TableRow key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{d.unidade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                        {d.especialidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{d.preceptor}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">{d.alunos}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum dado encontrado para os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
"""
# Insert right before the last closing </div> of the return block
content = content.replace("    </div>\n  );\n}\n\nexport default Dashboard;", dist_table + "    </div>\n  );\n}\n\nexport default Dashboard;")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard.tsx with detailed panel and distribution table.")
