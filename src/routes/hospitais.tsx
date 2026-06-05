import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSystemConfig } from "@/hooks/use-system-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Plus,
  Pencil,
  Building2,
  AlertCircle,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/hospitais")({
  head: () => ({ meta: [{ title: "Unidades — Painel de Preceptoria" }] }),
  component: HospitaisPage,
});

const TIPOS_CAMPO = ["Hospital", "UPA", "UBS", "CAPS", "Maternidade", "Clínica", "Outro"] as const;

const BADGE_COLOR: Record<string, string> = {
  Hospital: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  UPA: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  CAPS: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Maternidade: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  Clínica: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  UBS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Outro: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

interface UnidadeRow {
  id: string;
  nome: string;
  tipo: string;
  ativo: boolean;
  preceptoresAtivos: number;
  alunosAtivos: number;
}

function HospitaisPage() {
  const [unidades, setUnidades] = useState<UnidadeRow[]>([]);
  const [filtered, setFiltered] = useState<UnidadeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { config, updateLimiteUnidade } = useSystemConfig();
  const limiteAlunos = config.limiteUnidade;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUnidade, setEditingUnidade] = useState<UnidadeRow | null>(null);

  const fetchUnidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Busca unidades
      const { data: uData, error: uErr } = await supabase
        .from("unidades" as any)
        .select("id, nome, tipo, ativo")
        .order("nome");
      if (uErr) throw uErr;

      // 2. Busca alocações ativas para contar vínculos
      const hoje = new Date().toISOString().split("T")[0];
      const { data: aData, error: aErr } = await supabase
        .from("alocacoes" as any)
        .select("unidade_id, preceptor_id, aluno_id")
        .or(`data_fim.is.null,data_fim.gte.${hoje}`); // Apenas alocações vigentes
      
      if (aErr) console.error("Erro nas alocacoes:", aErr);

      const statsMap = new Map<string, { p: Set<string>; a: Set<string> }>();
      
      for (const aloc of (aData || []) as any[]) {
        if (!statsMap.has(aloc.unidade_id)) statsMap.set(aloc.unidade_id, { p: new Set(), a: new Set() });
        if (aloc.preceptor_id) statsMap.get(aloc.unidade_id)!.p.add(aloc.preceptor_id);
        if (aloc.aluno_id) statsMap.get(aloc.unidade_id)!.a.add(aloc.aluno_id);
      }

      const rows: UnidadeRow[] = ((uData || []) as any[]).map((u) => ({
        id: u.id,
        nome: u.nome,
        tipo: u.tipo || "Outro",
        ativo: u.ativo ?? true,
        preceptoresAtivos: statsMap.get(u.id)?.p.size || 0,
        alunosAtivos: statsMap.get(u.id)?.a.size || 0,
      }));

      setUnidades(rows);
      setFiltered(rows);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar unidades.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnidades();
  }, [fetchUnidades]);

  useEffect(() => {
    const term = query.toLowerCase();
    setFiltered(
      unidades.filter(
        (u) =>
          u.nome.toLowerCase().includes(term) || u.tipo.toLowerCase().includes(term)
      ),
    );
  }, [query, unidades]);

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Tem certeza que deseja INATIVAR a unidade "${nome}"? (Dados não serão excluídos, apenas ocultados das listagens principais)`)) return;
    try {
      const { error } = await supabase.from("unidades" as any).update({ ativo: false }).eq("id", id);
      if (error) throw error;
      toast.success("Unidade inativada com sucesso.");
      fetchUnidades();
    } catch (e: any) {
      toast.error("Erro ao inativar: " + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Unidades / Campos de Prática</h1>
          <p className="text-sm text-muted-foreground">
            Gerenciamento de hospitais, clínicas e postos de saúde.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUnidade(null);
            setDialogOpen(true);
          }}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Unidade
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total de Unidades</p>
              <h3 className="text-3xl font-bold mt-1">{unidades.length}</h3>
            </div>
            <Building2 className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar unidade..."
              className="pl-9 bg-muted/40 border-muted-foreground/20"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="limite-input" className="text-sm font-medium text-muted-foreground whitespace-nowrap">
              Limite de Alunos / Unidade:
            </Label>
            <Input
              id="limite-input"
              type="number"
              min={1}
              value={limiteAlunos}
              onChange={(e) => {
                const val = Math.max(1, Number(e.target.value));
                updateLimiteUnidade(val);
              }}
              className="w-20 h-9 text-center font-bold"
            />
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Unidade / Campo de Prática</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-center">Preceptores Ativos</TableHead>
                <TableHead className="text-center">Alunos Alocados</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-12 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Nenhuma unidade encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const isOverLimit = u.alunosAtivos > limiteAlunos;
                  return (
                    <TableRow key={u.id} className={!u.ativo ? "opacity-60" : ""}>
                      <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
                        {u.nome}
                      </TableCell>
                      <TableCell>
                        <Badge className={BADGE_COLOR[u.tipo] || BADGE_COLOR["Outro"]} variant="outline">
                          {u.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-slate-700 dark:text-slate-300 font-medium">
                        {u.preceptoresAtivos}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${isOverLimit ? "text-destructive" : "text-slate-700 dark:text-slate-300"}`}>
                          {u.alunosAtivos}
                        </span>
                        {isOverLimit && <AlertCircle className="inline-block w-3 h-3 text-destructive ml-1 mb-1" />}
                      </TableCell>
                      <TableCell className="text-center">
                        {u.ativo ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-500 border-slate-200 bg-slate-50">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => { e.stopPropagation(); setEditingUnidade(u); setDialogOpen(true); }}
                            className="h-8 w-8 text-slate-500 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {u.ativo && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => { e.stopPropagation(); handleDelete(u.id, u.nome); }}
                              className="h-8 w-8 text-slate-500 hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <UnidadeDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        unidade={editingUnidade}
        onSaved={fetchUnidades}
      />
    </div>
  );
}

function UnidadeDialog({
  open,
  onOpenChange,
  unidade,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  unidade: UnidadeRow | null;
  onSaved: () => void;
}) {
  const isEdit = !!unidade;
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("Hospital");
  const [ativo, setAtivo] = useState(true);

  useEffect(() => {
    if (open) {
      setNome(unidade?.nome ?? "");
      setTipo(unidade?.tipo ?? "Hospital");
      setAtivo(unidade?.ativo ?? true);
    }
  }, [open, unidade]);

  async function handleSave() {
    if (!nome.trim()) {
      toast.warning("O nome da unidade é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && unidade) {
        const { error } = await supabase
          .from("unidades" as any)
          .update({ nome, tipo, ativo })
          .eq("id", unidade.id);
        if (error) throw error;
        toast.success("Unidade atualizada.");
      } else {
        const { error } = await supabase
          .from("unidades" as any)
          .insert({ nome, tipo, ativo });
        if (error) throw error;
        toast.success("Unidade criada.");
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Erro: " + e.message);
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
            {isEdit ? "Editar Unidade" : "Nova Unidade"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome da Unidade *</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Hospital São Rafael" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger id="tipo"><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS_CAMPO.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select value={ativo ? "ativo" : "inativo"} onValueChange={(v) => setAtivo(v === "ativo")}>
                <SelectTrigger id="status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
