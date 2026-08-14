export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      application_documents: {
        Row: {
          application_id: string
          created_at: string
          document_type: string
          file_name: string
          id: string
          storage_path: string | null
        }
        Insert: {
          application_id: string
          created_at?: string
          document_type: string
          file_name: string
          id?: string
          storage_path?: string | null
        }
        Update: {
          application_id?: string
          created_at?: string
          document_type?: string
          file_name?: string
          id?: string
          storage_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_reviewer_notes: {
        Row: {
          application_id: string
          author_clerk_user_id: string
          author_role: string | null
          created_at: string
          id: string
          note: string
        }
        Insert: {
          application_id: string
          author_clerk_user_id: string
          author_role?: string | null
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          application_id?: string
          author_clerk_user_id?: string
          author_role?: string | null
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_reviewer_notes_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_screening_answers: {
        Row: {
          answer: string
          application_id: string
          created_at: string
          id: string
          question: string
        }
        Insert: {
          answer: string
          application_id: string
          created_at?: string
          id?: string
          question: string
        }
        Update: {
          answer?: string
          application_id?: string
          created_at?: string
          id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_screening_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_status_history: {
        Row: {
          application_id: string
          changed_by_clerk_user_id: string
          changed_by_role: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["application_status"]
          old_status: Database["public"]["Enums"]["application_status"] | null
        }
        Insert: {
          application_id: string
          changed_by_clerk_user_id: string
          changed_by_role?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["application_status"]
          old_status?: Database["public"]["Enums"]["application_status"] | null
        }
        Update: {
          application_id?: string
          changed_by_clerk_user_id?: string
          changed_by_role?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["application_status"]
          old_status?: Database["public"]["Enums"]["application_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "application_status_history_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_team_preferences: {
        Row: {
          application_id: string
          id: string
          preference_rank: number
          team_name: string
        }
        Insert: {
          application_id: string
          id?: string
          preference_rank: number
          team_name: string
        }
        Update: {
          application_id?: string
          id?: string
          preference_rank?: number
          team_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_team_preferences_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      application_templates: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      applications: {
        Row: {
          created_at: string
          email: string
          first_name: string
          gpa: number | null
          id: string
          job_id: string
          last_name: string
          major: string | null
          phone: string | null
          school: string | null
          school_email: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          year_of_study: string | null
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          gpa?: number | null
          id?: string
          job_id: string
          last_name: string
          major?: string | null
          phone?: string | null
          school?: string | null
          school_email?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          year_of_study?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          gpa?: number | null
          id?: string
          job_id?: string
          last_name?: string
          major?: string | null
          phone?: string | null
          school?: string | null
          school_email?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          year_of_study?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_clerk_user_id: string
          actor_role: string | null
          created_at: string
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_clerk_user_id: string
          actor_role?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_clerk_user_id?: string
          actor_role?: string | null
          created_at?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          application_template_id: string | null
          apply_url: string | null
          closing_date: string | null
          commitment_type: string
          created_at: string
          description: string
          display_order: number
          id: string
          location: string
          photo_path: string | null
          posting_date: string | null
          published_at: string | null
          role: string
          slug: string
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          application_template_id?: string | null
          apply_url?: string | null
          closing_date?: string | null
          commitment_type: string
          created_at?: string
          description: string
          display_order?: number
          id?: string
          location: string
          photo_path?: string | null
          posting_date?: string | null
          published_at?: string | null
          role: string
          slug: string
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          application_template_id?: string | null
          apply_url?: string | null
          closing_date?: string | null
          commitment_type?: string
          created_at?: string
          description?: string
          display_order?: number
          id?: string
          location?: string
          photo_path?: string | null
          posting_date?: string | null
          published_at?: string | null
          role?: string
          slug?: string
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_application_template_id_fkey"
            columns: ["application_template_id"]
            isOneToOne: false
            referencedRelation: "application_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      security_events: {
        Row: {
          actor_clerk_user_id: string
          actor_role: string
          created_at: string
          deleted_count: number
          deleted_ids: string[]
          event_type: string
          filters_snapshot: Json | null
          id: string
          scope: string
        }
        Insert: {
          actor_clerk_user_id: string
          actor_role: string
          created_at?: string
          deleted_count: number
          deleted_ids: string[]
          event_type: string
          filters_snapshot?: Json | null
          id?: string
          scope: string
        }
        Update: {
          actor_clerk_user_id?: string
          actor_role?: string
          created_at?: string
          deleted_count?: number
          deleted_ids?: string[]
          event_type?: string
          filters_snapshot?: Json | null
          id?: string
          scope?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_bulk_delete_history: {
        Args: { p_filters?: Json; p_ids: string[]; p_scope: string }
        Returns: number
      }
      submit_application: {
        Args: {
          p_application_id: string
          p_documents: Json
          p_email: string
          p_first_name: string
          p_gpa: number
          p_job_id: string
          p_last_name: string
          p_major: string
          p_phone: string
          p_school: string
          p_school_email: string
          p_screening_answers: Json
          p_team_preferences: Json
          p_year_of_study: string
        }
        Returns: string
      }
    }
    Enums: {
      application_status:
        | "submitted"
        | "under_review"
        | "interviewing"
        | "offer"
        | "hired"
        | "rejected"
        | "withdrawn"
      job_status: "draft" | "published" | "closed" | "archived"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_status: [
        "submitted",
        "under_review",
        "interviewing",
        "offer",
        "hired",
        "rejected",
        "withdrawn",
      ],
      job_status: ["draft", "published", "closed", "archived"],
    },
  },
} as const

