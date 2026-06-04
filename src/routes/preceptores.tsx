import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
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
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import { PRECEPTORES, ESPECIALIDADES, UNIDADES, TIPOS_CONTRATO, formatBRL } from "@/lib/mock-data";
import { downloadCSV } from "@/lib/csv";

type Preceptor = (typeof PRECEPTORES)[number];

export const Route = createFileRoute("/preceptores")({
  head: () => ({ meta: [{ title: "Preceptores" }] }),
  component: PreceptoresPage,
});

function PreceptoresPage() {
  const [editing, setEditing] = useState<Preceptor | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const headers = ["Nome", "Especialidade", "Unidade", "Contrato", "Valor/hora"];
    const rows = PRECEPTORES.map((p) => [
      p.nome,
      p.especialidade,
      p.unidade,
      p.tipoContrato,
      p.valorHora,
    ]);
    downloadCSV("preceptores.csv", headers, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Preceptores</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro de preceptores e valores de hora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            Importar CSV
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
          <PreceptorDialog
            trigger={
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Novo
              </Button>
            }
            title="Novo Preceptor"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={() => {
              /* gravação local feita pelo usuário */
            }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Especialidade</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Contrato</TableHead>
                <TableHead className="text-right">Valor/hora</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {PRECEPTORES.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{p.especialidade}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.unidade}</TableCell>
                  <TableCell>{p.tipoContrato}</TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatBRL(p.valorHora)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setEditing(p)}>
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
        <PreceptorDialog
          title="Editar Preceptor"
          data={editing}
          open
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}
    </div>
  );
}

function PreceptorDialog({
  trigger,
  title,
  data,
  open,
  onOpenChange,
}: {
  trigger?: React.ReactNode;
  title: string;
  data?: Preceptor;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Nome</Label>
            <Input defaultValue={data?.nome} placeholder="Dr(a). Nome Completo" />
          </div>
          <div className="grid gap-2">
            <Label>Especialidade</Label>
            <Select defaultValue={data?.especialidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {ESPECIALIDADES.map((e) => (
                  <SelectItem key={e} value={e}>
                    {e}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Unidade</Label>
            <Select defaultValue={data?.unidade}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {UNIDADES.map((u) => (
                  <SelectItem key={u} value={u}>
                    {u}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Tipo de Contrato</Label>
              <Select defaultValue={data?.tipoContrato}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_CONTRATO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Valor/hora (R$)</Label>
              <Input type="number" defaultValue={data?.valorHora} placeholder="120" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
