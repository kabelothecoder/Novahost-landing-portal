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
      broker_accounts: {
        Row: {
          account_id: string
          balance: number | null
          equity: number | null
          id: string
          platform: string | null
          server: string | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id: string
          balance?: number | null
          equity?: number | null
          id?: string
          platform?: string | null
          server?: string | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string
          balance?: number | null
          equity?: number | null
          id?: string
          platform?: string | null
          server?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      device_activations: {
        Row: {
          activated_at: string
          device_id: string
          id: string
          last_seen_at: string
          license_id: string
          status: string
        }
        Insert: {
          activated_at?: string
          device_id: string
          id?: string
          last_seen_at?: string
          license_id: string
          status?: string
        }
        Update: {
          activated_at?: string
          device_id?: string
          id?: string
          last_seen_at?: string
          license_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_activations_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_advisors: {
        Row: {
          accent_color: string | null
          avatar_url: string | null
          background_video_url: string | null
          code: string
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          name: string
          symbols: Json | null
          tts_script: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          accent_color?: string | null
          avatar_url?: string | null
          background_video_url?: string | null
          code: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          name: string
          symbols?: Json | null
          tts_script?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          accent_color?: string | null
          avatar_url?: string | null
          background_video_url?: string | null
          code?: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          name?: string
          symbols?: Json | null
          tts_script?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      itn_logs: {
        Row: {
          created_at: string | null
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string | null
          id?: string
          payload: Json
        }
        Update: {
          created_at?: string | null
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      license_symbol_config: {
        Row: {
          broker_symbol: string | null
          created_at: string
          enabled: boolean
          id: string
          license_id: string
          lot: number
          max_trades: number
          smart_lot: boolean
          symbol: string
          updated_at: string
        }
        Insert: {
          broker_symbol?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          license_id: string
          lot?: number
          max_trades?: number
          smart_lot?: boolean
          symbol: string
          updated_at?: string
        }
        Update: {
          broker_symbol?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          license_id?: string
          lot?: number
          max_trades?: number
          smart_lot?: boolean
          symbol?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_symbol_config_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      licenses: {
        Row: {
          allowed_symbols: Json | null
          created_at: string
          ea_id: string
          expires_at: string | null
          id: string
          is_master: boolean | null
          issued_at: string
          license_key: string
          max_devices: number
          metadata: Json | null
          owner_email: string | null
          owner_id: string
          plan_id: string
          product_id: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allowed_symbols?: Json | null
          created_at?: string
          ea_id: string
          expires_at?: string | null
          id?: string
          is_master?: boolean | null
          issued_at?: string
          license_key: string
          max_devices?: number
          metadata?: Json | null
          owner_email?: string | null
          owner_id: string
          plan_id: string
          product_id: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allowed_symbols?: Json | null
          created_at?: string
          ea_id?: string
          expires_at?: string | null
          id?: string
          is_master?: boolean | null
          issued_at?: string
          license_key?: string
          max_devices?: number
          metadata?: Json | null
          owner_email?: string | null
          owner_id?: string
          plan_id?: string
          product_id?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "licenses_ea_id_fkey"
            columns: ["ea_id"]
            isOneToOne: false
            referencedRelation: "expert_advisors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "licenses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "expert_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          duration_days: number | null
          id: string
          max_devices: number
          name: string
          product_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          duration_days?: number | null
          id?: string
          max_devices?: number
          name: string
          product_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          duration_days?: number | null
          id?: string
          max_devices?: number
          name?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plans_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "expert_advisors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          license_credits: number | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          license_credits?: number | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          license_credits?: number | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      signal_deliveries: {
        Row: {
          claimed_at: string
          device_id: string | null
          id: string
          license_id: string
          signal_id: string
        }
        Insert: {
          claimed_at?: string
          device_id?: string | null
          id?: string
          license_id: string
          signal_id: string
        }
        Update: {
          claimed_at?: string
          device_id?: string | null
          id?: string
          license_id?: string
          signal_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "signal_deliveries_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "signal_deliveries_signal_id_fkey"
            columns: ["signal_id"]
            isOneToOne: false
            referencedRelation: "signals"
            referencedColumns: ["id"]
          },
        ]
      }
      signal_logs: {
        Row: {
          created_at: string | null
          ea_id: string | null
          id: string
          license_id: string | null
          license_key: string | null
          raw_data: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          ea_id?: string | null
          id?: string
          license_id?: string | null
          license_key?: string | null
          raw_data?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          ea_id?: string | null
          id?: string
          license_id?: string | null
          license_key?: string | null
          raw_data?: Json | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "signal_logs_license_id_fkey"
            columns: ["license_id"]
            isOneToOne: false
            referencedRelation: "licenses"
            referencedColumns: ["id"]
          },
        ]
      }
      signals: {
        Row: {
          created_at: string | null
          ea_id: string | null
          id: string
          lot: number | null
          pair: string | null
          price: number | null
          side: string | null
          signal_id: string | null
          sl: number | null
          status: string | null
          tp: number | null
          type: string | null
        }
        Insert: {
          created_at?: string | null
          ea_id?: string | null
          id?: string
          lot?: number | null
          pair?: string | null
          price?: number | null
          side?: string | null
          signal_id?: string | null
          sl?: number | null
          status?: string | null
          tp?: number | null
          type?: string | null
        }
        Update: {
          created_at?: string | null
          ea_id?: string | null
          id?: string
          lot?: number | null
          pair?: string | null
          price?: number | null
          side?: string | null
          signal_id?: string | null
          sl?: number | null
          status?: string | null
          tp?: number | null
          type?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          device_bound_at: string | null
          device_id: string | null
          email: string
          has_scanner: boolean
          id: string
          is_lifetime: boolean
          is_premium: boolean | null
          subscription_expiry: string | null
          token: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          device_bound_at?: string | null
          device_id?: string | null
          email: string
          has_scanner?: boolean
          id?: string
          is_lifetime?: boolean
          is_premium?: boolean | null
          subscription_expiry?: string | null
          token?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          device_bound_at?: string | null
          device_id?: string | null
          email?: string
          has_scanner?: boolean
          id?: string
          is_lifetime?: boolean
          is_premium?: boolean | null
          subscription_expiry?: string | null
          token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      symbol_mappings: {
        Row: {
          created_at: string | null
          id: string
          normalized_symbol: string
          raw_symbol: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          normalized_symbol: string
          raw_symbol: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          normalized_symbol?: string
          raw_symbol?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      trade_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          license_key: string | null
          pair: string
          pl: number
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          license_key?: string | null
          pair: string
          pl: number
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          license_key?: string | null
          pair?: string
          pl?: number
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          credits: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          credits?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          credits?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      deduct_credits_and_generate_license: {
        Args: {
          p_allowed_symbols: Json
          p_is_master?: boolean
          p_license_key: string
          p_max_devices: number
          p_metadata: Json
          p_plan_id: string
          p_product_id: string
          p_user_id: string
        }
        Returns: Json
      }
      generate_license_secure: {
        Args: {
          p_email: string
          p_max_devices?: number
          p_mentor_id: string
          p_robot_id: string
        }
        Returns: Json
      }
      get_dashboard_stats: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
