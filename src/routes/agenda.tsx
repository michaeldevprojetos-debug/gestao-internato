import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";
import "react-big-calendar/lib/css/react-big-calendar.css";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/agenda")({
  head: () => ({ meta: [{ title: "Agenda de Preceptoria" }] }),
  component: AgendaPage,
});

const locales = {
  "pt-BR": ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

type AgendaEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  aluno_id: string;
  preceptor_id: string;
  unidade_id: string;
  especialidade_id: string | null;
  status: string;
};

function AgendaPage() {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [alunos, setAlunos] = useState<any[]>([]);
  const [preceptores, setPreceptores] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [especialidades, setEspecialidades] = useState<any[]>([]);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchAgenda = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("agenda_preceptoria" as any)
        .select(`
          id, data, hora_inicio, hora_fim, status,
          aluno_id, preceptor_id, unidade_id, especialidade_id,
          alunos(nome), preceptores(nome), unidades(nome)
        `);

      if (error) throw error;

      const parsedEvents = (data || []).map((e: any) => {
        // Combinar data e hora corretamente
        const startStr = `${e.data}T${e.hora_inicio}`;
        const endStr = `${e.data}T${e.hora_fim}`;
        return {
          id: e.id,
          title: `${e.alunos?.nome} c/ ${e.preceptores?.nome} (${e.status})`,
          start: new Date(startStr),
          end: new Date(endStr),
          aluno_id: e.aluno_id,
          preceptor_id: e.preceptor_id,
          unidade_id: e.unidade_id,
          especialidade_id: e.especialidade_id,
          status: e.status,
        };
      });

      setEvents(parsedEvents);
    } catch (err: any) {
      toast.error("Erro ao buscar agenda: " + err.message);
    }
  }, []);

  useEffect(() => {
    fetchAgenda();
    Promise.all([
      supabase.from("alunos").select("id, nome").eq("status", "Ativo").order("nome"),
      supabase.from("preceptores" as any).select("id, nome").order("nome"),
      supabase.from("unidades" as any).select("id, nome").order("nome"),
      supabase.from("especialidades" as any).select("id, nome").order("nome"),
    ]).then(([a, p, u, e]) => {
      if (!a.error) setAlunos(a.data ?? []);
      if (!p.error) setPreceptores(p.data ?? []);
      if (!u.error) setUnidades(u.data ?? []);
      if (!e.error) setEspecialidades(e.data ?? []);
    });

    const subscription = supabase
      .channel("agenda_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "agenda_preceptoria" }, fetchAgenda)
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [fetchAgenda]);

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    setSelectedDate(slotInfo.start);
    setSelectedEvent(null);
    setDialogOpen(true);
  };

  const handleSelectEvent = (event: AgendaEvent) => {
    setSelectedEvent(event);
    setSelectedDate(event.start);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agenda de Preceptoria</h1>
          <p className="text-sm text-muted-foreground">Distribuição diária de alunos e preceptores.</p>
        </div>
        <Button onClick={() => { setSelectedDate(new Date()); setSelectedEvent(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <Card className="flex-1 min-h-[600px]">
        <CardContent className="p-4 h-full">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            culture="pt-BR"
            selectable
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            messages={{
              next: "Próximo",
              previous: "Anterior",
              today: "Hoje",
              month: "Mês",
              week: "Semana",
              day: "Dia",
              agenda: "Agenda",
              date: "Data",
              time: "Hora",
              event: "Evento",
              noEventsInRange: "Não há eventos nesta faixa.",
            }}
            style={{ height: "100%", minHeight: 600 }}
            eventPropGetter={(event) => {
              let bg = "#3182ce"; // default blue
              if (event.status === "concluído") bg = "#38a169"; // green
              if (event.status === "cancelado") bg = "#e53e3e"; // red
              return { style: { backgroundColor: bg, borderColor: bg } };
            }}
          />
        </CardContent>
      </Card>

      <AgendaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={selectedEvent}
        initialDate={selectedDate}
        alunos={alunos}
        preceptores={preceptores}
        unidades={unidades}
        especialidades={especialidades}
        onSaved={fetchAgenda}
      />
    </div>
  );
}

function AgendaDialog({
  open, onOpenChange, event, initialDate, alunos, preceptores, unidades, especialidades, onSaved
}: {
  open: boolean; onOpenChange: (o: boolean) => void; event: AgendaEvent | null; initialDate: Date | null;
  alunos: any[]; preceptores: any[]; unidades: any[]; especialidades: any[]; onSaved: () => void;
}) {
  const isEdit = !!event;
  const [saving, setSaving] = useState(false);
  const [alunoId, setAlunoId] = useState("");
  const [preceptorId, setPreceptorId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  const [especialidadeId, setEspecialidadeId] = useState("none");
  const [dataStr, setDataStr] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("12:00");
  const [status, setStatus] = useState("ativo");

  useEffect(() => {
    if (open) {
      setAlunoId(event?.aluno_id ?? "");
      setPreceptorId(event?.preceptor_id ?? "");
      setUnidadeId(event?.unidade_id ?? "");
      setEspecialidadeId(event?.especialidade_id ?? "none");
      setStatus(event?.status ?? "ativo");
      
      if (event) {
        setDataStr(format(event.start, "yyyy-MM-dd"));
        setHoraInicio(format(event.start, "HH:mm"));
        setHoraFim(format(event.end, "HH:mm"));
      } else if (initialDate) {
        setDataStr(format(initialDate, "yyyy-MM-dd"));
        setHoraInicio("08:00");
        setHoraFim("12:00");
      }
    }
  }, [open, event, initialDate]);

  async function handleSave() {
    if (!alunoId || !preceptorId || !unidadeId || !dataStr || !horaInicio || !horaFim) {
      toast.warning("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        aluno_id: alunoId,
        preceptor_id: preceptorId,
        unidade_id: unidadeId,
        especialidade_id: especialidadeId === "none" ? null : especialidadeId,
        data: dataStr,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        status,
      };

      if (isEdit && event) {
        const { error } = await supabase.from("agenda_preceptoria" as any).update(payload).eq("id", event.id);
        if (error) throw error;
        toast.success("Evento atualizado!");
      } else {
        const { error } = await supabase.from("agenda_preceptoria" as any).insert(payload);
        if (error) throw error;
        toast.success("Evento criado!");
      }
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Erro ao salvar: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!event || !confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      const { error } = await supabase.from("agenda_preceptoria" as any).delete().eq("id", event.id);
      if (error) throw error;
      toast.success("Evento excluído.");
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar Evento" : "Novo Evento"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto">
          <div className="grid gap-2">
            <Label>Aluno *</Label>
            <Select value={alunoId} onValueChange={setAlunoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o aluno" /></SelectTrigger>
              <SelectContent>
                {alunos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Preceptor *</Label>
            <Select value={preceptorId} onValueChange={setPreceptorId}>
              <SelectTrigger><SelectValue placeholder="Selecione o preceptor" /></SelectTrigger>
              <SelectContent>
                {preceptores.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Unidade *</Label>
            <Select value={unidadeId} onValueChange={setUnidadeId}>
              <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
              <SelectContent>
                {unidades.map((u) => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Especialidade</Label>
            <Select value={especialidadeId} onValueChange={setEspecialidadeId}>
              <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {especialidades.map((e) => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label>Data *</Label>
            <Input type="date" value={dataStr} onChange={(e) => setDataStr(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Hora Início *</Label>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Hora Fim *</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="concluído">Concluído</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="flex justify-between w-full">
          {isEdit ? (
            <Button type="button" variant="destructive" onClick={handleDelete} className="mr-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </Button>
          ) : <div />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
