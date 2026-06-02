import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { ROTACOES } from "@/lib/mock-data";

type Rotacao = (typeof ROTACOES)[number];

export const Route = createFileRoute("/rotacoes")({
  head: () => ({ meta: [{ title: "Rotações" }] }),
  component: RotacoesPage,
});

function RotacoesPage() {
  const [editing, setEditing] = useState<Rotacao | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rotações</h1>
          <p className="text-sm text-muted-foreground">Estágios e carga horária prevista.</p>
        </div>
        <RotacaoDialog
          trigger={<Button><Plus className="mr-2 h-4 w-4" />Adicionar Novo</Button>}
          title="Nova Rotação"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome da Rotação</TableHead>
                <TableHead className="text-right">Carga Horária prevista</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ROTACOES.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.nome}</TableCell>
                  <TableCell className="text-right">{r.cargaHoraria}h</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(r)}>
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
        <RotacaoDialog
          title="Editar Rotação"
          data={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function RotacaoDialog({
  trigger, title, data, open, onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  data?: Rotacao;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2"><Label>Nome da Rotação</Label><Input defaultValue={data?.nome} placeholder="Ex.: Pediatria" /></div>
          <div className="grid gap-2"><Label>Carga Horária prevista</Label><Input type="number" defaultValue={data?.cargaHoraria} placeholder="240" /></div>
        </div>
        <DialogFooter><Button>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}