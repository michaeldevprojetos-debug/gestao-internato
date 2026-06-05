import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import { useSystemConfig } from "@/hooks/use-system-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Plus,
  Pencil,
  Building2,
  AlertCircle,
  Search,
  ChevronRight,
  ChevronDown,
  Settings2,
  Users,
  Trash2,
  X,
  ChevronsUpDown,
  Check,
  GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type PreceptorSimple = {
  id: string;
  nome: string;
  especialidade: string | null;
  local_id: string | null;
};

type AlunoSimple = {
  id: string;
  nome: string;
  semestre: number | null;
};

type LocalSimple = {
  id: string;
  nome: string;
  tipo: string;
};

type VinculoQtd = {
  id: string;
  preceptor_id: string;
  quantidade_alunos: number;
};

type LocalRow = {
  id: string;
  nome: string;
  tipo: string;
  totalPreceptores: number;
  especialidades: string[];
  preceptoresList: Array<{
    id: string;
    nome: string;
    especialidade: string | null;
    alunosCount: number;
    quantidadeAlunos: number;
    vinculoId: string | null;
  }>;
  alunosVinculados: Array<{
    aluno_id: string;
    aluno_nome: string;
    aluno_semestre: number | null;
    preceptor_nome: string;
    preceptor_id: string;
  }>;
  totalAlunosVinculados: number;
};

const TIPOS_CAMPO = ["Hospital", "UPA", "UBS", "CAPS", "Maternidade", "Clínica", "Outro"] as const;

const ESPECIALIDADES_COMUNS = [
  "Clínica Médica",
  "Cirurgia Geral",
  "Pediatria",
  "Ginecologia e Obstetrícia",
  "Ortopedia",
  "Cardiologia",
  "Neurologia",
  "Psiquiatria",
  "Dermatologia",
  "Oftalmologia",
  "Otorrinolaringologia",
  "Urologia",
  "Anestesiologia",
  "Medicina de Família",
  "Saúde Mental",
  "Emergência",
  "Outra",
] as const;

