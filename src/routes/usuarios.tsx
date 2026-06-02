import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/usuarios")({
  head: () => ({ meta: [{ title: "Usuários" }] }),
  component: UsuariosPage,
});

type UsuarioAdmin = { id: string; nome: string; email: string; nivel: "Admin" | "Visualizador" };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Administradores com acesso ao painel.</p>
        </div>
        <UsuarioDialog
          trigger={<Button><Plus className="mr-2 h-4 w-4" />Adicionar Novo Usuário</Button>}
          title="Novo Usuário"
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
                    <Badge variant={u.nivel === "Admin" ? "default" : "secondary"}>{u.nivel}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(u)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
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

function UsuarioDialog({
  trigger, title, data, open, onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  data?: UsuarioAdmin;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>Nome</Label><Input defaultValue={data?.nome} placeholder="Nome completo" /></div>
          <div className="grid gap-2"><Label>E-mail</Label><Input type="email" defaultValue={data?.email} placeholder="email@instituicao.org" /></div>
          <div className="grid gap-2">
            <Label>Nível de Acesso</Label>
            <Select defaultValue={data?.nivel ?? "Visualizador"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="Visualizador">Visualizador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}