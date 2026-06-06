import re

with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Imports
if "useAuth" not in code:
    code = code.replace('import { useQueryClient }', 'import { useAuth } from "@/lib/auth";\nimport { useQueryClient }')

if "Trash" not in code:
    code = code.replace('Pencil,', 'Pencil, Trash,')

# 2. Add handleClearPreceptor
handle_clear_code = """  const handleClearPreceptor = async (unidadeId: string, preceptorId: string) => {
    try {
      const { error } = await supabase
        .from("alocacoes")
        .delete()
        .eq("unidade_id", unidadeId)
        .eq("preceptor_id", preceptorId);

      if (error) throw error;
      toast.success("Registro de alocação removido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["hospitaisData"] });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao limpar registro.");
    }
  };

"""

# Insert before "const handleSaveDialog = async () => {"
if "handleClearPreceptor" not in code:
    code = code.replace("  const handleSaveDialog = async () => {", handle_clear_code + "  const handleSaveDialog = async () => {")

# 3. Add onClear to PreceptorCard usage
usage_old = """                          onEdit={() => setEditingPreceptor({ preceptor: p, unidadeId: u.id })}
                        />"""
usage_new = """                          onEdit={() => setEditingPreceptor({ preceptor: p, unidadeId: u.id })}
                          onClear={() => {
                            if (window.confirm("Deseja limpar o registro deste preceptor nesta unidade? Os alunos vinculados a ele neste bloco também serão desvinculados.")) {
                              handleClearPreceptor(u.id, p.id);
                            }
                          }}
                        />"""
code = code.replace(usage_old, usage_new)

# 4. Modify PreceptorCard definition
def_old = """function PreceptorCard({
  preceptor,
  students,
  exceeded,
  limiteAlunos,
  onUpdateQuantidade,
  onEdit,
}: {
  preceptor: LocalRow["preceptoresList"][number];
  students: LocalRow["alunosVinculados"];
  exceeded: boolean;
  limiteAlunos: number;
  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;
  onEdit?: () => void;
}) {"""
def_new = """function PreceptorCard({
  preceptor,
  students,
  exceeded,
  limiteAlunos,
  onUpdateQuantidade,
  onEdit,
  onClear,
}: {
  preceptor: LocalRow["preceptoresList"][number];
  students: LocalRow["alunosVinculados"];
  exceeded: boolean;
  limiteAlunos: number;
  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;
  onEdit?: () => void;
  onClear?: () => void;
}) {
  const { user } = useAuth();
  const canClear = user?.role === "admin" || user?.role === "super_admin";"""

code = code.replace(def_old, def_new)

# 5. Modify PreceptorCard header
header_old = """          {onEdit && (
            <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>"""
header_new = """          <div className="ml-auto flex items-center gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
            {canClear && onClear && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); onClear(); }} title="Limpar registro deste preceptor no bloco">
                <Trash className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>"""
code = code.replace(header_old, header_new)


with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied Limpar Registro functionality")