const BADGE_COLOR: Record<string, string> = {
  Hospital: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UPA: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CAPS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Maternidade: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  Clínica: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  UBS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Outro: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const Route = createFileRoute("/hospitais")({
  head: () => ({ meta: [{ title: "Hospitais / Locais — Painel de Preceptoria" }] }),
  component: HospitaisPage,
});

// ─── Página principal ─────────────────────────────────────────────────────────

function HospitaisPage() {
  const queryClient = useQueryClient();
  const [locais, setLocais] = useState<LocalRow[]>([]);
  const [filtered, setFiltered] = useState<LocalRow[]>([]);
  const [allPreceptores, setAllPreceptores] = useState<PreceptorSimple[]>([]);
  const [allLocaisSimple, setAllLocaisSimple] = useState<LocalSimple[]>([]);
  const [allAlunos, setAllAlunos] = useState<AlunoSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { config, updateLimitePreceptor } = useSystemConfig();
  const limiteAlunos = config.limitePreceptor;
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLocal, setEditingLocal] = useState<LocalRow | null>(null);

  const toggleRow = (id: string) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Busca e agrega dados ───────────────────────────────────────────────────
  const fetchLocais = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Todos os locais cadastrados
      const { data: locaisData, error: err1 } = await supabase
        .from("locais")
        .select("id, nome, tipo")
        .order("nome");
      if (err1) throw err1;

      setAllLocaisSimple((locaisData ?? []) as LocalSimple[]);

      // 2. Todos os preceptores
      const { data: preceptoresData, error: err2 } = await supabase
        .from("preceptores")
        .select("id, nome, especialidade, local_id")
        .order("nome");
      if (err2) throw err2;

      setAllPreceptores((preceptoresData ?? []) as PreceptorSimple[]);

      // 3. Todos os alunos
      const { data: alunosData, error: errAlunos } = await supabase
        .from("alunos")
        .select("id, nome, semestre")
        .order("nome");
      if (errAlunos) throw errAlunos;

      setAllAlunos(
        (alunosData ?? []).map((a) => ({
          id: a.id,
          nome: a.nome,
          semestre: a.semestre,
        })),
      );

      // 4. Vínculos operacionais
      const { data: vinculosData, error: err3 } = await supabase
        .from("vinculo_operacional")
        .select("id, preceptor_id, aluno_id, quantidade_alunos, alunos ( nome, semestre )");
      if (err3) throw err3;

      type AlunoInfo = { id: string; nome: string; semestre: number | null };
      const preceptorAlunosSet = new Map<string, Set<string>>();
      const preceptorStudents = new Map<string, AlunoInfo[]>();
      const preceptorQtd = new Map<string, VinculoQtd>();

      for (const v of vinculosData ?? []) {
        if (!v.preceptor_id) continue;
        if (!preceptorQtd.has(v.preceptor_id)) {
          preceptorQtd.set(v.preceptor_id, {
            id: v.id,
            preceptor_id: v.preceptor_id,
            quantidade_alunos: v.quantidade_alunos ?? 0,
          });
        }
        if (!v.aluno_id) continue;
        if (!preceptorAlunosSet.has(v.preceptor_id)) {
          preceptorAlunosSet.set(v.preceptor_id, new Set());
          preceptorStudents.set(v.preceptor_id, []);
        }
        if (!preceptorAlunosSet.get(v.preceptor_id)!.has(v.aluno_id)) {
          preceptorAlunosSet.get(v.preceptor_id)!.add(v.aluno_id);
          const al = v.alunos as { nome?: string; semestre?: number | null } | null;
          preceptorStudents.get(v.preceptor_id)!.push({
            id: v.aluno_id,
            nome: al?.nome ?? "—",
            semestre: al?.semestre ?? null,
          });
        }
      }

      const rows: LocalRow[] = (locaisData ?? []).map((local) => {
        const unitPreceptors = (preceptoresData ?? []).filter((p) => p.local_id === local.id);
        const activePreceptors = unitPreceptors.filter(
          (p) => (preceptorAlunosSet.get(p.id)?.size ?? 0) > 0,
        );

        const specs = new Set<string>();
        for (const p of activePreceptors) {
          if (p.especialidade) specs.add(p.especialidade);
        }

        const alunosVinculados: LocalRow["alunosVinculados"] = [];
        let totalAlunosVinculados = 0;
        for (const p of unitPreceptors) {
          const qtd = preceptorQtd.get(p.id);
          totalAlunosVinculados += qtd?.quantidade_alunos ?? 0;
          for (const s of preceptorStudents.get(p.id) ?? []) {
            alunosVinculados.push({
              aluno_id: s.id,
              aluno_nome: s.nome,
              aluno_semestre: s.semestre,
              preceptor_nome: p.nome,
              preceptor_id: p.id,
            });
          }
        }

        return {
          id: local.id,
          nome: local.nome,
          tipo: local.tipo,
          totalPreceptores: activePreceptors.length,
          especialidades: Array.from(specs).sort(),
          preceptoresList: unitPreceptors.map((p) => ({
            id: p.id,
            nome: p.nome,
            especialidade: p.especialidade,
            alunosCount: preceptorAlunosSet.get(p.id)?.size ?? 0,
            quantidadeAlunos: preceptorQtd.get(p.id)?.quantidade_alunos ?? 0,
            vinculoId: preceptorQtd.get(p.id)?.id ?? null,
          })),
          alunosVinculados,
          totalAlunosVinculados,
        };
      });

      setLocais(rows);
      setFiltered(rows);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar locais. Execute a migration SQL.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocais();
  }, [fetchLocais]);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(q ? locais.filter((l) => l.nome.toLowerCase().includes(q)) : locais);
  }, [query, locais]);

  const countByTipo = (tipo: string) => locais.filter((l) => l.tipo === tipo).length;

  // ── Excluir unidade ──
  async function handleDeleteLocal(localId: string, localNome: string) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir a unidade "${localNome}"?\n\nOs preceptores associados serão desvinculados.`,
      )
    )
      return;
    try {
      const { error: err1 } = await supabase
        .from("preceptores")
        .update({ local_id: null })
        .eq("local_id", localId);
      if (err1) throw err1;

      const { error: err2 } = await supabase.from("locais").delete().eq("id", localId);
      if (err2) throw err2;

      toast.success(`Unidade "${localNome}" excluída com sucesso!`);
      fetchLocais();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + (e?.message ?? "Tente novamente."));
    }
  }

  // ── Atualizar quantidade_alunos em tempo real ──
  async function handleUpdateQuantidade(
    vinculoId: string | null,
    preceptorId: string,
    newValue: number,
  ) {
    try {
      if (vinculoId) {
        const { error } = await supabase
          .from("vinculo_operacional")
          .update({ quantidade_alunos: newValue })
          .eq("id", vinculoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("alocacoes").insert({
          preceptor_id: preceptorId,
          quantidade_alunos: newValue,
          mes_referencia: new Date().toISOString().slice(0, 7),
        });
        if (error) throw error;
      }
      setLocais((prev) =>
        prev.map((l) => ({
          ...l,
          preceptoresList: l.preceptoresList.map((p) =>
            p.id === preceptorId ? { ...p, quantidadeAlunos: newValue } : p,
          ),
          totalAlunosVinculados: l.preceptoresList.reduce(
            (sum, p) => sum + (p.id === preceptorId ? newValue : p.quantidadeAlunos),
            0,
          ),
        })),
      );
    } catch (e: any) {
      toast.error("Erro ao salvar quantidade: " + (e?.message ?? ""));
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hospitais / Locais</h1>
          <p className="text-sm text-muted-foreground">
            Campos de prática vinculados aos preceptores.{" "}
            {!loading && !error && (
              <span className="font-medium text-foreground">{filtered.length} unidades</span>
            )}
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingLocal(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      {/* ── Cards de contagem ── */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["Hospital", "UPA", "Maternidade"] as const).map((tipo) => (
            <Card key={tipo} className="border-border/60">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{countByTipo(tipo)}</p>
                  <p className="text-xs text-muted-foreground">{tipo}s cadastrados</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Mensagem de erro ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={fetchLocais}>
            Tentar novamente
          </Button>
        </div>
      )}

      {/* ── Tabela principal ── */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar unidade…"
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
              <Label
                htmlFor="limite-input"
                className="text-xs font-semibold text-muted-foreground whitespace-nowrap"
              >
                Limite de Alunos / Preceptor:
              </Label>
              <Input
                id="limite-input"
                type="number"
                min={1}
                value={limiteAlunos}
                onChange={(e) => {
                  const val = Math.max(1, Number(e.target.value));
                  updateLimitePreceptor(val);
                }}
                className="w-16 h-8 text-center font-bold"
              />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade / Campo de Prática</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead className="text-right">Preceptores</TableHead>
                  <TableHead className="text-right">Alunos Vinculados</TableHead>
                  <TableHead className="text-right">Limite Individual</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                      {error
                        ? "Erro ao carregar. Verifique se a migration SQL foi executada."
                        : "Nenhuma unidade encontrada."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((u) => {
                    const isExpanded = !!expandedRows[u.id];
                    const hasLimitWarn = u.preceptoresList.some(
                      (p) => p.alunosCount > limiteAlunos,
                    );

                    return (
                      <Fragment key={u.id}>
                        <TableRow
                          className="hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => toggleRow(u.id)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground shrink-0">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                              </span>
                              <span>{u.nome}</span>
                              {hasLimitWarn && (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] h-5 py-0 px-2 animate-pulse shrink-0 ml-1"
                                >
                                  Limitação de Espaço Unidade
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLOR[u.tipo] ?? BADGE_COLOR["Outro"]}`}
                            >
                              {u.tipo}
                            </span>
                          </TableCell>

                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.especialidades.length === 0 ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <>
                                  {u.especialidades.slice(0, 3).map((e) => (
                                    <Badge key={e} variant="secondary" className="text-[10px]">
                                      {e}
                                    </Badge>
                                  ))}
                                  {u.especialidades.length > 3 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      +{u.especialidades.length - 3}
                                    </Badge>
                                  )}
                                </>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-right font-semibold">
                            {u.totalPreceptores}
                          </TableCell>

                          <TableCell className="text-right">
                            <Badge
                              variant={u.totalAlunosVinculados > 0 ? "secondary" : "outline"}
                              className="text-xs font-semibold"
                            >
                              {u.totalAlunosVinculados}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            <span className="text-xs text-muted-foreground font-medium">
                              {limiteAlunos} / preceptor
                            </span>
                          </TableCell>

                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Gerenciar Unidade"
                                onClick={() => {
                                  setEditingLocal(u);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Excluir Unidade"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => handleDeleteLocal(u.id, u.nome)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* ── Sub-linha expansível (Accordion) ── */}
                        {isExpanded && (
                          <TableRow className="bg-muted/5 hover:bg-muted/5">
                            <TableCell colSpan={7} className="p-4 pt-1">
                              <div className="rounded-lg border bg-card/50 p-4 shadow-inner">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                  Distribuição de Preceptores e Alunos
                                </h4>

                                {u.preceptoresList.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-2">
                                    Nenhum preceptor alocado.{" "}
                                    <button
                                      className="text-primary underline hover:no-underline text-sm"
                                      onClick={() => {
                                        setEditingLocal(u);
                                        setDialogOpen(true);
                                      }}
                                    >
                                      Clique aqui para gerenciar.
                                    </button>
                                  </p>
                                ) : (
                                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {u.preceptoresList.map((p) => {
                                      const exceeded = p.alunosCount > limiteAlunos;
                                      const students = u.alunosVinculados.filter(
                                        (a) => a.preceptor_id === p.id,
                                      );

                                      return (
                                        <PreceptorCard
                                          key={p.id}
                                          preceptor={p}
                                          students={students}
                                          exceeded={exceeded}
                                          limiteAlunos={limiteAlunos}
                                          onUpdateQuantidade={handleUpdateQuantidade}
                                        />
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Modal Gerenciar Unidade ── */}
      <GerenciarUnidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        local={editingLocal}
        allLocaisSimple={allLocaisSimple}
        allAlunos={allAlunos}
        onSaved={() => {
          setDialogOpen(false);
          fetchLocais();
          queryClient.invalidateQueries();
        }}
      />
    </div>
  );
}

// ─── Card de Preceptor com input numérico ─────────────────────────────────────

function PreceptorCard({
  preceptor,
  students,
  exceeded,
  limiteAlunos,
  onUpdateQuantidade,
}: {
  preceptor: LocalRow["preceptoresList"][number];
  students: LocalRow["alunosVinculados"];
  exceeded: boolean;
  limiteAlunos: number;
  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;
}) {
  const p = preceptor;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localQtd, setLocalQtd] = useState(p.quantidadeAlunos);

  useEffect(() => {
    setLocalQtd(p.quantidadeAlunos);
  }, [p.quantidadeAlunos]);

  function handleChange(newVal: number) {
    const val = Math.max(0, newVal);
    setLocalQtd(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onUpdateQuantidade(p.vinculoId, p.id, val);
    }, 500);
  }

  return (
    <div
      className={`rounded-lg border p-3 flex flex-col justify-between transition-colors ${
        exceeded
          ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10"
          : "border-border bg-card"
      }`}
    >
      <div>
        {/* Formato: Preceptor [Nome] — Quantidade de alunos: N — (nomes)  +  badge especialidade */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
            Preceptor
          </span>
          <span className="font-semibold text-sm text-foreground">{p.nome}</span>
          {p.especialidade && (
            <Badge variant="outline" className="text-[10px] py-0">
              {p.especialidade}
            </Badge>
          )}
        </div>

        <div className="text-xs text-foreground/80 leading-snug">
          <span className="font-semibold">Quantidade de alunos:</span>{" "}
          <Badge
            variant={exceeded ? "destructive" : "secondary"}
            className="text-[10px] py-0 px-1.5"
          >
            {p.alunosCount}
          </Badge>
          {students.length > 0 && (
            <span className="text-muted-foreground">
              {" "}
              — ({students.map((s) => s.aluno_nome).join(", ")})
            </span>
          )}
        </div>

        {/* ── Input de Quantidade de Alunos ── */}
        <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-muted/40 border border-border/50">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
            Quantidade de alunos por preceptor(a):
          </Label>
          <Input
            type="number"
            min={0}
            value={localQtd}
            onChange={(e) => handleChange(Number(e.target.value))}
            className="w-16 h-7 text-center text-sm font-bold"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {exceeded && (
        <div className="text-xs font-semibold text-destructive mt-3 flex items-center gap-1 bg-destructive/10 p-1.5 rounded border border-destructive/20">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Limitação de Espaço Unidade</span>
        </div>
      )}
    </div>
  );
}

// ─── Combobox Inteligente (Popover + Command com escrita livre) ────────────────

function SmartCombobox({
  value,
  onValueChange,
  options,
  placeholder,
  emptyMessage,
  id,
}: {
  value: string;
  onValueChange: (val: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  emptyMessage: string;
  id?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Quando abre, sincroniza o campo de busca com o valor atual
  useEffect(() => {
    if (open) setSearch(value);
  }, [open, value]);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          id={id}
          className="w-full justify-between font-normal h-9 text-sm"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ou digitar…`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filtered.length === 0 && !search.trim() && <CommandEmpty>{emptyMessage}</CommandEmpty>}
            {search.trim() &&
              !filtered.some((o) => o.label.toLowerCase() === search.toLowerCase()) && (
                <CommandItem
                  value={`__create__${search}`}
                  onSelect={() => {
                    onValueChange(search.trim());
                    setOpen(false);
                  }}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Usar: &ldquo;{search.trim()}&rdquo;
                </CommandItem>
              )}
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onValueChange(option.label);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.label ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Multi-select de Alunos por Preceptor ─────────────────────────────────────

function AlunoMultiSelect({
  allAlunos,
  selectedAlunoIds,
  onChangeAlunoIds,
  preceptorNome,
}: {
  allAlunos: AlunoSimple[];
  selectedAlunoIds: string[];
  onChangeAlunoIds: (ids: string[]) => void;
  preceptorNome: string;
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
        let query = supabase.from("alunos").select("id, nome, semestre").order("nome").limit(50);
        if (search.trim()) {
          query = query.ilike("nome", `%${search.trim()}%`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setOptions(data || []);
      } catch (err) {
        console.error("Erro ao buscar alunos:", err);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchAlunos, 300);
    return () => clearTimeout(timeoutId);
  }, [search, open]);

  const toggle = (aluno: AlunoSimple) => {
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
              {!loading && options.length === 0 && (
                <CommandEmpty>Nenhum aluno encontrado.</CommandEmpty>
              )}
              <CommandGroup>
                {!loading &&
                  options.map((a) => {
                    const isChecked = selectedAlunoIds.includes(a.id);
                    return (
                      <CommandItem key={a.id} value={a.id} onSelect={() => toggle(a)}>
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            isChecked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1 truncate">{a.nome}</span>
                        {a.semestre && (
                          <span className="text-muted-foreground text-[10px] ml-2">
                            {a.semestre}º sem.
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

// ─── Modal: Gerenciar Unidade (Formulário Inteligente) ────────────────────────

type SelectedPreceptor =
  | {
      type: "existing";
      id: string;
      nome: string;
    }
  | {
      type: "new";
      nome: string;
      tempId: string;
    };

function GerenciarUnidadeDialog({
  open,
  onOpenChange,
  local,
  allLocaisSimple,
  allAlunos,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  local: LocalRow | null;
  allLocaisSimple: LocalSimple[];
  allAlunos: AlunoSimple[];
  onSaved: () => void;
}) {
  const isNew = !local;

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("Outro");
  const [especialidade, setEspecialidade] = useState<string>("");
  const [especialidadeCustom, setEspecialidadeCustom] = useState("");
  const [selectedPreceptores, setSelectedPreceptores] = useState<SelectedPreceptor[]>([]);
  const [preceptorSearch, setPreceptorSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [preceptoresOptions, setPreceptoresOptions] = useState<PreceptorSimple[]>([]);
  // Per-preceptor student selections: Map<preceptorKey, string[]>
  const [preceptorAlunos, setPreceptorAlunos] = useState<Record<string, string[]>>({});
  
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("12:00");

  // Carregar preceptores diretamente no modal ao abrir
  useEffect(() => {
    if (!open) return;
    const fetchPreceptores = async () => {
      try {
        const { data, error } = await supabase
          .from("preceptores")
          .select("id, nome, especialidade, local_id")
          .order("nome");
        if (error) throw error;
        setPreceptoresOptions((data ?? []) as PreceptorSimple[]);
      } catch (err: any) {
        console.error("Erro ao carregar preceptores no modal:", err);
        toast.error("Erro ao carregar lista de preceptores.");
      }
    };
    fetchPreceptores();
  }, [open]);

  // Popula o formulário ao abrir
  useEffect(() => {
    if (!open) return;
    setNome(local?.nome ?? "");
    setTipo(local?.tipo ?? "Outro");
    setEspecialidade("");
    setEspecialidadeCustom("");
    setSelectedPreceptores(
      local?.preceptoresList.map((p) => ({ type: "existing" as const, id: p.id, nome: p.nome })) ??
        [],
    );
    setPreceptorSearch("");
    // Initialize per-preceptor aluno selections from existing data using Direct ID mapping
    const initialAlunos: Record<string, string[]> = {};
    if (local) {
      for (const p of local.preceptoresList) {
        const studentIds = local.alunosVinculados
          .filter((a) => a.preceptor_id === p.id)
          .map((a) => a.aluno_id);
        if (studentIds.length > 0) initialAlunos[p.id] = studentIds;
      }
    }
    setPreceptorAlunos(initialAlunos);
  }, [open, local]);

  const toggleExisting = (p: PreceptorSimple) => {
    setSelectedPreceptores((prev) => {
      const exists = prev.find((t) => t.type === "existing" && t.id === p.id);
      if (exists) {
        // Remove from tags and clear aluno selections
        setPreceptorAlunos((pa) => {
          const copy = { ...pa };
          delete copy[p.id];
          return copy;
        });
        return prev.filter((t) => !(t.type === "existing" && t.id === p.id));
      }
      return [...prev, { type: "existing", id: p.id, nome: p.nome }];
    });
  };

  const removePreceptor = (tag: SelectedPreceptor) => {
    const key = tag.type === "existing" ? tag.id : tag.tempId;
    setPreceptorAlunos((pa) => {
      const copy = { ...pa };
      delete copy[key];
      return copy;
    });
    setSelectedPreceptores((prev) => {
      if (tag.type === "existing")
        return prev.filter((t) => !(t.type === "existing" && t.id === tag.id));
      return prev.filter((t) => !(t.type === "new" && t.tempId === tag.tempId));
    });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !preceptorSearch.trim()) return;
    e.preventDefault();
    const searchLower = preceptorSearch.trim().toLowerCase();

    const matchingExisting = preceptoresOptions.find((p) => p.nome.toLowerCase() === searchLower);
    if (matchingExisting) {
      const alreadySelected = selectedPreceptores.find(
        (t) => t.type === "existing" && t.id === matchingExisting.id,
      );
      if (!alreadySelected) {
        setSelectedPreceptores((prev) => [
          ...prev,
          { type: "existing", id: matchingExisting.id, nome: matchingExisting.nome },
        ]);
      }
      setPreceptorSearch("");
      return;
    }

    const alreadyNew = selectedPreceptores.find(
      (t) => t.type === "new" && t.nome.toLowerCase() === searchLower,
    );
    if (alreadyNew) {
      setPreceptorSearch("");
      return;
    }

    setSelectedPreceptores((prev) => [
      ...prev,
      {
        type: "new",
        nome: preceptorSearch.trim(),
        tempId: crypto.randomUUID(),
      },
    ]);
    setPreceptorSearch("");
  };

  const visiblePreceptores = preceptoresOptions.filter((p) =>
    p.nome.toLowerCase().includes(preceptorSearch.toLowerCase()),
  );

  const isSelected = (id: string) =>
    selectedPreceptores.some((t) => t.type === "existing" && t.id === id);

  // Compute total alunos across all preceptors
  const totalAlunosSelecionados = Object.values(preceptorAlunos).reduce(
    (sum, ids) => sum + ids.length,
    0,
  );

  // Helper to update aluno selections for a specific preceptor key
  const updatePreceptorAlunos = (key: string, ids: string[]) => {
    setPreceptorAlunos((prev) => ({ ...prev, [key]: ids }));
  };

  // Combobox options from locais list
  const locaisOptions = allLocaisSimple.map((l) => ({
    value: l.id,
    label: l.nome,
  }));

  // Auto-detect tipo when selecting an existing local
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
      let localId = local?.id;
      const finalEspecialidade =
        especialidade === "Outra" ? especialidadeCustom.trim() : especialidade;

      // ── Verificar se o local já existe pelo nome ou criar novo ──
      const matchedLocal = allLocaisSimple.find(
        (l) => l.nome.toLowerCase() === nome.trim().toLowerCase(),
      );

      if (isNew) {
        if (matchedLocal) {
          // Local já existe, usar o ID existente e atualizar tipo se necessário
          localId = matchedLocal.id;
          const { error } = await supabase.from("locais").update({ tipo }).eq("id", localId);
          if (error) throw error;
        } else {
          // Criar novo local
          const { data, error } = await supabase
            .from("locais")
            .insert({ nome: nome.trim(), tipo })
            .select("id")
            .single();
          if (error) throw error;
          localId = data.id;
        }
      } else {
        const { error } = await supabase
          .from("locais")
          .update({ nome: nome.trim(), tipo })
          .eq("id", local!.id);
        if (error) throw error;
      }

      // ── Criar preceptores temporários (tags novas) ──
      const newTags = selectedPreceptores.filter((t) => t.type === "new");
      const tempIdToRealId = new Map<string, string>();

      for (const tag of newTags) {
        const insertData: Record<string, any> = {
          nome: tag.nome,
          local_id: localId,
        };
        if (finalEspecialidade) insertData.especialidade = finalEspecialidade;

        const { data, error } = await supabase
          .from("preceptores")
          .insert(insertData)
          .select("id")
          .single();
        if (error) throw error;
        tempIdToRealId.set(tag.tempId, data.id);
      }

      // ── Vincular preceptores existentes selecionados ──
      const existingIds = selectedPreceptores
        .filter((t) => t.type === "existing")
        .map((t) => (t as { type: "existing"; id: string }).id);

      const newCreatedIds = Array.from(tempIdToRealId.values());
      const allSelectedIds = [...existingIds, ...newCreatedIds];

      if (allSelectedIds.length > 0) {
        const { error } = await supabase
          .from("preceptores")
          .update({ local_id: localId })
          .in("id", allSelectedIds);
        if (error) throw error;

        if (finalEspecialidade && existingIds.length > 0) {
          const { error: errEsp } = await supabase
            .from("preceptores")
            .update({ especialidade: finalEspecialidade })
            .in("id", existingIds);
          if (errEsp) throw errEsp;
        }
      }

      // ── Limpar vínculos operacionais antigos (evita duplicações) ──
      if (local && local.preceptoresList.length > 0) {
        const preceptorIdsOfLocal = local.preceptoresList.map((p) => p.id);
        const { error: deleteError } = await supabase
          .from("vinculo_operacional")
          .delete()
          .in("preceptor_id", preceptorIdsOfLocal);
        if (deleteError) throw deleteError;

        // Desvincular alunos cujo preceptor_id atual pertencia a esta unidade
        const { error: unsetError } = await supabase
          .from("alunos")
          .update({ preceptor_id: null })
          .in("preceptor_id", preceptorIdsOfLocal);
        if (unsetError) throw unsetError;
      }

      // ── Criar vínculos operacionais com alunos selecionados ──
      const alocacoesToInsert: Array<{
        preceptor_id: string;
        aluno_id: string | null;
        unidade_id: string;
        data_inicio: string;
        data_fim: string | null;
        hora_inicio: string | null;
        hora_fim: string | null;
      }> = [];

      for (const tag of selectedPreceptores) {
        const key = tag.type === "existing" ? tag.id : tag.tempId;
        const realPreceptorId = tag.type === "existing" ? tag.id : tempIdToRealId.get(tag.tempId);
        if (!realPreceptorId) continue;

        const selectedStudents = preceptorAlunos[key] ?? [];
        if (selectedStudents.length > 0) {
          for (const alunoId of selectedStudents) {
            alocacoesToInsert.push({
              preceptor_id: realPreceptorId,
              aluno_id: alunoId,
              unidade_id: localId,
              data_inicio: dataInicio || new Date().toISOString().split("T")[0],
              data_fim: dataFim || null,
              hora_inicio: horaInicio || null,
              hora_fim: horaFim || null
            });
          }
        } else {
            alocacoesToInsert.push({
              preceptor_id: realPreceptorId,
              aluno_id: null,
              unidade_id: localId,
              data_inicio: dataInicio || new Date().toISOString().split("T")[0],
              data_fim: dataFim || null,
              hora_inicio: horaInicio || null,
              hora_fim: horaFim || null
            });
        }
      }

      if (alocacoesToInsert.length > 0) {
        const { error } = await supabase.from("alocacoes").insert(alocacoesToInsert);
        if (error) throw error;
      }

      // ── UPDATE alunos.preceptor_id para refletir a vinculação ──
      for (const tag of selectedPreceptores) {
        const key = tag.type === "existing" ? tag.id : tag.tempId;
        const realPreceptorId = tag.type === "existing" ? tag.id : tempIdToRealId.get(tag.tempId);
        if (!realPreceptorId) continue;
        const selectedStudents = preceptorAlunos[key] ?? [];
        if (selectedStudents.length === 0) continue;
        const { error: updErr } = await supabase
          .from("alunos")
          .update({ preceptor_id: realPreceptorId })
          .in("id", selectedStudents);
        if (updErr) throw updErr;
      }

      // ── Desvincular preceptores removidos (apenas em edição) ──
      if (!isNew && local) {
        const prevIds = local.preceptoresList.map((p) => p.id);
        const toUnlink = prevIds.filter((id) => !allSelectedIds.includes(id));
        if (toUnlink.length > 0) {
          const { error } = await supabase
            .from("preceptores")
            .update({ local_id: null })
            .in("id", toUnlink);
          if (error) throw error;
        }
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
      <DialogContent className="sm:max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {isNew ? "Nova Unidade" : `Gerenciar: ${local?.nome}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* ── Nome (Combobox) + Tipo ── */}
          <div className="grid sm:grid-cols-2 gap-4">
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

          {/* ── Alocar Preceptores ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Alocar Preceptores</p>
              <Badge variant="secondary" className="ml-auto text-xs">
                {selectedPreceptores.length} selecionado
                {selectedPreceptores.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar preceptor… (Enter para criar novo)"
                className="pl-8"
                value={preceptorSearch}
                onChange={(e) => setPreceptorSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
              />
            </div>

            <div className="rounded-md border divide-y overflow-y-auto max-h-44 bg-background">
              {visiblePreceptores.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {preceptorSearch.trim() ? (
                    <span>
                      Nenhum preceptor encontrado. Pressione{" "}
                      <kbd className="px-1.5 py-0.5 rounded bg-muted border border-border text-[10px] font-mono">
                        Enter
                      </kbd>{" "}
                      para criar.
                    </span>
                  ) : (
                    "Nenhum preceptor encontrado."
                  )}
                </div>
              ) : (
                visiblePreceptores.slice(0, 50).map((p) => {
                  const checked = isSelected(p.id);
                  const otherLocal = p.local_id && p.local_id !== local?.id;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        checked ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggleExisting(p)}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        readOnly
                        className="h-4 w-4 rounded accent-primary cursor-pointer shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-tight">{p.nome}</p>
                        {p.especialidade && (
                          <p className="text-xs text-muted-foreground">{p.especialidade}</p>
                        )}
                      </div>
                      {otherLocal && (
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0 text-amber-600 border-amber-400/50"
                        >
                          Em outra unidade
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
              {visiblePreceptores.length > 50 && (
                <div className="px-3 py-2 text-center text-[10px] text-muted-foreground border-t">
                  Mostrando 50 de {visiblePreceptores.length} — refine a busca
                </div>
              )}
            </div>

            {preceptoresOptions.length === 0 && !preceptorSearch && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Nenhum preceptor cadastrado no sistema.
              </p>
            )}
          </div>

          {/* ── Especialidade ── */}
          <div className="grid gap-2">
            <Label htmlFor="g-especialidade">Especialidade</Label>
            <Select value={especialidade} onValueChange={setEspecialidade}>
              <SelectTrigger id="g-especialidade">
                <SelectValue placeholder="Selecione a especialidade" />
              </SelectTrigger>
              <SelectContent>
                {ESPECIALIDADES_COMUNS.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {especialidade === "Outra" && (
              <Input
                placeholder="Digite a especialidade…"
                value={especialidadeCustom}
                onChange={(e) => setEspecialidadeCustom(e.target.value)}
                className="mt-1"
              />
            )}
          </div>

          {/* ── Lista de preceptores alocados e suas vinculações de alunos ── */}
          {selectedPreceptores.length > 0 && (
            <div className="space-y-3 mt-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Preceptores Selecionados e Alocação de Alunos
                </Label>
                <Badge variant="outline" className="text-xs font-bold">
                  Total: {totalAlunosSelecionados} aluno(s)
                </Badge>
              </div>

              <div className="space-y-3">
                {selectedPreceptores.map((tag) => {
                  const key = tag.type === "existing" ? tag.id : tag.tempId;
                  const alunoIds = preceptorAlunos[key] ?? [];

                  return (
                    <div key={key} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span className="text-sm font-semibold">{tag.nome}</span>
                          {tag.type === "new" && (
                            <Badge variant="default" className="text-[9px] py-0 px-1.5">
                              (novo)
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                              Alunos vinculados:
                            </span>
                            <Badge
                              variant={alunoIds.length > 0 ? "secondary" : "outline"}
                              className="font-bold text-xs min-w-[24px] h-5 justify-center"
                            >
                              {alunoIds.length}
                            </Badge>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePreceptor(tag)}
                            className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                            title="Remover preceptor"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Rótulo e Componente de Alunos */}
                      <div className="mt-2 pt-2 border-t border-border/40">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            Quantidade de alunos por preceptor(a)
                          </span>
                        </div>
                        <AlunoMultiSelect
                          allAlunos={allAlunos}
                          selectedAlunoIds={alunoIds}
                          onChangeAlunoIds={(ids) => updatePreceptorAlunos(key, ids)}
                          preceptorNome={tag.nome}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4 border-t">
            <div className="grid gap-2">
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hora Início</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hora Fim</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
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
