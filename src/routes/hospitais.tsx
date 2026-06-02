import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Building2, AlertCircle, Search } from "lucide-react";
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

  // Agrega preceptores por unidade_vinculada
  const fetchUnidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("preceptores")
        .select("unidade_vinculada, especialidade, nome")
        .not("unidade_vinculada", "is", null)
        .order("unidade_vinculada", { ascending: true });

      if (err) throw err;

      // Agrupa por unidade
      const map = new Map<string, { count: number; especialidades: Set<string> }>();
      // Garante que TODAS as unidades pré-cadastradas apareçam no grid,
      // mesmo quando ainda não houver preceptor vinculado.
      for (const u of UNIDADES) {
        map.set(u, { count: 0, especialidades: new Set() });
      }
      for (const row of data ?? []) {
        const u = row.unidade_vinculada!;
        if (!map.has(u)) map.set(u, { count: 0, especialidades: new Set() });
        const entry = map.get(u)!;
        entry.count++;
        if (row.especialidade) entry.especialidades.add(row.especialidade);
      }

      const rows: UnidadeRow[] = Array.from(map.entries())
        .map(([unidade, v]) => ({
          unidade,
          totalPreceptores: v.count,
          especialidades: Array.from(v.especialidades).sort(),
        }))
        .sort((a, b) =>
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
  }, []);

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
          {/* Busca */}
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidade…"
              className="pl-8"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
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
                      return (
                        <TableRow key={u.unidade}>
                          <TableCell className="font-medium">{u.unidade}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeColor[tipo] ?? badgeColor["Outro"]}`}>
                              {tipo}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.especialidades.slice(0, 3).map(e => (
                                <Badge key={e} variant="secondary" className="text-[10px]">{e}</Badge>
                              ))}
                              {u.especialidades.length > 3 && (
                                <Badge variant="outline" className="text-[10px]">+{u.especialidades.length - 3}</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold">{u.totalPreceptores}</TableCell>
                          <TableCell className="text-right">
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
  open, onOpenChange, nomeAtual, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  nomeAtual: string | null;
  onSaved: () => void;
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
        toast.success("Unidade renomeada em todos os preceptores!");
      } else {
        // Cadastrar nova unidade significa adicionar ao campo_pratica como referência
        // (unidades só existem ligadas a preceptores — orientamos o usuário)
        toast.info("Nova unidade será vinculada ao cadastrar ou editar um preceptor.");
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
              💡 As unidades são criadas automaticamente ao cadastrar preceptores. Use esta opção para corrigir nomes existentes.
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
