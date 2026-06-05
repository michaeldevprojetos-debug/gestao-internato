const fs = require("fs");

let code = fs.readFileSync("src/routes/hospitais.tsx", "utf8");

// 1. Update PreceptorSimple
code = code.replace(
  /type PreceptorSimple = \{[\s\S]*?\};/,
  `type PreceptorSimple = {
  id: string;
  nome: string;
  especialidade: string | null;
  units?: string[];
};`,
);

// 2. Move setAllPreceptores after alocacoes logic in fetchLocais
code = code.replace(
  /setAllPreceptores\(\(preceptoresData \?\? \[\]\) as PreceptorSimple\[\]\);/g,
  "",
);

// Add setAllPreceptores at the end of fetchLocais logic
const setAllPreceptoresCode = `
      setAllPreceptores(
        (preceptoresData ?? []).map((p: any) => ({
          id: p.id,
          nome: p.nome,
          especialidade: p.especialidade,
          units: Array.from(preceptorUnits.get(p.id) || []),
        }))
      );
`;

code = code.replace(
  /setLocalRows\(newLocalRows\);/,
  `setLocalRows(newLocalRows);${setAllPreceptoresCode}`,
);

// 3. Fix otherLocal using units
code = code.replace(
  /const precUnits = preceptorUnits\?\.get\(p\.id\);\s*const hasOtherUnit = precUnits && Array\.from\(precUnits\)\.some\(uId => uId !== local\?\.id\);\s*const otherLocal = hasOtherUnit;/g,
  `const otherLocal = p.units && p.units.length > 0 && p.units.some(uId => uId !== local?.id);`,
);

fs.writeFileSync("src/routes/hospitais.tsx", code);
console.log("Fixed PreceptorSimple units");
