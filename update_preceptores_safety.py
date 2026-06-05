import re

file_path = r"C:\Users\zinho.dam\Documents\Projeto de gestão do internato\gestao-internato-main\src\routes\preceptores.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix ReferenceError for fetchData
content = content.replace("onSaved={fetchData}", "onSaved={() => queryClient.invalidateQueries({ queryKey: ['preceptores'] })}")

# Apply Optional Chaining and safe fallbacks to TableBody
old_table_body = """            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-48" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-16 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-16 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    Nenhum preceptor encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id} className={!p.ativo ? "opacity-60" : ""}>
                    <TableCell className="font-semibold">{p.nome}</TableCell>
                    <TableCell>
                      {p.especialidade_nome ? (
                        <Badge variant="secondary">{p.especialidade_nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.ativo ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200 bg-green-50"
                        >
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-200 bg-slate-50"
                        >
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPreceptor(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {p.ativo && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id, p.nome)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>"""

new_table_body = """            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16 mx-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filtered && filtered.length > 0 ? (
                filtered.map((p) => {
                  if (!p) return null;
                  const isAtivo = p?.ativo ?? true;
                  const tipoRemuneracao = p?.tipo_remuneracao || "Bolsa";
                  return (
                  <TableRow key={p?.id || Math.random().toString()} className={!isAtivo ? "opacity-60" : ""}>
                    <TableCell className="font-semibold">{p?.nome || "Sem Nome"}</TableCell>
                    <TableCell>
                      {p?.especialidade_nome ? (
                        <Badge variant="secondary">{p.especialidade_nome}</Badge>
                      ) : (
                        <span className="text-muted-foreground">Não informada</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isAtivo ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-200 bg-green-50"
                        >
                          Ativo
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-slate-500 border-slate-200 bg-slate-50"
                        >
                          Inativo
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingPreceptor(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {isAtivo && p?.id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(p.id, p.nome || "Preceptor")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )})
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                    <p>Nenhum preceptor encontrado.</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>"""

content = content.replace(old_table_body, new_table_body)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Applied optional chaining and safe fallbacks.")
