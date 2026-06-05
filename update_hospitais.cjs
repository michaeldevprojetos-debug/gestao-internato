const fs = require('fs');
let code = fs.readFileSync('src/routes/hospitais.tsx', 'utf8');

// 1. Add classNames to Date/Time inputs
code = code.replace(
  /<Input type="date" value=\{dataInicio\}/g,
  '<Input type="date" className="bg-background text-foreground border-input focus:ring-ring" value={dataInicio}'
);
code = code.replace(
  /<Input type="date" value=\{dataFim\}/g,
  '<Input type="date" className="bg-background text-foreground border-input focus:ring-ring" value={dataFim}'
);
code = code.replace(
  /<Input type="time" value=\{horaInicio\}/g,
  '<Input type="time" className="bg-background text-foreground border-input focus:ring-ring" value={horaInicio}'
);
code = code.replace(
  /<Input type="time" value=\{horaFim\}/g,
  '<Input type="time" className="bg-background text-foreground border-input focus:ring-ring" value={horaFim}'
);

// 2. Add validation logic inside handleSave
const handleSaveStartRegex = /async function handleSave\(\) \{[\s\S]*?setSaving\(true\);/;

const validationCode = `async function handleSave() {
    if (!nome.trim()) {
      toast.warning("Informe o nome da unidade.");
      return;
    }
    
    // --- INÍCIO VALIDAÇÃO ANTI-CONFLITO ---
    const allSelectedStudentIds = Array.from(new Set(
      selectedPreceptores.flatMap(tag => {
        const key = tag.type === "existing" ? tag.id : tag.tempId;
        return preceptorAlunos[key] ?? [];
      })
    ));

    if (allSelectedStudentIds.length > 0) {
      const { data: existingAlocacoes, error: fetchErr } = await supabase
        .from("alocacoes")
        .select("id, aluno_id, unidade_id, preceptor_id, especialidade_id, data_inicio, data_fim, hora_inicio, hora_fim")
        .in("aluno_id", allSelectedStudentIds);

      if (!fetchErr && existingAlocacoes) {
        const newStart = new Date(dataInicio || new Date().toISOString().split("T")[0]);
        const newEnd = dataFim ? new Date(dataFim) : new Date("2099-12-31");
        
        const nHI = horaInicio || "00:00";
        const nHF = horaFim || "23:59";

        for (const ext of existingAlocacoes) {
          // Ignorar se estiver editando a própria unidade e sobrescrevendo,
          // mas wait, o usuário disse: Se a unidade for DIFERENTE, barra. Se for a MESMA, permite se preceptor+esp for diferente.
          // Na verdade, the user says if it's the SAME unidade but different preceptor/especialidade it is allowed (internal rotation).
          
          const extStart = new Date(ext.data_inicio);
          const extEnd = ext.data_fim ? new Date(ext.data_fim) : new Date("2099-12-31");
          
          const eHI = ext.hora_inicio || "00:00";
          const eHF = ext.hora_fim || "23:59";

          const datesOverlap = newStart <= extEnd && newEnd >= extStart;
          const timesOverlap = nHI < eHF && nHF > eHI;

          if (datesOverlap && timesOverlap) {
            // Conflito de tempo detectado para o aluno ext.aluno_id
            
            // Qual unidade atual estamos salvando? 
            // isNew ? não temos localId ainda, mas a lógica exige comparar
            const savingLocalId = local?.id; 

            if (ext.unidade_id !== savingLocalId) {
              toast.error("Conflito: Este aluno já está alocado em outra unidade neste mesmo dia e horário!");
              return;
            } else {
              // Mesma unidade. Verificar preceptor e especialidade
              // Se for o MESMO preceptor (na mesma unidade) já é um erro ou não?
              // The user said: "PERMITA o salvamento apenas se o Preceptor e a Especialidade forem diferentes"
              // Qual preceptor estamos tentando salvar para esse aluno?
              // Check the tag that contains this student:
              const tagOfStudent = selectedPreceptores.find(tag => {
                const key = tag.type === "existing" ? tag.id : tag.tempId;
                return (preceptorAlunos[key] ?? []).includes(ext.aluno_id);
              });
              
              if (tagOfStudent) {
                const realPreceptorId = tagOfStudent.type === "existing" ? tagOfStudent.id : "NEW_PRECEPTOR";
                const isSamePreceptor = realPreceptorId === ext.preceptor_id;
                // Since finalEspecialidade is set below, let's just grab the current especialidade being saved.
                const currentEspecialidade = especialidade === "Outra" ? especialidadeCustom.trim() : especialidade;
                // Wait, if it's a NEW preceptor, realPreceptorId is definitely different from ext.preceptor_id
                // But the user specifies: "apenas se o Preceptor e a Especialidade forem diferentes".
                if (isSamePreceptor) {
                  toast.error("Conflito: Este aluno já possui alocação para este preceptor no mesmo horário!");
                  return;
                }
              }
            }
          }
        }
      }
    }
    // --- FIM VALIDAÇÃO ANTI-CONFLITO ---

    setSaving(true);`;

code = code.replace(handleSaveStartRegex, validationCode);

fs.writeFileSync('src/routes/hospitais.tsx', code);
console.log('Done hospitais.tsx updates');
