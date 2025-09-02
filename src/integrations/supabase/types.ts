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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      care_logs: {
        Row: {
          created_at: string
          dog_id: string | null
          id: string
          note: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dog_id?: string | null
          id?: string
          note?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string | null
          id?: string
          note?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      dogs: {
        Row: {
          age_months: number | null
          breed: string | null
          created_at: string
          id: string
          name: string
          photo_url: string | null
          user_id: string
        }
        Insert: {
          age_months?: number | null
          breed?: string | null
          created_at?: string
          id?: string
          name: string
          photo_url?: string | null
          user_id: string
        }
        Update: {
          age_months?: number | null
          breed?: string | null
          created_at?: string
          id?: string
          name?: string
          photo_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          audio_url: string | null
          confidence: number | null
          context: string | null
          created_at: string
          dog_id: string | null
          id: string
          state: string
          user_id: string
        }
        Insert: {
          audio_url?: string | null
          confidence?: number | null
          context?: string | null
          created_at?: string
          dog_id?: string | null
          id?: string
          state: string
          user_id: string
        }
        Update: {
          audio_url?: string | null
          confidence?: number | null
          context?: string | null
          created_at?: string
          dog_id?: string | null
          id?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      logsheet_history: {
        Row: {
          competencies: Json
          created_at: string | null
          date_from: string | null
          date_to: string | null
          docx_url: string
          filename: string
          grade_level: string
          id: string
          section: string
          subject: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          competencies: Json
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          docx_url: string
          filename: string
          grade_level: string
          id?: string
          section: string
          subject: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          competencies?: Json
          created_at?: string | null
          date_from?: string | null
          date_to?: string | null
          docx_url?: string
          filename?: string
          grade_level?: string
          id?: string
          section?: string
          subject?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payment_webhooks: {
        Row: {
          created_at: string | null
          error_message: string | null
          event_type: string
          id: string
          metadata: Json | null
          payment_intent_id: string | null
          processed_at: string | null
          retry_count: number | null
          status: string
          stripe_event_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          stripe_event_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          payment_intent_id?: string | null
          processed_at?: string | null
          retry_count?: number | null
          status?: string
          stripe_event_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_webhooks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          metadata: Json | null
          plan_type: Database["public"]["Enums"]["subscription_plan"] | null
          status: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          user_id: string | null
          verification_status: string | null
          verified_at: string | null
          webhook_verified: boolean | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          plan_type?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          webhook_verified?: boolean | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          metadata?: Json | null
          plan_type?: Database["public"]["Enums"]["subscription_plan"] | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_status?: string | null
          verified_at?: string | null
          webhook_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          school: string
          teacher_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          school: string
          teacher_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          school?: string
          teacher_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_tips: {
        Row: {
          created_at: string
          dog_id: string | null
          id: string
          tip_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dog_id?: string | null
          id?: string
          tip_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string | null
          id?: string
          tip_key?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_type?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"] | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          dog_id: string | null
          done_at: string
          drill_key: string
          id: string
          user_id: string
        }
        Insert: {
          dog_id?: string | null
          done_at?: string
          drill_key: string
          id?: string
          user_id: string
        }
        Update: {
          dog_id?: string | null
          done_at?: string
          drill_key?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_goals: {
        Row: {
          created_at: string | null
          goal_name: string
          id: string
          is_primary: boolean | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          goal_name: string
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          goal_name?: string
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          experience_level:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name: string | null
          id: string
          onboarding_completed: boolean | null
          reminder_enabled: boolean | null
          reminder_time: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name?: string | null
          id: string
          onboarding_completed?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          experience_level?:
            | Database["public"]["Enums"]["experience_level"]
            | null
          full_name?: string | null
          id?: string
          onboarding_completed?: boolean | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      weelmat_matrices: {
        Row: {
          ai_json: Json | null
          code: string | null
          competency: string
          created_at: string
          custom_instructions: string | null
          date_from: string
          date_to: string
          docx_url: string | null
          grade_level: string
          id: string
          pdf_url: string | null
          section: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_json?: Json | null
          code?: string | null
          competency: string
          created_at?: string
          custom_instructions?: string | null
          date_from: string
          date_to: string
          docx_url?: string | null
          grade_level: string
          id?: string
          pdf_url?: string | null
          section: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_json?: Json | null
          code?: string | null
          competency?: string
          created_at?: string
          custom_instructions?: string | null
          date_from?: string
          date_to?: string
          docx_url?: string | null
          grade_level?: string
          id?: string
          pdf_url?: string | null
          section?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weelmat_runs: {
        Row: {
          created_at: string
          error: string | null
          id: string
          matrix_id: string
          status: string
          step: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          matrix_id: string
          status?: string
          step?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          matrix_id?: string
          status?: string
          step?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weelmat_runs_matrix_id_fkey"
            columns: ["matrix_id"]
            isOneToOne: false
            referencedRelation: "weelmat_matrices"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_test_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      has_premium_access: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      verify_payment_security: {
        Args: { payment_intent_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      experience_level: "beginner" | "intermediate" | "advanced"
      subscription_plan: "monthly" | "lifetime" | "free"
      subscription_status: "active" | "cancelled" | "expired" | "trial"
      user_role: "admin" | "premium" | "free"
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
      experience_level: ["beginner", "intermediate", "advanced"],
      subscription_plan: ["monthly", "lifetime", "free"],
      subscription_status: ["active", "cancelled", "expired", "trial"],
      user_role: ["admin", "premium", "free"],
    },
  },
} as const
