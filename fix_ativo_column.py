import os

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\preceptores.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the select statement to remove 'ativo'
content = content.replace(
    'select("id, nome, especialidade_id, ativo, tipo_remuneracao, valor_hora_preceptor, especialidades(nome)")',
    'select("id, nome, especialidade_id, tipo_remuneracao, valor_hora_preceptor, especialidades(nome)")'
)

# Fix handleSave to remove 'ativo' from the data payload
old_save = """      const data = {
        nome,
        especialidade_id: especialidadeId === "none" ? null : especialidadeId,
        ativo,
        tipo_remuneracao: tipoRemuneracao,
        valor_hora_preceptor: valorHora === "" ? 0 : Number(valorHora),
      };"""

new_save = """      const data = {
        nome,
        especialidade_id: especialidadeId === "none" ? null : especialidadeId,
        tipo_remuneracao: tipoRemuneracao,
        valor_hora_preceptor: valorHora === "" ? 0 : Number(valorHora),
      };"""

content = content.replace(old_save, new_save)

# Fix handleDelete to just throw an error saying it's not supported, or change how we handle it
# If 'ativo' doesn't exist, we might have to actually delete it, but since foreign keys might block it, maybe we just use delete() and catch the FK error.
old_delete = """  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`ATENÇÃO DESTRUTIVA!\\n\\nTem certeza que deseja inativar o preceptor "${nome}"?\\nIsso poderá afetar seus vínculos e alocações ativas.`)) return;
    try {
      const { error } = await supabase
        .from("preceptores" as any)
        .update({ ativo: false })
        .eq("id", id);"""

new_delete = """  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`ATENÇÃO DESTRUTIVA!\\n\\nTem certeza que deseja APAGAR o preceptor "${nome}"?\\nIsso falhará se ele possuir alocações ativas.`)) return;
    try {
      const { error } = await supabase
        .from("preceptores" as any)
        .delete()
        .eq("id", id);"""

content = content.replace(old_delete, new_delete)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Removed 'ativo' column logic")
