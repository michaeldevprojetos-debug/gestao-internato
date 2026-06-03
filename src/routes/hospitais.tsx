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
import {
  Plus, Pencil, Building2, AlertCircle, Search,
  ChevronRight, ChevronDown, Settings2, Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

type PreceptorSimple = {
  id: string;
  nome: string;
  especialidade: string | null;
  local_id: string | null;
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
  }>;
  alunosVinculados: Array<{
    aluno_nome: string;
    aluno_semestre: number | null;
    preceptor_nome: string;
    preceptor_id: string;
  }>;
};

const TIPOS_CAMPO = ["Hospital", "UPA", "UBS", "CAPS", "Maternidade", "Clínica", "Outro"] as const;

const BADGE_COLOR: Record<string, string> = {
  Hospital:    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UPA:         "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CAPS:        "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Maternidade: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  Clínica:     "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  UBS:         "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Outro:       "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

export const Route = createFileRoute("/hospitais")({
  head: () => ({ meta: [{ title: "Hospitais / Locais — Painel de Preceptoria" }] }),
  component: HospitaisPage,
});

// ─── Página principal ─────────────────────────────────────────────────────────

function HospitaisPage() {
  const [locais, setLocais]           = useState<LocalRow[]>([]);
  const [filtered, setFiltered]       = useState<LocalRow[]>([]);
  const [allPreceptores, setAllPreceptores] = useState<PreceptorSimple[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [query, setQuery]             = useState("");
  const [limiteAlunos, setLimiteAlunos] = useState(4);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editingLocal, setEditingLocal] = useState<LocalRow | null>(null); // null = nova

  const toggleRow = (id: string) =>
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Busca e agrega dados da tabela locais ───────────────────────────────────
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

      // 2. Todos os preceptores com local_id
      const { data: preceptoresData, error: err2 } = await supabase
        .from("preceptores")
        .select("id, nome, especialidade, local_id")
        .order("nome");
      if (err2) throw err2;

      setAllPreceptores((preceptoresData ?? []) as PreceptorSimple[]);

      // 3. Vínculos operacionais com alunos
      const { data: vinculosData, error: err3 } = await supabase
        .from("vinculo_operacional")
        .select("id, preceptor_id, aluno_id, alunos ( nome, semestre )");
      if (err3) throw err3;

      // Map: preceptor_id → Set<aluno_id> (contagem única de alunos)
      type AlunoInfo = { nome: string; semestre: number | null };
      const preceptorAlunosSet  = new Map<string, Set<string>>();
      const preceptorStudents   = new Map<string, AlunoInfo[]>();

      for (const v of vinculosData ?? []) {
        if (!v.preceptor_id || !v.aluno_id) continue;
        if (!preceptorAlunosSet.has(v.preceptor_id)) {
          preceptorAlunosSet.set(v.preceptor_id, new Set());
          preceptorStudents.set(v.preceptor_id, []);
        }
        if (!preceptorAlunosSet.get(v.preceptor_id)!.has(v.aluno_id)) {
          preceptorAlunosSet.get(v.preceptor_id)!.add(v.aluno_id);
          const al = v.alunos as { nome?: string; semestre?: number | null } | null;
          preceptorStudents.get(v.preceptor_id)!.push({
            nome:     al?.nome     ?? "—",
            semestre: al?.semestre ?? null,
          });
        }
      }

      // Monta LocalRow[] cruzando locais ← preceptores ← vinculo_operacional
      const rows: LocalRow[] = (locaisData ?? []).map(local => {
        const unitPreceptors  = (preceptoresData ?? []).filter(p => p.local_id === local.id);
        const activePreceptors = unitPreceptors.filter(p => (preceptorAlunosSet.get(p.id)?.size ?? 0) > 0);

        const specs = new Set<string>();
        for (const p of activePreceptors) {
          if (p.especialidade) specs.add(p.especialidade);
        }

        const alunosVinculados: LocalRow["alunosVinculados"] = [];
        for (const p of unitPreceptors) {
          for (const s of preceptorStudents.get(p.id) ?? []) {
            alunosVinculados.push({
              aluno_nome:      s.nome,
              aluno_semestre:  s.semestre,
              preceptor_nome:  p.nome,
              preceptor_id:    p.id,
            });
          }
        }

        return {
          id:               local.id,
          nome:             local.nome,
          tipo:             local.tipo,
          totalPreceptores: activePreceptors.length,
          especialidades:   Array.from(specs).sort(),
          preceptoresList:  unitPreceptors.map(p => ({
            id:           p.id,
            nome:         p.nome,
            especialidade: p.especialidade,
            alunosCount:  preceptorAlunosSet.get(p.id)?.size ?? 0,
          })),
          alunosVinculados,
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

  useEffect(() => { fetchLocais(); }, [fetchLocais]);

  // Filtro local por nome
  useEffect(() => {
    const q = query.trim().toLowerCase();
    setFiltered(q ? locais.filter(l => l.nome.toLowerCase().includes(q)) : locais);
  }, [query, locais]);

  const countByTipo = (tipo: string) => locais.filter(l => l.tipo === tipo).length;

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
        <Button onClick={() => { setEditingLocal(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Nova Unidade
        </Button>
      </div>

      {/* ── Cards de contagem (Hospital / UPA / Maternidade) ── */}
      {!loading && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {(["Hospital", "UPA", "Maternidade"] as const).map(tipo => (
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
          {/* Busca + controle de limite */}
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
                          {error
                            ? "Erro ao carregar. Verifique se a migration SQL foi executada."
                            : "Nenhuma unidade encontrada."}
                        </TableCell>
                      </TableRow>
                    )
                    : filtered.map(u => {
                        const isExpanded    = !!expandedRows[u.id];
                        const hasLimitWarn  = u.preceptoresList.some(p => p.alunosCount > limiteAlunos);

                        return (
                          <Fragment key={u.id}>
                            {/* ── Linha principal ── */}
                            <TableRow
                              className="hover:bg-muted/50 cursor-pointer transition-colors"
                              onClick={() => toggleRow(u.id)}
                            >
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground shrink-0">
                                    {isExpanded
                                      ? <ChevronDown className="h-4 w-4" />
                                      : <ChevronRight className="h-4 w-4" />}
                                  </span>
                                  <span>{u.nome}</span>
                                  {hasLimitWarn && (
                                    <Badge variant="destructive" className="text-[10px] h-5 py-0 px-2 animate-pulse shrink-0 ml-1">
                                      Limitação de Espaço Unidade
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell>
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${BADGE_COLOR[u.tipo] ?? BADGE_COLOR["Outro"]}`}>
                                  {u.tipo}
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

                              <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                                <Button
                                  variant="ghost" size="icon"
                                  title="Gerenciar Unidade"
                                  onClick={() => { setEditingLocal(u); setDialogOpen(true); }}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>

                            {/* ── Sub-linha expansível (Accordion) ── */}
                            {isExpanded && (
                              <TableRow className="bg-muted/5 hover:bg-muted/5">
                                <TableCell colSpan={5} className="p-4 pt-1">
                                  <div className="rounded-lg border bg-card/50 p-4 shadow-inner">
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                      Distribuição de Preceptores e Alunos
                                    </h4>

                                    {u.preceptoresList.length === 0 ? (
                                      <p className="text-sm text-muted-foreground py-2">
                                        Nenhum preceptor alocado.{" "}
                                        <button
                                          className="text-primary underline hover:no-underline text-sm"
                                          onClick={() => { setEditingLocal(u); setDialogOpen(true); }}
                                        >
                                          Clique aqui para gerenciar.
                                        </button>
                                      </p>
                                    ) : (
                                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {u.preceptoresList.map(p => {
                                          const exceeded  = p.alunosCount > limiteAlunos;
                                          const students  = u.alunosVinculados.filter(a => a.preceptor_id === p.id);

                                          return (
                                            <div
                                              key={p.id}
                                              className={`rounded-lg border p-3 flex flex-col justify-between transition-colors ${
                                                exceeded
                                                  ? "border-destructive/30 bg-destructive/5 dark:bg-destructive/10"
                                                  : "border-border bg-card"
                                              }`}
                                            >
                                              <div>
                                                <div className="flex justify-between items-start gap-2 mb-2">
                                                  <div className="min-w-0">
                                                    <p className="font-semibold text-sm leading-tight text-foreground truncate">
                                                      {p.nome}
                                                    </p>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                                      {p.especialidade || "Sem especialidade"}
                                                    </p>
                                                  </div>
                                                  <Badge
                                                    variant={exceeded ? "destructive" : "secondary"}
                                                    className="shrink-0 text-[10px]"
                                                  >
                                                    {p.alunosCount} {p.alunosCount === 1 ? "aluno" : "alunos"}
                                                  </Badge>
                                                </div>

                                                {students.length > 0 && (
                                                  <div className="mt-2.5 pt-2 border-t border-border/50 space-y-1">
                                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                      Alunos:
                                                    </p>
                                                    {students.map((s, idx) => (
                                                      <div key={idx} className="flex justify-between text-xs text-foreground/80 py-0.5">
                                                        <span className="truncate max-w-[160px]">
                                                          {idx + 1}. {s.aluno_nome}
                                                        </span>
                                                        <span className="text-muted-foreground shrink-0">
                                                          {s.aluno_semestre ? `${s.aluno_semestre}º sem.` : "—"}
                                                        </span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>

                                              {exceeded && (
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

      {/* ── Modal Gerenciar Unidade ── */}
      <GerenciarUnidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        local={editingLocal}
        allPreceptores={allPreceptores}
        onSaved={() => {
          setDialogOpen(false);
          fetchLocais();
        }}
      />
    </div>
  );
}

// ─── Modal: Gerenciar Unidade ─────────────────────────────────────────────────

function GerenciarUnidadeDialog({
  open, onOpenChange, local, allPreceptores, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  local: LocalRow | null;
  allPreceptores: PreceptorSimple[];
  onSaved: () => void;
}) {
  const isNew = !local;

  const [nome,            setNome]            = useState("");
  const [tipo,            setTipo]            = useState<string>("Outro");
  const [selectedIds,     setSelectedIds]     = useState<string[]>([]);
  const [preceptorSearch, setPreceptorSearch] = useState("");
  const [saving,          setSaving]          = useState(false);

  // Popula o formulário ao abrir
  useEffect(() => {
    if (!open) return;
    setNome(local?.nome ?? "");
    setTipo(local?.tipo ?? "Outro");
    setSelectedIds(local?.preceptoresList.map(p => p.id) ?? []);
    setPreceptorSearch("");
  }, [open, local]);

  const toggle = (id: string) =>
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );

  const visiblePreceptores = allPreceptores.filter(p =>
    p.nome.toLowerCase().includes(preceptorSearch.toLowerCase())
  );

  async function handleSave() {
    if (!nome.trim()) { toast.warning("Informe o nome da unidade."); return; }
    setSaving(true);
    try {
      let localId = local?.id;

      // ── Criar ou atualizar o local ──
      if (isNew) {
        const { data, error } = await supabase
          .from("locais")
          .insert({ nome: nome.trim(), tipo })
          .select("id")
          .single();
        if (error) throw error;
        localId = data.id;
      } else {
        const { error } = await supabase
          .from("locais")
          .update({ nome: nome.trim(), tipo })
          .eq("id", local!.id);
        if (error) throw error;
      }

      // ── Vincular preceptores selecionados a este local ──
      if (selectedIds.length > 0) {
        const { error } = await supabase
          .from("preceptores")
          .update({ local_id: localId })
          .in("id", selectedIds);
        if (error) throw error;
      }

      // ── Desvincular preceptores removidos (apenas em edição) ──
      if (!isNew && local) {
        const prevIds  = local.preceptoresList.map(p => p.id);
        const toUnlink = prevIds.filter(id => !selectedIds.includes(id));
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            {isNew ? "Nova Unidade" : `Gerenciar: ${local?.nome}`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 py-2 max-h-[65vh] overflow-y-auto pr-1">
          {/* Nome + Tipo */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="g-nome">Nome da Unidade *</Label>
              <Input
                id="g-nome"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="Ex.: Hospital Municipal de Salvador"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="g-tipo">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger id="g-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CAMPO.map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Alocar Preceptores */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-semibold">Alocar Preceptores</p>
              <Badge variant="secondary" className="ml-auto text-xs">
                {selectedIds.length} selecionado{selectedIds.length !== 1 ? "s" : ""}
              </Badge>
            </div>

            <div className="relative mb-2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar preceptor…"
                className="pl-8"
                value={preceptorSearch}
                onChange={e => setPreceptorSearch(e.target.value)}
              />
            </div>

            <div className="rounded-md border divide-y overflow-y-auto max-h-56 bg-background">
              {visiblePreceptores.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhum preceptor encontrado.
                </div>
              ) : (
                visiblePreceptores.map(p => {
                  const checked     = selectedIds.includes(p.id);
                  const otherLocal  = p.local_id && p.local_id !== local?.id;

                  return (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                        checked ? "bg-primary/5" : "hover:bg-muted/50"
                      }`}
                      onClick={() => toggle(p.id)}
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
                        <Badge variant="outline" className="text-[10px] shrink-0 text-amber-600 border-amber-400/50">
                          Em outra unidade
                        </Badge>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {allPreceptores.length === 0 && !preceptorSearch && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Nenhum preceptor cadastrado no sistema.
              </p>
            )}
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
