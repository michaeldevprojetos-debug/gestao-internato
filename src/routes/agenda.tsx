import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useCallback } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
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
  const [alocacoes, setAlocacoes] = useState<any[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<AgendaEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const fetchAgenda = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("agenda_preceptoria" as any).select(`
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
    const hoje = new Date().toISOString().split("T")[0];
    supabase
      .from("alocacoes" as any)
      .select(
        `
        id, aluno_id, preceptor_id, unidade_id, especialidade_id,
        alunos(nome), preceptores(nome), unidades(nome), especialidades(nome)
      `,
      )
      .or(`data_fim.is.null,data_fim.gte.${hoje}`)
      .then(({ data }) => setAlocacoes(data || []));

    const subscription = supabase
      .channel("agenda_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agenda_preceptoria" },
        fetchAgenda,
      )
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
          <p className="text-sm text-muted-foreground">
            Distribuição diária de alunos e preceptores.
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedDate(new Date());
            setSelectedEvent(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      <Card className="flex-1 min-h-[150px]">
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
        alocacoes={alocacoes}
        onSaved={fetchAgenda}
      />
    </div>
  );
}

function AgendaDialog({
  open,
  onOpenChange,
  event,
  initialDate,
  alocacoes,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: AgendaEvent | null;
  initialDate: Date | null;
  alocacoes: any[];
  onSaved: () => void;
}) {
  const isEdit = !!event;
  const [saving, setSaving] = useState(false);
  const [alocacaoId, setAlocacaoId] = useState("");
  const [dataStr, setDataStr] = useState("");
  const [horaInicio, setHoraInicio] = useState("08:00");
  const [horaFim, setHoraFim] = useState("12:00");
  const [status, setStatus] = useState("ativo");

  useEffect(() => {
    if (open) {
      setStatus(event?.status ?? "ativo");

      if (event) {
        // Encontrar a alocação que corresponde a este evento
        const match = alocacoes.find(
          (a) =>
            a.aluno_id === event.aluno_id &&
            a.preceptor_id === event.preceptor_id &&
            a.unidade_id === event.unidade_id,
        );
        if (match) setAlocacaoId(match.id);
        else setAlocacaoId("");
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
    if (!alocacaoId || !dataStr || !horaInicio || !horaFim) {
      toast.warning("Selecione o vínculo e preencha as datas e horários.");
      return;
    }

    const alocacao = alocacoes.find((a) => a.id === alocacaoId);
    if (!alocacao) return;

    setSaving(true);
    try {
      const payload = {
        aluno_id: alocacao.aluno_id,
        preceptor_id: alocacao.preceptor_id,
        unidade_id: alocacao.unidade_id,
        especialidade_id: alocacao.especialidade_id,
        data: dataStr,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        status,
      };

      if (isEdit && event) {
        const { error } = await supabase
          .from("agenda_preceptoria" as any)
          .update(payload)
          .eq("id", event.id);
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
      const { error } = await supabase
        .from("agenda_preceptoria" as any)
        .delete()
        .eq("id", event.id);
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
            <Label>Vínculo Ativo *</Label>
            <Select value={alocacaoId} onValueChange={setAlocacaoId} disabled={isEdit}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o vínculo (Aluno → Preceptor)" />
              </SelectTrigger>
              <SelectContent>
                {alocacoes.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.alunos?.nome} c/ {a.preceptores?.nome} ({a.unidades?.nome})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isEdit && (
              <p className="text-[10px] text-muted-foreground">
                O vínculo não pode ser alterado após a criação.
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Data *</Label>
            <Input type="date" value={dataStr} onChange={(e) => setDataStr(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Hora Início *</Label>
              <Input
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Hora Fim *</Label>
              <Input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
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
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : isEdit ? "Salvar" : "Criar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
