import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ClientOnly } from "@/components/client-only";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Stethoscope,
  Clock,
  Building2,
  Activity,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSystemConfig } from "@/hooks/use-system-config";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Executivo — Afya" }] }),
  component: Dashboard,
});

function Stat({
  icon: Icon,
  value,
  label,
  hint,
  isRatio = false,
}: {
  icon: React.ElementType;
  value: string | number;
  label: string;
  hint?: string;
  isRatio?: boolean;
}) {
  return (
    <Card className="card-glow shadow-sm border-white/10 dark:bg-white/5 bg-white">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:bg-primary/20 dark:text-[#4ade80]">
          <Icon className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <p className="text-3xl font-bold text-slate-900 dark:text-white">
            {value}
            {isRatio && (
              <span className="text-lg font-medium text-slate-500 dark:text-white/50 ml-1">
                al/pc
              </span>
            )}
          </p>
          <p className="text-sm font-medium text-slate-700 dark:text-white/90">{label}</p>
          {hint && <p className="text-xs text-slate-500 dark:text-white/60">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

const COLORS = [
  "#0ea5e9",
  "#10b981",
  "#3b82f6",
  "#14b8a6",
  "#64748b",
  "#06b6d4",
  "#22c55e",
  "#334155",
  "#6366f1",
  "#475569",
];

function getTurnoLabel(horaInicio?: string, horaFim?: string): string {
  if (!horaInicio) return "Não informado";
  const h = parseInt(horaInicio.split(":")[0], 10);
  let turno = "";
  if (h >= 0 && h < 12) turno = "☀️ Manhã";
  else if (h >= 12 && h < 18) turno = "🌤️ Tarde";
  else turno = "🌙 Noite";
  if (horaFim) {
    return `${turno} (${horaInicio.slice(0, 5)} - ${horaFim.slice(0, 5)})`;
  }
  return turno;
}

function Dashboard() {
  const { config } = useSystemConfig();
  const limitePreceptor = config.limitePreceptor;
  const limiteUnidade = config.limiteUnidade;
  const queryClient = useQueryClient();

  // --- Filtros globais ---
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [selectedEspecialidade, setSelectedEspecialidade] = useState<string>("all");
  const [selectedPreceptor, setSelectedPreceptor] = useState<string>("all");
  const [selectedMes, setSelectedMes] = useState<string>("all");

  // --- Sheet lateral (Raio-X) ---
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetPreceptorId, setSheetPreceptorId] = useState<string | null>(null);

  // Abrir sheet quando filtro de preceptor muda
  useEffect(() => {
    if (selectedPreceptor !== "all") {
      setSheetPreceptorId(selectedPreceptor);
      setSheetOpen(true);
    } else {
      setSheetOpen(false);
      setSheetPreceptorId(null);
    }
  }, [selectedPreceptor]);

  // --- Query principal ---
  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: async () => {
      const { data: viewData, error } = (await supabase
        .from("vw_dashboard_preceptores" as any)
        .select("*")) as { data: any[] | null; error: any };
      if (error) throw error;
      return { alocacoes: viewData || [] };
    },
  });

  // --- Supabase Realtime: escuta alocacoes e invalida cache ---
  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alocacoes" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const alocacoes = dashboardData?.alocacoes || [];
  const lastUpdate = new Date();

  // --- Filtros dinâmicos ---
  const dynamicUnidadesFiltro = useMemo(() => {
    const unis = new Map<string, string>();
    alocacoes.forEach((a) => {
      if (a.unidade_id && a.unidade) unis.set(a.unidade_id, a.unidade);
    });
    return Array.from(unis.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alocacoes]);

  const dynamicMesesFiltro = useMemo(() => {
    const meses = new Set<string>();
    alocacoes.forEach((a) => {
      if (a.mes_referencia) meses.add(a.mes_referencia);
    });
    return Array.from(meses).sort();
  }, [alocacoes]);

  const dynamicEspecialidadesFiltro = useMemo(() => {
    const specs = new Set<string>();
    alocacoes.forEach((a) => {
      specs.add(a.text_especialidade || a.especialidade || "Sem Especialidade");
    });
    return Array.from(specs)
      .sort()
      .map((nome) => ({ id: nome, nome }));
  }, [alocacoes]);

  const dynamicPreceptoresFiltro = useMemo(() => {
    const precs = new Map<string, string>();
    alocacoes.forEach((a) => {
      if (a.preceptor_id && a.preceptor) precs.set(a.preceptor_id, a.preceptor);
    });
    return Array.from(precs.entries())
      .map(([id, nome]) => ({ id, nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [alocacoes]);

  // --- Array filtrado (Single Source of Truth) ---
  const filteredAloc = useMemo(() => {
    return alocacoes.filter((a) => {
      const passUnidade = selectedUnidade === "all" || a.unidade_id === selectedUnidade;
      const passPreceptor = selectedPreceptor === "all" || a.preceptor_id === selectedPreceptor;
      const aEsp = a.text_especialidade || a.especialidade || "Sem Especialidade";
      const passEspecialidade = selectedEspecialidade === "all" || aEsp === selectedEspecialidade;
      const passMes = selectedMes === "all" || a.mes_referencia === selectedMes;
      return passUnidade && passEspecialidade && passPreceptor && passMes;
    });
  }, [alocacoes, selectedUnidade, selectedEspecialidade, selectedPreceptor, selectedMes]);

  // --- KPIs + Ranking + Especialidade + Alertas ---
  const {
    totalAlunos,
    totalPreceptores,
    totalUnidades,
    rankingData,
    especialidadeData,
    alertasPreceptor,
    alertasUnidade,
  } = useMemo(() => {
    const alunosSet = new Set<string>();
    const preceptoresSet = new Set<string>();
    const unidadesSet = new Set<string>();

    const preceptorMap = new Map<
      string,
      {
        id: string;
        nome: string;
        count: Set<string>;
        turnos: Set<string>;
        especialidades: Set<string>;
      }
    >();
    const especialidadeMap = new Map<string, Set<string>>();
    const unidadeMap = new Map<string, { nome: string; count: Set<string> }>();

    for (const a of filteredAloc) {
      if (a.aluno) alunosSet.add(a.aluno);
      if (a.preceptor_id) preceptoresSet.add(a.preceptor_id);
      if (a.unidade_id) unidadesSet.add(a.unidade_id);

      if (a.preceptor_id) {
        if (!preceptorMap.has(a.preceptor_id)) {
          preceptorMap.set(a.preceptor_id, {
            id: a.preceptor_id,
            nome: a.preceptor || "Desconhecido",
            count: new Set(),
            turnos: new Set(),
            especialidades: new Set(),
          });
        }
        const pObj = preceptorMap.get(a.preceptor_id)!;
        if (a.aluno) pObj.count.add(a.aluno);
        const pEsp = a.text_especialidade || a.especialidade;
        if (pEsp && pEsp !== "Sem Especialidade") pObj.especialidades.add(pEsp);
        const turnoStr = getTurnoLabel(a.hora_inicio, a.hora_fim);
        pObj.turnos.add(turnoStr);
      }

      const espNome = a.text_especialidade || a.especialidade || "Sem Especialidade";
      if (!especialidadeMap.has(espNome)) especialidadeMap.set(espNome, new Set());
      if (a.aluno) especialidadeMap.get(espNome)!.add(a.aluno);

      if (a.unidade_id) {
        if (!unidadeMap.has(a.unidade_id)) {
          unidadeMap.set(a.unidade_id, { nome: a.unidade || "Desconhecida", count: new Set() });
        }
        if (a.aluno) unidadeMap.get(a.unidade_id)!.count.add(a.aluno);
      }
    }

    const rData = Array.from(preceptorMap.values())
      .map((p) => ({
        id: p.id,
        preceptor: p.nome,
        alunos: p.count.size,
        turnos: Array.from(p.turnos),
        text_especialidade: Array.from(p.especialidades).join(", ") || "Sem Especialidade",
      }))
      .sort((a, b) => b.alunos - a.alunos)
      .slice(0, 10);

    const eData = Array.from(especialidadeMap.entries())
      .map(([name, set]) => ({ name, value: set.size }))
      .sort((a, b) => b.value - a.value);

    const aPrec = Array.from(preceptorMap.values())
      .filter((p) => p.count.size > limitePreceptor)
      .map((p) => ({ nome: p.nome, alunos: p.count.size }));

    const aUni = Array.from(unidadeMap.values())
      .filter((u) => u.count.size > limiteUnidade)
      .map((u) => ({ nome: u.nome, alunos: u.count.size }));

    return {
      totalAlunos: alunosSet.size,
      totalPreceptores: preceptoresSet.size,
      totalUnidades: unidadesSet.size,
      rankingData: rData,
      especialidadeData: eData,
      alertasPreceptor: aPrec,
      alertasUnidade: aUni,
    };
  }, [filteredAloc, limitePreceptor, limiteUnidade]);

  // --- Tabela de Distribuição Acadêmica ---
  const distribuicaoData = useMemo(() => {
    const map = new Map<
      string,
      { unidade: string; especialidade: string; preceptor: string; alunos: Set<string> }
    >();
    for (const a of filteredAloc) {
      if (!a.unidade || !a.preceptor) continue;
      const esp = a.text_especialidade || a.especialidade || "Sem Especialidade";
      const key = `${a.unidade_id}_${esp}_${a.preceptor_id}`;
      if (!map.has(key)) {
        map.set(key, {
          unidade: a.unidade,
          especialidade: esp,
          preceptor: a.preceptor,
          alunos: new Set(),
        });
      }
      if (a.aluno) map.get(key)!.alunos.add(a.aluno);
    }
    return Array.from(map.values())
      .map((d) => ({ ...d, qtdAlunos: d.alunos.size }))
      .sort((a, b) => a.unidade.localeCompare(b.unidade) || b.qtdAlunos - a.qtdAlunos);
  }, [filteredAloc]);

  // --- Dados do Sheet (Raio-X do Preceptor) ---
  const sheetData = useMemo(() => {
    if (!sheetPreceptorId) return null;
    const rows = alocacoes.filter((a) => a.preceptor_id === sheetPreceptorId);
    if (rows.length === 0) return null;

    const nome = rows[0]?.preceptor || "Desconhecido";
    const unidades = [...new Set(rows.map((r: any) => r.unidade).filter(Boolean))];
    const especialidades = [...new Set(rows.map((r: any) => r.text_especialidade || r.especialidade).filter(Boolean))];
    const alunos = [...new Set(rows.map((r: any) => r.aluno).filter(Boolean))];
    const turnos = [...new Set(rows.map((r: any) => getTurnoLabel(r.hora_inicio, r.hora_fim)))];
    const chContratada = rows.reduce((acc: number, r: any) => {
      let calc_ch = Number(r.ch_prevista || r.carga_horaria || 0);
      
      if (calc_ch === 0 && r.data_inicio && r.data_fim && r.hora_inicio && r.hora_fim) {
        try {
          const start = new Date(r.data_inicio);
          const end = new Date(r.data_fim);
          if (end >= start) {
            const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
            const [h1, m1] = r.hora_inicio.split(":").map(Number);
            const [h2, m2] = r.hora_fim.split(":").map(Number);
            let diffHours = ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60;
            if (diffHours < 0) diffHours += 24;
            calc_ch = diffDays * diffHours;
          }
        } catch (e) {}
      }
      return acc + (calc_ch / Number(r.qtd_alunos_alocacao || 1));
    }, 0);

    const chRealizada = rows.reduce((acc: number, r: any) => {
      return acc + (Number(r.horas_realizadas || 0) / Number(r.qtd_alunos_alocacao || 1));
    }, 0);

    const aproveitamento = chContratada > 0 ? Math.round((chRealizada / chContratada) * 100) : 0;

    return { 
      nome, unidades, especialidades, alunos, turnos, 
      chContratada: Math.round(chContratada),
      chRealizada: Math.round(chRealizada),
      aproveitamento
    };
  }, [sheetPreceptorId, alocacoes]);

  const mediaAlunosPreceptor =
    totalPreceptores > 0 ? (totalAlunos / totalPreceptores).toFixed(1) : "0.0";

  const handleBarClick = (data: any) => {
    if (data && data.activePayload?.[0]?.payload?.id) {
      const id = data.activePayload[0].payload.id;
      setSelectedPreceptor((prev) => (prev === id ? "all" : id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* ── Sheet Lateral: Raio-X do Preceptor ── */}
      <Sheet open={sheetOpen} onOpenChange={(open) => {
        setSheetOpen(open);
        if (!open) setSelectedPreceptor("all");
      }}>
        <SheetContent side="right" className="w-full sm:w-[480px] bg-slate-950 border-slate-800 text-white overflow-y-auto">
          <SheetHeader className="border-b border-slate-800 pb-4 mb-6">
            <SheetTitle className="text-white text-xl flex items-center gap-2">
              <Stethoscope className="h-6 w-6 text-emerald-400" />
              Raio-X do Preceptor
            </SheetTitle>
          </SheetHeader>

          {sheetData ? (
            <div className="space-y-6">
              {/* Nome */}
              <div className="flex items-center gap-3 bg-slate-900 rounded-xl p-4 border border-slate-800">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {sheetData.nome.charAt(0)}
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-0.5">👨‍⚕️ Preceptor</p>
                  <p className="text-lg font-bold text-white">{sheetData.nome}</p>
                </div>
              </div>

              {/* Campos de info */}
              <div className="space-y-4">
                <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" /> Unidade Hospitalar
                  </p>
                  <p className="text-sm text-slate-200 font-medium">{sheetData.unidades.join(", ") || "—"}</p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5" /> Especialidade
                  </p>
                  <p className="text-sm text-slate-200 font-medium">{sheetData.especialidades.join(", ") || "—"}</p>
                </div>

                <div className="bg-slate-900/60 rounded-lg p-4 border border-slate-800/50">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Turno
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {sheetData.turnos.filter(t => t !== "Não informado").map((t, i) => (
                      <Badge key={i} variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-xs">{t}</Badge>
                    ))}
                    {sheetData.turnos.every(t => t === "Não informado") && (
                      <span className="text-sm text-slate-500">Não informado</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-950/40 rounded-lg p-4 border border-emerald-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Users className="h-3 w-3" /> Alunos
                    </p>
                    <p className="text-2xl font-black text-emerald-400">{sheetData.alunos.length}</p>
                  </div>
                  <div className="bg-blue-950/40 rounded-lg p-4 border border-blue-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-blue-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> CH Contratada
                    </p>
                    <p className="text-2xl font-black text-blue-400">{sheetData.chContratada}h</p>
                  </div>
                  <div className="bg-indigo-950/40 rounded-lg p-4 border border-indigo-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-indigo-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> CH Realizada
                    </p>
                    <p className="text-2xl font-black text-indigo-400">{sheetData.chRealizada}h</p>
                  </div>
                  <div className="bg-purple-950/40 rounded-lg p-4 border border-purple-900/40 flex flex-col items-center justify-center">
                    <p className="text-[10px] text-purple-400/70 font-bold uppercase tracking-wider mb-0.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Aproveitamento
                    </p>
                    <p className="text-2xl font-black text-purple-400">{sheetData.aproveitamento}%</p>
                  </div>
                </div>
              </div>

              {/* Lista de alunos */}
              <div className="border-t border-slate-800 pt-5">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  📋 Lista de Alunos ({sheetData.alunos.length})
                </p>
                <ul className="space-y-2">
                  {sheetData.alunos.map((aluno, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-3 text-sm text-slate-300 bg-slate-900/50 px-3 py-2.5 rounded-lg border border-slate-800/50"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                      {aluno}
                    </li>
                  ))}
                  {sheetData.alunos.length === 0 && (
                    <li className="text-sm text-slate-500 italic text-center py-4">Nenhum aluno vinculado.</li>
                  )}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-500 text-sm">
              Carregando dados...
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── HEADER & FILTROS ── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-inner">
            <Activity className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Dashboard Executivo
            </h1>
            <p className="text-slate-400 text-sm mt-1 font-medium">
              Visão consolidada da distribuição acadêmica e preceptoria da Afya.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap xl:flex-nowrap items-center gap-3">
          <Select value={selectedMes} onValueChange={setSelectedMes}>
            <SelectTrigger className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200">
              <SelectValue placeholder="Todos os Meses" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todos os Meses</SelectItem>
              {dynamicMesesFiltro.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200">
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {dynamicUnidadesFiltro.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedEspecialidade} onValueChange={setSelectedEspecialidade}>
            <SelectTrigger className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200">
              <SelectValue placeholder="Todas as Especialidades" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todas as Especialidades</SelectItem>
              {dynamicEspecialidadesFiltro.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedPreceptor} onValueChange={setSelectedPreceptor}>
            <SelectTrigger className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200">
              <SelectValue placeholder="Todos os Preceptores" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todos os Preceptores</SelectItem>
              {dynamicPreceptoresFiltro.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Sync status */}
      <div className="flex items-center justify-end gap-2 text-xs text-slate-400 -mt-2 pr-2">
        {loading ? (
          <span className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3 animate-spin" /> Atualizando...
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-emerald-500">
            <CheckCircle2 className="h-3 w-3" /> Dados Sincronizados
          </span>
        )}
        <span className="opacity-50">Última atualização: {lastUpdate.toLocaleTimeString()}</span>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <Stat icon={Users} value={totalAlunos} label="Alunos" hint="vinculados ativos" />
        <Stat icon={Stethoscope} value={totalPreceptores} label="Preceptores" hint="com vínculos" />
        <Stat icon={Activity} value={mediaAlunosPreceptor} label="Média" hint="Alunos/Preceptor" isRatio />
        <Stat icon={Building2} value={totalUnidades} label="Unidades" hint="com alunos alocados" />
        <Stat icon={Clock} value={0} label="Horas" hint="carga horária da agenda" />
      </div>

      {/* ── ALERTAS ── */}
      <div className="grid grid-cols-1 gap-4">
        <Card className="border-red-900/50 bg-red-950/10 dark:bg-red-950/20 w-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-500">
              <AlertTriangle className="h-4 w-4" /> Alerta: Preceptores
              <span className="ml-auto text-[10px] uppercase bg-red-900/40 px-2 py-0.5 rounded text-red-400">
                Acima de {limitePreceptor} alunos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertasPreceptor.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
                Nenhum preceptor acima do limite.
              </p>
            ) : (
              <div className="space-y-2">
                {alertasPreceptor.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm px-3 py-2 bg-red-900/10 rounded-lg border border-red-900/20">
                    <span className="font-medium text-slate-700 dark:text-slate-300">{p.nome}</span>
                    <Badge variant="destructive" className="text-xs">{p.alunos} alunos</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── GRÁFICOS ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Ranking Preceptores — clicável */}
        <Card className="lg:col-span-2 shadow-md border-white/10 dark:bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Ranking de Preceptores (Top 10)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Clique em uma barra para abrir o Raio-X do Preceptor
            </p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ClientOnly>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={rankingData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    onClick={handleBarClick}
                    style={{ cursor: "pointer" }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#334155"
                      opacity={0.4}
                    />
                    <XAxis
                      type="number"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      dataKey="preceptor"
                      type="category"
                      width={150}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(100, 116, 139, 0.15)" }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3 shadow-lg max-w-xs">
                              <p className="text-slate-800 dark:text-slate-200 font-bold mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">{label}</p>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Alunos</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                                  {data.alunos}
                                </span>
                              </div>
                              {data.text_especialidade && (
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[10px] text-slate-500 uppercase font-bold">Especialidade</span>
                                  <span className="text-slate-600 dark:text-slate-300 text-[11px] truncate max-w-[140px]">{data.text_especialidade}</span>
                                </div>
                              )}
                              <p className="text-[10px] text-slate-400 italic mt-2">Clique para ver Raio-X</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="alunos"
                      fill="#10b981"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </CardContent>
        </Card>

        {/* Pizza Especialidades */}
        <Card className="shadow-md border-white/10 dark:bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
              Alunos por Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[220px] w-full">
              <ClientOnly>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={especialidadeData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {especialidadeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--background))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 500 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full mt-4">
              {especialidadeData.slice(0, 4).map((entry, index) => (
                <div key={index} className="flex items-center text-xs">
                  <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate text-slate-600 dark:text-slate-300 flex-1" title={entry.name}>{entry.name}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 ml-1">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── TABELA: DISTRIBUIÇÃO ACADÊMICA ── */}
      <Card className="shadow-md border-white/10 dark:bg-slate-900/40 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800">
          <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-200">
            Distribuição Acadêmica
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Cruzamento em tempo real de Unidades · Especialidades · Preceptores · Alunos
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[420px] overflow-y-auto">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/80 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Unidade</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Especialidade</TableHead>
                  <TableHead className="font-bold text-slate-700 dark:text-slate-300">Preceptor</TableHead>
                  <TableHead className="font-bold text-center text-slate-700 dark:text-slate-300">Alunos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {[...Array(4)].map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : distribuicaoData.length > 0 ? (
                  distribuicaoData.map((d, idx) => (
                    <TableRow
                      key={idx}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <TableCell className="font-medium text-slate-700 dark:text-slate-300">{d.unidade}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium"
                        >
                          {d.especialidade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300">{d.preceptor}</TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                          {d.qtdAlunos}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                      Nenhum dado encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
