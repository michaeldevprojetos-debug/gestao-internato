import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Mapeia nivel_acesso do banco para o tipo Role interno
export type Role = "super_admin" | "admin" | "viewer";
export type User = { email: string; nome: string; role: Role };

type AuthContextValue = {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  ready: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

/** Converte o valor de nivel_acesso do banco para o Role interno */
function nivelAcessoToRole(nivel: string): Role {
  const n = nivel.toLowerCase().replace(/\s+/g, "_");
  if (n === "super_admin") return "super_admin";
  if (n === "admin") return "admin";
  return "viewer";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  // Ao iniciar, tenta restaurar a sessão ativa do Supabase Auth
  useEffect(() => {
    async function restoreSession() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        if (session?.user?.email) {
          // Sessão ativa: valida o e-mail na tabela usuarios_painel
          const email = session.user.email;
          const { data: painel } = await supabase
            .from("usuarios_painel")
            .select("email, nome, nivel_acesso")
            .eq("email", email)
            .maybeSingle();

          if (painel) {
            setUser({
              email: painel.email,
              nome: painel.nome,
              role: nivelAcessoToRole(painel.nivel_acesso),
            });
          } else {
            // Usuário autenticado no Supabase mas não tem permissão no painel
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error("[Auth] Erro ao restaurar sessão:", err);
      } finally {
        setReady(true);
      }
    }

    restoreSession();
  }, []);

  /**
   * Login real:
   * 1. Autentica com Supabase Auth
   * 2. Busca o e-mail na tabela usuarios_painel
   * 3. Se não encontrar → signOut automático + toast de acesso negado
   */
  const login = async (email: string, password: string): Promise<User> => {
    // Etapa 1 — Autenticação no Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      throw new Error(authError?.message ?? "Falha na autenticação.");
    }

    // Etapa 2 — Verifica permissão na tabela usuarios_painel
    const { data: painel, error: painelError } = await supabase
      .from("usuarios_painel")
      .select("email, nome, nivel_acesso")
      .eq("email", email)
      .maybeSingle();

    if (painelError) {
      await supabase.auth.signOut();
      throw new Error("Erro ao verificar permissões. Tente novamente.");
    }

    if (!painel) {
      // Acesso negado: faz signOut imediato e lança erro
      await supabase.auth.signOut();
      toast.error(
        "Acesso Negado: Seu e-mail não possui permissão neste sistema.",
        { duration: 6000 }
      );
      throw new Error("acesso_negado");
    }

    // Etapa 3 — Sucesso: salva usuário no estado
    const u: User = {
      email: painel.email,
      nome: painel.nome,
      role: nivelAcessoToRole(painel.nivel_acesso),
    };
    setUser(u);
    return u;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}