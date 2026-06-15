import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
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
  Pencil, Eraser,
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
import { cn, getTurnoBadgeText } from "@/lib/utils";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type PreceptorSimple = {
  id: string;
  nome: string;
  especialidade: string | null;
  valor_hora?: number | null;
  units?: string[];
};

type AlunoSimple = {
  id: string;
  nome: string;
  semestre: number | null;
  matricula?: string | null;
  isOcupado?: boolean;
  ocupadoLocal?: string;
};

type LocalSimple = {
  id: string;
  nome: string;
  tipo: string;
  valor_mensal_contrato?: number; // NOVA COLUNA FINANCEIRA
};

type VinculoQtd = {
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
  carga_horaria_semanal?: number | null; // NOVA REGRA: CALCULO SEMANAL X 4.5
  valor_hora_aula?: number | null; // NOVA REGRA
};

type LocalRow = {
  id: string;
  nome: string;
  tipo: string;
  valor_mensal_contrato?: number; // NOVA COLUNA FINANCEIRA
  totalPreceptores: number;
  especialidades: string[];
  preceptoresList: Array<{
    id: string;
    nome: string;
    especialidade: string | null;
    alunosCount: number;
    quantidadeAlunos: number;
    vinculoId: string | null;
    hora_inicio: string | null;
    hora_fim: string | null;
    mes_referencia: string | null;
    semestre: string | null;
    rotacao_periodo_id: string | null;
    ch_prevista: number | null;
    horas_realizadas: number | null;
    carga_horaria_semanal: number | null; // NOVA REGRA
    valor_hora_aula: number | null; // NOVA REGRA
    valor_hora: number | null;
  }>;
  alunosVinculados: {
    aluno_id: string;
    aluno_nome: string;
    aluno_semestre: number | null;
    preceptor_nome: string;
    preceptor_id: string;
  }[];
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
  const handleLimparPreceptor = async (unidadeId: string, preceptorId: string) => {
    if (!window.confirm("Deseja limpar o registro deste preceptor nesta unidade? Os alunos vinculados a ele neste bloco também serão desvinculados.")) return;
    try {
      const { error } = await supabase
        .from("alocacoes")
        .delete()
        .eq("unidade_id", unidadeId)
        .eq("preceptor_id", preceptorId);
      if (error) throw error;
      toast.success("Vínculo do preceptor removido do bloco.");
      fetchLocais();
      await queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      await queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
    } catch (e: any) {
      toast.error("Erro ao limpar vínculo: " + e.message);
    }
  };

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
  const [editingPreceptor, setEditingPreceptor] = useState<{ preceptor: LocalRow["preceptoresList"][number] | null, unidadeId: string } | null>(null);

  const toggleRow = (id: string) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Busca e agrega dados ───────────────────────────────────────────────────
  const fetchLocais = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Todos os locais cadastrados
      const { data: locaisData, error: err1 } = (await supabase
        .from("unidades" as any)
        .select("id, nome, tipo, valor_mensal_contrato") // NOVA COLUNA FINANCEIRA
        .order("nome")) as { data: any[] | null; error: any };
      if (err1) throw err1;

      setAllLocaisSimple((locaisData ?? []) as LocalSimple[]);

      // 2. Todos os preceptores
      const { data: preceptoresData, error: err2 } = (await supabase
        .from("preceptores" as any)
        .select("id, nome, especialidade, valor_hora")
        .order("nome")) as { data: any[] | null; error: any };
      if (err2) throw err2;

      // 3. Todos os alunos
      const { data: alunosData, error: errAlunos } = (await supabase
        .from("alunos" as any)
        .select("id, nome, semestre")
        .order("nome")) as { data: any[] | null; error: any };
      if (errAlunos) throw errAlunos;

      setAllAlunos(
        (alunosData ?? []).map((a) => ({
          id: a.id,
          nome: a.nome,
          semestre: a.semestre,
        })),
      );

      // 4. Vínculos operacionais
      const { data: vinculosData, error: err3 } = (await supabase
        .from("alocacoes" as any)
        .select("id, preceptor_id, aluno_id, unidade_id, hora_inicio, hora_fim, mes_referencia, semestre, rotacao_periodo_id, ch_prevista, horas_realizadas, carga_horaria_semanal, valor_hora_aula, alunos ( nome, semestre )")) as { data: any[] | null; error: any };
      if (err3) throw err3;

      type AlunoInfo = { id: string; nome: string; semestre: number | null };
      const preceptorAlunosSet = new Map<string, Set<string>>();
      const preceptorStudents = new Map<string, AlunoInfo[]>();
      const preceptorQtd = new Map<string, VinculoQtd>();

      const preceptorUnits = new Map<string, Set<string>>();

      for (const v of vinculosData ?? []) {
        if (!v.preceptor_id) continue;
        
        if (v.unidade_id) {
          if (!preceptorUnits.has(v.preceptor_id)) {
            preceptorUnits.set(v.preceptor_id, new Set());
          }
          preceptorUnits.get(v.preceptor_id)!.add(v.unidade_id);
        }

        if (!preceptorQtd.has(v.preceptor_id)) {
          preceptorQtd.set(v.preceptor_id, {
            id: v.id,
            preceptor_id: v.preceptor_id,
            quantidade_alunos: v.quantidade_alunos ?? 0,
            hora_inicio: v.hora_inicio ?? null,
            hora_fim: v.hora_fim ?? null,
            mes_referencia: v.mes_referencia ?? null,
            semestre: v.semestre ?? null,
            rotacao_periodo_id: v.rotacao_periodo_id ?? null,
            ch_prevista: v.ch_prevista ?? null,
            horas_realizadas: v.horas_realizadas ?? null,
            carga_horaria_semanal: v.carga_horaria_semanal ?? null, // NOVA REGRA
            valor_hora_aula: v.valor_hora_aula ?? null, // NOVA REGRA
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
        const unitPreceptors = (preceptoresData ?? []).filter((p) => {
          const pUnits = preceptorUnits.get(p.id);
          return pUnits && pUnits.has(local.id);
        });
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
          valor_mensal_contrato: local.valor_mensal_contrato, // NOVA COLUNA FINANCEIRA
          totalPreceptores: activePreceptors.length,
          especialidades: Array.from(specs).sort(),
          preceptoresList: unitPreceptors.map((p) => {
            const pqtd = preceptorQtd.get(p.id);
            return {
              id: p.id,
              nome: p.nome,
              especialidade: p.especialidade,
              alunosCount: preceptorAlunosSet.get(p.id)?.size ?? 0,
              quantidadeAlunos: pqtd?.quantidade_alunos ?? 0,
              vinculoId: pqtd?.id ?? null,
              hora_inicio: pqtd?.hora_inicio ?? null,
              hora_fim: pqtd?.hora_fim ?? null,
              mes_referencia: pqtd?.mes_referencia ?? null,
              semestre: pqtd?.semestre ?? null,
              rotacao_periodo_id: pqtd?.rotacao_periodo_id ?? null,
              ch_prevista: pqtd?.ch_prevista ?? null,
              horas_realizadas: pqtd?.horas_realizadas ?? null,
              carga_horaria_semanal: pqtd?.carga_horaria_semanal ?? null, // NOVA REGRA
              valor_hora_aula: pqtd?.valor_hora_aula ?? null, // NOVA REGRA
              valor_hora: p.valor_hora ?? 0,
            };
          }),
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
      const { error: err2 } = await supabase.from("unidades" as any).delete().eq("id", localId);
      if (err2) throw err2;

      toast.success(`Unidade "${localNome}" excluída com sucesso!`);
      fetchLocais();
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
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
          .from("alocacoes" as any)
          .update({ quantidade_alunos: newValue })
          .eq("id", vinculoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("alocacoes" as any).insert({
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
                  <TableHead>Valor do Contrato</TableHead> {/* NOVA COLUNA FINANCEIRA */}
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

                          {/* NOVA COLUNA FINANCEIRA */}
                          <TableCell>
                            {u.valor_mensal_contrato != null ? (
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(u.valor_mensal_contrato)}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
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
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                    Distribuição de Preceptores e Alunos
                                  </h4>
                                  <Button size="sm" variant="outline" onClick={() => setEditingPreceptor({ preceptor: null, unidadeId: u.id })}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Vincular Preceptor
                                  </Button>
                                </div>

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
                                          onEdit={() => setEditingPreceptor({ preceptor: p, unidadeId: u.id })}
                                          handleLimparPreceptor={(id) => handleLimparPreceptor(u.id, id)}
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
        onSaved={() => {
          setDialogOpen(false);
          fetchLocais();
          queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
        }}
      />
      
      {/* ── Modal Gerenciar Alocação do Preceptor ── */}
      <GerenciarAlocacaoPreceptorDialog
        open={!!editingPreceptor}
        onOpenChange={(o) => !o && setEditingPreceptor(null)}
        preceptor={editingPreceptor?.preceptor ?? null}
        unidadeId={editingPreceptor?.unidadeId ?? ""}
        allAlunos={allAlunos}
        allLocaisSimple={allLocaisSimple}
        onSaved={() => {
          setEditingPreceptor(null);
          fetchLocais();
          queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
          queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
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
  onEdit,
  handleLimparPreceptor,
}: {
  preceptor: LocalRow["preceptoresList"][number];
  students: LocalRow["alunosVinculados"];
  exceeded: boolean;
  limiteAlunos: number;
  onUpdateQuantidade: (vinculoId: string | null, preceptorId: string, value: number) => void;
  onEdit?: () => void;
  handleLimparPreceptor?: (id: string) => void;
}) {
  const { user } = useAuth();
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
          <div className="ml-auto flex items-center gap-2">
            {handleLimparPreceptor && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); handleLimparPreceptor(p.id); }} title="Limpar registro deste preceptor no bloco">
                <Eraser className="w-4 h-4 mr-2" /> <span>Limpar</span>
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="text-xs text-foreground/80 leading-snug">
            <span className="font-semibold">Quantidade de alunos:</span>{" "}
            <Badge
              variant={exceeded ? "destructive" : "secondary"}
              className="text-[10px] py-0 px-1.5"
            >
              {p.alunosCount}
            </Badge>
          </div>
          {(p as any).hora_inicio && (p as any).hora_fim && (
            <Badge variant="outline" className="text-[10px] ml-auto bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
              {getTurnoBadgeText((p as any).hora_inicio, (p as any).hora_fim)}
            </Badge>
          )}
        </div>

        <div className="text-xs text-foreground/80 leading-snug">
          {students.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {students.map((s, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="text-[10px] bg-slate-100 dark:bg-slate-800"
                >
                  {s.aluno_nome}
                </Badge>
              ))}
            </div>
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

        {/* Custos Financeiros */}
        <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Custo Total Rotação</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((p.horas_realizadas || 0) * (p.valor_hora_aula || p.valor_hora || 0))}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Custo Prop. por Aluno</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {p.quantidadeAlunos > 0 ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(((p.horas_realizadas || 0) * (p.valor_hora_aula || p.valor_hora || 0)) / p.quantidadeAlunos) : 'R$ 0,00'}
            </span>
          </div>
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

  const isDateTimeValid = Boolean(dataInicio && dataFim && horaInicio && horaFim);

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
            disabled={!isDateTimeValid}
          >
            <span className="text-muted-foreground truncate">
              {!isDateTimeValid 
                ? "Preencha a data e horário primeiro..." 
                : selectedAlunoIds.length > 0
                ? `${selectedAlunoIds.length} aluno(s) selecionado(s)`
                : "Buscar aluno…"}
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
                        className={cn(a.isOcupado && "cursor-not-allowed bg-muted/20")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            isChecked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className={cn("flex-1 truncate", a.isOcupado && "text-slate-400")}>
                          {a.nome} | Mat: {a.matricula || 'N/A'} | {a.semestre || '-'}º Sem.
                        </span>
                        {a.isOcupado && (
                          <span className="text-amber-500 font-medium text-[10px] ml-2 shrink-0">
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
  const [valorContrato, setValorContrato] = useState<number | "">(""); // NOVA COLUNA FINANCEIRA
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    if (!open) return;
    setNome(local?.nome ?? "");
    setTipo(local?.tipo ?? "Outro");
    setValorContrato(local?.valor_mensal_contrato ?? ""); // NOVA COLUNA FINANCEIRA
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
      setValorContrato(matchedLocal.valor_mensal_contrato ?? ""); // NOVA COLUNA FINANCEIRA
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
          const { error } = await supabase.from("unidades" as any).update({ tipo, valor_mensal_contrato: valorContrato === "" ? null : Number(valorContrato) }).eq("id", localId); // NOVA COLUNA FINANCEIRA
          if (error) throw error;
        } else {
          const { data, error } = (await supabase
            .from("unidades" as any)
            .insert({ nome: nome.trim(), tipo, valor_mensal_contrato: valorContrato === "" ? null : Number(valorContrato) }) // NOVA COLUNA FINANCEIRA
            .select("id")
            .single()) as { data: any; error: any };
          if (error) throw error;
          localId = data.id;
        }
      } else {
        const { error } = await supabase
          .from("unidades" as any)
          .update({ nome: nome.trim(), tipo, valor_mensal_contrato: valorContrato === "" ? null : Number(valorContrato) }) // NOVA COLUNA FINANCEIRA
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
          {/* NOVA COLUNA FINANCEIRA */}
          <div className="grid gap-2">
            <Label htmlFor="g-valor">Valor Mensal do Contrato (R$)</Label>
            <Input
              id="g-valor"
              type="number"
              step="0.01"
              min="0"
              placeholder="Ex.: 11550.30"
              value={valorContrato}
              onChange={(e) => setValorContrato(e.target.value === "" ? "" : Number(e.target.value))}
            />
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
  const [cargaHorariaSemanal, setCargaHorariaSemanal] = useState<number | "">(""); // NOVA REGRA
  const [valorHoraAula, setValorHoraAula] = useState<number | "">(50.00); // NOVA REGRA
  
  const [rotacoesOptions, setRotacoesOptions] = useState<{id: string, nome: string}[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("rotacoes" as any).select("id, nome").order("nome").then(({data}) => {
      if (data) setRotacoesOptions(data as unknown as {id: string, nome: string}[]);
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
    setCargaHorariaSemanal(""); // NOVA REGRA
    setValorHoraAula(50.00); // NOVA REGRA
    setSearch("");

    if (preceptor) {
      setSelectedPreceptor({ id: preceptor.id, nome: preceptor.nome, especialidade: preceptor.especialidade });
      setMes(preceptor.mes_referencia || "");
      setSemestre(preceptor.semestre || "");
      setRotacao(preceptor.rotacao_periodo_id || "");
      setChPrevista(preceptor.ch_prevista || "");
      setHorasRealizadas(preceptor.horas_realizadas || "");
      setCargaHorariaSemanal(preceptor.carga_horaria_semanal || ""); // NOVA REGRA
      setValorHoraAula(preceptor.valor_hora_aula || 50.00); // NOVA REGRA
      
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
          const rows = data as any[] | null;
          if (rows && rows.length > 0) {
            setDataInicio(rows[0].data_inicio || "");
            setDataFim(rows[0].data_fim || "");
            const ids = rows.map((a: any) => a.aluno_id).filter(Boolean);
            setAlunoIds(ids);
          }
        });
    } else {
      setSelectedPreceptor(null);
    }
  }, [open, preceptor, unidadeId]);

  // NOVA REGRA: CALCULO SEMANAL X 4.5
  useEffect(() => {
    if (cargaHorariaSemanal && typeof cargaHorariaSemanal === "number") {
      setHorasRealizadas(Math.round((cargaHorariaSemanal * 4.5) * 100) / 100);
    }
  }, [cargaHorariaSemanal]);

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
          for (const ext of (extAloc as any[])) {
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
        for (const ext of (pAloc as any[])) {
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
        carga_horaria_semanal: cargaHorariaSemanal || null, // NOVA REGRA
        valor_hora_aula: valorHoraAula || null, // NOVA REGRA
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
                  dataInicio={dataInicio}
                  dataFim={dataFim}
                  horaInicio={horaInicio}
                  horaFim={horaFim}
                  unidadeId={unidadeId}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 border-t pt-3">
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
                {/* NOVA REGRA */}
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">CH Semanal</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={cargaHorariaSemanal} onChange={(e) => setCargaHorariaSemanal(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Valor Hora (R$)</Label>
                  <Input type="number" step="0.01" min={0} className="h-8 text-xs" value={valorHoraAula} onChange={(e) => setValorHoraAula(e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">H. Realizadas</Label>
                  <Input type="number" min={0} className="h-8 text-xs" value={horasRealizadas} onChange={(e) => setHorasRealizadas(e.target.value ? Number(e.target.value) : "")} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 border-t pt-3">
                <div className="grid gap-2"><Label>Data Início</Label><Input className="dark:[color-scheme:dark]" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Data Fim</Label><Input className="dark:[color-scheme:dark]" type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Hora Início</Label><Input className="dark:[color-scheme:dark]" type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} /></div>
                <div className="grid gap-2"><Label>Hora Fim</Label><Input className="dark:[color-scheme:dark]" type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} /></div>
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
