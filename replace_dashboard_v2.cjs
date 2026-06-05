const fs = require('fs');

let code = fs.readFileSync('src/routes/dashboard.tsx', 'utf8');

// Ensure useQuery is imported
if (!code.includes('useQuery')) {
  code = code.replace(
    /import \{ useEffect, useState, useMemo, useCallback \} from \"react\";/,
    `import { useState, useMemo } from "react";\nimport { useQuery, useQueryClient } from "@tanstack/react-query";`
  );
} else if (!code.includes('useQueryClient')) {
    code = code.replace(
        /import \{ useQuery \} from \"@tanstack\/react-query\";/,
        `import { useQuery, useQueryClient } from "@tanstack/react-query";`
    );
}

// Remove old state and add useQuery
const oldStateRegex = /const \[loading, setLoading\] = useState\(true\);[\s\S]*?const filteredAloc = useMemo\(\(\) => \{/m;

const queryHookCode = `  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const [uRes, eRes, pRes] = await Promise.all([
        supabase.from("unidades").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("especialidades").select("id, nome").order("nome"),
        supabase.from("preceptores").select("id, nome").eq("ativo", true).order("nome"),
      ]);
      
      const { data: viewData, error } = await supabase
        .from("vw_dashboard_preceptores")
        .select("*");
        
      if (error) throw error;
      
      return {
        unidades: uRes.data || [],
        especialidades: eRes.data || [],
        preceptores: pRes.data || [],
        alocacoes: viewData || []
      };
    }
  });

  const alocacoes = dashboardData?.alocacoes || [];
  const unidadesFiltro = dashboardData?.unidades || [];
  const especialidadesFiltro = dashboardData?.especialidades || [];
  const preceptoresFiltro = dashboardData?.preceptores || [];
  const horasConcluidas = 0; // Se necessário, re-implementar a lógica de agenda separadamente, ou remover do dashboard.
  const lastUpdate = new Date(); // Para simplificar a UI

  const filteredAloc = useMemo(() => {`;

code = code.replace(oldStateRegex, queryHookCode);

// Fix the useMemo for KPIs to use the new view columns
const oldKpiRegex = /let totalAlunosSum = 0;[\s\S]*?\}, \[filteredAloc, limitePreceptor, limiteUnidade\]\);/m;

const newKpiCode = `    const alunosSet = new Set<string>();
    const preceptoresSet = new Set<string>();
    const unidadesSet = new Set<string>();
    
    const preceptorMap = new Map<string, { nome: string; count: Set<string> }>();
    const especialidadeMap = new Map<string, Set<string>>();
    const unidadeMap = new Map<string, { nome: string; count: Set<string> }>();

    for (const a of filteredAloc) {
      if (a.aluno) alunosSet.add(a.aluno);
      if (a.preceptor_id) preceptoresSet.add(a.preceptor_id);
      if (a.unidade_id) unidadesSet.add(a.unidade_id);

      if (a.preceptor_id) {
        if (!preceptorMap.has(a.preceptor_id)) {
          preceptorMap.set(a.preceptor_id, { nome: a.preceptor || "Desconhecido", count: new Set() });
        }
        if (a.aluno) preceptorMap.get(a.preceptor_id)!.count.add(a.aluno);
      }

      const espNome = a.especialidade || "Sem Especialidade";
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
      .map((p) => ({ preceptor: p.nome, alunos: p.count.size }))
      .sort((a, b) => b.alunos - a.alunos)
      .slice(0, 10);

    const eData = Array.from(especialidadeMap.entries())
      .map(([name, set]) => ({ name, value: set.size }))
      .sort((a, b) => b.value - a.value);

    const aPrec = Array.from(preceptorMap.values()).filter(p => p.count.size > limitePreceptor).map(p => ({ nome: p.nome, alunos: p.count.size }));
    const aUni = Array.from(unidadeMap.values()).filter(u => u.count.size > limiteUnidade).map(u => ({ nome: u.nome, alunos: u.count.size }));

    return {
      totalAlunos: alunosSet.size,
      totalPreceptores: preceptoresSet.size,
      totalUnidades: unidadesSet.size,
      rankingData: rData,
      especialidadeData: eData,
      alertasPreceptor: aPrec,
      alertasUnidade: aUni
    };
  }, [filteredAloc, limitePreceptor, limiteUnidade]);`;

code = code.replace(oldKpiRegex, newKpiCode);

fs.writeFileSync('src/routes/dashboard.tsx', code);
console.log('Replaced dashboard.tsx logic for React Query and new view schema');
