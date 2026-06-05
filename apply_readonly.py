import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make CH Prevista readonly
pattern = r'<Input type="number" min=\{0\} className="h-8 text-xs" value=\{preceptorChPrevista\[key\] \|\| ""\} onChange=\{\(e\) => setPreceptorChPrevista\(p => \(\{\.\.\.p, \[key\]: e\.target\.value \? Number\(e\.target\.value\) : ""\}\)\)\} />'
replacement = r'<Input type="number" min={0} className="h-8 text-xs bg-muted/50 cursor-not-allowed" readOnly value={preceptorChPrevista[key] || ""} title="Calculado automaticamente" />'

new_content = content.replace(
    '<Input type="number" min={0} className="h-8 text-xs" value={preceptorChPrevista[key] || ""} onChange={(e) => setPreceptorChPrevista(p => ({...p, [key]: e.target.value ? Number(e.target.value) : ""}))} />',
    replacement
)

# Wait, the previous search pattern might have spaces. Let's just use regex for the Input tag.
new_content_regex = re.sub(
    r'<Input type="number" min=\{0\} className="h-8 text-xs" value=\{preceptorChPrevista\[key\] \|\| ""\} onChange=\{[^>]+ \/>',
    '<Input type="number" min={0} className="h-8 text-xs bg-muted/50 cursor-not-allowed" readOnly value={preceptorChPrevista[key] || ""} title="Calculado automaticamente" />',
    content
)

if new_content_regex != content:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content_regex)
    print("Replaced CH Prevista input to readonly.")
else:
    print("Failed to replace CH Prevista input. Check the regex or string.")
