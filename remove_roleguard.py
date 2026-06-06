import re

with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    code = f.read()

# Remove canClear condition
old_button = "{canClear && onClear && ("
new_button = "{onClear && ("
code = code.replace(old_button, new_button)

# Also remove canClear definition to clean up
old_def = """  const { user } = useAuth();
  const canClear = user?.role === "admin" || user?.role === "super_admin";"""
new_def = """  const { user } = useAuth();"""
code = code.replace(old_def, new_def)

with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
    f.write(code)

print("Removed RoleGuard")
