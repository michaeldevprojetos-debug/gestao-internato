import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Chunk 1: Types VinculoQtd
content = content.replace("""type VinculoQtd = {
  id: string;
  preceptor_id: string;
  quantidade_alunos: number;
  hora_inicio?: string | null;
  hora_fim?: string | null;
};""", """type VinculoQtd = {
  id: string;
  preceptor_id: string;
  quantidade_alunos: number;
  hora_inicio?: string | null;
  hora_fim?: string | null;
  mes_referencia?: string | null;
  semestre?: string | null;
  rotacao_periodo_id?: string | null;
  ch_prevista?: number | null;
  horas_realizadas?: number | null;
};""")

# Chunk 2: Types LocalRow
content = content.replace("""    vinculoId: string | null;
    hora_inicio: string | null;
    hora_fim: string | null;
  }>;""", """    vinculoId: string | null;
    hora_inicio: string | null;
    hora_fim: string | null;
    mes_referencia: string | null;
    semestre: string | null;
    rotacao_periodo_id: string | null;
    ch_prevista: number | null;
    horas_realizadas: number | null;
  }>;""")

# Chunk 3: fetchLocais DB query
content = content.replace("""        .select("id, preceptor_id, aluno_id, unidade_id, hora_inicio, hora_fim, alunos ( nome, semestre )")) as { data: any[] | null; error: any };""", """        .select("id, preceptor_id, aluno_id, unidade_id, hora_inicio, hora_fim, mes_referencia, semestre, rotacao_periodo_id, ch_prevista, horas_realizadas, alunos ( nome, semestre )")) as { data: any[] | null; error: any };""")

# Chunk 4: preceptorQtd.set
content = content.replace("""            quantidade_alunos: v.quantidade_alunos ?? 0,
            hora_inicio: v.hora_inicio ?? null,
            hora_fim: v.hora_fim ?? null,
          });""", """            quantidade_alunos: v.quantidade_alunos ?? 0,
            hora_inicio: v.hora_inicio ?? null,
            hora_fim: v.hora_fim ?? null,
            mes_referencia: v.mes_referencia ?? null,
            semestre: v.semestre ?? null,
            rotacao_periodo_id: v.rotacao_periodo_id ?? null,
            ch_prevista: v.ch_prevista ?? null,
            horas_realizadas: v.horas_realizadas ?? null,
          });""")

# Chunk 5: preceptoresList map
content = content.replace("""              vinculoId: pqtd?.id ?? null,
              hora_inicio: pqtd?.hora_inicio ?? null,
              hora_fim: pqtd?.hora_fim ?? null,
            };""", """              vinculoId: pqtd?.id ?? null,
              hora_inicio: pqtd?.hora_inicio ?? null,
              hora_fim: pqtd?.hora_fim ?? null,
              mes_referencia: pqtd?.mes_referencia ?? null,
              semestre: pqtd?.semestre ?? null,
              rotacao_periodo_id: pqtd?.rotacao_periodo_id ?? null,
              ch_prevista: pqtd?.ch_prevista ?? null,
              horas_realizadas: pqtd?.horas_realizadas ?? null,
            };""")

# Chunk 6: States in GerenciarUnidadeDialog
content = content.replace("""  const [preceptorSearch, setPreceptorSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [preceptoresOptions, setPreceptoresOptions] = useState<PreceptorSimple[]>([]);
  // Per-preceptor student selections: Map<preceptorKey, string[]>
  const [preceptorAlunos, setPreceptorAlunos] = useState<Record<string, string[]>>({});""", """  const [preceptorSearch, setPreceptorSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [preceptoresOptions, setPreceptoresOptions] = useState<PreceptorSimple[]>([]);
  // Per-preceptor student selections: Map<preceptorKey, string[]>
  const [preceptorAlunos, setPreceptorAlunos] = useState<Record<string, string[]>>({});
  
  const [preceptorMes, setPreceptorMes] = useState<Record<string, string>>({});
  const [preceptorSemestre, setPreceptorSemestre] = useState<Record<string, string>>({});
  const [preceptorRotacao, setPreceptorRotacao] = useState<Record<string, string>>({});
  const [preceptorChPrevista, setPreceptorChPrevista] = useState<Record<string, number | "">>({});
  const [preceptorHorasRealizadas, setPreceptorHorasRealizadas] = useState<Record<string, number | "">>({});
  const [rotacoesOptions, setRotacoesOptions] = useState<{id: string, nome: string}[]>([]);
  
  useEffect(() => {
    supabase.from("rotacoes" as any).select("id, nome").order("nome").then(({data}) => {
       if(data) setRotacoesOptions(data);
    });
  }, []);""")

