export const ESPECIALIDADES = [
  "Pediatria",
  "APS",
  "GO",
  "Clínica Médica",
  "Clínica Cirurgia",
  "Saúde Coletiva",
] as const;

export const UNIDADES = [
  "Obras Sociais Irmã Dulce",
  "Hospital Municipal",
  "Martagão Gesteira",
  "Hospital Manoel Victorino",
  "Maternidade José Maria de Magalhães",
  "UPA Marback",
  "CAPS Águas Claras",
  "Clínica Escola Civil Trade",
  "2 de Julho",
  "Menandro de Farias",
  "Núcleo Médico Ocular",
  "Gestão Metropolitano",
  "USF Arraial do Retiro",
  "USF Beira Mangue",
  "USF Alto do Coquerinho",
  "USF Estrada da Cocisa",
  "USF Vista Alegre",
  "UBS Periperi",
  "USF Alto do Congo",
  "USF Areal",
  "USF São Gonçalo",
  "UBS Ramiro de Azevedo",
  "UPA Pirajá",
  "UBS Barbalho",
  "Atendimento Móvel de Urgência",
  "PAP",
  "CAPS São Caetano Valeria",
  "CAPS Liberdade",
  "CAPS Maria Celia da Rocha",
  "Maternidade Regional de Camaçari",
] as const;

export const SEMESTRES = ["9º", "10º", "11º", "12º"] as const;
export const TIPOS_CONTRATO = ["CLT", "PJ", "Bolsa", "Voluntário"] as const;

export const ROTACOES = [
  { id: "r1", nome: "Pediatria", cargaHoraria: 240 },
  { id: "r2", nome: "APS", cargaHoraria: 200 },
  { id: "r3", nome: "GO", cargaHoraria: 220 },
  { id: "r4", nome: "Clínica Médica", cargaHoraria: 260 },
  { id: "r5", nome: "Clínica Cirurgia", cargaHoraria: 260 },
  { id: "r6", nome: "Saúde Coletiva", cargaHoraria: 180 },
];

const nomesPreceptores = [
  "Dra. Ana Carvalho",
  "Dr. Bruno Lima",
  "Dra. Carla Souza",
  "Dr. Diego Mendes",
  "Dra. Eliana Reis",
  "Dr. Fábio Nogueira",
  "Dra. Gabriela Pinto",
  "Dr. Henrique Alves",
  "Dra. Isabela Costa",
  "Dr. João Pedro Ramos",
  "Dra. Karla Vieira",
  "Dr. Lucas Andrade",
];

export const PRECEPTORES = nomesPreceptores.map((nome, i) => ({
  id: `p${i + 1}`,
  nome,
  especialidade: ESPECIALIDADES[i % ESPECIALIDADES.length],
  unidade: UNIDADES[i % UNIDADES.length],
  tipoContrato: TIPOS_CONTRATO[i % TIPOS_CONTRATO.length],
  valorHora: 80 + (i % 6) * 25,
}));

const nomesAlunos = [
  "Aline Barreto",
  "Bernardo Tavares",
  "Camila Freitas",
  "Daniel Rocha",
  "Elisa Monteiro",
  "Felipe Cardoso",
  "Giovana Lopes",
  "Heitor Pacheco",
  "Iara Nunes",
  "Júlio Sampaio",
  "Larissa Moura",
  "Marcos Teixeira",
  "Natália Vasconcelos",
  "Otávio Brandão",
  "Patrícia Guimarães",
  "Rafael Siqueira",
  "Sofia Bezerra",
  "Thiago Macedo",
  "Vanessa Ribeiro",
  "Wagner Castro",
  "Yara Aragão",
  "Zélia Cordeiro",
  "André Filgueiras",
  "Beatriz Holanda",
];

export const ALUNOS = nomesAlunos.map((nome, i) => ({
  id: `a${i + 1}`,
  nome,
  semestre: SEMESTRES[i % SEMESTRES.length],
  status: i % 9 === 0 ? "Inativo" : "Ativo",
}));

export const VINCULOS = ALUNOS.flatMap((aluno, i) => {
  const preceptor = PRECEPTORES[i % PRECEPTORES.length];
  const horas = 40 + (i % 8) * 10;
  return [
    {
      id: `v${i + 1}`,
      mesReferencia: ["2025-09", "2025-10", "2025-11"][i % 3],
      aluno: aluno.nome,
      semestre: aluno.semestre,
      especialidade: preceptor.especialidade,
      unidade: preceptor.unidade,
      preceptor: preceptor.nome,
      horas,
      valorHora: preceptor.valorHora,
      custoTotal: horas * preceptor.valorHora,
    },
  ];
});

export const totalAlunosAtivos = ALUNOS.filter((a) => a.status === "Ativo").length;
export const totalPreceptores = PRECEPTORES.length;
export const totalHorasMensais = VINCULOS.reduce((s, v) => s + v.horas, 0);
export const custoTotalMensal = VINCULOS.reduce((s, v) => s + v.custoTotal, 0);
export const mediaAlunosPorPreceptor = +(totalAlunosAtivos / totalPreceptores).toFixed(1);
export const custoMedioPorAluno = Math.round(custoTotalMensal / totalAlunosAtivos);

export const custoPorPreceptor = PRECEPTORES.map((p) => ({
  nome: p.nome.replace(/^(Dra?\.\s)/, ""),
  custo: VINCULOS.filter((v) => v.preceptor === p.nome).reduce((s, v) => s + v.custoTotal, 0),
}))
  .sort((a, b) => b.custo - a.custo)
  .slice(0, 8);

export const alunosPorUnidade = UNIDADES.map((u) => ({
  unidade: u.length > 18 ? u.slice(0, 18) + "…" : u,
  alunos: VINCULOS.filter((v) => v.unidade === u).length,
})).sort((a, b) => b.alunos - a.alunos);

export const distribuicaoFinanceira = ESPECIALIDADES.map((e) => ({
  name: e,
  value: VINCULOS.filter((v) => v.especialidade === e).reduce((s, v) => s + v.custoTotal, 0),
}));

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
