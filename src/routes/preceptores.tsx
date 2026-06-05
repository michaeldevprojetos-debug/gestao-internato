import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { Plus, Pencil, Trash2, Upload, Download, Search } from "lucide-react";
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

function PreceptoresPage() {
  const [preceptores, setPreceptores] = useState<PreceptorRow[]>([]);
  const [filtered, setFiltered] = useState<PreceptorRow[]>([]);
  const [especialidades, setEspecialidades] = useState<Especialidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreceptor, setEditingPreceptor] = useState<PreceptorRow | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [precRes, espRes] = await Promise.all([
        supabase
          .from("preceptores" as any)
          .select("id, nome, especialidade_id, ativo, tipo_remuneracao, valor_hora, especialidades(nome)")
          .order("nome"),
        supabase
          .from("especialidades" as any)
          .select("id, nome")
          .order("nome"),
      ]);

      if (precRes.error) throw precRes.error;
      if (espRes.error) throw espRes.error;

      setEspecialidades((espRes.data || []) as unknown as Especialidade[]);

      const rows: PreceptorRow[] = ((precRes.data || []) as any[]).map((p) => ({
        id: p.id,
        nome: p.nome,
        especialidade_id: p.especialidade_id,
        especialidade_nome: p.especialidades?.nome || null,
        ativo: p.ativo ?? true,
        tipo_remuneracao: p.tipo_remuneracao || "Bolsa",
        valor_hora: p.valor_hora || 80.00,
      }));

      setPreceptores(rows);
      setFiltered(rows);
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const term = query.toLowerCase();
    setFiltered(
      preceptores.filter(
        (p) =>
          p.nome.toLowerCase().includes(term) ||
          (p.especialidade_nome && p.especialidade_nome.toLowerCase().includes(term)),
      ),
    );
  }, [query, preceptores]);

  const handleExport = () => {
    const headers = ["Nome", "Especialidade", "Status"];
    const rows = filtered.map((p) => [
      p.nome,
      p.especialidade_nome || "—",
      p.ativo ? "Ativo" : "Inativo",
    ]);
    downloadCSV("preceptores.csv", headers, rows);
  };

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Tem certeza que deseja inativar "${nome}"?`)) return;
    try {
      const { error } = await supabase
        .from("preceptores" as any)
        .update({ ativo: false })
        .eq("id", id);
      if (error) throw error;
      toast.success("Preceptor inativado com sucesso.");
      fetchData();
    } catch (e: any) {
      toast.error("Erro ao inativar: " + e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preceptores</h1>
          <p className="text-sm text-muted-foreground">Cadastro de preceptores e especialidades.</p>
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
        </div>

        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Nenhum preceptor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className={!p.ativo ? "opacity-60" : ""}>
                    <TableCell className="font-semibold">{p.nome}</TableCell>
                    <TableCell>
                      {p.especialidade_nome ? (
                        <Badge variant="secondary">{p.especialidade_nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.ativo ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200 bg-green-50"
                        >
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-200 bg-slate-50"
                        >
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPreceptor(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.ativo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id, p.nome)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PreceptorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        preceptor={editingPreceptor}
        especialidades={especialidades}
        onSaved={fetchData}
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
        ativo,
        tipo_remuneracao: tipoRemuneracao,
        valor_hora: valorHora === "" ? 0 : Number(valorHora),
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
                {especialidades.map((e) => (
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