# Chunk 7: Initializing from local
content = content.replace("""    const initialAlunos: Record<string, string[]> = {};
    const initialEspecialidades: Record<string, string> = {};
    const initialEspecialidadesCustom: Record<string, string> = {};""", """    const initialAlunos: Record<string, string[]> = {};
    const initialEspecialidades: Record<string, string> = {};
    const initialEspecialidadesCustom: Record<string, string> = {};
    const initialMes: Record<string, string> = {};
    const initialSemestre: Record<string, string> = {};
    const initialRotacao: Record<string, string> = {};
    const initialCh: Record<string, number | ""> = {};
    const initialHoras: Record<string, number | ""> = {};""")

content = content.replace("""        if (p.especialidade) {
          if (ESPECIALIDADES_COMUNS.includes(p.especialidade as any)) {""", """        if (p.mes_referencia) initialMes[p.id] = p.mes_referencia;
        if (p.semestre) initialSemestre[p.id] = p.semestre;
        if (p.rotacao_periodo_id) initialRotacao[p.id] = p.rotacao_periodo_id;
        if (p.ch_prevista) initialCh[p.id] = p.ch_prevista;
        if (p.horas_realizadas) initialHoras[p.id] = p.horas_realizadas;

        if (p.especialidade) {
          if (ESPECIALIDADES_COMUNS.includes(p.especialidade as any)) {""")

content = content.replace("""    setPreceptorAlunos(initialAlunos);
    setPreceptorEspecialidades(initialEspecialidades);
    setPreceptorEspecialidadesCustom(initialEspecialidadesCustom);""", """    setPreceptorAlunos(initialAlunos);
    setPreceptorEspecialidades(initialEspecialidades);
    setPreceptorEspecialidadesCustom(initialEspecialidadesCustom);
    setPreceptorMes(initialMes);
    setPreceptorSemestre(initialSemestre);
    setPreceptorRotacao(initialRotacao);
    setPreceptorChPrevista(initialCh);
    setPreceptorHorasRealizadas(initialHoras);""")

# Chunk 8: alocacoesToInsert push (with and without students)
content = content.replace("""              unidade_id: localId,
              data_inicio: dataInicio || new Date().toISOString().split("T")[0],
              data_fim: dataFim || null,
              hora_inicio: horaInicio || null,
              hora_fim: horaFim || null,""", """              unidade_id: localId,
              data_inicio: dataInicio || new Date().toISOString().split("T")[0],
              data_fim: dataFim || null,
              hora_inicio: horaInicio || null,
              hora_fim: horaFim || null,
              mes_referencia: preceptorMes[key] || null,
              semestre: preceptorSemestre[key] || null,
              rotacao_periodo_id: preceptorRotacao[key] || null,
              ch_prevista: preceptorChPrevista[key] || null,
              horas_realizadas: preceptorHorasRealizadas[key] || null,""")

# Chunk 9: UI rendering in selectedPreceptores.map
ui_code = """
                      {/* Novos campos financeiros e de auditoria */}
                      <div className="mt-2 pt-2 border-t border-border/40 grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mês Referência</Label>
                          <Select value={preceptorMes[key] || ""} onValueChange={(val) => setPreceptorMes(p => ({...p, [key]: val}))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
                            <SelectContent>
                              {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map(m => (
                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Semestre</Label>
                          <Select value={preceptorSemestre[key] || ""} onValueChange={(val) => setPreceptorSemestre(p => ({...p, [key]: val}))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem." /></SelectTrigger>
                            <SelectContent>
                              {["9º", "10º", "11º", "12º"].map(m => (
                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Período / Rotação</Label>
                          <Select value={preceptorRotacao[key] || ""} onValueChange={(val) => setPreceptorRotacao(p => ({...p, [key]: val}))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Rotação" /></SelectTrigger>
                            <SelectContent>
                              {rotacoesOptions.map(r => (
                                <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CH Prevista</Label>
                          <Input type="number" min={0} className="h-8 text-xs" value={preceptorChPrevista[key] || ""} onChange={(e) => setPreceptorChPrevista(p => ({...p, [key]: e.target.value ? Number(e.target.value) : ""}))} />
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">H. Realizadas</Label>
                          <Input type="number" min={0} className="h-8 text-xs" value={preceptorHorasRealizadas[key] || ""} onChange={(e) => setPreceptorHorasRealizadas(p => ({...p, [key]: e.target.value ? Number(e.target.value) : ""}))} />
                        </div>
                      </div>
"""
content = content.replace("""                        <AlunoMultiSelect
                          allAlunos={allAlunos}
                          selectedAlunoIds={alunoIds}
                          onChangeAlunoIds={(ids) => updatePreceptorAlunos(key, ids)}
                          preceptorNome={tag.nome}
                        />
                      </div>
                    </div>""", f"""                        <AlunoMultiSelect
                          allAlunos={{allAlunos}}
                          selectedAlunoIds={{alunoIds}}
                          onChangeAlunoIds={{(ids) => updatePreceptorAlunos(key, ids)}}
                          preceptorNome={{tag.nome}}
                        />
                      </div>
{ui_code}
                    </div>""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated hospitais.tsx successfully.")
