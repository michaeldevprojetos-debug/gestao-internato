// ─── Modal: Gerenciar Unidade (Formulário Inteligente) ────────────────────────

function GerenciarUnidadeDialog({
  open,
  onOpenChange,
  local,
  allLocaisSimple,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  local: LocalRow | null;
  allLocaisSimple: LocalSimple[];
  onSaved: () => void;
}) {
  const isNew = !local;
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("Outro");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(local?.nome ?? "");
    setTipo(local?.tipo ?? "Outro");
  }, [open, local]);

  const locaisOptions = allLocaisSimple.map((l) => ({
    value: l.id,
    label: l.nome,
  }));

  const handleNomeChange = (val: string) => {
    setNome(val);
    const matchedLocal = allLocaisSimple.find((l) => l.nome === val);
    if (matchedLocal) {
      setTipo(matchedLocal.tipo);
    }
  };

  async function handleSave() {
    if (!nome.trim()) {
      toast.warning("Informe o nome da unidade.");
      return;
    }
    setSaving(true);
    try {
      let localId: string = local?.id ?? "";
      const matchedLocal = allLocaisSimple.find(
        (l) => l.nome.toLowerCase() === nome.trim().toLowerCase(),
      );

      if (isNew) {
        if (matchedLocal) {
          localId = matchedLocal.id;
          const { error } = await supabase.from("unidades" as any).update({ tipo }).eq("id", localId);
          if (error) throw error;
        } else {
          const { data, error } = (await supabase
            .from("unidades" as any)
            .insert({ nome: nome.trim(), tipo })
            .select("id")
            .single()) as { data: any; error: any };
          if (error) throw error;
          localId = data.id;
        }
      } else {
        const { error } = await supabase
          .from("unidades" as any)
          .update({ nome: nome.trim(), tipo })
          .eq("id", local!.id);
        if (error) throw error;
      }
      toast.success(isNew ? "Unidade criada com sucesso!" : "Unidade atualizada com sucesso!");
      onSaved();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {isNew ? "Nova Unidade" : `Gerenciar: ${local?.nome}`}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="g-nome">Nome da Unidade *</Label>
            <SmartCombobox
              id="g-nome"
              value={nome}
              onValueChange={handleNomeChange}
              options={locaisOptions}
              placeholder="Ex.: Hospital Municipal de Salvador"
              emptyMessage="Nenhum local cadastrado."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="g-tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="g-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_CAMPO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : isNew ? "Criar Unidade" : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal: Gerenciar Alocação de Preceptor (Isolado) ────────────────────────

function GerenciarAlocacaoPreceptorDialog({
  open,
  onOpenChange,
  preceptor,
  unidadeId,
  allAlunos,
  allLocaisSimple,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preceptor: LocalRow["preceptoresList"][number] | null;
  unidadeId: string;
  allAlunos: AlunoSimple[];
  allLocaisSimple: LocalSimple[];
  onSaved: () => void;
}) {
  const isNew = !preceptor;

  // Local state for isolation
  const [selectedPreceptor, setSelectedPreceptor] = useState<PreceptorSimple | null>(null);
  const [search, setSearch] = useState("");
  const [preceptoresOptions, setPreceptoresOptions] = useState<PreceptorSimple[]>([]);

  const [alunoIds, setAlunoIds] = useState<string[]>([]);
  const [especialidade, setEspecialidade] = useState<string>("");
  const [especialidadeCustom, setEspecialidadeCustom] = useState<string>("");
  
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("12:00");
  
  const [mes, setMes] = useState("");
  const [semestre, setSemestre] = useState("");
  const [rotacao, setRotacao] = useState("");
  const [chPrevista, setChPrevista] = useState<number | "">("");
  const [horasRealizadas, setHorasRealizadas] = useState<number | "">("");
  
  const [rotacoesOptions, setRotacoesOptions] = useState<{id: string, nome: string}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("rotacoes" as any).select("id, nome").order("nome").then(({data}) => {
      if (data) setRotacoesOptions(data);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    supabase.from("preceptores").select("id, nome, especialidade").order("nome").then(({data}) => {
      if (data) setPreceptoresOptions(data as PreceptorSimple[]);
    });
    
    // Reset state
    setAlunoIds([]);
    setEspecialidade("");
    setEspecialidadeCustom("");
    setDataInicio("");
    setDataFim("");
    setHoraInicio("08:00");
    setHoraFim("12:00");
    setMes("");
    setSemestre("");
    setRotacao("");
    setChPrevista("");
    setHorasRealizadas("");
    setSearch("");

    if (preceptor) {
      setSelectedPreceptor({ id: preceptor.id, nome: preceptor.nome, especialidade: preceptor.especialidade });
      setMes(preceptor.mes_referencia || "");
      setSemestre(preceptor.semestre || "");
      setRotacao(preceptor.rotacao_periodo_id || "");
      setChPrevista(preceptor.ch_prevista || "");
      setHorasRealizadas(preceptor.horas_realizadas || "");
      
      if (preceptor.hora_inicio) setHoraInicio(preceptor.hora_inicio);
      if (preceptor.hora_fim) setHoraFim(preceptor.hora_fim);

      if (preceptor.especialidade) {
        if (ESPECIALIDADES_COMUNS.includes(preceptor.especialidade as any)) {
          setEspecialidade(preceptor.especialidade);
        } else {
          setEspecialidade("Outra");
          setEspecialidadeCustom(preceptor.especialidade);
        }
      }
      
      // We need to fetch the specific alocacoes for this preceptor in this unit
      // Since preceptor doesn't store dataInicio/dataFim directly on the object, we fetch it
      supabase
        .from("alocacoes" as any)
        .select("aluno_id, data_inicio, data_fim")
        .eq("preceptor_id", preceptor.id)
        .eq("unidade_id", unidadeId)
        .then(({ data }) => {
          if (data && data.length > 0) {
            setDataInicio(data[0].data_inicio || "");
            setDataFim(data[0].data_fim || "");
            const ids = data.map((a: any) => a.aluno_id).filter(Boolean);
            setAlunoIds(ids);
          }
        });
    } else {
      setSelectedPreceptor(null);
    }
  }, [open, preceptor, unidadeId]);

  // Cálculo automático de Horas Realizadas
  useEffect(() => {
    if (!dataInicio || !dataFim || !horaInicio || !horaFim) return;
    try {
      const start = new Date(dataInicio);
      const end = new Date(dataFim);
      if (end < start) return;
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const [h1, m1] = horaInicio.split(":").map(Number);
      const [h2, m2] = horaFim.split(":").map(Number);
      let diffHours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
      if (diffHours < 0) diffHours += 24;
      const chCalculada = Math.round(diffDays * diffHours);
      if (chCalculada > 0) {
        setHorasRealizadas(chCalculada);
      }
    } catch (e) {}
  }, [dataInicio, dataFim, horaInicio, horaFim]);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !search.trim()) return;
    e.preventDefault();
    const searchLower = search.trim().toLowerCase();
    const match = preceptoresOptions.find(p => p.nome.toLowerCase() === searchLower);
    if (match) {
      setSelectedPreceptor(match);
      if (match.especialidade) {
        if (ESPECIALIDADES_COMUNS.includes(match.especialidade as any)) setEspecialidade(match.especialidade);
        else { setEspecialidade("Outra"); setEspecialidadeCustom(match.especialidade); }
      }
    } else {
      setSelectedPreceptor({ id: "NEW_TEMP_ID_" + crypto.randomUUID(), nome: search.trim(), especialidade: null });
      setEspecialidade("");
      setEspecialidadeCustom("");
    }
    setSearch("");
  };

  async function handleSave() {
    if (!selectedPreceptor) {
      toast.warning("Selecione ou crie um preceptor primeiro.");
      return;
    }
    setSaving(true);
    try {
      let realPreceptorId = selectedPreceptor.id;

      // Se é um preceptor novo (criado na hora)
      if (realPreceptorId.startsWith("NEW_TEMP_ID_")) {
        const finalEsp = especialidade === "Outra" ? especialidadeCustom.trim() : especialidade;
        const insertData: any = { nome: selectedPreceptor.nome };
        if (finalEsp) insertData.especialidade = finalEsp;
        
        const { data, error } = await supabase.from("preceptores").insert(insertData).select("id").single();
        if (error) throw error;
        realPreceptorId = data.id;
      } else {
        // Atualizar especialidade do preceptor existente se mudou
        const finalEsp = especialidade === "Outra" ? especialidadeCustom.trim() : especialidade;
        if (finalEsp) {
          await supabase.from("preceptores").update({ especialidade: finalEsp }).eq("id", realPreceptorId);
        }
      }

      // Validação anti-conflito para os alunos
      if (alunoIds.length > 0) {
        const { data: extAloc, error: fetchErr } = await supabase
          .from("alocacoes" as any)
          .select("aluno_id, unidade_id, data_inicio, data_fim, hora_inicio, hora_fim")
          .in("aluno_id", alunoIds);
        
        if (!fetchErr && extAloc) {
          const newStart = new Date(dataInicio || new Date().toISOString().split("T")[0]);
          const newEnd = dataFim ? new Date(dataFim) : new Date("2099-12-31");
          for (const ext of extAloc) {
            const extStart = new Date(ext.data_inicio);
            const extEnd = ext.data_fim ? new Date(ext.data_fim) : new Date("2099-12-31");
            const datesOverlap = newStart <= extEnd && newEnd >= extStart;
            const timesOverlap = (horaInicio || "00:00") < (ext.hora_fim || "23:59") && (horaFim || "23:59") > (ext.hora_inicio || "00:00");
            if (datesOverlap && timesOverlap && ext.unidade_id !== unidadeId) {
              toast.error("Conflito: Um ou mais alunos selecionados já possuem alocação em outra unidade neste mesmo dia e horário!");
              setSaving(false);
              return;
            }
          }
        }
      }

      // Validação anti-conflito para o preceptor
      const { data: pAloc, error: pFetchErr } = await supabase
        .from("alocacoes" as any)
        .select("unidade_id, data_inicio, data_fim, hora_inicio, hora_fim")
        .eq("preceptor_id", realPreceptorId);
      
      if (!pFetchErr && pAloc) {
        const newStart = new Date(dataInicio || new Date().toISOString().split("T")[0]);
        const newEnd = dataFim ? new Date(dataFim) : new Date("2099-12-31");
        for (const ext of pAloc) {
          const extStart = new Date(ext.data_inicio);
          const extEnd = ext.data_fim ? new Date(ext.data_fim) : new Date("2099-12-31");
          const datesOverlap = newStart <= extEnd && newEnd >= extStart;
          const timesOverlap = (horaInicio || "00:00") < (ext.hora_fim || "23:59") && (horaFim || "23:59") > (ext.hora_inicio || "00:00");
          if (datesOverlap && timesOverlap && ext.unidade_id !== unidadeId) {
            toast.error("Conflito: Este preceptor já está escalado para outra unidade neste mesmo dia e horário!");
            setSaving(false);
            return;
          }
        }
      }

      // Limpar vínculos operacionais antigos DENTRO DESTA UNIDADE PARA ESTE PRECEPTOR APENAS
      await supabase.from("alocacoes" as any).delete().eq("unidade_id", unidadeId).eq("preceptor_id", realPreceptorId);
      
      // Desvincular preceptor atual dos alunos
      if (preceptor) {
        await supabase.from("alunos" as any).update({ preceptor_id: null }).eq("preceptor_id", realPreceptorId);
      }

      // Criar novos vínculos
      const alocacoesToInsert: any[] = [];
      const baseData = {
        preceptor_id: realPreceptorId,
        unidade_id: unidadeId,
        data_inicio: dataInicio || new Date().toISOString().split("T")[0],
        data_fim: dataFim || null,
        hora_inicio: horaInicio || null,
        hora_fim: horaFim || null,
        mes_referencia: mes || null,
        semestre: semestre || null,
        rotacao_periodo_id: rotacao || null,
        ch_prevista: chPrevista || null,
        horas_realizadas: horasRealizadas || null,
      };

      if (alunoIds.length > 0) {
        alunoIds.forEach(aId => alocacoesToInsert.push({ ...baseData, aluno_id: aId }));
      } else {
        alocacoesToInsert.push({ ...baseData, aluno_id: null });
      }

      const { error: insertErr } = await supabase.from("alocacoes" as any).insert(alocacoesToInsert);
      if (insertErr) throw insertErr;

      // Atualizar alunos.preceptor_id
      if (alunoIds.length > 0) {
        await supabase.from("alunos").update({ preceptor_id: realPreceptorId }).in("id", alunoIds);
      }

      toast.success("Alocação salva com sucesso!");
      onSaved();
    } catch(e: any) {
      toast.error("Erro: " + (e?.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  }

  const visiblePreceptores = preceptoresOptions.filter(p => p.nome.toLowerCase().includes(search.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {isNew ? "Vincular Preceptor" : `Gerenciar Alocação: ${preceptor?.nome}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Se for Novo, permite pesquisar e selecionar um preceptor */}
          {!selectedPreceptor && (
            <div>
              <Label>Buscar ou Criar Preceptor</Label>
              <div className="relative mt-1 mb-2">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar preceptor… (Enter para criar novo)"
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                />
              </div>
              <div className="rounded-md border divide-y overflow-y-auto max-h-44 bg-background">
                {visiblePreceptores.length === 0 ? (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Pressione Enter para criar '{search}'
                  </div>
                ) : (
                  visiblePreceptores.slice(0, 30).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setSelectedPreceptor(p);
                        if (p.especialidade) {
                          if (ESPECIALIDADES_COMUNS.includes(p.especialidade as any)) setEspecialidade(p.especialidade);
                          else { setEspecialidade("Outra"); setEspecialidadeCustom(p.especialidade); }
                        }
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{p.nome}</p>
                        {p.especialidade && <p className="text-xs text-muted-foreground">{p.especialidade}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Formato de Edição quando selecionado */}
          {selectedPreceptor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-md bg-muted/20 border">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Preceptor</span>
                  <span className="font-semibold">{selectedPreceptor.nome}</span>
                  {selectedPreceptor.id.startsWith("NEW_TEMP_ID_") && <Badge className="w-fit mt-1 text-[10px]">Novo Preceptor</Badge>}
                </div>
                {isNew && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPreceptor(null)}>Trocar</Button>
                )}
              </div>

              <div className="grid grid-cols-[1fr_auto] sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Especialidade</Label>
                  <Select value={especialidade} onValueChange={setEspecialidade}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {ESPECIALIDADES_COMUNS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {especialidade === "Outra" && (
                  <div className="grid gap-1.5">
                    <Label>Especificar</Label>
                    <Input className="h-8" value={especialidadeCustom} onChange={e => setEspecialidadeCustom(e.target.value)} />
                  </div>
                )}
              </div>

              <div className="grid gap-1.5 border-t pt-3">
                <Label>Quantidade e Vínculo de Alunos</Label>
                <AlunoMultiSelect
                  allAlunos={allAlunos}
                  selectedAlunoIds={alunoIds}
                  onChangeAlunoIds={setAlunoIds}
                  preceptorNome={selectedPreceptor.nome}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-3">
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mês Referência</Label>
                  <Select value={mes} onValueChange={setMes}>
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
                  <Select value={semestre} onValueChange={setSemestre}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Sem." /></SelectTrigger>
                    <SelectContent>
                      {["9º", "10º", "11º", "12º"].map(m => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rotação</Label>
                  <Select value={rotacao} onValueChange={setRotacao}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Rotação" /></SelectTrigger>
                    <SelectContent>
                      {rotacoesOptions.map(r => <SelectItem key={r.id} value={r.id} className="text-xs">{r.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CH Prevista</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={chPrevista} onChange={(e) => setChPrevista(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">H. Realizadas</Label>
                  <Input type="number" min={0} className="h-8 text-xs bg-muted/50 cursor-not-allowed" readOnly value={horasRealizadas} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="grid gap-2"><Label>Data Início</Label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Data Fim</Label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Hora Início</Label><Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Hora Fim</Label><Input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} /></div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !selectedPreceptor}>
            {saving ? "Salvando…" : isNew ? "Adicionar Preceptor" : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
