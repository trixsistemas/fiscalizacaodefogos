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
      evidence: {
        Row: {
          ai_classe: string | null
          ai_confianca: number | null
          arquivo_url: string
          criado_em: string
          id: string
          report_id: string
          tipo: Database["public"]["Enums"]["evidence_type"]
        }
        Insert: {
          ai_classe?: string | null
          ai_confianca?: number | null
          arquivo_url: string
          criado_em?: string
          id?: string
          report_id: string
          tipo: Database["public"]["Enums"]["evidence_type"]
        }
        Update: {
          ai_classe?: string | null
          ai_confianca?: number | null
          arquivo_url?: string
          criado_em?: string
          id?: string
          report_id?: string
          tipo?: Database["public"]["Enums"]["evidence_type"]
        }
        Relationships: [
          {
            foreignKeyName: "evidence_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      inspections: {
        Row: {
          data_fiscalizacao: string
          fiscal_id: string
          id: string
          observacao: string | null
          report_id: string
          resultado: Database["public"]["Enums"]["inspection_result"]
        }
        Insert: {
          data_fiscalizacao?: string
          fiscal_id: string
          id?: string
          observacao?: string | null
          report_id: string
          resultado: Database["public"]["Enums"]["inspection_result"]
        }
        Update: {
          data_fiscalizacao?: string
          fiscal_id?: string
          id?: string
          observacao?: string | null
          report_id?: string
          resultado?: Database["public"]["Enums"]["inspection_result"]
        }
        Relationships: [
          {
            foreignKeyName: "inspections_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "reports"
            referencedColumns: ["id"]
          },
        ]
      }
      orgaos: {
        Row: {
          ativo: boolean
          cidade: string
          contato: string | null
          criado_em: string
          estado: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          cidade: string
          contato?: string | null
          criado_em?: string
          estado: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          cidade?: string
          contato?: string | null
          criado_em?: string
          estado?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          criado_em: string
          email: string
          id: string
          nome: string
          telefone: string | null
        }
        Insert: {
          criado_em?: string
          email: string
          id: string
          nome: string
          telefone?: string | null
        }
        Update: {
          criado_em?: string
          email?: string
          id?: string
          nome?: string
          telefone?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          atualizado_em: string
          bairro: string | null
          criado_em: string
          descricao: string | null
          endereco: string | null
          id: string
          latitude: number
          longitude: number
          orgao_id: string | null
          status: Database["public"]["Enums"]["report_status"]
          tipo_ocorrencia: Database["public"]["Enums"]["occurrence_type"]
          usuario_id: string
        }
        Insert: {
          atualizado_em?: string
          bairro?: string | null
          criado_em?: string
          descricao?: string | null
          endereco?: string | null
          id?: string
          latitude: number
          longitude: number
          orgao_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          tipo_ocorrencia?: Database["public"]["Enums"]["occurrence_type"]
          usuario_id: string
        }
        Update: {
          atualizado_em?: string
          bairro?: string | null
          criado_em?: string
          descricao?: string | null
          endereco?: string | null
          id?: string
          latitude?: number
          longitude?: number
          orgao_id?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          tipo_ocorrencia?: Database["public"]["Enums"]["occurrence_type"]
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_orgao_id_fkey"
            columns: ["orgao_id"]
            isOneToOne: false
            referencedRelation: "orgaos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      list_public_reports: {
        Args: { _limit?: number }
        Returns: {
          bairro: string
          criado_em: string
          id: string
          latitude: number
          longitude: number
          status: Database["public"]["Enums"]["report_status"]
          tipo_ocorrencia: Database["public"]["Enums"]["occurrence_type"]
        }[]
      }
    }
    Enums: {
      app_role: "cidadao" | "fiscal" | "admin"
      evidence_type: "foto" | "video" | "audio"
      inspection_result: "confirmado" | "nao_confirmado" | "inconclusivo"
      occurrence_type:
        | "fogo_com_estampido"
        | "fogo_silencioso"
        | "rojao"
        | "bateria_fogos"
        | "outro"
      report_status: "em_analise" | "confirmada" | "arquivada" | "falsa"
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
      app_role: ["cidadao", "fiscal", "admin"],
      evidence_type: ["foto", "video", "audio"],
      inspection_result: ["confirmado", "nao_confirmado", "inconclusivo"],
      occurrence_type: [
        "fogo_com_estampido",
        "fogo_silencioso",
        "rojao",
        "bateria_fogos",
        "outro",
      ],
      report_status: ["em_analise", "confirmada", "arquivada", "falsa"],
    },
  },
} as const
