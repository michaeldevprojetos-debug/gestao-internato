import re

with open("src/routes/dashboard.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# 1. Fix Header block
header_old = 'bg-white dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md backdrop-blur-sm relative overflow-hidden'
header_new = 'bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-sm relative overflow-hidden'
code = code.replace(header_old, header_new)

# 2. Fix Sync Text
sync_old = '<div className="flex items-center justify-end gap-2 text-xs text-slate-400 -mt-2 pr-2">'
sync_new = '<div className="flex items-center justify-end gap-2 text-xs text-slate-500 dark:text-slate-400 -mt-2 pr-2">'
code = code.replace(sync_old, sync_new)

sync_old2 = '<span className="opacity-50">Última atualização:'
sync_new2 = '<span className="text-slate-400 dark:text-slate-500">Última atualização:'
code = code.replace(sync_old2, sync_new2)

# 3. Fix Alert block
alert_old = '<Card className="border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 w-full">'
alert_new = '<Card className="border-red-300 dark:border-red-900/50 bg-red-100 dark:bg-red-950/20 w-full shadow-sm">'
code = code.replace(alert_old, alert_new)

badge_old = '<span className="ml-auto text-[10px] uppercase bg-red-900/40 px-2 py-0.5 rounded text-red-400">'
badge_new = '<span className="ml-auto text-[10px] uppercase bg-red-200 dark:bg-red-900/40 px-2 py-0.5 rounded text-red-700 dark:text-red-400">'
code = code.replace(badge_old, badge_new)

with open("src/routes/dashboard.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Applied contrast fixes")
