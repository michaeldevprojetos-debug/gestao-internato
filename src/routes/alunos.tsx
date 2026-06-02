import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { downloadCSV } from "@/lib/csv";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Search, Upload, Download, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Aluno = {
  id: string;
  matricula: string | null;
  nome: string;
  cpf: string | null;
  semestre: number | null;
  status: string | null;
};

const SEMESTRES_NUM = [9, 10, 11, 12];

function maskCPF(cpf: string | null) {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length < 11) return "***.***.***-**";
  return `${d.slice(0, 3)}.***.***-${d.slice(9, 11)}`;
}

export const Route = createFileRoute("/alunos")({
  head: () => ({ meta: [{ title: "Alunos — Painel de Preceptoria" }] }),
  component: AlunosPage,
});

// ─── Página principal ─────────────────────────────────────────────────────────

function AlunosPage() {
  const { user } = useAuth();
  const canSeeCPF = user?.role === "super_admin";

  const [alunos, setAlunos]     = useState<Aluno[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [query, setQuery]       = useState("");
  const [page, setPage]         = useState(0);
  const [editing, setEditing]   = useState<Aluno | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const PAGE_SIZE = 25;

  // Busca paginada no Supabase com filtro de busca server-side
  const fetchAlunos = useCallback(async (pageNum: number, search: string) => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from("alunos")
        .select("id, matricula, nome, cpf, semestre, status", { count: "exact" })
        .order("nome", { ascending: true })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

      // Filtro de busca: nome ou matrícula
      if (search.trim()) {
        q = q.or(`nome.ilike.%${search.trim()}%,matricula.ilike.%${search.trim()}%`);
      }

      const { data, error: err, count } = await q;
      if (err) throw err;

      setAlunos(data ?? []);
      setTotal(count ?? 0);
    } catch (e: any) {
      setError(e?.message ?? "Erro ao carregar alunos.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce da busca para não disparar a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchAlunos(0, query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchAlunos]);

  useEffect(() => {
    fetchAlunos(page, query);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Exportar CSV (página atual) ──────────────────────────────────────────────
  const handleExport = () => {
    const headers = canSeeCPF
      ? ["Matrícula", "Nome", "CPF", "Semestre", "Status"]
      : ["Matrícula", "Nome", "Semestre", "Status"];
    const rows = alunos.map((a) =>
      canSeeCPF
        ? [a.matricula ?? "", a.nome, a.cpf ?? "", String(a.semestre ?? ""), a.status ?? ""]
        : [a.matricula ?? "", a.nome, String(a.semestre ?? ""), a.status ?? ""]
    );
    downloadCSV("alunos.csv", headers, rows);
  };

  // ── Deletar ──────────────────────────────────────────────────────────────────
  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o aluno "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error: err } = await supabase.from("alunos").delete().eq("id", id);
    if (err) {
      toast.error("Erro ao excluir aluno: " + err.message);
    } else {
      toast.success("Aluno excluído.");
      fetchAlunos(page, query);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alunos</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? "Carregando…" : (
              <>
                <span className="font-medium text-foreground">{total.toLocaleString("pt-BR")}</span> internos cadastrados
                {canSeeCPF ? " (acesso completo)" : " — CPF oculto por política de privacidade"}
              </>
            )}
          </p>
        </div>
        <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Adicionar Novo
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <Button variant="ghost" size="sm" className="ml-auto h-7" onClick={() => fetchAlunos(page, query)}>
            Tentar novamente
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="space-y-3 p-4">
          {/* Barra de ferramentas */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative max-w-sm flex-1 min-w-[240px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={canSeeCPF ? "Buscar por nome, matrícula ou CPF…" : "Buscar por nome ou matrícula…"}
                className="pl-8"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />Importar CSV
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />Exportar CSV
            </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={async (ev) => {
              const file = ev.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              // Detecta separador (; ou ,)
              const sep = text.split("\n")[0].includes(";") ? ";" : ",";
              const lines = text.split(/\r?\n/).filter(l => l.trim());
              const header = lines.shift()!.split(sep).map(h => h.trim().toUpperCase());
              const idxMat  = header.findIndex(h => h.includes("MATR"));
              const idxNome = header.findIndex(h => h.includes("NOME"));
              const idxPer  = header.findIndex(h => h.includes("PERIODO") || h.includes("SEMESTRE") || h.includes("PERÍODO"));
              const idxCpf  = header.findIndex(h => h.includes("CPF"));
              if (idxMat < 0 || idxNome < 0) {
                toast.error("CSV inválido: colunas MATRICULA e NOME são obrigatórias.");
                ev.target.value = "";
                return;
              }
              const seen = new Set<string>();
              const rows: Array<{ matricula: string; nome: string; semestre: number | null; cpf?: string | null; status: string }> = [];
              for (const ln of lines) {
                const cols = ln.split(sep);
                const mat = (cols[idxMat] ?? "").trim();
                const nome = (cols[idxNome] ?? "").trim();
                if (!mat || !nome || seen.has(mat)) continue;
                seen.add(mat);
                const per = idxPer >= 0 ? parseInt(cols[idxPer]) : NaN;
                const cpf = idxCpf >= 0 ? (cols[idxCpf] ?? "").trim() : "";
                rows.push({
                  matricula: mat,
                  nome,
                  semestre: Number.isFinite(per) ? per : null,
                  ...(canSeeCPF && cpf ? { cpf } : {}),
                  status: "Ativo",
                });
              }
              if (rows.length === 0) {
                toast.warning("Nenhuma linha válida encontrada no CSV.");
                ev.target.value = "";
                return;
              }
              const tid = toast.loading(`Importando ${rows.length.toLocaleString("pt-BR")} alunos…`);
              try {
                const BATCH = 200;
                let inserted = 0;
                for (let i = 0; i < rows.length; i += BATCH) {
                  const chunk = rows.slice(i, i + BATCH);
                  const { error: err } = await supabase.from("alunos").insert(chunk);
                  if (err) throw err;
                  inserted += chunk.length;
                  toast.loading(`Importando ${inserted.toLocaleString("pt-BR")}/${rows.length.toLocaleString("pt-BR")}…`, { id: tid });
                }
                toast.success(`✅ ${inserted.toLocaleString("pt-BR")} alunos importados!`, { id: tid });
                fetchAlunos(0, "");
                setPage(0);
                setQuery("");
              } catch (e: any) {
                toast.error("Erro ao importar: " + (e?.message ?? "Tente novamente."), { id: tid });
              } finally {
                ev.target.value = "";
              }
            }}
          />
          </div>

          {/* Tabela */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome do aluno</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Semestre</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading
                  ? Array.from({ length: PAGE_SIZE }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => (
                          <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                      </TableRow>
                    ))
                  : alunos.length === 0
                    ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                          Nenhum aluno encontrado.
                        </TableCell>
                      </TableRow>
                    )
                    : alunos.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-mono text-xs">{a.matricula ?? "—"}</TableCell>
                        <TableCell className="font-medium">{a.nome}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {canSeeCPF ? (a.cpf ?? "—") : maskCPF(a.cpf)}
                        </TableCell>
                        <TableCell>{a.semestre ? `${a.semestre}º` : "—"}</TableCell>
                        <TableCell>
                          <Badge variant={a.status === "Ativo" ? "default" : "secondary"}>
                            {a.status ?? "—"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => { setEditing(a); setDialogOpen(true); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost" size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleDelete(a.id, a.nome)}
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
          </div>

          {/* Paginação */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Página {page + 1} de {totalPages} · {total.toLocaleString("pt-BR")} resultado(s)
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1 || loading} onClick={() => setPage(p => p + 1)}>
                Próxima
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog criação / edição */}
      <AlunoDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        data={editing}
        canSeeCPF={canSeeCPF}
        onSaved={() => {
          setDialogOpen(false);
          setEditing(null);
          fetchAlunos(page, query);
        }}
      />
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

function AlunoDialog({
  open, onOpenChange, data, canSeeCPF, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  data: Aluno | null;
  canSeeCPF: boolean;
  onSaved: () => void;
}) {
  const isEdit = !!data;
  const [saving, setSaving]     = useState(false);
  const [nome, setNome]         = useState("");
  const [matricula, setMatricula] = useState("");
  const [cpf, setCpf]           = useState("");
  const [semestre, setSemestre] = useState("");
  const [status, setStatus]     = useState("Ativo");

  useEffect(() => {
    if (open) {
      setNome(data?.nome ?? "");
      setMatricula(data?.matricula ?? "");
      setCpf(data?.cpf ?? "");
      setSemestre(String(data?.semestre ?? ""));
      setStatus(data?.status ?? "Ativo");
    }
  }, [open, data]);

  async function handleSave() {
    if (!nome.trim()) { toast.warning("Informe o nome do aluno."); return; }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        matricula: matricula.trim() || null,
        cpf: canSeeCPF ? (cpf.trim() || null) : undefined,
        semestre: semestre ? Number(semestre) : null,
        status,
      };

      if (isEdit && data) {
        const { error: err } = await supabase.from("alunos").update(payload).eq("id", data.id);
        if (err) throw err;
        toast.success("Aluno atualizado!");
      } else {
        const { error: err } = await supabase.from("alunos").insert(payload);
        if (err) throw err;
        toast.success("Aluno cadastrado!");
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
      <DialogContent>
        <DialogHeader><DialogTitle>{isEdit ? "Editar Aluno" : "Novo Aluno"}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="a-matricula">Matrícula</Label>
              <Input id="a-matricula" value={matricula} onChange={e => setMatricula(e.target.value)} placeholder="Matrícula" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-cpf">CPF</Label>
              <Input
                id="a-cpf"
                value={canSeeCPF ? cpf : ""}
                onChange={e => setCpf(e.target.value)}
                placeholder={canSeeCPF ? "000.000.000-00" : "Restrito ao Super Admin"}
                disabled={!canSeeCPF}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="a-nome">Nome completo *</Label>
            <Input id="a-nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Semestre</Label>
              <Select value={semestre} onValueChange={setSemestre}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {SEMESTRES_NUM.map(s => (
                    <SelectItem key={s} value={String(s)}>{s}º Semestre</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Cadastrar aluno"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}