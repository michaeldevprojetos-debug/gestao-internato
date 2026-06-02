import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Preceptoria" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Em breve: gestão completa de Configurações.</p>
      </div>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Esta seção está em construção.
        </CardContent>
      </Card>
    </div>
  );
}
