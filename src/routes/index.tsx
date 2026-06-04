import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Stethoscope, Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Entrar — Painel de Preceptoria" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate({ to: "/dashboard" });
  }, [user, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !senha) {
      setError("Informe e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      await login(email, senha);
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      // "acesso_negado" já exibiu o toast vermelho dentro do AuthProvider
      if (err instanceof Error && err.message === "acesso_negado") {
        setError(""); // o toast já foi exibido
      } else {
        setError("E-mail ou senha incorretos. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-accent/30 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">Painel de Preceptoria</h1>
          <p className="mt-1 text-sm text-muted-foreground">Gestão do Internato — Custo Real</p>
        </div>

        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="voce@instituicao.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Entrar
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Acesso restrito à equipe de gestão.
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Desenvolvido por <span className="font-medium text-foreground">Michael Pithon</span>
        </p>
      </div>
    </div>
  );
}
