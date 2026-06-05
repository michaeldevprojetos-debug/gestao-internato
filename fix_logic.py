import re

# 1. FIX hospitais.tsx
file_hospitais = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"
with open(file_hospitais, "r", encoding="utf-8") as f:
    content_hosp = f.read()

# Swap auto-calc target from setPreceptorChPrevista to setPreceptorHorasRealizadas
# Find the useEffect for auto calculation
auto_calc_pattern = r'(// Cálculo automático de CH Prevista\s*useEffect\(\(\) => \{.*?)setPreceptorChPrevista(\(prev => \{.*?newCh\[key\] = chCalculada;.*?return newCh;\s*\}\);)(.*?\}, \[dataInicio, dataFim, horaInicio, horaFim, selectedPreceptores\]\);)'
match = re.search(auto_calc_pattern, content_hosp, flags=re.DOTALL)
if match:
    old_effect = match.group(0)
    new_effect = old_effect.replace('Cálculo automático de CH Prevista', 'Cálculo automático de Horas Realizadas')
    new_effect = new_effect.replace('setPreceptorChPrevista', 'setPreceptorHorasRealizadas')
    content_hosp = content_hosp.replace(old_effect, new_effect)
else:
    print("Could not find auto calc effect in hospitais.tsx")

# Swap readOnly inputs
# Make CH Prevista editable
content_hosp = content_hosp.replace(
    '<Input type="number" min={0} className="h-8 text-xs bg-muted/50 cursor-not-allowed" readOnly value={preceptorChPrevista[key] || ""} title="Calculado automaticamente a partir das datas e horas" />',
    '<Input type="number" min={0} className="h-8 text-xs" value={preceptorChPrevista[key] || ""} onChange={(e) => setPreceptorChPrevista(p => ({...p, [key]: e.target.value ? Number(e.target.value) : ""}))} />'
)

# Make H. Realizadas readOnly
content_hosp = content_hosp.replace(
    '<Input type="number" min={0} className="h-8 text-xs" value={preceptorHorasRealizadas[key] || ""} onChange={(e) => setPreceptorHorasRealizadas(p => ({...p, [key]: e.target.value ? Number(e.target.value) : ""}))} />',
    '<Input type="number" min={0} className="h-8 text-xs bg-muted/50 cursor-not-allowed" readOnly value={preceptorHorasRealizadas[key] || ""} title="Calculado automaticamente a partir das datas e horas" />'
)

with open(file_hospitais, "w", encoding="utf-8") as f:
    f.write(content_hosp)

# 2. FIX dashboard.tsx
file_dash = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"
with open(file_dash, "r", encoding="utf-8") as f:
    content_dash = f.read()

# Fix the reduce logic to filter by unique alocacao_id
old_sheet_data_calc = """    const chContratada = rows.reduce((acc: number, r: any) => {
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
    }, 0);"""

new_sheet_data_calc = """    // Filtrar alocações únicas antes de somar as horas para remover duplicidade de alunos
    const uniqueAlocs = new Map();
    rows.forEach((r: any) => {
      const id = r.alocacao_id || Math.random();
      if (!uniqueAlocs.has(id)) uniqueAlocs.set(id, r);
    });
    const uniqueRows = Array.from(uniqueAlocs.values());

    const chContratada = uniqueRows.reduce((acc: number, r: any) => {
      let calc_ch = Number(r.ch_prevista || r.carga_horaria || 0);
      return acc + calc_ch;
    }, 0);

    const chRealizada = uniqueRows.reduce((acc: number, r: any) => {
      let calc_hr = Number(r.horas_realizadas || 0);
      
      // Fallback: se H. Realizadas for 0, calcular pelas datas
      if (calc_hr === 0 && r.data_inicio && r.data_fim && r.hora_inicio && r.hora_fim) {
        try {
          const start = new Date(r.data_inicio);
          const end = new Date(r.data_fim);
          if (end >= start) {
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const [h1, m1] = r.hora_inicio.split(":").map(Number);
            const [h2, m2] = r.hora_fim.split(":").map(Number);
            let diffHours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
            if (diffHours < 0) diffHours += 24;
            calc_hr = diffDays * diffHours;
          }
        } catch (e) {}
      }
      return acc + calc_hr;
    }, 0);"""

content_dash = content_dash.replace(old_sheet_data_calc, new_sheet_data_calc)

with open(file_dash, "w", encoding="utf-8") as f:
    f.write(content_dash)

print("Applied fixes for hospitais.tsx and dashboard.tsx")
