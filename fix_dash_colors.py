import os

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Header container
content = content.replace(
    'className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-900/50 p-6 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm relative overflow-hidden"',
    'className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-100 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg backdrop-blur-sm relative overflow-hidden"'
)

# 2. Header titles
content = content.replace(
    'className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2"',
    'className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2"'
)

content = content.replace(
    'className="text-slate-400 text-sm mt-1 font-medium"',
    'className="text-slate-600 dark:text-slate-400 text-sm mt-1 font-medium"'
)

# 3. Select Triggers (there are 4 of them)
content = content.replace(
    'className="w-[180px] bg-slate-900/80 border-slate-700 text-slate-200"',
    'className="w-[180px] bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"'
)

# Also check the Sheet header (Dossiê do preceptor) which is also hardcoded dark.
# The user might have meant the Dossiê Sheet!
# Let's replace the Dossiê sheet hardcoded styles just in case, or leave it if it wasn't requested. 
# The prompt says: "ajuste a cor só no tema claro para melhor visibilidade" while showing a screenshot of the Dashboard. The screenshot does NOT show the Sheet, it shows the main Dashboard view.

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard header theme colors")
