const fs = require('fs');
let code = fs.readFileSync('src/routes/hospitais.tsx', 'utf8');

code = code.replace(
  /supabase\.from\(\"vinculo_operacional\"\)/g,
  'supabase.from(\"alocacoes\")'
);

code = code.replace(
  /select\(\"id, preceptor_id, aluno_id, quantidade_alunos, alunos \\( nome, semestre \\)\"\)/g,
  'select(\"id, preceptor_id, aluno_id, alunos ( nome, semestre )\")'
);

const insertBlockRegex = /const vinculosToInsert: Array<\{[\s\S]*?\}> = \[\];[\s\S]*?if \(vinculosToInsert\.length > 0\) \{[\s\S]*?supabase\.from\(\"alocacoes\"\)\.insert\(vinculosToInsert\);[\s\S]*?\}/;

const newBlock = `const alocacoesToInsert: Array<{
        preceptor_id: string;
        aluno_id: string | null;
        unidade_id: string;
        data_inicio: string;
        data_fim: string | null;
        hora_inicio: string | null;
        hora_fim: string | null;
      }> = [];

      for (const tag of selectedPreceptores) {
        const key = tag.type === "existing" ? tag.id : tag.tempId;
        const realPreceptorId = tag.type === "existing" ? tag.id : tempIdToRealId.get(tag.tempId);
        if (!realPreceptorId) continue;

        const selectedStudents = preceptorAlunos[key] ?? [];
        if (selectedStudents.length > 0) {
          for (const alunoId of selectedStudents) {
            alocacoesToInsert.push({
              preceptor_id: realPreceptorId,
              aluno_id: alunoId,
              unidade_id: localId,
              data_inicio: dataInicio || new Date().toISOString().split("T")[0],
              data_fim: dataFim || null,
              hora_inicio: horaInicio || null,
              hora_fim: horaFim || null
            });
          }
        } else {
            alocacoesToInsert.push({
              preceptor_id: realPreceptorId,
              aluno_id: null,
              unidade_id: localId,
              data_inicio: dataInicio || new Date().toISOString().split("T")[0],
              data_fim: dataFim || null,
              hora_inicio: horaInicio || null,
              hora_fim: horaFim || null
            });
        }
      }

      if (alocacoesToInsert.length > 0) {
        const { error } = await supabase.from("alocacoes").insert(alocacoesToInsert);
        if (error) throw error;
      }`;

code = code.replace(insertBlockRegex, newBlock);

fs.writeFileSync('src/routes/hospitais.tsx', code);
console.log('Replaced');
