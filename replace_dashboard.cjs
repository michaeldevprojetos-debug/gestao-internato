const fs = require("fs");
let code = fs.readFileSync("src/routes/dashboard.tsx", "utf8");

const fetchDataRegex =
  /const \{ data: alocData \} = await supabase[\s\S]*?setAlocacoes\(alocData \|\| \[\]\);/;

const newFetchData = `      const { data: alocData } = await supabase
        .from("vw_dashboard_preceptores" as any)
        .select("*");
      
      setAlocacoes(alocData || []);`;

code = code.replace(fetchDataRegex, newFetchData);

const filteredAlocRegex =
  /const passEspecialidade = selectedEspecialidade === \"all\" \|\| a\.especialidade_id === selectedEspecialidade;/;
const newFilteredAloc = `const passEspecialidade = selectedEspecialidade === "all" || (a.especialidade_nome && a.especialidade_nome === selectedEspecialidade) || (!a.especialidade_nome && selectedEspecialidade === "null");`;

code = code.replace(filteredAlocRegex, newFilteredAloc);

const kpisRegex =
  /const \{ totalAlunos, totalPreceptores, totalUnidades, rankingData, especialidadeData, alertasPreceptor, alertasUnidade \} = useMemo\(\(\) => \{[\s\S]*?\}, \[filteredAloc, limitePreceptor, limiteUnidade\]\);/;

const newKpis = `  const { totalAlunos, totalPreceptores, totalUnidades, rankingData, especialidadeData, alertasPreceptor, alertasUnidade } = useMemo(() => {
    let totalAlunosSum = 0;
    const preceptoresSet = new Set<string>();
    const unidadesSet = new Set<string>();
    
    const preceptorMap = new Map<string, { nome: string; alunos: number }>();
    const especialidadeMap = new Map<string, number>();
    const unidadeMap = new Map<string, { nome: string; alunos: number }>();

    for (const a of filteredAloc) {
      if (a.preceptor_id) preceptoresSet.add(a.preceptor_id);
      if (a.unidade_id) unidadesSet.add(a.unidade_id);
      
      const qtdAlunos = Number(a.total_alunos) || 0;
      totalAlunosSum += qtdAlunos;

      if (a.preceptor_id) {
        if (!preceptorMap.has(a.preceptor_id)) {
          preceptorMap.set(a.preceptor_id, { nome: a.preceptor_nome || "Desconhecido", alunos: 0 });
        }
        preceptorMap.get(a.preceptor_id)!.alunos += qtdAlunos;
      }

      if (a.especialidade_nome) {
        const espNome = a.especialidade_nome;
        especialidadeMap.set(espNome, (especialidadeMap.get(espNome) || 0) + qtdAlunos);
      } else {
        especialidadeMap.set("Sem Especialidade", (especialidadeMap.get("Sem Especialidade") || 0) + qtdAlunos);
      }

      if (a.unidade_id) {
        if (!unidadeMap.has(a.unidade_id)) {
          unidadeMap.set(a.unidade_id, { nome: a.unidade_nome || "Desconhecida", alunos: 0 });
        }
        unidadeMap.get(a.unidade_id)!.alunos += qtdAlunos;
      }
    }

    const rData = Array.from(preceptorMap.values())
      .map((p) => ({ preceptor: p.nome, alunos: p.alunos }))
      .sort((a, b) => b.alunos - a.alunos)
      .slice(0, 10);

    const eData = Array.from(especialidadeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const aPrec = Array.from(preceptorMap.values()).filter(p => p.alunos > limitePreceptor).map(p => ({ nome: p.nome, alunos: p.alunos }));
    const aUni = Array.from(unidadeMap.values()).filter(u => u.alunos > limiteUnidade).map(u => ({ nome: u.nome, alunos: u.alunos }));

    return {
      totalAlunos: totalAlunosSum,
      totalPreceptores: preceptoresSet.size,
      totalUnidades: unidadesSet.size,
      rankingData: rData,
      especialidadeData: eData,
      alertasPreceptor: aPrec,
      alertasUnidade: aUni
    };
  }, [filteredAloc, limitePreceptor, limiteUnidade]);`;

code = code.replace(kpisRegex, newKpis);

fs.writeFileSync("src/routes/dashboard.tsx", code);
console.log("Replaced dashboard.tsx");
