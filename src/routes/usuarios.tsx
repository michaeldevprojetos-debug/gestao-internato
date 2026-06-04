import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
  DialogTrigger,
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
import { Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários" }] }),
  component: UsuariosPage,
});

// ---------------------------------------------------------------------------
// Tipo alinhado com a tabela `usuarios_painel` do Supabase
// ---------------------------------------------------------------------------
type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  nivel_acesso: "Admin" | "Visualizador";
};

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
function UsuariosPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [editing, setEditing] = useState<UsuarioAdmin | null>(null);
  const [loadingList, setLoadingList] = useState(true);

  useEffect(() => {
    if (ready && user && user.role !== "super_admin") navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  // ── Carrega a lista real do Supabase ──────────────────────────────────────
  const fetchUsuarios = useCallback(async () => {
    setLoadingList(true);
    try {
      const { data, error } = await supabase
        .from("usuarios_painel")
        .select("id, nome, email, nivel_acesso")
        .order("nome");

      if (error) throw error;
      setUsuarios((data ?? []) as UsuarioAdmin[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao carregar usuários.";
      console.error("[UsuariosPage] fetchUsuarios:", err);
      toast.error(msg);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);

  // ── Excluir usuário ───────────────────────────────────────────────────────
  async function handleDeleteUser(id: string) {
    const confirmado = window.confirm("Deseja realmente remover este usuário?");
    if (!confirmado) return;

    try {
      const { error } = await supabase.from("usuarios_painel").delete().eq("id", id);

      if (error) throw error;

      toast.success("Usuário removido!");
      // Remove da lista local imediatamente para não precisar recarregar a tela
      setUsuarios((prev) => prev.filter((u) => u.id !== id));
      // Recarrega a lista do banco após exclusão para garantir sincronia
      await fetchUsuarios();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao remover usuário.";
      console.error("[UsuariosPage] handleDeleteUser:", err);
      toast.error(msg);
    }
  }

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4" /> Acesso restrito ao Super Admin.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Administradores com acesso ao painel.</p>
        </div>
        <UsuarioDialog
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Novo Usuário
            </Button>
          }
          title="Novo Usuário"
          onSaved={fetchUsuarios}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Nível de Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingList ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Carregando usuários...
                  </TableCell>
                </TableRow>
              ) : usuarios.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                    Nenhum usuário cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                usuarios.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant={u.nivel_acesso === "Admin" ? "default" : "secondary"}>
                        {u.nivel_acesso}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {/* Botão Editar — abre o dialog passando os dados do usuário */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditing(u)}
                          title="Editar usuário"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {/* Botão Excluir — chama handleDeleteUser */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteUser(u.id)}
                          title="Remover usuário"
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

      {/* Dialog de edição — aberto via setEditing(u) */}
      {editing && (
        <UsuarioDialog
          title="Editar Usuário"
          data={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
          onSaved={fetchUsuarios}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dialog de criação / edição de usuário
// ---------------------------------------------------------------------------
function UsuarioDialog({
  trigger,
  title,
  data,
  open,
  onOpenChange,
  onSaved,
}: {
  trigger?: React.ReactNode;
  title: string;
  data?: UsuarioAdmin;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
  /** Chamado após salvar com sucesso (sem argumento — pai faz o refetch) */
  onSaved?: () => void;
}) {
  const isEdit = Boolean(data?.id);

  // Estado controlado dos campos
  const [nome, setNome] = useState(data?.nome ?? "");
  const [email, setEmail] = useState(data?.email ?? "");
  const [nivel, setNivel] = useState<"Admin" | "Visualizador">(
    data?.nivel_acesso ?? "Visualizador",
  );
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(open ?? false);

  function closeDialog() {
    setDialogOpen(false);
    if (onOpenChange) onOpenChange(false);
  }

  function resetForm() {
    setNome("");
    setEmail("");
    setNivel("Visualizador");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = { nome: nome.trim(), email: email.trim(), nivel_acesso: nivel };

    // ✅ Log para verificar captura dos dados antes de enviar ao Supabase
    console.log("[UsuarioDialog] onSubmit — dados capturados:", payload);

    if (!payload.nome || !payload.email) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      if (isEdit && data?.id) {
        // ── UPDATE ────────────────────────────────────────────────────────
        const { error } = await supabase
          .from("usuarios_painel")
          .update({ nome: payload.nome, email: payload.email, nivel_acesso: payload.nivel_acesso })
          .eq("id", data.id);

        if (error) throw error;

        console.log("[UsuarioDialog] Usuário atualizado:", data.id);
        toast.success("Usuário atualizado com sucesso!");
      } else {
        // ── INSERT ────────────────────────────────────────────────────────

        // 1. Criar conta no Supabase Auth com senha provisória
        const authData = await supabase.auth.signUp({
          email: payload.email,
          password: "Afya@2026",
          options: { data: { trocar_senha: true, nome: payload.nome } },
        });

        if (authData.error) throw authData.error;

        // 2. Inserir registro na tabela usuarios_painel
        const { data: inserted, error } = await supabase
          .from("usuarios_painel")
          .insert([payload])
          .select()
          .single();

        if (error) throw error;

        console.log("[UsuarioDialog] Usuário criado:", inserted);
        toast.success("Usuário criado com a senha provisória: Afya@2026");
      }

      // Notifica o pai para recarregar a lista
      if (onSaved) onSaved();

      closeDialog();
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao salvar.";
      console.error("[UsuarioDialog] Erro ao salvar no Supabase:", err);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open ?? dialogOpen}
      onOpenChange={(o) => {
        setDialogOpen(o);
        if (onOpenChange) onOpenChange(o);
      }}
    >
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="usuario-nome">Nome</Label>
              <Input
                id="usuario-nome"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="usuario-email">E-mail</Label>
              <Input
                id="usuario-email"
                type="email"
                placeholder="email@instituicao.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="usuario-nivel">Nível de Acesso</Label>
              <Select value={nivel} onValueChange={(v) => setNivel(v as "Admin" | "Visualizador")}>
                <SelectTrigger id="usuario-nivel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Visualizador">Visualizador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
