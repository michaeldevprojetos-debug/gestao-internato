import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SystemConfig {
  limitePreceptor: number;
  limiteUnidade: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  limitePreceptor: 4,
  limiteUnidade: 20,
};

/**
 * Hook centralizado para consumir as configurações do sistema
 * via Supabase (tabela: configuracoes_sistema).
 *
 * - Faz fetch inicial na montagem.
 * - Escuta mudanças via Supabase Realtime e atualiza automaticamente.
 * - Expõe funções para atualizar cada configuração.
 */
export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchConfig = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_sistema" as any)
        .select("chave, valor");

      if (error) {
        console.error("[useSystemConfig] Erro ao ler configuracoes_sistema:", error.message);
        // Mantém os defaults
        return;
      }

      if (data && Array.isArray(data) && data.length > 0) {
        const map: Record<string, string> = {};
        for (const row of data as unknown as { chave: string; valor: string }[]) {
          map[row.chave] = row.valor;
        }

        setConfig({
          limitePreceptor: map["limite_alunos_preceptor"]
            ? Number(map["limite_alunos_preceptor"])
            : DEFAULT_CONFIG.limitePreceptor,
          limiteUnidade: map["limite_alunos_unidade"]
            ? Number(map["limite_alunos_unidade"])
            : DEFAULT_CONFIG.limiteUnidade,
        });
      }

      setLastUpdate(new Date());
    } catch (err) {
      console.error("[useSystemConfig] Exceção ao buscar configurações:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel("config-realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "configuracoes_sistema" },
        () => {
          console.log("[useSystemConfig] Realtime: configuração alterada, recarregando...");
          fetchConfig();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchConfig]);

  // Funções de atualização
  const updateLimitePreceptor = useCallback(async (value: number) => {
    setConfig((prev) => ({ ...prev, limitePreceptor: value }));

    const { error } = await (supabase as any)
      .from("configuracoes_sistema")
      .update({ valor: value.toString() })
      .eq("chave", "limite_alunos_preceptor");

    if (error) {
      console.error("[useSystemConfig] Erro ao salvar limite_alunos_preceptor:", error.message);
    }
  }, []);

  const updateLimiteUnidade = useCallback(async (value: number) => {
    setConfig((prev) => ({ ...prev, limiteUnidade: value }));

    const { error } = await (supabase as any)
      .from("configuracoes_sistema")
      .update({ valor: value.toString() })
      .eq("chave", "limite_alunos_unidade");

    if (error) {
      console.error("[useSystemConfig] Erro ao salvar limite_alunos_unidade:", error.message);
    }
  }, []);

  return {
    config,
    loading,
    lastUpdate,
    refetch: fetchConfig,
    updateLimitePreceptor,
    updateLimiteUnidade,
  };
}
