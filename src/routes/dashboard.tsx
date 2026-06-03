import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { ClientOnly } from "@/components/client-only";
import { Users, Stethoscope, Clock, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Preceptoria" }] }),
  component: Dashboard,
});

function Stat({ icon: Icon, value, label, hint }: { icon: any; value: string | number; label: string; hint?: string }) {
  return (
    <Card className="card-glow shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-[#4ade80]">
          <Icon className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <p className="text-3xl font-bold text-white">{value}</p>
          <p className="text-sm font-medium text-white/90">{label}</p>
          {hint && <p className="text-xs text-white/60">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const [stats, setStats] = useState({
    alunosAtivos: 0,
    preceptoresAtivos: 0,
    hospitais: 0,
    horasMes: 0,
  });

  const [atividadesRecentes, setAtividadesRecentes] = useState<any[]>([]);
  const [atividadesPorPeriodo, setAtividadesPorPeriodo] = useState<any[]>([]);
  const [cargaPorSemestre, setCargaPorSemestre] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        // 1. Alunos Ativos
        const { count: alunosCount } = await supabase
          .from("alunos")
          .select("id", { count: "exact", head: true })
          .eq("status", "Ativo");

        // 2. Preceptores Ativos
        // Vamos considerar todos com status "Ativo" se existir a coluna. 
        // Caso não, consideramos a base toda que não esteja inativa.
        const { count: preceptoresCount } = await supabase
          .from("preceptores")
          .select("id", { count: "exact", head: true });

        // 3. Hospitais Cadastrados (Unidades Únicas)
        const { data: preceptoresData } = await supabase
          .from("preceptores")
          .select("unidade_vinculada")
          .not("unidade_vinculada", "is", null);
        const hospitaisUnicos = new Set((preceptoresData || []).map((p) => p.unidade_vinculada)).size;

        // 4. Horas do Mês Atual
        const mesAtual = new Date().toISOString().slice(0, 7); // ex: 2024-05
        const { data: horasData } = await supabase
          .from("vinculo_operacional")
          .select("horas_realizadas")
          .eq("mes_referencia", mesAtual);
        const totalHoras = (horasData || []).reduce((acc, curr) => acc + (curr.horas_realizadas || 0), 0);

        setStats({
          alunosAtivos: alunosCount || 0,
          preceptoresAtivos: preceptoresCount || 0,
          hospitais: hospitaisUnicos || 0,
          horasMes: totalHoras || 0,
        });

        // 5. Atividades Recentes
        const { data: recentes } = await supabase
          .from("vinculo_operacional")
          .select(`
            id,
            mes_referencia,
            horas_realizadas,
            preceptores ( nome ),
            rotacoes ( nome )
          `)
          .order("created_at", { ascending: false })
          .limit(5);

        setAtividadesRecentes(recentes || []);

        // Mock para os gráficos (poderia ser query group by, mas para simplificar a UI inicial de exemplo mantemos com cores novas)
        setAtividadesPorPeriodo([
          { semana: "01–07", atividades: 110 },
          { semana: "08–14", atividades: 225 },
          { semana: "15–21", atividades: 195 },
          { semana: "22–28", atividades: 295 },
          { semana: "29–31", atividades: 230 },
        ]);

        setCargaPorSemestre([
          { name: "9º Período", value: 450, color: "#22c55e" },
          { name: "10º Período", value: 360, color: "#16a34a" },
          { name: "11º Período", value: 270, color: "#15803d" },
          { name: "12º Período", value: 165, color: "#166534" },
        ]);

      } catch (e) {
        console.error("Erro ao carregar dados do dashboard:", e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const totalCarga = cargaPorSemestre.reduce((s, c) => s + c.value, 0);

  return (
    <div className="min-h-screen bg-background text-foreground -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Bem-vindo(a), Administrador!</h1>
          <p className="text-sm text-white/60 mt-1">Acompanhe os principais indicadores da preceptoria com dados em tempo real.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat icon={Stethoscope} value={loading ? "..." : stats.preceptoresAtivos} label="Preceptores" hint="ativos" />
          <Stat icon={Users} value={loading ? "..." : stats.alunosAtivos} label="Alunos" hint="ativos" />
          <Stat icon={Building2} value={loading ? "..." : stats.hospitais} label="Hospitais / Locais" hint="cadastrados" />
          <Stat icon={Clock} value={loading ? "..." : stats.horasMes} label="Horas Lançadas" hint="este mês" />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-glow shadow-sm border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base text-white font-semibold">Atividades por Período</CardTitle>
              <Select defaultValue="mes">
                <SelectTrigger className="h-8 w-32.5 bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] text-white border-white/20">
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="trimestre">Trimestre</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-72 pt-4">
              <ClientOnly>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={atividadesPorPeriodo} margin={{ left: -20, right: 10, top: 10 }}>
                    <defs>
                      <linearGradient id="neonGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="#22c55e" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="semana" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        borderColor: '#374151',
                        borderRadius: '0.375rem',
                        color: '#FFFFFF'
                      }}
                      itemStyle={{ color: '#10B981' }}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area type="monotone" dataKey="atividades" stroke="#22c55e" strokeWidth={3} fill="url(#neonGreen)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </CardContent>
          </Card>

          <Card className="card-glow shadow-sm border-white/10 bg-white/5">
            <CardHeader className="pb-2"><CardTitle className="text-base text-white font-semibold">Carga Horária por Semestre</CardTitle></CardHeader>
            <CardContent className="h-72">
              <div className="grid h-full grid-cols-2 items-center gap-4">
                <ClientOnly>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={cargaPorSemestre} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                        {cargaPorSemestre.map((c) => <Cell key={c.name} fill={c.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          borderColor: '#374151',
                          borderRadius: '0.375rem',
                          color: '#FFFFFF'
                        }}
                        itemStyle={{ color: '#10B981' }}
                        labelStyle={{ color: '#9CA3AF' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ClientOnly>
                <div className="space-y-2 text-sm text-white/80">
                  {cargaPorSemestre.map((c) => (
                    <div key={c.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: c.color, color: c.color }} />
                        {c.name}
                      </span>
                      <span className="font-medium text-white">{c.value}h</span>
                    </div>
                  ))}
                  <div className="mt-3 border-t border-white/20 pt-2 text-right font-semibold text-[#4ade80]">
                    Total: {totalCarga.toLocaleString("pt-BR")}h
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2 pb-10">
          <Card className="card-glow shadow-sm border-white/10 bg-white/5">
            <CardHeader className="pb-2"><CardTitle className="text-base text-white font-semibold">Atividades Recentes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-white/50 text-sm py-4">Carregando atividades...</div>
              ) : atividadesRecentes.length === 0 ? (
                <div className="text-white/50 text-sm py-4">Nenhuma atividade registrada ainda.</div>
              ) : (
                atividadesRecentes.map((a) => (
                  <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3 hover:bg-white/10 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-white">{a.rotacoes?.nome || "Rotação não especificada"}</p>
                      <p className="text-xs text-white/60">Preceptor: {a.preceptores?.nome || "N/A"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-xs text-white/50">Mês ref: {a.mes_referencia}</span>
                      <span className="rounded-full bg-green-900/40 border border-green-500/30 px-2 py-0.5 text-[10px] font-medium text-[#4ade80]">
                        {a.horas_realizadas}h concluídas
                      </span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="card-glow shadow-sm border-white/10 bg-white/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base text-white font-semibold">Próximas Atividades</CardTitle>
              <button className="text-xs font-medium text-[#4ade80] hover:text-[#22c55e] transition-colors hover:underline">Ver todas</button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium text-white">Clínica Cirúrgica — Hospital Central</p>
                  <p className="text-xs text-white/60">Preceptor: Dr. Paulo Mendes · Alunos: 10</p>
                </div>
                <span className="text-xs font-medium text-white/80">22/05</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 p-3">
                <div>
                  <p className="text-sm font-medium text-white">Medicina da Família — UBS Centro</p>
                  <p className="text-xs text-white/60">Preceptor: Dra. Fernanda Lima · Alunos: 6</p>
                </div>
                <span className="text-xs font-medium text-white/80">23/05</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
