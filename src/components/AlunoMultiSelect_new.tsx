function AlunoMultiSelect({
  allAlunos,
  selectedAlunoIds,
  onChangeAlunoIds,
  preceptorNome,
  dataInicio,
  dataFim,
  horaInicio,
  horaFim,
  unidadeId,
}: {
  allAlunos: AlunoSimple[];
  selectedAlunoIds: string[];
  onChangeAlunoIds: (ids: string[]) => void;
  preceptorNome: string;
  dataInicio?: string;
  dataFim?: string;
  horaInicio?: string;
  horaFim?: string;
  unidadeId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<AlunoSimple[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlunosCache, setSelectedAlunosCache] = useState<AlunoSimple[]>([]);

  useEffect(() => {
    if (!open && options.length === 0 && !search) return;
    const fetchAlunos = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from("alunos")
          .select("id, nome, semestre, matricula, alocacoes(unidade_id, data_inicio, data_fim, hora_inicio, hora_fim, unidades(nome))")
          .order("nome")
          .limit(50);
        
        if (search.trim()) {
          query = query.ilike("nome", `%${search.trim()}%`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        const mappedData = (data || []).map((a: any) => {
          let isOcupado = false;
          let ocupadoLocal = "";
          
          if (a.alocacoes && a.alocacoes.length > 0 && dataInicio && horaInicio && horaFim) {
            const newStart = new Date(dataInicio);
            const newEnd = dataFim ? new Date(dataFim) : new Date("2099-12-31");
            
            for (const ext of a.alocacoes) {
              if (ext.unidade_id === unidadeId) continue; // Same unit is fine

              const extStart = new Date(ext.data_inicio);
              const extEnd = ext.data_fim ? new Date(ext.data_fim) : new Date("2099-12-31");
              const datesOverlap = newStart <= extEnd && newEnd >= extStart;
              
              const eHI = ext.hora_inicio || "00:00";
              const eHF = ext.hora_fim || "23:59";
              const nHI = horaInicio;
              const nHF = horaFim;
              
              const timesOverlap = nHI < eHF && nHF > eHI;
              
              if (datesOverlap && timesOverlap) {
                isOcupado = true;
                ocupadoLocal = ext.unidades?.nome || "Outra unidade";
                break;
              }
            }
          }
          
          return {
            id: a.id,
            nome: a.nome,
            semestre: a.semestre,
            matricula: a.matricula,
            isOcupado,
            ocupadoLocal,
          };
        });

        setOptions(mappedData);
      } catch (err) {
        console.error("Erro ao buscar alunos:", err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchAlunos, 300);
    return () => clearTimeout(timeoutId);
  }, [search, open, dataInicio, dataFim, horaInicio, horaFim, unidadeId]);

  const toggle = (aluno: AlunoSimple) => {
    if (aluno.isOcupado) return;
    const isSelected = selectedAlunoIds.includes(aluno.id);
    if (isSelected) {
      onChangeAlunoIds(selectedAlunoIds.filter((x) => x !== aluno.id));
    } else {
      onChangeAlunoIds([...selectedAlunoIds, aluno.id]);
      setSelectedAlunosCache((prev) => {
        if (prev.find((a) => a.id === aluno.id)) return prev;
        return [...prev, aluno];
      });
    }
  };

  const removeId = (id: string) => {
    onChangeAlunoIds(selectedAlunoIds.filter((x) => x !== id));
  };

  const selectedAlunos = selectedAlunoIds.map((id) => {
    const found =
      selectedAlunosCache.find((a) => a.id === id) ||
      options.find((a) => a.id === id) ||
      allAlunos.find((a) => a.id === id);
    return found || { id, nome: "Carregando...", semestre: null };
  });

  // FILTRO LOCAL E ORDENAÇÃO
  const visibleOptions = options
    .filter(a => !selectedAlunoIds.includes(a.id))
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Vincular alunos a {preceptorNome}
        </span>
      </div>

      {/* Tags dos selecionados */}
      {selectedAlunos.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedAlunos.map((a) => (
            <Badge
              key={a.id}
              variant="secondary"
              className="pl-2 pr-1 py-0.5 gap-0.5 text-[10px] cursor-default"
            >
              {a.nome}
              {a.semestre ? ` (${a.semestre}º)` : ""}
              <button
                type="button"
                onClick={() => removeId(a.id)}
                className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs font-normal"
          >
            <span className="text-muted-foreground truncate">
              {selectedAlunoIds.length > 0
                ? `${selectedAlunoIds.length} aluno(s) selecionado(s)`
                : "Selecionar alunos…"}
            </span>
            <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Buscar aluno…" value={search} onValueChange={setSearch} />
            <CommandList className="max-h-48">
              {loading && (
                <div className="p-4 text-center text-xs text-muted-foreground">Buscando...</div>
              )}
              {!loading && visibleOptions.length === 0 && (
                <CommandEmpty>Nenhum aluno disponível encontrado.</CommandEmpty>
              )}
              <CommandGroup>
                {!loading &&
                  visibleOptions.map((a) => {
                    const isChecked = selectedAlunoIds.includes(a.id);
                    return (
                      <CommandItem 
                        key={a.id} 
                        value={a.id} 
                        onSelect={() => toggle(a)}
                        className={cn(a.isOcupado && "opacity-50 cursor-not-allowed")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            isChecked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1 truncate">
                          {a.nome} | Mat: {a.matricula || 'N/A'} | {a.semestre || '-'}º Sem.
                        </span>
                        {a.isOcupado && (
                          <span className="text-destructive text-[10px] ml-2 shrink-0">
                            ⚠️ Ocupado neste horário ({a.ocupadoLocal})
                          </span>
                        )}
                      </CommandItem>
                    );
                  })}
                {!loading && options.length === 50 && (
                  <div className="px-2 py-1.5 text-center text-[10px] text-muted-foreground">
                    Mostrando 50 resultados — refine a busca
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
