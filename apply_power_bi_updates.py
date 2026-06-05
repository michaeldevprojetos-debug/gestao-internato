import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove detailedPreceptorName
content = content.replace('  const [detailedPreceptorName, setDetailedPreceptorName] = useState<string | null>(null);\n', '')

# 2. Update Map definitions and populate ID
content = content.replace(
    'const preceptorMap = new Map<string, { nome: string; count: Set<string>; listaAlunos: Set<string>; turnos: Set<string>; especialidades: Set<string>; unidades: Set<string>; ch_total: number }>();',
    'const preceptorMap = new Map<string, { id: string; nome: string; count: Set<string>; listaAlunos: Set<string>; turnos: Set<string>; especialidades: Set<string>; unidades: Set<string>; ch_total: number }>();'
)

content = content.replace(
    'const distribuicaoMap = new Map<string, { unidade: string; especialidade: string; preceptor: string; alunos: Set<string> }>();',
    'const distribuicaoMap = new Map<string, { unidade: string; especialidade: string; preceptor: string; alunos: Set<string>; carga_horaria: number }>();'
)

content = content.replace(
    """          preceptorMap.set(a.preceptor_id, {
            nome: a.preceptor || "Desconhecido",""",
    """          preceptorMap.set(a.preceptor_id, {
            id: a.preceptor_id,
            nome: a.preceptor || "Desconhecido","""
)

content = content.replace(
    """        if (!distribuicaoMap.has(dKey)) {
          distribuicaoMap.set(dKey, {
            unidade: a.unidade,
            especialidade: a.text_especialidade || a.especialidade || "Sem Especialidade",
            preceptor: a.preceptor,
            alunos: new Set()
          });
        }
        if (a.aluno) distribuicaoMap.get(dKey)!.alunos.add(a.aluno);""",
    """        if (!distribuicaoMap.has(dKey)) {
          distribuicaoMap.set(dKey, {
            unidade: a.unidade,
            especialidade: a.text_especialidade || a.especialidade || "Sem Especialidade",
            preceptor: a.preceptor,
            alunos: new Set(),
            carga_horaria: 0
          });
        }
        distribuicaoMap.get(dKey)!.carga_horaria += Number(a.ch_prevista || a.carga_horaria || 0) / Number(a.qtd_alunos_alocacao || 1);
        if (a.aluno) distribuicaoMap.get(dKey)!.alunos.add(a.aluno);"""
)

content = content.replace(
    """      .map((p) => ({ 
        preceptor: p.nome,""",
    """      .map((p) => ({ 
        id: p.id,
        preceptor: p.nome,"""
)

content = content.replace(
    """      preceptor: d.preceptor,
      alunos: d.alunos.size
    }))""",
    """      preceptor: d.preceptor,
      alunos: d.alunos.size,
      carga_horaria: d.carga_horaria
    }))"""
)

# 3. Update Bar Chart onClick
content = re.sub(
    r'onClick=\{\(data\) => \{\s*if \(data && data\.preceptor\) \{\s*setDetailedPreceptorName\(data\.preceptor\);\s*\}\s*\}\}',
    """onClick={(data) => {
                      if (data && data.id) {
                        setSelectedPreceptor(selectedPreceptor === data.id ? "all" : data.id);
                      }
                    }}""",
    content
)

# 4. Update Painel de Detalhamento
old_panel = """      {/* ── PAINEL DE DETALHAMENTO (POWER BI STYLE) ── */}
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

new_panel = """      {/* ── PAINEL DE DETALHAMENTO (POWER BI STYLE) ── */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl relative mt-2 min-h-[160px] flex flex-col justify-center overflow-hidden">
        {selectedPreceptor === "all" ? (
          <div className="text-center text-slate-400 py-12 animate-in fade-in px-6">
            <p className="text-lg flex items-center justify-center gap-3">
              <span className="text-3xl animate-pulse">💡</span> 
              <span>Selecione um preceptor no filtro ou <strong>clique em sua barra no gráfico</strong> para visualizar o detalhamento operacional</span>
            </p>
          </div>
        ) : (
          <div className="p-6 animate-in zoom-in-95 duration-200">
            {(() => {
              const pData = rankingDataFull.find(p => p.id === selectedPreceptor);
              if (!pData) return <p className="text-slate-400 text-center">Dados não encontrados para os filtros atuais.</p>;
              
              return (
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* Coluna Esquerda: Informações Gerais */}
                  <div className="space-y-5 flex-1">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
                      <Stethoscope className="h-6 w-6 text-emerald-400" /> {pData.preceptor}
                    </h2>
                    
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Unidade Hospitalar</p>
                          <p className="text-sm text-slate-300">{pData.unidades.join(', ') || "Nenhuma"}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Activity className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Especialidade</p>
                          <p className="text-sm text-slate-300">{pData.text_especialidade}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <Clock className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-0.5">Turno/Horário</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {pData.turnos.map(t => <Badge key={t} variant="secondary" className="bg-slate-800 text-slate-300 border-none">{t}</Badge>)}
                            {pData.turnos.length === 0 && <span className="text-sm text-slate-500">Não informado</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 inline-flex flex-col items-center justify-center min-w-[150px]">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Carga Horária Total</p>
                      <p className="text-3xl font-black text-blue-400">{Math.round(pData.ch_total)}h</p>
                    </div>
                  </div>
                  
                  {/* Coluna Direita: Escala de Alunos */}
                  <div className="flex-1 bg-slate-950/50 rounded-lg border border-slate-800 p-5">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800/50 pb-2">
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Users className="h-4 w-4" /> Escala de Alunos
                      </p>
                      <Badge variant="outline" className="bg-emerald-950/30 text-emerald-400 border-emerald-900">
                        {pData.alunos} {pData.alunos === 1 ? 'vinculado' : 'vinculados'}
                      </Badge>
                    </div>
                    
                    {pData.listaAlunos.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                        {pData.listaAlunos.map(aluno => (
                          <Badge key={aluno} variant="outline" className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 py-1.5 px-3">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2 inline-block"></span>
                            {aluno}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic flex items-center justify-center h-20">
                        Nenhum aluno vinculado.
                      </p>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>"""
content = content.replace(old_panel, new_panel)

# 5. Update Table columns
old_table_headers = """              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Preceptor</TableHead>
                <TableHead className="text-center">Alunos</TableHead>
              </TableRow>"""
new_table_headers = """              <TableRow>
                <TableHead>Unidade</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Preceptor</TableHead>
                <TableHead className="text-center">Alunos Vinculados</TableHead>
                <TableHead className="text-right">Carga Horária</TableHead>
              </TableRow>"""
content = content.replace(old_table_headers, new_table_headers)

old_table_cells = """                  <TableRow key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{d.unidade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                        {d.especialidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{d.preceptor}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">{d.alunos}</TableCell>
                  </TableRow>"""
new_table_cells = """                  <TableRow key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <TableCell className="font-medium text-slate-700 dark:text-slate-300">{d.unidade}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                        {d.especialidade}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-700 dark:text-slate-300">{d.preceptor}</TableCell>
                    <TableCell className="text-center font-bold text-emerald-600 dark:text-emerald-400">{d.alunos}</TableCell>
                    <TableCell className="text-right font-medium text-blue-600 dark:text-blue-400">{Math.round(d.carga_horaria)}h</TableCell>
                  </TableRow>"""
content = content.replace(old_table_cells, new_table_cells)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Applied Power BI interactions and exact UI requests.")
