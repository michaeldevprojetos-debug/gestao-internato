import os

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\dashboard.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add shadow-md to all Cards for light theme (already has some shadow classes, I'll enhance them)
# "shadow-md border-white/10 dark:bg-slate-900/40" -> "shadow-md dark:shadow-none border-slate-200 dark:border-white/10 dark:bg-slate-900/40"
content = content.replace(
    'className="lg:col-span-2 shadow-md border-white/10 dark:bg-slate-900/40"',
    'className="lg:col-span-2 shadow-md dark:shadow-none border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40"'
)

content = content.replace(
    'className="shadow-md border-white/10 dark:bg-slate-900/40"',
    'className="shadow-md dark:shadow-none border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40"'
)

content = content.replace(
    'className="shadow-md border-white/10 dark:bg-slate-900/40 overflow-hidden"',
    'className="shadow-md dark:shadow-none border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/40 overflow-hidden"'
)

# Fix the 4 stats cards at the top
# Currently: className="card-glow relative overflow-hidden" 
# Let's add bg-white shadow-sm dark:bg-transparent dark:shadow-none to card-glow in CSS, OR directly here
content = content.replace(
    'className="card-glow relative overflow-hidden"',
    'className="card-glow relative overflow-hidden bg-white dark:bg-white/5 shadow-sm dark:shadow-none border-slate-200 dark:border-white/10"'
)

# 4. COMPONENTE DE ALERTA (Card Vermelho)
# Currently: className="bg-red-500/10 border-red-500/20 text-red-500" or similar
# Let's find the exact string.
alert_old = 'className="mb-6 bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl border flex items-center gap-3"'
alert_new = 'className="mb-6 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-400 p-4 rounded-xl border flex items-center gap-3 shadow-sm dark:shadow-none"'
content = content.replace(alert_old, alert_new)

# Let's do another pass in case the alert string is slightly different.
# If it fails, I'll use regex.
import re
alert_pattern = r'className="mb-6 bg-red-[^"]+"'
new_alert = 'className="mb-6 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-800 dark:text-red-400 p-4 rounded-xl border flex items-center gap-3 shadow-sm dark:shadow-none"'
content = re.sub(alert_pattern, new_alert, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated dashboard cards and alert colors")
