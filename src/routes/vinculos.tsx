import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
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
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/vinculos")({
  head: () => ({ meta: [{ title: "Alocações — Painel de Preceptoria" }] }),
  component: VinculosPage,
});

type AlocacaoRow = {
  id: string;
  data_inicio: string;
  data_fim: string | null;
  aluno_id: string;
  preceptor_id: string;
  unidade_id: string;
  especialidade_id: string | null;
  aluno_nome: string;
  preceptor_nome: string;
  unidade_nome: string;
  especialidade_nome: string | null;
};

function VinculosPage() {
  const [alocacoes, setAlocacoes] = useState<AlocacaoRow[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [preceptores, setPreceptores] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AlocacaoRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAlocacoes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("alocacoes" as any)
        .select(
          `
          id, data_inicio, data_fim, aluno_id, preceptor_id, unidade_id, especialidade_id,
          alunos(nome), preceptores(nome), unidades(nome), especialidades(nome)
        `,
        )
        .order("data_inicio", { ascending: false });

      if (err) throw err;

      setAlocacoes(
        (data || []).map((v: any) => ({
          id: v.id,
          data_inicio: v.data_inicio,
          data_fim: v.data_fim,
          aluno_id: v.aluno_id,
          preceptor_id: v.preceptor_id,
          unidade_id: v.unidade_id,
          especialidade_id: v.especialidade_id,
          aluno_nome: v.alunos?.nome ?? "—",
          preceptor_nome: v.preceptores?.nome ?? "—",
          unidade_nome: v.unidades?.nome ?? "—",
          especialidade_nome: v.especialidades?.nome ?? null,
        })),
      );
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar alocações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlocacoes();
    Promise.all([
      supabase.from("alunos").select("id, nome").eq("status", "Ativo").order("nome"),
      supabase
        .from("preceptores" as any)
        .select("id, nome")
        .order("nome"),
      supabase
        .from("unidades" as any)
        .select("id, nome")
        .order("nome"),
      supabase
        .from("especialidades" as any)
        .select("id, nome")
        .order("nome"),
    ]).then(([a, p, u, e]) => {
      if (!a.error) setAlunos(a.data ?? []);
      if (!p.error) setPreceptores(p.data ?? []);
      if (!u.error) setUnidades(u.data ?? []);
      if (!e.error) setEspecialidades(e.data ?? []);
    });
  }, [fetchAlocacoes]);

  async function handleDelete(id: string, aluno: string) {
    if (!confirm(`Excluir a alocação de "${aluno}"?`)) return;
    const { error: err } = await supabase
      .from("alocacoes" as any)
      .delete()
      .eq("id", id);
    if (err) toast.error("Erro: " + err.message);
    else {
      toast.success("Alocação excluída.");
      fetchAlocacoes();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alocações Acadêmicas</h1>
          <p className="text-sm text-muted-foreground">
            Distribuição de alunos por preceptor e unidade.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Alocação
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={fetchAlocacoes}>
            Tentar novamente
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Preceptor</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : alocacoes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    Nenhuma alocação encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                alocacoes.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{new Date(v.data_inicio).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      {v.data_fim ? new Date(v.data_fim).toLocaleDateString("pt-BR") : "Vigente"}
                    </TableCell>
                    <TableCell className="font-medium">{v.aluno_nome}</TableCell>
                    <TableCell>{v.preceptor_nome}</TableCell>
                    <TableCell className="text-muted-foreground">{v.unidade_nome}</TableCell>
                    <TableCell>
                      {v.especialidade_nome ? (
                        <Badge variant="secondary">{v.especialidade_nome}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditing(v);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(v.id, v.aluno_nome)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlocacaoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={editing}
        alunos={alunos}
        preceptores={preceptores}
        unidades={unidades}
        especialidades={especialidades}
        onSaved={fetchAlocacoes}
      />
    </div>
  );
}

function AlocacaoDialog({
  open,
  onOpenChange,
  data,
  alunos,
  preceptores,
  unidades,
  especialidades,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: AlocacaoRow | null;
  alunos: any[];
  preceptores: any[];
  unidades: any[];
  especialidades: any[];
  onSaved: () => void;
}) {
  const isEdit = !!data;
  const [saving, setSaving] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [preceptorId, setPreceptorId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [especialidadeId, setEspecialidadeId] = useState("none");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    if (open) {
      setAlunoId(data?.aluno_id ?? "");
      setPreceptorId(data?.preceptor_id ?? "");
      setUnidadeId(data?.unidade_id ?? "");
      setEspecialidadeId(data?.especialidade_id ?? "none");
      setDataInicio(data?.data_inicio ?? new Date().toISOString().split("T")[0]);
      setDataFim(data?.data_fim ?? "");
    }
  }, [open, data]);

  async function handleSave() {
    if (!alunoId || !preceptorId || !unidadeId || !dataInicio) {
      toast.warning("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      // ── VERIFICAÇÃO DE SOBREPOSIÇÃO (REGRA DE NEGÓCIO 4) ──
      // Aluno não pode ter outro preceptor no mesmo período
      let query = supabase
        .from("alocacoes" as any)
        .select("id")
        .eq("aluno_id", alunoId);

      if (isEdit && data) {
        query = query.neq("id", data.id);
      }

      const { data: overlaps, error: checkErr } = await query;
      if (checkErr) throw checkErr;

      const dIni = new Date(dataInicio).getTime();
      const dFim = dataFim ? new Date(dataFim).getTime() : Infinity;

      // Manual overlap check against existing rows since PostgREST OR syntax can be tricky with dates
      if (overlaps && overlaps.length > 0) {
        const { data: fullOverlaps } = await supabase
          .from("alocacoes" as any)
          .select("id, data_inicio, data_fim, preceptor_id, preceptores(nome)")
          .in(
            "id",
            overlaps.map((o: any) => o.id),
          );

        for (const o of (fullOverlaps as any[]) || []) {
          const oIni = new Date(o.data_inicio).getTime();
          const oFim = o.data_fim ? new Date(o.data_fim).getTime() : Infinity;

          // Se inicio1 <= fim2 E fim1 >= inicio2 -> CHOQUE!
          if (dIni <= oFim && dFim >= oIni) {
            const preceptorName = o.preceptores?.nome || "outro preceptor";
            toast.error(`Este aluno já está vinculado ao preceptor ${preceptorName}.`, {
              duration: 5000,
            });
            setSaving(false);
            return;
          }
        }
      }

      const payload = {
        aluno_id: alunoId,
        preceptor_id: preceptorId,
        unidade_id: unidadeId,
        especialidade_id: especialidadeId === "none" ? null : especialidadeId,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
      };

      if (isEdit && data) {
        const { error: err } = await supabase
          .from("alocacoes" as any)
          .update(payload)
          .eq("id", data.id);
        if (err) throw err;
        toast.success("Alocação atualizada!");
      } else {
        const { error: err } = await supabase.from("alocacoes" as any).insert(payload);
        if (err) throw err;
        toast.success("Alocação criada!");
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
          <DialogTitle>{isEdit ? "Editar Alocação" : "Nova Alocação"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Aluno *</Label>
            <Select value={alunoId} onValueChange={setAlunoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o aluno" />
              </SelectTrigger>
              <SelectContent>
                {alunos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Preceptor *</Label>
            <Select value={preceptorId} onValueChange={setPreceptorId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o preceptor" />
              </SelectTrigger>
              <SelectContent>
                {preceptores.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Unidade *</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a unidade" />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Especialidade</Label>
            <Select value={especialidadeId} onValueChange={setEspecialidadeId}>
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
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
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Data de Início *</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Data de Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
          </div>
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
