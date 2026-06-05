import re

file_dash = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"

with open(file_dash, "r", encoding="utf-8") as f:
    content = f.read()

old_logic = """    // Filtrar alocações únicas antes de somar as horas para remover duplicidade de alunos
    const uniqueAlocs = new Map();
    rows.forEach((r: any) => {
      const id = r.alocacao_id || Math.random();
      if (!uniqueAlocs.has(id)) uniqueAlocs.set(id, r);
    });
    const uniqueRows = Array.from(uniqueAlocs.values());"""

new_logic = """    // Filtrar alocações únicas por turno/hospital para remover duplicidade de alunos
    const uniqueAlocs = new Map();
    rows.forEach((r: any) => {
      // Cria uma chave única baseada no hospital e no período do turno
      const id = `${r.unidade}-${r.data_inicio}-${r.data_fim}-${r.hora_inicio}-${r.hora_fim}`;
      if (!uniqueAlocs.has(id)) uniqueAlocs.set(id, r);
    });
    const uniqueRows = Array.from(uniqueAlocs.values());"""

content = content.replace(old_logic, new_logic)

with open(file_dash, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard.tsx unique logic")
