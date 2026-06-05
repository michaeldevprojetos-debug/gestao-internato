import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  icon: any;
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
  "#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#10b981",
];

function Dashboard() {
  const { config } = useSystemConfig();
  const limitePreceptor = config.limitePreceptor;
  const limiteUnidade = config.limiteUnidade;

  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  // Filtros dinâmicos
  const [unidadesFiltro, setUnidadesFiltro] = useState<{id: string, nome: string}[]>([]);
  const [especialidadesFiltro, setEspecialidadesFiltro] = useState<{id: string, nome: string}[]>([]);
  const [preceptoresFiltro, setPreceptoresFiltro] = useState<{id: string, nome: string}[]>([]);

  // Filtros selecionados
  const [selectedUnidade, setSelectedUnidade] = useState<string>("all");
  const [selectedEspecialidade, setSelectedEspecialidade] = useState<string>("all");
  const [selectedPreceptor, setSelectedPreceptor] = useState<string>("all");

  // Dados crus
  const [alocacoes, setAlocacoes] = useState<any[]>([]);
  const [horasConcluidas, setHorasConcluidas] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, eRes, pRes] = await Promise.all([
        supabase.from("unidades" as any).select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("especialidades" as any).select("id, nome").order("nome"),
        supabase.from("preceptores" as any).select("id, nome").eq("ativo", true).order("nome"),
      ]);
      if (uRes.data) setUnidadesFiltro(uRes.data);
      if (eRes.data) setEspecialidadesFiltro(eRes.data);
      if (pRes.data) setPreceptoresFiltro(pRes.data);

      // 2. Carregar Alocações ativas
      const hoje = new Date().toISOString().split("T")[0];
            const { data: alocData } = await supabase
        .from("vw_dashboard_preceptores" as any)
        .select("*");
      
      setAlocacoes(alocData || []);

      // 3. Carregar Horas da Agenda
      const { data: agendaData } = await supabase
        .from("agenda_preceptoria" as any)
        .select("hora_inicio, hora_fim")
        .in("status", ["ativo", "concluído"]);

      let totalHoras = 0;
      if (agendaData) {
        for (const ev of agendaData) {
          if (ev.hora_inicio && ev.hora_fim) {
            const [hI, mI] = ev.hora_inicio.split(":").map(Number);
            const [hF, mF] = ev.hora_fim.split(":").map(Number);
            const diffMin = (hF * 60 + mF) - (hI * 60 + mI);
            if (diffMin > 0) totalHoras += diffMin / 60;
          }
        }
      }
      setHorasConcluidas(Math.round(totalHoras));
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Auto-refresh via realtime
    const sub1 = supabase.channel("aloc_dash").on("postgres_changes", { event: "*", schema: "public", table: "alocacoes" }, fetchData).subscribe();
    const sub2 = supabase.channel("agend_dash").on("postgres_changes", { event: "*", schema: "public", table: "agenda_preceptoria" }, fetchData).subscribe();
    const sub3 = supabase.channel("uni_dash").on("postgres_changes", { event: "*", schema: "public", table: "unidades" }, fetchData).subscribe();
    const sub4 = supabase.channel("prec_dash").on("postgres_changes", { event: "*", schema: "public", table: "preceptores" }, fetchData).subscribe();

    return () => {
      supabase.removeChannel(sub1);
      supabase.removeChannel(sub2);
      supabase.removeChannel(sub3);
      supabase.removeChannel(sub4);
    };
  }, [fetchData]);

  // Aplicar filtros locais nas alocações
  const filteredAloc = useMemo(() => {
    return alocacoes.filter((a) => {
      const passUnidade = selectedUnidade === "all" || a.unidade_id === selectedUnidade;
      const passEspecialidade = selectedEspecialidade === "all" || (a.especialidade_nome && a.especialidade_nome === selectedEspecialidade) || (!a.especialidade_nome && selectedEspecialidade === "null");
      const passPreceptor = selectedPreceptor === "all" || a.preceptor_id === selectedPreceptor;
      return passUnidade && passEspecialidade && passPreceptor;
    });
  }, [alocacoes, selectedUnidade, selectedEspecialidade, selectedPreceptor]);

  // Calcular KPIs
    const { totalAlunos, totalPreceptores, totalUnidades, rankingData, especialidadeData, alertasPreceptor, alertasUnidade } = useMemo(() => {
    let totalAlunosSum = 0;
    const preceptoresSet = new Set<string>();
    const unidadesSet = new Set<string>();
    
    const preceptorMap = new Map<string, { nome: string; alunos: number }>();
    const especialidadeMap = new Map<string, number>();
    const unidadeMap = new Map<string, { nome: string; alunos: number }>();

    for (const a of filteredAloc) {
      if (a.preceptor_id) preceptoresSet.add(a.preceptor_id);
      if (a.unidade_id) unidadesSet.add(a.unidade_id);
      
      const qtdAlunos = Number(a.total_alunos) || 0;
      totalAlunosSum += qtdAlunos;

      if (a.preceptor_id) {
        if (!preceptorMap.has(a.preceptor_id)) {
          preceptorMap.set(a.preceptor_id, { nome: a.preceptor_nome || "Desconhecido", alunos: 0 });
        }
        preceptorMap.get(a.preceptor_id)!.alunos += qtdAlunos;
      }

      if (a.especialidade_nome) {
        const espNome = a.especialidade_nome;
        especialidadeMap.set(espNome, (especialidadeMap.get(espNome) || 0) + qtdAlunos);
      } else {
        especialidadeMap.set("Sem Especialidade", (especialidadeMap.get("Sem Especialidade") || 0) + qtdAlunos);
      }

      if (a.unidade_id) {
        if (!unidadeMap.has(a.unidade_id)) {
          unidadeMap.set(a.unidade_id, { nome: a.unidade_nome || "Desconhecida", alunos: 0 });
        }
        unidadeMap.get(a.unidade_id)!.alunos += qtdAlunos;
      }
    }

    const rData = Array.from(preceptorMap.values())
      .map((p) => ({ preceptor: p.nome, alunos: p.alunos }))
      .sort((a, b) => b.alunos - a.alunos)
      .slice(0, 10);

    const eData = Array.from(especialidadeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const aPrec = Array.from(preceptorMap.values()).filter(p => p.alunos > limitePreceptor).map(p => ({ nome: p.nome, alunos: p.alunos }));
    const aUni = Array.from(unidadeMap.values()).filter(u => u.alunos > limiteUnidade).map(u => ({ nome: u.nome, alunos: u.alunos }));

    return {
      totalAlunos: totalAlunosSum,
      totalPreceptores: preceptoresSet.size,
      totalUnidades: unidadesSet.size,
      rankingData: rData,
      especialidadeData: eData,
      alertasPreceptor: aPrec,
      alertasUnidade: aUni
    };
  }, [filteredAloc, limitePreceptor, limiteUnidade]);

  const mediaAlunosPreceptor = totalPreceptores > 0 ? (totalAlunos / totalPreceptores).toFixed(1) : "0.0";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      {/* ── HEADER & FILTERS ── */}
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
          <Select value={selectedUnidade} onValueChange={setSelectedUnidade}>
            <SelectTrigger className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200">
              <SelectValue placeholder="Todas as Unidades" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="all">Todas as Unidades</SelectItem>
              {unidadesFiltro.map((u) => (
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
              {especialidadesFiltro.map((e) => (
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
              {preceptoresFiltro.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-slate-400 -mt-2 pr-2">
        {loading ? (
          <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" /> Atualizando...</span>
        ) : (
          <span className="flex items-center gap-1.5 text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Dados Sincronizados</span>
        )}
        <span className="opacity-50">Última atualização: {lastUpdate.toLocaleTimeString()}</span>
      </div>

      {/* ── KPIs MAINS ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <Stat icon={Users} value={totalAlunos} label="Alunos" hint="vinculados ativos" />
        <Stat icon={Stethoscope} value={totalPreceptores} label="Preceptores" hint="com vínculos" />
        <Stat icon={Activity} value={mediaAlunosPreceptor} label="Média" hint="Alunos/Preceptor" isRatio />
        <Stat icon={Building2} value={totalUnidades} label="Unidades" hint="com alunos alocados" />
        <Stat icon={Clock} value={horasConcluidas} label="Horas" hint="carga horária da agenda" />
      </div>

      {/* ── ALERTAS ── */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-red-900/50 bg-red-950/10 dark:bg-red-950/20">
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
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Nenhum preceptor acima do limite.</p>
            ) : (
              <div className="space-y-2">
                {alertasPreceptor.map((p, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-red-900/20">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{p.nome}</span>
                    <span className="text-red-600 dark:text-red-400 font-bold">{p.alunos} alunos</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-900/50 bg-orange-950/10 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-orange-500">
              <AlertTriangle className="h-4 w-4" /> Alerta: Unidades
              <span className="ml-auto text-[10px] uppercase bg-orange-900/40 px-2 py-0.5 rounded text-orange-400">
                Acima de {limiteUnidade} alunos
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {alertasUnidade.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">Nenhuma unidade sobrecarregada.</p>
            ) : (
              <div className="space-y-2">
                {alertasUnidade.map((u, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-orange-900/20">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{u.nome}</span>
                    <span className="text-orange-600 dark:text-orange-400 font-bold">{u.alunos} alunos</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── GRÁFICOS ── */}
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 shadow-md border-white/10 dark:bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Ranking de Preceptores (Top 10)</CardTitle>
            <p className="text-xs text-muted-foreground">Distribuição atual de alunos alocados por preceptor</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ClientOnly>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rankingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" opacity={0.4} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="preceptor" type="category" width={150} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
                    <Bar dataKey="alunos" fill="#22c55e" radius={[0, 4, 4, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md border-white/10 dark:bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">Alunos por Especialidade</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="h-[220px] w-full">
              <ClientOnly>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={especialidadeData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                      {especialidadeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }} />
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
    </div>
  );
}
