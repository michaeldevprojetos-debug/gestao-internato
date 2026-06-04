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
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  BarChart,
  Bar,
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

// Colors for charts
const COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#10b981",
];

function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<"syncing" | "synced">("syncing");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Dynamic Settings (Configurações do Sistema)
  const [config, setConfig] = useState({
    limitePreceptor: 4,
    limiteUnidade: 20,
  });

  // Filters Options
  const [unidadesOpt, setUnidadesOpt] = useState<{ id: string; nome: string }[]>([]);
  const [especialidadesOpt, setEspecialidadesOpt] = useState<{ id: string; nome: string }[]>([]);
  const [preceptoresOpt, setPreceptoresOpt] = useState<{ id: string; nome: string }[]>([]);

  // Selected Filters
  const [unidadeSel, setUnidadeSel] = useState<string>("all");
  const [especialidadeSel, setEspecialidadeSel] = useState<string>("all");
  const [preceptorSel, setPreceptorSel] = useState<string>("all");

  // Dashboard Data from View
  const [viewData, setViewData] = useState<any[]>([]);

  // Carrega opções de filtros
  useEffect(() => {
    async function fetchFilters() {
      try {
        const [resU, resE, resP] = await Promise.all([
          supabase.from("unidades").select("id, nome").order("nome"),
          supabase.from("especialidades").select("id, nome").order("nome"),
          supabase.from("preceptores").select("id, nome").order("nome"),
        ]);

        if (resU.data) setUnidadesOpt(resU.data);
        if (resE.data) setEspecialidadesOpt(resE.data);
        if (resP.data) setPreceptoresOpt(resP.data);
      } catch (err) {
        console.error("Erro ao buscar filtros:", err);
      }
    }
    fetchFilters();
  }, []);

  // Busca dados principais e configurações
  const reloadDashboard = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setSyncStatus("syncing");

      try {
        // 1. Busca configurações (Limites)
        const { data: configData } = await supabase.from("configuracoes_sistema").select("*");

        let newLimitePreceptor = 4;
        let newLimiteUnidade = 20;

        if (configData) {
          const pConf = configData.find((c) => c.chave === "limite_alunos_preceptor");
          const uConf = configData.find((c) => c.chave === "limite_alunos_unidade");
          if (pConf) newLimitePreceptor = Number(pConf.valor);
          if (uConf) newLimiteUnidade = Number(uConf.valor);
        }

        setConfig({ limitePreceptor: newLimitePreceptor, limiteUnidade: newLimiteUnidade });

        // 2. Busca os dados da View
        let query = supabase.from("vw_dashboard_preceptores").select("*");

        if (unidadeSel !== "all") query = query.eq("unidade_id", unidadeSel);
        if (especialidadeSel !== "all") query = query.eq("especialidade_id", especialidadeSel);
        if (preceptorSel !== "all") query = query.eq("preceptor_id", preceptorSel);

        const { data, error } = await query;
        if (error) throw error;

        setViewData(data || []);
        setLastUpdate(new Date());
      } catch (err) {
        console.error("Erro ao buscar dados do dashboard:", err);
      } finally {
        setLoading(false);
        setSyncStatus("synced");
      }
    },
    [unidadeSel, especialidadeSel, preceptorSel],
  );

  useEffect(() => {
    reloadDashboard(true);
  }, [reloadDashboard]);

  // Supabase Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel("schema-db-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "alocacoes" }, (payload) => {
        console.log("Realtime update em alocacoes:", payload);
        reloadDashboard(false); // Atualiza dados sem loading state
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "configuracoes_sistema" },
        (payload) => {
          console.log("Realtime update em configurações:", payload);
          reloadDashboard(false);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Conectado ao Supabase Realtime");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [reloadDashboard]);

  // Derived Metrics & Chart Data
  const metrics = useMemo(() => {
    const alunosUnicos = new Set(viewData.map((d) => d.aluno));
    const preceptoresUnicos = new Set(viewData.map((d) => d.preceptor));
    const unidadesUnicas = new Set(viewData.map((d) => d.unidade));
    const totalHoras = viewData.reduce((acc, curr) => acc + (Number(curr.carga_horaria) || 0), 0);

    const alunosQtd = alunosUnicos.size;
    const preceptorQtd = preceptoresUnicos.size;
    const media = preceptorQtd > 0 ? (alunosQtd / preceptorQtd).toFixed(1) : "0";

    // Aggregations
    const preceptorMap: Record<
      string,
      { nome: string; especialidade: string; alunos: Set<string>; horas: number }
    > = {};
    const especialidadeMap: Record<string, Set<string>> = {};
    const unidadeMap: Record<string, Set<string>> = {};

    viewData.forEach((d) => {
      if (!preceptorMap[d.preceptor_id]) {
        preceptorMap[d.preceptor_id] = {
          nome: d.preceptor,
          especialidade: d.especialidade || "Geral",
          alunos: new Set(),
          horas: 0,
        };
      }
      preceptorMap[d.preceptor_id].alunos.add(d.aluno);
      preceptorMap[d.preceptor_id].horas += Number(d.carga_horaria) || 0;

      const espName = d.especialidade || "Sem Especialidade";
      if (!especialidadeMap[espName]) especialidadeMap[espName] = new Set();
      especialidadeMap[espName].add(d.aluno);

      const unitName = d.unidade || "Desconhecida";
      if (!unidadeMap[unitName]) unidadeMap[unitName] = new Set();
      unidadeMap[unitName].add(d.aluno);
    });

    const topPreceptores = Object.values(preceptorMap)
      .map((p) => ({
        nome: p.nome,
        especialidade: p.especialidade,
        alunosCount: p.alunos.size,
        horas: p.horas,
      }))
      .sort((a, b) => b.alunosCount - a.alunosCount)
      .slice(0, 10);

    const alunosPorEspecialidade = Object.entries(especialidadeMap)
      .map(([name, alunosSet]) => ({ name, value: alunosSet.size }))
      .sort((a, b) => b.value - a.value);

    const ocupacaoPorUnidade = Object.entries(unidadeMap)
      .map(([name, alunosSet]) => ({ unidade: name, alunos: alunosSet.size }))
      .sort((a, b) => b.alunos - a.alunos);

    // Alerts usando a única fonte de verdade (Dynamic config)
    const alertasPreceptores = Object.values(preceptorMap)
      .filter((p) => p.alunos.size > config.limitePreceptor)
      .map((p) => ({ nome: p.nome, especialidade: p.especialidade, alunos: p.alunos.size }))
      .sort((a, b) => b.alunos - a.alunos);

    const alertasUnidades = Object.entries(unidadeMap)
      .filter(([_, set]) => set.size > config.limiteUnidade)
      .map(([nome, set]) => ({ nome, alunos: set.size }))
      .sort((a, b) => b.alunos - a.alunos);

    return {
      alunosQtd,
      preceptorQtd,
      media,
      unidadesQtd: unidadesUnicas.size,
      totalHoras,
      topPreceptores,
      alunosPorEspecialidade,
      ocupacaoPorUnidade,
      alertasPreceptores,
      alertasUnidades,
    };
  }, [viewData, config]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background text-slate-900 dark:text-foreground -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* STATUS BAR (Feedback Visual) */}
        <div className="flex items-center justify-end gap-3 text-xs">
          {syncStatus === "syncing" ? (
            <span className="flex items-center gap-1.5 text-yellow-600 dark:text-yellow-400 font-medium bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded-full">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Atualizando...
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400 font-medium bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" /> Dados Sincronizados
            </span>
          )}
          <span className="text-slate-500 dark:text-slate-400 font-mono">
            Última atualização: {lastUpdate.toLocaleTimeString("pt-BR")}
          </span>
        </div>

        {/* HEADER & FILTERS */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#111827] p-5 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 mt-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="h-8 w-8 text-primary dark:text-[#4ade80]" />
              Dashboard Executivo
            </h1>
            <p className="text-sm text-slate-500 dark:text-white/60 mt-1">
              Visão consolidada da distribuição acadêmica e preceptoria da Afya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={unidadeSel} onValueChange={setUnidadeSel}>
              <SelectTrigger className="w-[180px] bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-900 dark:text-white">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white">
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {unidadesOpt.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={especialidadeSel} onValueChange={setEspecialidadeSel}>
              <SelectTrigger className="w-[180px] bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-900 dark:text-white">
                <SelectValue placeholder="Todas Especialidades" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white">
                <SelectItem value="all">Todas as Especialidades</SelectItem>
                {especialidadesOpt.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={preceptorSel} onValueChange={setPreceptorSel}>
              <SelectTrigger className="w-[180px] bg-slate-100 dark:bg-white/10 border-slate-200 dark:border-white/20 text-slate-900 dark:text-white">
                <SelectValue placeholder="Todos Preceptores" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#111827] text-slate-900 dark:text-white">
                <SelectItem value="all">Todos os Preceptores</SelectItem>
                {preceptoresOpt.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            icon={Users}
            value={loading ? "..." : metrics.alunosQtd}
            label="Alunos"
            hint="vinculados"
          />
          <Stat
            icon={Stethoscope}
            value={loading ? "..." : metrics.preceptorQtd}
            label="Preceptores"
            hint="com vínculos"
          />
          <Stat
            icon={Activity}
            value={loading ? "..." : metrics.media}
            label="Média"
            hint="Alunos/Preceptor"
            isRatio
          />
          <Stat
            icon={Building2}
            value={loading ? "..." : metrics.unidadesQtd}
            label="Unidades"
            hint="ativas com alunos"
          />
          <Stat
            icon={Clock}
            value={loading ? "..." : metrics.totalHoras}
            label="Horas"
            hint="carga horária alocada"
          />
        </div>

        {/* ALERTS SECTION */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Preceptors Alert */}
          <Card className="border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20 shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Alerta: Preceptores
              </CardTitle>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400">
                Acima de {config.limitePreceptor} Alunos
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-slate-500 dark:text-white/50 text-center py-2">
                  Carregando...
                </div>
              ) : metrics.alertasPreceptores.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {metrics.alertasPreceptores.map((p, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm bg-white dark:bg-[#111827] p-2 rounded border border-red-100 dark:border-red-900/30"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-white">{p.nome}</p>
                        <p className="text-xs text-slate-500 dark:text-white/60">
                          {p.especialidade}
                        </p>
                      </div>
                      <span className="font-bold text-red-600 dark:text-red-400">
                        {p.alunos} alunos
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-white/50 text-center py-4">
                  Nenhum preceptor acima do limite.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Units Alert */}
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900/50 dark:bg-orange-950/20 shadow-sm transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-bold text-orange-700 dark:text-orange-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Alerta: Unidades
              </CardTitle>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-orange-100 text-orange-600 dark:bg-orange-900/50 dark:text-orange-400">
                Acima de {config.limiteUnidade} Alunos
              </span>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-sm text-slate-500 dark:text-white/50 text-center py-2">
                  Carregando...
                </div>
              ) : metrics.alertasUnidades.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                  {metrics.alertasUnidades.map((u, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm bg-white dark:bg-[#111827] p-2 rounded border border-orange-100 dark:border-orange-900/30"
                    >
                      <span className="font-medium text-slate-800 dark:text-white truncate">
                        {u.nome}
                      </span>
                      <span className="font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">
                        {u.alunos} alunos
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-slate-500 dark:text-white/50 text-center py-4">
                  Nenhuma unidade sobrecarregada.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CHARTS ROW 1 */}
        <div className="grid gap-4 lg:grid-cols-3 pb-4">
          {/* Top 10 Preceptors */}
          <Card className="card-glow shadow-sm border-white/10 dark:bg-white/5 bg-white lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 dark:text-white font-semibold">
                Ranking de Preceptores (Top 10)
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Distribuição de alunos e carga horária por preceptor
              </p>
            </CardHeader>
            <CardContent className="h-80">
              {loading ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Carregando gráfico...
                </div>
              ) : metrics.topPreceptores.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhum dado encontrado para os filtros selecionados.
                </div>
              ) : (
                <ClientOnly>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.topPreceptores}
                      layout="vertical"
                      margin={{ left: 20, right: 20, top: 0, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(100,116,139,0.1)"
                        horizontal={true}
                        vertical={false}
                      />
                      <XAxis
                        type="number"
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={120}
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          borderColor: "#374151",
                          borderRadius: "0.5rem",
                          color: "#FFFFFF",
                          boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                        }}
                        itemStyle={{ color: "#E2E8F0" }}
                        labelStyle={{ color: "#94A3B8", fontWeight: "bold", marginBottom: "4px" }}
                        formatter={(value: any, name: string) => [
                          value,
                          name === "alunosCount" ? "Qtd Alunos" : "Carga Horária (h)",
                        ]}
                      />
                      <Bar
                        dataKey="alunosCount"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                        barSize={12}
                        name="Qtd Alunos"
                      />
                      <Bar
                        dataKey="horas"
                        fill="#22c55e"
                        radius={[0, 4, 4, 0]}
                        barSize={12}
                        name="Carga Horária (h)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientOnly>
              )}
            </CardContent>
          </Card>

          {/* Students by Specialty */}
          <Card className="card-glow shadow-sm border-white/10 dark:bg-white/5 bg-white">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 dark:text-white font-semibold">
                Alunos por Especialidade
              </CardTitle>
            </CardHeader>
            <CardContent className="h-80 flex flex-col justify-center">
              {loading ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Carregando gráfico...
                </div>
              ) : metrics.alunosPorEspecialidade.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Sem dados
                </div>
              ) : (
                <ClientOnly>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.alunosPorEspecialidade}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {metrics.alunosPorEspecialidade.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          borderColor: "#374151",
                          borderRadius: "0.5rem",
                          color: "#FFFFFF",
                        }}
                        itemStyle={{ color: "#E2E8F0" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ClientOnly>
              )}
              {/* Custom Legend */}
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 overflow-y-auto max-h-24 custom-scrollbar px-2">
                {metrics.alunosPorEspecialidade.map((entry, index) => (
                  <div
                    key={index}
                    className="flex items-center text-xs text-slate-600 dark:text-slate-300 truncate"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full mr-2 shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    ></div>
                    <span className="truncate">{entry.name}</span>
                    <span className="ml-auto font-medium">{entry.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* CHARTS ROW 2 */}
        <div className="pb-10">
          <Card className="card-glow shadow-sm border-white/10 dark:bg-white/5 bg-white">
            <CardHeader>
              <CardTitle className="text-base text-slate-900 dark:text-white font-semibold">
                Ocupação de Alunos por Unidade de Saúde
              </CardTitle>
              <p className="text-xs text-slate-500 dark:text-white/60">
                Volume total de alunos em cada campo de prática
              </p>
            </CardHeader>
            <CardContent className="h-80">
              {loading ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  Carregando gráfico...
                </div>
              ) : metrics.ocupacaoPorUnidade.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  Nenhum dado encontrado para os filtros selecionados.
                </div>
              ) : (
                <ClientOnly>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={metrics.ocupacaoPorUnidade}
                      margin={{ left: -20, right: 10, top: 10, bottom: 10 }}
                    >
                      <defs>
                        <linearGradient id="colorOcupacao" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(100,116,139,0.1)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="unidade"
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8" }}
                      />
                      <YAxis
                        stroke="#64748B"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#94a3b8" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#1F2937",
                          borderColor: "#374151",
                          borderRadius: "0.5rem",
                          color: "#FFFFFF",
                        }}
                        itemStyle={{ color: "#E2E8F0", fontWeight: "bold" }}
                        labelStyle={{ color: "#94A3B8" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="alunos"
                        name="Total de Alunos"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        fillOpacity={1}
                        fill="url(#colorOcupacao)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </ClientOnly>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(156, 163, 175, 0.3);
          border-radius: 20px;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>
    </div>
  );
}
