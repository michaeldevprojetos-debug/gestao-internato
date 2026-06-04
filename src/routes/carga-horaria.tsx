import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Send, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/lib/mock-data";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type PreceptorRef = {
  id: string;
  nome: string;
  valor_hora: number | null;
  especialidade: string | null;
};
type RotacaoRef = { id: string; nome: string };

type LancamentoRow = {
  id: string;
  mes_referencia: string;
  horas_realizadas: number | null;
  valor_hora_preceptor: number | null;
  custo_total_rotacao: number | null;
  preceptor_nome?: string;
  rotacao_nome?: string;
};

function formatMes(m: string) {
  const [y, mm] = m.split("-");
  const nomes = [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ];
  return `${nomes[parseInt(mm) - 1]}/${y.slice(2)}`;
}

export const Route = createFileRoute("/carga-horaria")({
  head: () => ({ meta: [{ title: "Carga Horária — Painel de Preceptoria" }] }),
  component: CargaHorariaPage,
});

// ─── Página principal ─────────────────────────────────────────────────────────

function CargaHorariaPage() {
  const [preceptores, setPreceptores] = useState<PreceptorRef[]>([]);
  const [rotacoes, setRotacoes] = useState<RotacaoRef[]>([]);
  const [lancamentos, setLancamentos] = useState<LancamentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Form state ───────────────────────────────────────────────────────────────
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [preceptorId, setPreceptorId] = useState("");
  const [rotacaoId, setRotacaoId] = useState("");
  const [horas, setHoras] = useState("");
  const [saving, setSaving] = useState(false);

  // Custo estimado em tempo real
  const preceptorSel = preceptores.find((p) => p.id === preceptorId);
  const custoEstimado =
    horas && preceptorSel ? Number(horas) * (preceptorSel.valor_hora ?? 0) : null;

  // ── Carrega listas de referência e histórico ─────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, rRes, lRes] = await Promise.all([
        supabase.from("preceptores").select("id, nome, valor_hora, especialidade").order("nome"),
        supabase.from("rotacoes").select("id, nome").order("nome"),
        supabase
          .from("vinculo_operacional")
          .select(
            `
            id, mes_referencia, horas_realizadas,
            valor_hora_preceptor, custo_total_rotacao,
            preceptores ( nome ),
            rotacoes ( nome )
          `,
          )
          .order("mes_referencia", { ascending: false })
          .limit(50),
      ]);

      if (pRes.error) throw pRes.error;
      if (rRes.error) throw rRes.error;
      if (lRes.error) throw lRes.error;

      setPreceptores(pRes.data ?? []);
      setRotacoes(rRes.data ?? []);
      setLancamentos(
        (lRes.data ?? []).map((v: any) => ({
          id: v.id,
          mes_referencia: v.mes_referencia,
          horas_realizadas: v.horas_realizadas,
          valor_hora_preceptor: v.valor_hora_preceptor,
          custo_total_rotacao: v.custo_total_rotacao,
          preceptor_nome: v.preceptores?.nome ?? "—",
          rotacao_nome: v.rotacoes?.nome ?? "—",
        })),
      );
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Lançar horas ─────────────────────────────────────────────────────────────
  async function handleLancar() {
    if (!mes || !preceptorId || !rotacaoId || !horas) {
      toast.warning("Preencha todos os campos antes de lançar.");
      return;
    }
    const horasNum = Number(horas);
    if (horasNum <= 0 || horasNum > 744) {
      toast.warning("Informe um número de horas válido (1–744).");
      return;
    }

    const valorHora = preceptorSel?.valor_hora ?? 0;
    const custoTotal = horasNum * valorHora;

    setSaving(true);
    try {
      const { error: err } = await supabase.from("vinculo_operacional").insert({
        mes_referencia: mes,
        preceptor_id: preceptorId,
        rotacao_id: rotacaoId,
        horas_realizadas: horasNum,
        valor_hora_preceptor: valorHora,
        custo_total_rotacao: custoTotal,
      });

      if (err) throw err;

      toast.success(`✅ ${horasNum}h lançadas para ${preceptorSel?.nome}!`);

      // Limpa o formulário mantendo o mês
      setPreceptorId("");
      setRotacaoId("");
      setHoras("");
      fetchData();
    } catch (e: any) {
      toast.error("Erro ao lançar: " + (e?.message ?? "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  // Totais do histórico carregado
  const totalHoras = lancamentos.reduce((s, l) => s + (l.horas_realizadas ?? 0), 0);
  const totalCusto = lancamentos.reduce((s, l) => s + (l.custo_total_rotacao ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Carga Horária</h1>
        <p className="text-sm text-muted-foreground">
          Lançamento e histórico de horas por preceptor e rotação.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={fetchData}>
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* ── Formulário de lançamento ── */}
        <Card className="h-fit border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Lançar Horas</CardTitle>
                <CardDescription className="text-xs">
                  Registra horas realizadas no Supabase
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="space-y-4 pt-4">
            {/* Mês */}
            <div className="grid gap-2">
              <Label htmlFor="ch-mes">Mês de referência *</Label>
              <Input
                id="ch-mes"
                type="month"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
              />
            </div>

            {/* Preceptor */}
            <div className="grid gap-2">
              <Label>Preceptor *</Label>
              <Select value={preceptorId} onValueChange={setPreceptorId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando…" : "Selecione o preceptor"} />
                </SelectTrigger>
                <SelectContent>
                  {preceptores.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome}
                      {p.especialidade ? ` — ${p.especialidade}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rotação */}
            <div className="grid gap-2">
              <Label>Rotação *</Label>
              <Select value={rotacaoId} onValueChange={setRotacaoId} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder={loading ? "Carregando…" : "Selecione a rotação"} />
                </SelectTrigger>
                <SelectContent>
                  {rotacoes.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horas */}
            <div className="grid gap-2">
              <Label htmlFor="ch-horas">Horas realizadas *</Label>
              <Input
                id="ch-horas"
                type="number"
                min={1}
                max={744}
                placeholder="Ex.: 60"
                value={horas}
                onChange={(e) => setHoras(e.target.value)}
              />
            </div>

            {/* Preview de custo */}
            {custoEstimado !== null && (
              <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                <p className="text-xs text-muted-foreground">Custo estimado</p>
                <p className="text-lg font-bold text-primary">{formatBRL(custoEstimado)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {horas}h × {formatBRL(preceptorSel?.valor_hora ?? 0)}/h
                </p>
              </div>
            )}

            <Button className="w-full" onClick={handleLancar} disabled={saving || loading}>
              <Send className="mr-2 h-4 w-4" />
              {saving ? "Lançando…" : "Lançar Horas"}
            </Button>
          </CardContent>
        </Card>

        {/* ── Histórico de lançamentos ── */}
        <div className="space-y-4">
          {/* Cards de totais */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total de horas (50 últimas)</p>
                <p className="text-2xl font-bold">{totalHoras.toLocaleString("pt-BR")}h</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Custo total (50 últimas)</p>
                <p className="text-2xl font-bold text-primary">{formatBRL(totalCusto)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de histórico */}
          <Card className="border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Últimos 50 lançamentos</CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead>Preceptor</TableHead>
                    <TableHead>Rotação</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Custo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 5 }).map((__, j) => (
                          <TableCell key={j}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : lancamentos.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        Nenhum lançamento encontrado. Use o formulário ao lado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    lancamentos.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-medium">{formatMes(l.mes_referencia)}</TableCell>
                        <TableCell>{l.preceptor_nome}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[11px]">
                            {l.rotacao_nome}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{l.horas_realizadas ?? 0}h</TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatBRL(l.custo_total_rotacao ?? 0)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
