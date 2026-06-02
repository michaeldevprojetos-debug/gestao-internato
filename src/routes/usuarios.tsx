import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários" }] }),
  component: UsuariosPage,
});

type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  nivel: "Admin" | "Visualizador";
};

const INICIAIS: UsuarioAdmin[] = [
  { id: "u1", nome: "Maicon (Super Admin)", email: "maiconinform@gmail.com", nivel: "Admin" },
  { id: "u2", nome: "Coordenação do Internato", email: "coordenacao@instituicao.org", nivel: "Admin" },
  { id: "u3", nome: "Secretaria Acadêmica", email: "secretaria@instituicao.org", nivel: "Visualizador" },
];

function UsuariosPage() {
  const { user, ready } = useAuth();
  const navigate = useNavigate();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>(INICIAIS);
  const [editing, setEditing] = useState<UsuarioAdmin | null>(null);

  useEffect(() => {
    if (ready && user && user.role !== "super_admin") navigate({ to: "/dashboard" });
  }, [ready, user, navigate]);

  if (!user || user.role !== "super_admin") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
        <ShieldAlert className="h-4 w-4" /> Acesso restrito ao Super Admin.
      </div>
    );
  }

  /** Callback chamado após salvar com sucesso para atualizar a lista local */
  function handleNovoUsuario(novoUsuario: UsuarioAdmin) {
    setUsuarios((prev) => [...prev, novoUsuario]);
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
          onSaved={handleNovoUsuario}
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
              {usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.nivel === "Admin" ? "default" : "secondary"}>
                      {u.nivel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing && (
        <UsuarioDialog
          title="Editar Usuário"
          data={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
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
  onSaved?: (usuario: UsuarioAdmin) => void;
}) {
  // Estado controlado para os campos do formulário
  const [nome, setNome] = useState(data?.nome ?? "");
  const [email, setEmail] = useState(data?.email ?? "");
  const [nivel, setNivel] = useState<"Admin" | "Visualizador">(data?.nivel ?? "Visualizador");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(open ?? false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const payload = { nome, email, nivel };

    // ✅ Log para verificar se os dados do formulário estão sendo capturados
    console.log("[UsuarioDialog] onSubmit — dados capturados:", payload);

    if (!nome.trim() || !email.trim()) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    const { data: inserted, error } = await supabase
      .from("usuarios_painel")
      .insert([{ nome: nome.trim(), email: email.trim(), nivel }])
      .select()
      .single();

    setLoading(false);

    if (error) {
      console.error("[UsuarioDialog] Erro ao salvar no Supabase:", error);
      toast.error(error.message);
      return;
    }

    console.log("[UsuarioDialog] Usuário salvo com sucesso:", inserted);
    toast.success("Usuário salvo com sucesso!");

    // Notifica o componente pai para atualizar a lista
    if (onSaved && inserted) {
      onSaved(inserted as UsuarioAdmin);
    }

    // Fecha o dialog e limpa o formulário
    setDialogOpen(false);
    if (onOpenChange) onOpenChange(false);
    setNome("");
    setEmail("");
    setNivel("Visualizador");
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
              <Select
                value={nivel}
                onValueChange={(v) => setNivel(v as "Admin" | "Visualizador")}
              >
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