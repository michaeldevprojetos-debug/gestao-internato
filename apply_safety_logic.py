import re

# 1. Update preceptores.tsx
file_preceptores = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\preceptores.tsx"
with open(file_preceptores, "r", encoding="utf-8") as f:
    content_prec = f.read()

# Safe fallbacks in preceptores.tsx
content_prec = re.sub(
    r'const rows = filtered\.map',
    'const rows = (filtered || []).map',
    content_prec
)
content_prec = re.sub(
    r'preceptores\.filter\(',
    '(preceptores || []).filter(',
    content_prec
)
content_prec = re.sub(
    r'\{especialidades\.map\(',
    '{(especialidades || []).map(',
    content_prec
)

with open(file_preceptores, "w", encoding="utf-8") as f:
    f.write(content_prec)

# 2. Update hospitais.tsx
file_hospitais = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"
with open(file_hospitais, "r", encoding="utf-8") as f:
    content_hosp = f.read()

auto_calc_effect = """
    useEffect(() => {
      supabase.from("rotacoes" as any).select("id, nome").order("nome").then(({data}) => {
        if (data) setRotacoesOptions(data);
      });
    }, []);

    // Cálculo automático de CH Prevista
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
          setPreceptorChPrevista(prev => {
            const newCh = { ...prev };
            selectedPreceptores.forEach(tag => {
              const key = tag.type === "existing" ? tag.id : tag.tempId;
              // Preenche automaticamente o campo
              newCh[key] = chCalculada;
            });
            return newCh;
          });
        }
      } catch (e) {
        // ignore
      }
    }, [dataInicio, dataFim, horaInicio, horaFim, selectedPreceptores]);
"""

content_hosp = re.sub(
    r'useEffect\(\(\) => \{\s*supabase\.from\("rotacoes".*?\}\);\s*\}, \[\]\);',
    auto_calc_effect.strip(),
    content_hosp,
    flags=re.DOTALL
)

with open(file_hospitais, "w", encoding="utf-8") as f:
    f.write(content_hosp)

# 3. Update dashboard.tsx
file_dash = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"
with open(file_dash, "r", encoding="utf-8") as f:
    content_dash = f.read()

# Replace sheetData calculation
old_sheet_data = """    const ch = rows.reduce((acc: number, r: any) => {
      return acc + (Number(r.ch_prevista || r.carga_horaria || 0) / Number(r.qtd_alunos_alocacao || 1));
    }, 0);

    return { nome, unidades, especialidades, alunos, turnos, ch: Math.round(ch) };"""

new_sheet_data = """    const chContratada = rows.reduce((acc: number, r: any) => {
      let calc_ch = Number(r.ch_prevista || r.carga_horaria || 0);
      
      if (calc_ch === 0 && r.data_inicio && r.data_fim && r.hora_inicio && r.hora_fim) {
        try {
          const start = new Date(r.data_inicio);
          const end = new Date(r.data_fim);
          if (end >= start) {
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const [h1, m1] = r.hora_inicio.split(":").map(Number);
            const [h2, m2] = r.hora_fim.split(":").map(Number);
            let diffHours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
            if (diffHours < 0) diffHours += 24;
            calc_ch = diffDays * diffHours;
          }
        } catch (e) {}
      }
      return acc + (calc_ch / Number(r.qtd_alunos_alocacao || 1));
    }, 0);

    const chRealizada = rows.reduce((acc: number, r: any) => {
      return acc + (Number(r.horas_realizadas || 0) / Number(r.qtd_alunos_alocacao || 1));
    }, 0);

    const aproveitamento = chContratada > 0 ? Math.round((chRealizada / chContratada) * 100) : 0;

    return { 
      nome, unidades, especialidades, alunos, turnos, 
      chContratada: Math.round(chContratada),
      chRealizada: Math.round(chRealizada),
      aproveitamento
    };"""
content_dash = content_dash.replace(old_sheet_data, new_sheet_data)

# Replace sheet UI
old_sheet_ui = """                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-950/40 rounded-lg p-4 border border-emerald-900/40 text-center">
                    <p className="text-xs text-emerald-400/70 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                      <Users className="h-3 w-3" /> Alunos
                    </p>
                    <p className="text-3xl font-black text-emerald-400">{sheetData.alunos.length}</p>
                  </div>
                  <div className="bg-blue-950/40 rounded-lg p-4 border border-blue-900/40 text-center">
                    <p className="text-xs text-blue-400/70 font-bold uppercase tracking-wider mb-1 flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" /> Carga
                    </p>
                    <p className="text-3xl font-black text-blue-400">{sheetData.ch}h</p>
                  </div>
                </div>"""

new_sheet_ui = """                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-950/40 rounded-lg p-4 border border-emerald-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Alunos
                    </p>
                    <p className="text-2xl font-black text-emerald-400">{sheetData.alunos.length}</p>
                  </div>
                  <div className="bg-blue-950/40 rounded-lg p-4 border border-blue-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-blue-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> CH Contratada
                    </p>
                    <p className="text-2xl font-black text-blue-400">{sheetData.chContratada}h</p>
                  </div>
                  <div className="bg-indigo-950/40 rounded-lg p-4 border border-indigo-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> CH Realizada
                    </p>
                    <p className="text-2xl font-black text-indigo-400">{sheetData.chRealizada}h</p>
                  </div>
                  <div className="bg-purple-950/40 rounded-lg p-4 border border-purple-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-purple-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Aproveitamento
                    </p>
                    <p className="text-2xl font-black text-purple-400">{sheetData.aproveitamento}%</p>
                  </div>
                </div>"""
content_dash = content_dash.replace(old_sheet_ui, new_sheet_ui)

with open(file_dash, "w", encoding="utf-8") as f:
    f.write(content_dash)

print("Applied safety and logic updates.")
