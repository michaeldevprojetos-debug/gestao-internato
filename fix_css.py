import os

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\styles.css"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Make the CSS variables explicitly use #FFFFFF for pure white, slate-50 for background, etc.
old_root = """:root {
  --background: oklch(0.9711 0.0074 80.7211);
  --foreground: oklch(0.3 0.0358 30.2042);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.3 0.0358 30.2042);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.3 0.0358 30.2042);
  --primary: oklch(0.5234 0.1347 144.1672);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.9571 0.021 147.636);
  --secondary-foreground: oklch(0.4254 0.1159 144.3078);
  --muted: oklch(0.937 0.0142 74.4218);
  --muted-foreground: oklch(0.4495 0.0486 39.211);
  --accent: oklch(0.8952 0.0504 146.0366);
  --accent-foreground: oklch(0.4254 0.1159 144.3078);
  --destructive: oklch(0.5386 0.1937 26.7249);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.8805 0.0208 74.6428);
  --input: oklch(0.8805 0.0208 74.6428);"""

new_root = """:root {
  --background: #f8fafc; /* slate-50 */
  --foreground: #0f172a; /* slate-900 */
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: oklch(0.5234 0.1347 144.1672);
  --primary-foreground: #ffffff;
  --secondary: oklch(0.9571 0.021 147.636);
  --secondary-foreground: oklch(0.4254 0.1159 144.3078);
  --muted: #f1f5f9; /* slate-100 */
  --muted-foreground: #475569; /* slate-600 */
  --accent: oklch(0.8952 0.0504 146.0366);
  --accent-foreground: oklch(0.4254 0.1159 144.3078);
  --destructive: oklch(0.5386 0.1937 26.7249);
  --destructive-foreground: #ffffff;
  --border: #e2e8f0; /* slate-200 */
  --input: #e2e8f0; /* slate-200 */"""

content = content.replace(old_root, new_root)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated styles.css with high contrast light mode colors")
