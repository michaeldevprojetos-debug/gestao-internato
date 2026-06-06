import re

with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    code = f.read()

header_old = """          <div className="ml-auto flex items-center gap-1">
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
            {canClear && onClear && (
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); onClear(); }} title="Limpar registro deste preceptor no bloco">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>"""

header_new = """          <div className="ml-auto flex items-center gap-2">
            {canClear && onClear && (
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-500 hover:bg-red-50/10 dark:hover:bg-red-950/50" onClick={(e) => { e.stopPropagation(); onClear(); }} title="Limpar registro deste preceptor no bloco">
                <Eraser className="w-4 h-4 mr-2" /> <span>Limpar</span>
              </Button>
            )}
            {onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(); }} title="Editar alocação">
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>"""

# Ensure Eraser is imported
if "Eraser," not in code:
    code = code.replace("Pencil,", "Pencil, Eraser,")

if header_old in code:
    code = code.replace(header_old, header_new)
    print("Replaced successfully")
else:
    print("Could not find the exact header_old string to replace")
    print(code[code.find('<div className="ml-auto flex items-center gap-1">'):code.find('<div className="ml-auto flex items-center gap-1">')+1000])

with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
    f.write(code)
