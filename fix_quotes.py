with open("src/routes/hospitais.tsx", "r", encoding="utf-8") as f:
    c = f.read()
c = c.replace('\\"', '"')
with open("src/routes/hospitais.tsx", "w", encoding="utf-8") as f:
    f.write(c)
