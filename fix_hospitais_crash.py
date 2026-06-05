import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Locate the useEffect block
pattern_effect = r"(\s*// Cálculo automático de CH Prevista\s*useEffect\(\(\) => \{.*?\n\s*\}, \[dataInicio, dataFim, horaInicio, horaFim, selectedPreceptores\]\);)"

match = re.search(pattern_effect, content, flags=re.DOTALL)
if match:
    effect_code = match.group(1)
    
    # Remove the effect from its current position
    content = content.replace(effect_code, "")
    
    # Locate the target insertion point: after setHoraFim useState
    pattern_target = r"(\s*const \[horaFim, setHoraFim\] = useState\(\"12:00\"\);)"
    match_target = re.search(pattern_target, content)
    
    if match_target:
        target_code = match_target.group(1)
        # Insert effect right after the state declarations
        content = content.replace(target_code, target_code + "\n" + effect_code + "\n")
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        print("Successfully moved useEffect for auto calculation below state declarations.")
    else:
        print("Could not find state declarations target.")
else:
    print("Could not find useEffect code.")
