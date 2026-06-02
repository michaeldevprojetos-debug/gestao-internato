import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/mock-data";

export const Route = createFileRoute("/vinculos")({
  head: () => ({ meta: [{ title: "Vínculos — Painel de Preceptoria" }] }),
  component: VinculosPage,
});

// ─── Tipos derivados do schema real ───────────────────────────────────────────

type VinculoRow = {
  id: string;
  mes_referencia: string;
  horas_realizadas: number | null;
  valor_hora_preceptor: number | null;
  custo_total_rotacao: number | null;
  aluno_id: string | null;
  preceptor_id: string | null;
  rotacao_id: string | null;
  // Nomes resolvidos via join
  aluno_nome?: string;
  aluno_semestre?: number | null;
  preceptor_nome?: string;
  preceptor_especialidade?: string | null;
  preceptor_unidade?: string | null;
  rotacao_nome?: string;
};

type AlunoRef   = { id: string; nome: string; semestre: number | null };
type PreceptorRef = { id: string; nome: string; especialidade: string | null; unidade_vinculada: string | null; valor_hora: number | null };
type RotacaoRef = { id: string; nome: string };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMes(m: string) {
  const [y, mm] = m.split("-");
  const nomes = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${nomes[parseInt(mm) - 1]}/${y.slice(2)}`;
}

// ─── Página principal ─────────────────────────────────────────────────────────

function VinculosPage() {
  const [vinculos, setVinculos]   = useState<VinculoRow[]>([]);
  const [alunos, setAlunos]       = useState<AlunoRef[]>([]);
  const [preceptores, setPreceptores] = useState<PreceptorRef[]>([]);
  const [rotacoes, setRotacoes]   = useState<RotacaoRef[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [editing, setEditing]     = useState<VinculoRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // ── Carrega vínculos com join manual ────────────────────────────────────────
  const fetchVinculos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("vinculo_operacional")
        .select(`
          id,
          mes_referencia,
          horas_realizadas,
          valor_hora_preceptor,
          custo_total_rotacao,
          aluno_id,
          preceptor_id,
          rotacao_id,
          alunos ( nome, semestre ),
          preceptores ( nome, especialidade, unidade_vinculada ),
          rotacoes ( nome )
        `)
        .order("mes_referencia", { ascending: false });

      if (err) throw err;

      const mapped: VinculoRow[] = (data ?? []).map((v: any) => ({
        id: v.id,
        mes_referencia: v.mes_referencia,
        horas_realizadas: v.horas_realizadas,
        valor_hora_preceptor: v.valor_hora_preceptor,
        custo_total_rotacao: v.custo_total_rotacao,
        aluno_id: v.aluno_id,
        preceptor_id: v.preceptor_id,
        rotacao_id: v.rotacao_id,
        aluno_nome: v.alunos?.nome ?? "—",
        aluno_semestre: v.alunos?.semestre ?? null,
        preceptor_nome: v.preceptores?.nome ?? "—",
        preceptor_especialidade: v.preceptores?.especialidade ?? null,
        preceptor_unidade: v.preceptores?.unidade_vinculada ?? null,
        rotacao_nome: v.rotacoes?.nome ?? "—",
      }));

      setVinculos(mapped);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar vínculos.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Carrega listas de referência para o formulário ───────────────────────────
  useEffect(() => {
    fetchVinculos();

    Promise.all([
      supabase.from("alunos").select("id, nome, semestre").eq("status", "Ativo").order("nome"),
      supabase.from("preceptores").select("id, nome, especialidade, unidade_vinculada, valor_hora").order("nome"),
      supabase.from("rotacoes").select("id, nome").order("nome"),
    ]).then(([a, p, r]) => {
      if (!a.error) setAlunos(a.data ?? []);
      if (!p.error) setPreceptores(p.data ?? []);
      if (!r.error) setRotacoes(r.data ?? []);
    });
  }, [fetchVinculos]);

  // ── Deletar ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string, aluno: string) {
    if (!confirm(`Excluir o vínculo de "${aluno}"? Esta ação não pode ser desfeita.`)) return;

    const { error: err } = await supabase
      .from("vinculo_operacional")
      .delete()
      .eq("id", id);

    if (err) {
      toast.error("Erro ao excluir vínculo: " + err.message);
    } else {
      toast.success("Vínculo excluído com sucesso.");
      setVinculos(prev => prev.filter(v => v.id !== id));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vínculo Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Lançamentos mensais de horas e custo realizado.{" "}
            {!loading && !error && (
              <span className="font-medium text-foreground">{vinculos.length} registros</span>
            )}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Novo Vínculo
        </Button>
      </div>

      {/* ── Estado de erro ── */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={fetchVinculos}>Tentar novamente</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead>Aluno</TableHead>
                <TableHead>Sem.</TableHead>
                <TableHead>Rotação / Especialidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Preceptor</TableHead>
                <TableHead className="text-right">Horas</TableHead>
                <TableHead className="text-right">Valor/h</TableHead>
                <TableHead className="text-right">Custo Total</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 10 }).map((__, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                : vinculos.length === 0
                  ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                        Nenhum vínculo encontrado. Clique em "Novo Vínculo" para começar.
                      </TableCell>
                    </TableRow>
                  )
                  : vinculos.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{formatMes(v.mes_referencia)}</TableCell>
                      <TableCell className="font-medium">{v.aluno_nome}</TableCell>
                      <TableCell>{v.aluno_semestre ? `${v.aluno_semestre}º` : "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{v.rotacao_nome}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs max-w-[140px] truncate" title={v.preceptor_unidade ?? ""}>
                        {v.preceptor_unidade ?? "—"}
                      </TableCell>
                      <TableCell>{v.preceptor_nome}</TableCell>
                      <TableCell className="text-right">{v.horas_realizadas ?? 0}h</TableCell>
                      <TableCell className="text-right">{formatBRL(v.valor_hora_preceptor ?? 0)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatBRL(v.custo_total_rotacao ?? 0)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Editar" onClick={() => { setEditing(v); setDialogOpen(true); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                            onClick={() => handleDelete(v.id, v.aluno_nome ?? "este aluno")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Dialog de criação/edição ── */}
      <VinculoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={editing}
        alunos={alunos}
        preceptores={preceptores}
        rotacoes={rotacoes}
        onSaved={() => {
          setDialogOpen(false);
          setEditing(null);
          fetchVinculos();
        }}
      />
    </div>
  );
}

// ─── Dialog de criação / edição ───────────────────────────────────────────────

function VinculoDialog({
  open, onOpenChange, data, alunos, preceptores, rotacoes, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: VinculoRow | null;
  alunos: AlunoRef[];
  preceptores: PreceptorRef[];
  rotacoes: RotacaoRef[];
  onSaved: () => void;
}) {
  const isEdit = !!data;
  const [saving, setSaving]         = useState(false);
  const [mes, setMes]               = useState("");
  const [horas, setHoras]           = useState("");
  const [alunoId, setAlunoId]       = useState("");
  const [preceptorId, setPreceptorId] = useState("");
  const [rotacaoId, setRotacaoId]   = useState("");

  // Preenche o form ao abrir para edição
  useEffect(() => {
    if (open) {
      setMes(data?.mes_referencia ?? "");
      setHoras(String(data?.horas_realizadas ?? ""));
      setAlunoId(data?.aluno_id ?? "");
      setPreceptorId(data?.preceptor_id ?? "");
      setRotacaoId(data?.rotacao_id ?? "");
    }
  }, [open, data]);

  async function handleSave() {
    if (!mes || !alunoId || !preceptorId || !rotacaoId || !horas) {
      toast.warning("Preencha todos os campos obrigatórios.");
      return;
    }

    const horasNum = Number(horas);
    const preceptor = preceptores.find(p => p.id === preceptorId);
    const valorHora = preceptor?.valor_hora ?? 0;
    const custoTotal = horasNum * valorHora;

    setSaving(true);
    try {
      if (isEdit && data) {
        // ── UPDATE ──────────────────────────────────────────────────────────
        const { error: err } = await supabase
          .from("vinculo_operacional")
          .update({
            mes_referencia: mes,
            horas_realizadas: horasNum,
            aluno_id: alunoId,
            preceptor_id: preceptorId,
            rotacao_id: rotacaoId,
            valor_hora_preceptor: valorHora,
            custo_total_rotacao: custoTotal,
          })
          .eq("id", data.id);

        if (err) throw err;
        toast.success("Vínculo atualizado com sucesso!");
      } else {
        // ── INSERT ──────────────────────────────────────────────────────────
        const { error: err } = await supabase
          .from("vinculo_operacional")
          .insert({
            mes_referencia: mes,
            horas_realizadas: horasNum,
            aluno_id: alunoId,
            preceptor_id: preceptorId,
            rotacao_id: rotacaoId,
            valor_hora_preceptor: valorHora,
            custo_total_rotacao: custoTotal,
          });

        if (err) throw err;
        toast.success("Vínculo criado com sucesso!");
      }

      onSaved();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message ?? "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Vínculo" : "Novo Vínculo"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="v-mes">Mês de referência *</Label>
              <Input id="v-mes" type="month" value={mes} onChange={e => setMes(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="v-horas">Horas realizadas *</Label>
              <Input id="v-horas" type="number" min={1} placeholder="60" value={horas} onChange={e => setHoras(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Aluno *</Label>
            <Select value={alunoId} onValueChange={setAlunoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
              <SelectContent>
                {alunos.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nome}{a.semestre ? ` — ${a.semestre}º sem.` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Preceptor *</Label>
            <Select value={preceptorId} onValueChange={setPreceptorId}>
              <SelectTrigger><SelectValue placeholder="Selecione o preceptor" /></SelectTrigger>
              <SelectContent>
                {preceptores.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}{p.especialidade ? ` — ${p.especialidade}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Rotação *</Label>
            <Select value={rotacaoId} onValueChange={setRotacaoId}>
              <SelectTrigger><SelectValue placeholder="Selecione a rotação" /></SelectTrigger>
              <SelectContent>
                {rotacoes.map(r => (
                  <SelectItem key={r.id} value={r.id}>{r.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview do custo calculado */}
          {horas && preceptorId && (
            <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              💰 Custo estimado:{" "}
              <span className="font-semibold text-foreground">
                {formatBRL(
                  Number(horas) * (preceptores.find(p => p.id === preceptorId)?.valor_hora ?? 0)
                )}
              </span>
              {" "}({horas}h × {formatBRL(preceptores.find(p => p.id === preceptorId)?.valor_hora ?? 0)}/h)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar vínculo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}