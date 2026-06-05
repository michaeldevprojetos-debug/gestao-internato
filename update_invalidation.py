import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\hospitais.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add invalidateQueries to handleUpdateQuantidade
content = content.replace("""        setLocais((prev) =>
          prev.map((l) => ({
            ...l,
            preceptoresList: l.preceptoresList.map((p) =>
              p.id === preceptorId ? { ...p, quantidadeAlunos: newValue } : p,
            ),
          })),
        );
      } catch (err: any) {""", """        setLocais((prev) =>
          prev.map((l) => ({
            ...l,
            preceptoresList: l.preceptoresList.map((p) =>
              p.id === preceptorId ? { ...p, quantidadeAlunos: newValue } : p,
            ),
          })),
        );
        queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
        queryClient.invalidateQueries({ queryKey: ["alocacoes"] });
      } catch (err: any) {""")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Updated handleUpdateQuantidade.")
