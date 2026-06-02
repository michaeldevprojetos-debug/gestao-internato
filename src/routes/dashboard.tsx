import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from "recharts";
import { ClientOnly } from "@/components/client-only";
import {
  UNIDADES, totalAlunosAtivos, totalPreceptores, totalHorasMensais,
} from "@/lib/mock-data";
import { Users, Stethoscope, Clock, Building2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Preceptoria" }] }),
  component: Dashboard,
});

const totalUnidades = UNIDADES.length;

const atividadesPorPeriodo = [
  { semana: "01–07", atividades: 110 },
  { semana: "08–14", atividades: 225 },
  { semana: "15–21", atividades: 195 },
  { semana: "22–28", atividades: 295 },
  { semana: "29–31", atividades: 230 },
];

const cargaPorSemestre = [
  { name: "9º Período",  value: 450, color: "oklch(0.4254 0.1159 144.3078)" },
  { name: "10º Período", value: 360, color: "oklch(0.5234 0.1347 144.1672)" },
  { name: "11º Período", value: 270, color: "oklch(0.6731 0.1624 144.2083)" },
  { name: "12º Período", value: 165, color: "oklch(0.8000 0.1400 144.0000)" },
];
const totalCarga = cargaPorSemestre.reduce((s, c) => s + c.value, 0);

const atividadesRecentes = [
  { titulo: "Clínica Médica — Hospital São Lucas", preceptor: "Dr. João Silva", alunos: 8, data: "20/05/2024" },
  { titulo: "Pediatria — Hospital Infantil",       preceptor: "Dra. Ana Costa", alunos: 6, data: "20/05/2024" },
  { titulo: "Ginecologia — Maternidade Vida",      preceptor: "Dr. Lucas Almeida", alunos: 7, data: "19/05/2024" },
];
const proximasAtividades = [
  { titulo: "Clínica Cirúrgica — Hospital Central", preceptor: "Dr. Paulo Mendes", alunos: 10, data: "22/05" },
  { titulo: "Medicina da Família — UBS Centro",     preceptor: "Dra. Fernanda Lima", alunos: 6,  data: "23/05" },
  { titulo: "Urgência e Emergência — UPA Norte",    preceptor: "Dr. Rafael Souza", alunos: 7,  data: "24/05" },
];

function Stat({ icon: Icon, value, label, hint }: { icon: any; value: string; label: string; hint?: string }) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <Icon className="h-6 w-6" />
        </div>
        <div className="leading-tight">
          <p className="text-3xl font-bold text-foreground">{value}</p>
          <p className="text-sm font-medium text-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bem-vindo(a), Administrador!</h1>
        <p className="text-sm text-muted-foreground">Acompanhe os principais indicadores da preceptoria.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat icon={Stethoscope} value={String(totalPreceptores)} label="Preceptores" hint="ativos" />
        <Stat icon={Users}       value={String(totalAlunosAtivos)} label="Alunos" hint="ativos" />
        <Stat icon={Building2}   value={String(totalUnidades)} label="Hospitais / Locais" hint="cadastrados" />
        <Stat icon={Clock}       value={`${totalHorasMensais}`} label="Horas Lançadas" hint="este mês" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Atividades por Período</CardTitle>
            <Select defaultValue="mes">
              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Este mês</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="h-72">
            <ClientOnly>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={atividadesPorPeriodo} margin={{ left: -10, right: 10, top: 10 }}>
                <defs>
                  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="semana" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Area type="monotone" dataKey="atividades" stroke="var(--primary)" strokeWidth={2.5} fill="url(#areaFill)" />
              </AreaChart>
            </ResponsiveContainer>
            </ClientOnly>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader><CardTitle className="text-base">Carga Horária por Semestre</CardTitle></CardHeader>
          <CardContent className="h-72">
            <div className="grid h-full grid-cols-2 items-center gap-4">
              <ClientOnly>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cargaPorSemestre} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} stroke="none">
                    {cargaPorSemestre.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
              </ClientOnly>
              <div className="space-y-2 text-sm">
                {cargaPorSemestre.map((c) => (
                  <div key={c.name} className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-medium">{c.value}h</span>
                  </div>
                ))}
                <div className="mt-3 border-t pt-2 text-right font-semibold text-primary">
                  Total: {totalCarga.toLocaleString("pt-BR")}h
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60 shadow-sm">
          <CardHeader><CardTitle className="text-base">Atividades Recentes</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {atividadesRecentes.map((a) => (
              <div key={a.titulo} className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">Preceptor: {a.preceptor} · Alunos: {a.alunos}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">{a.data}</span>
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-primary">Concluída</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Próximas Atividades</CardTitle>
            <button className="text-xs font-medium text-primary hover:underline">Ver todas</button>
          </CardHeader>
          <CardContent className="space-y-3">
            {proximasAtividades.map((a) => (
              <div key={a.titulo} className="flex items-center justify-between gap-3 rounded-md border border-border/60 p-3">
                <div>
                  <p className="text-sm font-medium">{a.titulo}</p>
                  <p className="text-xs text-muted-foreground">Preceptor: {a.preceptor} · Alunos: {a.alunos}</p>
                </div>
                <span className="text-xs font-medium text-foreground">{a.data}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
