import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios — Preceptoria" }] }),
  component: Page,
});

function Page() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Em breve: gestão completa de Relatórios.</p>
      </div>
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Esta seção está em construção.
        </CardContent>
      </Card>
    </div>
  );
}
