export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alunos: {
        Row: {
          CODTURMA: string | null
          cpf: string | null
          CPF: string | null
          created_at: string | null
          id: string
          matricula: string | null
          MATRICULA: string | null
          nome: string
          NOME: string | null
          PERIODO: string | null
          semestre: number | null
          status: string | null
        }
        Insert: {
          CODTURMA?: string | null
          cpf?: string | null
          CPF?: string | null
          created_at?: string | null
          id?: string
          matricula?: string | null
          MATRICULA?: string | null
          nome: string
          NOME?: string | null
          PERIODO?: string | null
          semestre?: number | null
          status?: string | null
        }
        Update: {
          CODTURMA?: string | null
          cpf?: string | null
          CPF?: string | null
          created_at?: string | null
          id?: string
          matricula?: string | null
          MATRICULA?: string | null
          nome?: string
          NOME?: string | null
          PERIODO?: string | null
          semestre?: number | null
          status?: string | null
        }
        Relationships: []
      }
      locais: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tipo?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      preceptores: {
        Row: {
          campo_pratica: string | null
          carga_horaria_contratada: number | null
          created_at: string | null
          especialidade: string | null
          id: string
          local_id: string | null
          nome: string
          tipo_contrato: string | null
          unidade_vinculada: string | null
          valor_hora: number | null
        }
        Insert: {
          campo_pratica?: string | null
          carga_horaria_contratada?: number | null
          created_at?: string | null
          especialidade?: string | null
          id?: string
          local_id?: string | null
          nome: string
          tipo_contrato?: string | null
          unidade_vinculada?: string | null
          valor_hora?: number | null
        }
        Update: {
          campo_pratica?: string | null
          carga_horaria_contratada?: number | null
          created_at?: string | null
          especialidade?: string | null
          id?: string
          local_id?: string | null
          nome?: string
          tipo_contrato?: string | null
          unidade_vinculada?: string | null
          valor_hora?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "preceptores_local_id_fkey"
            columns: ["local_id"]
            isOneToOne: false
            referencedRelation: "locais"
            referencedColumns: ["id"]
          },
        ]
      }
      rotacoes: {
        Row: {
          ch_prevista: number | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          id: string
          nome: string
        }
        Insert: {
          ch_prevista?: number | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome: string
        }
        Update: {
          ch_prevista?: number | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      usuarios_painel: {
        Row: {
          created_at: string | null
          email: string
          id: string
          nivel_acesso: string
          nome: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          nivel_acesso: string
          nome: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          nivel_acesso?: string
          nome?: string
        }
        Relationships: []
      }
      vinculo_operacional: {
        Row: {
          aluno_id: string | null
          created_at: string | null
          custo_proporcional_aluno: number | null
          custo_total_rotacao: number | null
          horas_realizadas: number | null
          id: string
          mes_referencia: string
          preceptor_id: string | null
          quantidade_alunos: number
          rotacao_id: string | null
          valor_hora_preceptor: number | null
        }
        Insert: {
          aluno_id?: string | null
          created_at?: string | null
          custo_proporcional_aluno?: number | null
          custo_total_rotacao?: number | null
          horas_realizadas?: number | null
          id?: string
          mes_referencia: string
          preceptor_id?: string | null
          quantidade_alunos?: number
          rotacao_id?: string | null
          valor_hora_preceptor?: number | null
        }
        Update: {
          aluno_id?: string | null
          created_at?: string | null
          custo_proporcional_aluno?: number | null
          custo_total_rotacao?: number | null
          horas_realizadas?: number | null
          id?: string
          mes_referencia?: string
          preceptor_id?: string | null
          quantidade_alunos?: number
          rotacao_id?: string | null
          valor_hora_preceptor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vinculo_operacional_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculo_operacional_aluno_id_fkey"
            columns: ["aluno_id"]
            isOneToOne: false
            referencedRelation: "alunos_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculo_operacional_preceptor_id_fkey"
            columns: ["preceptor_id"]
            isOneToOne: false
            referencedRelation: "preceptores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinculo_operacional_rotacao_id_fkey"
            columns: ["rotacao_id"]
            isOneToOne: false
            referencedRelation: "rotacoes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      alunos_safe: {
        Row: {
          created_at: string | null
          id: string | null
          matricula: string | null
          nome: string | null
          semestre: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          matricula?: string | null
          nome?: string | null
          semestre?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          matricula?: string | null
          nome?: string | null
          semestre?: number | null
          status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_admin_access: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      truncate_alunos: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "super_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "super_admin"],
    },
  },
} as const
