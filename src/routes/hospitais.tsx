import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, Fragment } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Building2, AlertCircle, Search, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { UNIDADES } from "@/lib/mock-data";

// ─── Tipo ─────────────────────────────────────────────────────────────────────
// Hospitais/Locais são derivados da coluna `unidade_vinculada` da tabela
// `preceptores`. Agrupamos por unidade e contamos alunos e preceptores ativos.

type UnidadeRow = {
  unidade: string;
  totalPreceptores: number;
  especialidades: string[];
  preceptores: Array<{
    id: string;
    nome: string;
    especialidade: string | null;
    alunosCount: number;
  }>;
  alunosVinculados: Array<{
    aluno_nome: string;
    aluno_semestre: number | null;
    preceptor_nome: string;
    preceptor_id: string;
  }>;
};

const TIPOS_CAMPO = ["Hospital", "UPA", "UBS", "CAPS", "Maternidade", "Clínica", "Outros"] as const;

export const Route = createFileRoute("/hospitais")({
  head: () => ({ meta: [{ title: "Hospitais / Locais — Painel de Preceptoria" }] }),
  component: HospitaisPage,
});

// ─── Página principal ─────────────────────────────────────────────────────────

function HospitaisPage() {
  const [unidades, setUnidades]   = useState<UnidadeRow[]>([]);
  const [filtered, setFiltered]   = useState<UnidadeRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [query, setQuery]         = useState("");
  const [editing, setEditing]     = useState<string | null>(null); // unidade selecionada
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isNew, setIsNew]         = useState(false);

  const [customUnidades, setCustomUnidades] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("custom_unidades");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [limiteAlunos, setLimiteAlunos] = useState<number>(4);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (unidade: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [unidade]: !prev[unidade]
    }));
  };

  // Agrega preceptores por unidade_vinculada e faz contagem reativa baseada em vinculos
  const fetchUnidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Busca todos os preceptores do banco
      const { data: preceptoresData, error: errPreceptores } = await supabase
        .from("preceptores")
        .select("id, nome, unidade_vinculada, especialidade")
        .order("nome", { ascending: true });

      if (errPreceptores) throw errPreceptores;

      // 2. Busca vínculos operacionais ativos
      const { data: vinculosData, error: errVinculos } = await supabase
        .from("vinculo_operacional")
        .select(`
          id,
          preceptor_id,
          aluno_id,
          alunos (
            nome,
            semestre
          )
        `);

      if (errVinculos) throw errVinculos;

      // Mapeia IDs de preceptor para um Set de IDs únicos de alunos
      const preceptorAlunosMap = new Map<string, Set<string>>();
      for (const v of vinculosData || []) {
        if (v.preceptor_id && v.aluno_id) {
          if (!preceptorAlunosMap.has(v.preceptor_id)) {
            preceptorAlunosMap.set(v.preceptor_id, new Set());
          }
          preceptorAlunosMap.get(v.preceptor_id)!.add(v.aluno_id);
        }
      }

      // Consolida lista de nomes únicos de unidades
      const uniqueNames = new Set([
        ...UNIDADES,
        ...customUnidades,
        ...(preceptoresData || [])
          .map(p => p.unidade_vinculada)
          .filter((u): u is string => !!u)
      ]);

      const rows: UnidadeRow[] = Array.from(uniqueNames).map(unidade => {
        // Preceptores alocados a essa unidade no cadastro
        const unitPreceptors = (preceptoresData || []).filter(p => p.unidade_vinculada === unidade);
        
        // Preceptores ativos (aqueles que possuem vínculo operacional com pelo menos 1 aluno)
        const activePreceptors = unitPreceptors.filter(p => (preceptorAlunosMap.get(p.id)?.size ?? 0) > 0);
        
        // Especialidades ativas via vinculo_operacional
        const specs = new Set<string>();
        for (const p of activePreceptors) {
          if (p.especialidade) specs.add(p.especialidade);
        }

        // Filtra alunos vinculados a essa unidade
        const students: Array<{
          aluno_nome: string;
          aluno_semestre: number | null;
          preceptor_nome: string;
          preceptor_id: string;
        }> = [];

        for (const v of vinculosData || []) {
          const preceptor = (preceptoresData || []).find(p => p.id === v.preceptor_id);
          if (preceptor && preceptor.unidade_vinculada === unidade) {
            students.push({
              aluno_nome: v.alunos?.nome ?? "—",
              aluno_semestre: v.alunos?.semestre ?? null,
              preceptor_nome: preceptor.nome,
              preceptor_id: preceptor.id
            });
          }
        }

        return {
          unidade,
          totalPreceptores: activePreceptors.length,
          especialidades: Array.from(specs).sort(),
          preceptores: unitPreceptors.map(p => ({
            id: p.id,
            nome: p.nome,
            especialidade: p.especialidade,
            alunosCount: preceptorAlunosMap.get(p.id)?.size ?? 0
          })),
          alunosVinculados: students
        };
      }).sort((a, b) =>
        b.totalPreceptores - a.totalPreceptores ||
        a.unidade.localeCompare(b.unidade, "pt-BR")
      );

      setUnidades(rows);
      setFiltered(rows);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar hospitais.");
    } finally {
      setLoading(false);
    }
  }, [customUnidades]);

  useEffect(() => { fetchUnidades(); }, [fetchUnidades]);

  // Filtro local por nome
  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(q ? unidades.filter(u => u.unidade.toLowerCase().includes(q)) : unidades);
  }, [query, unidades]);

  // Detecta tipo de unidade a partir do nome
  function tipoBadge(nome: string) {
    const n = nome.toLowerCase();
    if (n.includes("upa")) return "UPA";
    if (n.includes("ubs") || n.includes("centro de saúde") || n.includes("caps")) return "CAPS";
    if (n.includes("maternidade")) return "Maternidade";
    if (n.includes("clínica") || n.includes("clinica")) return "Clínica";
    if (n.includes("hospital")) return "Hospital";
    return "Outro";
  }

  const badgeColor: Record<string, string> = {
    "Hospital":    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "UPA":         "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "CAPS":        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    "Maternidade": "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
    "Clínica":     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Outro":       "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };

  return (
    <div className="space-y-6">
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
        <Button onClick={() => { setIsNew(true); setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Nova Unidade
        </Button>
      </div>

      {/* Stats cards */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["Hospital", "UPA", "Maternidade"] as const).map(tipo => {
            const count = unidades.filter(u => tipoBadge(u.unidade) === tipo).length;
            return (
              <Card key={tipo} className="border-border/60">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{tipo}s cadastrados</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={fetchUnidades}>Tentar novamente</Button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          {/* Busca e Controle de Limites */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar unidade…"
                className="pl-8"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border border-border/50">
              <Label htmlFor="limite-input" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                Limite de Alunos / Preceptor:
              </Label>
              <Input
                id="limite-input"
                type="number"
                min={1}
                value={limiteAlunos}
                onChange={e => setLimiteAlunos(Math.max(1, Number(e.target.value)))}
                className="w-16 h-8 text-center font-bold"
              />
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade / Campo de Prática</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead className="text-right">Preceptores</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : filtered.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                          Nenhuma unidade encontrada.
                        </TableCell>
                      </TableRow>
                    )
                    : filtered.map((u) => {
                      const tipo = tipoBadge(u.unidade);
                      const isExpanded = !!expandedRows[u.unidade];
                      const hasLimitWarning = u.preceptores.some(p => p.alunosCount > limiteAlunos);
                      
                      return (
                        <Fragment key={u.unidade}>
                          <TableRow className="hover:bg-muted/50 cursor-pointer transition-colors" onClick={() => toggleRow(u.unidade)}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground shrink-0">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </span>
                                <span className="hover:underline">{u.unidade}</span>
                                {hasLimitWarning && (
                                  <Badge variant="destructive" className="text-[10px] h-5 py-0 px-2 animate-pulse shrink-0 ml-2">
                                    Limitação de Espaço Unidade
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor[tipo] ?? badgeColor["Outro"]}`}>
                                {tipo}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {u.especialidades.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">—</span>
                                ) : (
                                  <>
                                    {u.especialidades.slice(0, 3).map(e => (
                                      <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                                    ))}
                                    {u.especialidades.length > 3 && (
                                      <Badge variant="outline" className="text-[10px]">+{u.especialidades.length - 3}</Badge>
                                    )}
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">{u.totalPreceptores}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost" size="icon" title="Editar"
                                  onClick={() => { setEditing(u.unidade); setIsNew(false); setDialogOpen(true); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow className="bg-muted/5 hover:bg-muted/5 border-t-0">
                              <TableCell colSpan={5} className="p-4 pt-1">
                                <div className="rounded-lg border bg-card/50 p-4 space-y-4 shadow-inner">
                                  <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                      Distribuição de Preceptores e Alunos
                                    </h4>
                                    
                                    {u.preceptores.length === 0 ? (
                                      <p className="text-sm text-muted-foreground py-2">
                                        Nenhum preceptor alocado a esta unidade.
                                      </p>
                                    ) : (
                                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {u.preceptores.map(p => {
                                          const isLimitExceeded = p.alunosCount > limiteAlunos;
                                          const preceptorStudents = u.alunosVinculados.filter(a => a.preceptor_id === p.id);
                                          
                                          return (
                                            <div 
                                              key={p.id} 
                                              className={`rounded-lg border p-3 flex flex-col justify-between transition-colors ${
                                                isLimitExceeded 
                                                  ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10" 
                                                  : "border-border bg-card"
                                              }`}
                                            >
                                              <div>
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                  <div>
                                                    <p className="font-semibold text-sm leading-tight text-foreground">{p.nome}</p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">{p.especialidade || "Sem especialidade"}</p>
                                                  </div>
                                                  <Badge variant={isLimitExceeded ? "destructive" : "secondary"} className="shrink-0 text-[10px]">
                                                    {p.alunosCount} {p.alunosCount === 1 ? "aluno" : "alunos"}
                                                  </Badge>
                                                </div>

                                                {preceptorStudents.length > 0 && (
                                                  <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                      Alunos:
                                                    </p>
                                                    {preceptorStudents.map((s, idx) => (
                                                      <div key={idx} className="flex justify-between text-xs text-foreground/80 py-0.5">
                                                        <span className="truncate max-w-[150px]">{idx + 1}. {s.aluno_nome}</span>
                                                        <span className="text-muted-foreground shrink-0">{s.aluno_semestre ? `${s.aluno_semestre}º sem.` : "—"}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {isLimitExceeded && (
                                                <div className="text-xs font-semibold text-destructive mt-3 flex items-center gap-1 bg-destructive/10 p-1.5 rounded border border-destructive/20">
                                                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                                  <span>Limitação de Espaço Unidade</span>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
                }
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de nova unidade */}
      <UnidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        nomeAtual={editing}
        customUnidades={customUnidades}
        setCustomUnidades={setCustomUnidades}
        onSaved={() => {
          setDialogOpen(false);
          fetchUnidades();
        }}
      />
    </div>
  );
}

// ─── Dialog — cadastrar nova unidade (renomeia em todos preceptores) ───────────

function UnidadeDialog({
  open, onOpenChange, nomeAtual, onSaved, customUnidades, setCustomUnidades,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nomeAtual: string | null;
  onSaved: () => void;
  customUnidades: string[];
  setCustomUnidades: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const isEdit = !!nomeAtual;
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setNome(nomeAtual ?? "");
  }, [open, nomeAtual]);

  async function handleSave() {
    if (!nome.trim()) { toast.warning("Informe o nome da unidade."); return; }
    setSaving(true);
    try {
      if (isEdit && nomeAtual) {
        // Renomeia em todos os preceptores vinculados
        const { error: err } = await supabase
          .from("preceptores")
          .update({ unidade_vinculada: nome.trim() })
          .eq("unidade_vinculada", nomeAtual);
        if (err) throw err;

        // Renomeia no customUnidades se existir
        if (customUnidades.includes(nomeAtual)) {
          const updated = customUnidades.map(u => u === nomeAtual ? nome.trim() : u);
          localStorage.setItem("custom_unidades", JSON.stringify(updated));
          setCustomUnidades(updated);
        }
        toast.success("Unidade renomeada em todos os preceptores!");
      } else {
        // Cadastrar nova unidade significa adicionar ao estado local customUnidades
        const novoNome = nome.trim();
        if (customUnidades.includes(novoNome) || UNIDADES.includes(novoNome as any)) {
          toast.warning("Esta unidade já existe.");
          setSaving(false);
          return;
        }
        const updated = [...customUnidades, novoNome];
        localStorage.setItem("custom_unidades", JSON.stringify(updated));
        setCustomUnidades(updated);
        toast.success("Nova unidade cadastrada com sucesso!");
      }
      onSaved();
    } catch (e: any) {
      toast.error("Erro: " + (e?.message ?? "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Renomear Unidade" : "Nova Unidade"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="h-nome">Nome da unidade *</Label>
            <Input
              id="h-nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Ex.: Hospital Municipal de Salvador"
            />
          </div>
          {!isEdit && (
            <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              💡 As unidades são salvas localmente e estarão disponíveis para novos cadastros e filtros imediatamente.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Renomear" : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
