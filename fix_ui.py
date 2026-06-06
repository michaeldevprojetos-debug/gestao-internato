import re

with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Add isDateTimeValid
code = code.replace(
    "  const [selectedAlunosCache, setSelectedAlunosCache] = useState<AlunoSimple[]>([]);",
    "  const [selectedAlunosCache, setSelectedAlunosCache] = useState<AlunoSimple[]>([]);\n\n  const isDateTimeValid = Boolean(dataInicio && dataFim && horaInicio && horaFim);"
)

# 2. Update PopoverTrigger Button
trigger_old = """          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs font-normal"
          >
            <span className="text-muted-foreground truncate">
              {selectedAlunoIds.length > 0
                ? `${selectedAlunoIds.length} aluno(s) selecionado(s)`
                : "Selecionar alunos…"}
            </span>"""
trigger_new = """          <Button
            variant="outline"
            size="sm"
            className="w-full justify-between h-8 text-xs font-normal"
            disabled={!isDateTimeValid}
          >
            <span className="text-muted-foreground truncate">
              {!isDateTimeValid 
                ? "Preencha a data e horário primeiro..." 
                : selectedAlunoIds.length > 0
                ? `${selectedAlunoIds.length} aluno(s) selecionado(s)`
                : "Buscar aluno…"}
            </span>"""
code = code.replace(trigger_old, trigger_new)

# 3. Update CommandItem styling
item_old = """                      <CommandItem 
                        key={a.id} 
                        value={a.id} 
                        onSelect={() => toggle(a)}
                        className={cn(a.isOcupado && "opacity-50 cursor-not-allowed")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            isChecked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className="flex-1 truncate">
                          {a.nome} | Mat: {a.matricula || 'N/A'} | {a.semestre || '-'}º Sem.
                        </span>
                        {a.isOcupado && (
                          <span className="text-destructive text-[10px] ml-2 shrink-0">
                            ⚠️ Ocupado neste horário ({a.ocupadoLocal})
                          </span>
                        )}
                      </CommandItem>"""

item_new = """                      <CommandItem 
                        key={a.id} 
                        value={a.id} 
                        onSelect={() => toggle(a)}
                        className={cn(a.isOcupado && "cursor-not-allowed bg-muted/20")}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            isChecked ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <span className={cn("flex-1 truncate", a.isOcupado && "text-slate-400")}>
                          {a.nome} | Mat: {a.matricula || 'N/A'} | {a.semestre || '-'}º Sem.
                        </span>
                        {a.isOcupado && (
                          <span className="text-amber-500 font-medium text-[10px] ml-2 shrink-0">
                            ⚠️ Ocupado neste horário ({a.ocupadoLocal})
                          </span>
                        )}
                      </CommandItem>"""
code = code.replace(item_old, item_new)

with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied UX improvements")
