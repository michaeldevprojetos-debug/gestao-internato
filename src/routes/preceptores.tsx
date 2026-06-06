import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Pencil, Trash2, Upload, Download, Search, FileText, ChevronLeft, ChevronRight, Activity, Clock, DollarSign, Building } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadCSV } from "@/lib/csv";

export const Route = createFileRoute("/preceptores")({
  head: () => ({ meta: [{ title: "Preceptores" }] }),
  component: PreceptoresPage,
});

type PreceptorRow = {
  id: string;
  nome: string;
  especialidade_id: string | null;
  especialidade_nome: string | null;
  ativo: boolean;
  tipo_remuneracao?: string;
  valor_hora?: number;
};

type Especialidade = {
  id: string;
  nome: string;
};

// Dossiê query
function usePreceptorDossier(preceptorId: string | null) {
  return useQuery({
    queryKey: ["preceptorDossier", preceptorId],
    queryFn: async () => {
      if (!preceptorId) return [];
      const { data, error } = await supabase
        .from("vw_dashboard_preceptores" as any)
        .select("*")
        .eq("preceptor_id", preceptorId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!preceptorId,
  });
}

function PreceptoresPage() {
  const queryClient = useQueryClient();

  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreceptor, setEditingPreceptor] = useState<PreceptorRow | null>(null);
  
  const [dossierOpen, setDossierOpen] = useState(false);
  const [selectedDossier, setSelectedDossier] = useState<PreceptorRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: preceptoresData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ["preceptores"],
    queryFn: async () => {
      const [precRes, espRes] = await Promise.all([
        supabase
          .from("preceptores" as any)
          .select("id, nome, especialidade_id, tipo_remuneracao, valor_hora_preceptor, especialidades(nome)")
          .order("nome"),
        supabase
          .from("especialidades" as any)
          .select("id, nome")
          .order("nome"),
      ]);

      if (precRes.error) {
        console.error("Erro na busca de preceptores:", precRes.error);
        toast.error("Erro ao buscar preceptores: " + precRes.error.message);
        throw precRes.error;
      }
      if (espRes.error) {
        console.error("Erro na busca de especialidades:", espRes.error);
        toast.error("Erro ao buscar especialidades: " + espRes.error.message);
        throw espRes.error;
      }

      setEspecialidades((espRes.data || []) as unknown as Especialidade[]);

      const rows: PreceptorRow[] = ((precRes.data || []) as any[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        especialidade_id: p.especialidade_id,
        especialidade_nome: p.especialidades?.nome || null,
        ativo: p.ativo ?? true,
        tipo_remuneracao: p.tipo_remuneracao || "Bolsa",
        valor_hora: p.valor_hora_preceptor || 80.00,
      }));
      return rows;
    }
  });

  const preceptores = preceptoresData || [];

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ["preceptores"] });
  }, [queryClient]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase();
    if (!term) return preceptores;
    return preceptores.filter(
      (p) =>
        p.nome.toLowerCase().includes(term) ||
        (p.especialidade_nome && p.especialidade_nome.toLowerCase().includes(term)),
    );
  }, [query, preceptores]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  
  useEffect(() => {
    // Reset to page 1 if query changes
    setCurrentPage(1);
  }, [query]);

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage]);

  const handleExport = () => {
    const headers = ["Nome", "Especialidade", "Valor Hora", "Status"];
    const rows = filtered.map((p) => [
      p.nome,
      p.especialidade_nome || "—",
      p.valor_hora?.toString() || "0",
      p.ativo ? "Ativo" : "Inativo",
    ]);
    downloadCSV("preceptores.csv", headers, rows);
  };

  async function handleDelete(id: string, nome: string) {
    if (!window.confirm(`ATENÇÃO DESTRUTIVA!

Tem certeza que deseja inativar o preceptor "${nome}"?
Isso poderá afetar seus vínculos e alocações ativas.`)) return;
    try {
      const { error } = await supabase
        .from("preceptores" as any)
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Preceptor inativado com sucesso.");
      queryClient.invalidateQueries({ queryKey: ["preceptores"] });
    } catch (e: any) {
      toast.error("Erro ao inativar: " + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preceptores</h1>
          <p className="text-sm text-muted-foreground">RH e Auditoria de Contratos</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importar
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button
            onClick={() => {
              setEditingPreceptor(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Adicionar Novo
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" />
        </div>
      </div>

      <Card>
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar preceptor ou especialidade..."
              className="pl-9 bg-muted/40 border-muted-foreground/20"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="ml-auto text-sm text-muted-foreground self-center">
            {filtered.length} registro(s) encontrado(s)
          </div>
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead className="text-center">Valor Hora</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedData.length > 0 ? (
                paginatedData.map((p) => {
                  const isAtivo = p.ativo;
                  return (
                  <TableRow key={p.id} className={!isAtivo ? "opacity-60" : ""}>
                    <TableCell className="font-semibold">{p.nome}</TableCell>
                    <TableCell>
                      {p.especialidade_nome ? (
                        <Badge variant="secondary">{p.especialidade_nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não informada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium text-slate-700">R$ {p.valor_hora?.toFixed(2) || "0.00"}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      {isAtivo ? (
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
                          title="Ver Dossiê"
                          onClick={() => {
                            setSelectedDossier(p);
                            setDossierOpen(true);
                          }}
                        >
                          <FileText className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar"
                          onClick={() => {
                            setEditingPreceptor(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAtivo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Inativar"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id, p.nome)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    <p>Nenhum preceptor encontrado.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Próxima
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <PreceptorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        preceptor={editingPreceptor}
        especialidades={especialidades}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['preceptores'] })}
      />

      <DossierSheet 
        open={dossierOpen} 
        onOpenChange={setDossierOpen} 
        preceptor={selectedDossier} 
        onEdit={() => {
          setDossierOpen(false);
          setEditingPreceptor(selectedDossier);
          setDialogOpen(true);
        }}
      />
    </div>
  );
}

function PreceptorDialog({
  open,
  onOpenChange,
  preceptor,
  especialidades,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preceptor: PreceptorRow | null;
  especialidades: Especialidade[];
  onSaved: () => void;
}) {
  const isEdit = !!preceptor;
  const [saving, setSaving] = useState(false);
  const [nome, setNome] = useState("");
  const [especialidadeId, setEspecialidadeId] = useState<string>("none");
  const [ativo, setAtivo] = useState(true);
  const [tipoRemuneracao, setTipoRemuneracao] = useState("Bolsa");
  const [valorHora, setValorHora] = useState<number | "">(80);

  useEffect(() => {
    if (open) {
      setNome(preceptor?.nome ?? "");
      setEspecialidadeId(preceptor?.especialidade_id ?? "none");
      setAtivo(preceptor?.ativo ?? true);
      setTipoRemuneracao(preceptor?.tipo_remuneracao ?? "Bolsa");
      setValorHora(preceptor?.valor_hora ?? 80);
    }
  }, [open, preceptor]);

  async function handleSave() {
    if (!nome.trim()) {
      toast.warning("O nome é obrigatório.");
      return;
    }
    setSaving(true);
    try {
      const data = {
        nome,
        especialidade_id: especialidadeId === "none" ? null : especialidadeId,
        tipo_remuneracao: tipoRemuneracao,
        valor_hora_preceptor: valorHora === "" ? 0 : Number(valorHora),
      };

      if (isEdit && preceptor) {
        const { error } = await supabase
          .from("preceptores" as any)
          .update(data)
          .eq("id", preceptor.id);
        if (error) throw error;
        toast.success("Preceptor atualizado.");
      } else {
        const { error } = await supabase.from("preceptores" as any).insert(data);
        if (error) throw error;
        toast.success("Preceptor criado.");
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
          <DialogTitle>{isEdit ? "Editar Preceptor" : "Novo Preceptor"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Dr(a). Nome Completo"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="esp">Especialidade</Label>
            <Select value={especialidadeId} onValueChange={setEspecialidadeId}>
              <SelectTrigger id="esp">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {(especialidades || []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="tipo-remun">Tipo de Remuneração</Label>
              <Select value={tipoRemuneracao} onValueChange={setTipoRemuneracao}>
                <SelectTrigger id="tipo-remun">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bolsa">Bolsa</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                  <SelectItem value="Voluntário">Voluntário</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valor-hora">Valor Hora (R$)</Label>
              <Input
                id="valor-hora"
                type="number"
                min={0}
                step={0.01}
                value={valorHora}
                onChange={(e) => setValorHora(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Ex: 80.00"
              />
            </div>
          </div>

          {isEdit && (
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={ativo ? "ativo" : "inativo"}
                onValueChange={(v) => setAtivo(v === "ativo")}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DossierSheet({
  open,
  onOpenChange,
  preceptor,
  onEdit
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  preceptor: PreceptorRow | null;
  onEdit: () => void;
}) {
  const { data: rows = [], isLoading } = usePreceptorDossier(preceptor?.id || null);

  const stats = useMemo(() => {
    if (!rows.length) return { chPrevista: 0, chRealizada: 0, custo: 0 };
    
    const uniqueAlocs = new Map();
    rows.forEach((r: any) => {
      const id = `${r.unidade}-${r.data_inicio}-${r.data_fim}-${r.hora_inicio}-${r.hora_fim}`;
      if (!uniqueAlocs.has(id)) uniqueAlocs.set(id, r);
    });
    const uniqueRows = Array.from(uniqueAlocs.values());

    const chContratada = uniqueRows.reduce((acc: number, r: any) => acc + Number(r.ch_prevista || r.carga_horaria || 0), 0);
    const chRealizada = uniqueRows.reduce((acc: number, r: any) => {
      let hr = Number(r.horas_realizadas || 0);
      if (hr === 0 && r.data_inicio && r.data_fim && r.hora_inicio && r.hora_fim) {
        try {
          const start = new Date(r.data_inicio);
          const end = new Date(r.data_fim);
          if (end >= start) {
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const [h1, m1] = r.hora_inicio.split(":").map(Number);
            const [h2, m2] = r.hora_fim.split(":").map(Number);
            let diffHours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
            if (diffHours < 0) diffHours += 24;
            hr = diffDays * diffHours;
          }
        } catch(e) {}
      }
      return acc + hr;
    }, 0);

    const custo = chRealizada * (preceptor?.valor_hora || 0);
    return { chPrevista: chContratada, chRealizada, custo };
  }, [rows, preceptor]);

  const history = useMemo(() => {
    if (!rows.length) return [];
    // Group allocations by Unidade and Turno to show a clean list
    const histMap = new Map();
    rows.forEach((r: any) => {
      const key = `${r.unidade}-${r.hora_inicio}-${r.hora_fim}`;
      if (!histMap.has(key)) {
        histMap.set(key, {
          unidade: r.unidade || "Desconhecida",
          turno: `${r.hora_inicio?.slice(0,5) || "?"} às ${r.hora_fim?.slice(0,5) || "?"}`,
          alunos: 0
        });
      }
      histMap.get(key).alunos += 1;
    });
    return Array.from(histMap.values());
  }, [rows]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg border-l border-border bg-background p-0 overflow-y-auto">
        <div className="flex flex-col h-full">
          <div className="p-6 border-b bg-muted/20">
            <SheetHeader className="text-left space-y-1">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="secondary" className="mb-2">Dossiê RH</Badge>
                  <SheetTitle className="text-2xl font-bold text-foreground">
                    {preceptor?.nome}
                  </SheetTitle>
                  <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                    <Activity className="h-4 w-4" />
                    {preceptor?.especialidade_nome || "Especialidade não informada"}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-2" /> Editar
                </Button>
              </div>
            </SheetHeader>
          </div>

          <div className="p-6 space-y-8">
            {/* Financial Summary */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Resumo Financeiro e Carga</h3>
              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/50">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Clock className="h-5 w-5 text-blue-600 mb-2" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">CH Prevista</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                      {isLoading ? "-" : `${stats.chPrevista}h`}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-indigo-50/50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/50">
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Activity className="h-5 w-5 text-indigo-600 mb-2" />
                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">H. Realizadas</p>
                    <p className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
                      {isLoading ? "-" : `${stats.chRealizada}h`}
                    </p>
                  </CardContent>
                </Card>
                <Card className="col-span-2 bg-emerald-50/50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/50">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                        <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-800/70 dark:text-emerald-400/70 uppercase tracking-wider">Custo Total Atual</p>
                        <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">
                          {isLoading ? "R$ --" : `R$ ${stats.custo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-emerald-800/60 dark:text-emerald-400/60">Taxa Base</p>
                      <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">R$ {preceptor?.valor_hora?.toFixed(2)} /h</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* History List */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Histórico de Alocações</h3>
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="flex items-center p-4">
                        <div className="h-10 w-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mr-4 shrink-0">
                          <Building className="h-5 w-5 text-slate-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate text-foreground">{h.unidade}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">Turno: {h.turno}</p>
                        </div>
                        <div className="ml-4 text-center shrink-0">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800">
                            {h.alunos} aluno(s)
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">O médico não possui alocações ativas no momento.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
