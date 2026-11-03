// Database types: the TypeScript shape of every table, enum and SQL function in
// supabase/migrations/. GENERATED, do not edit by hand.
//
// How it was made (3 Nov 2026): `supabase gen types typescript` was not available
// in the cloud session (the CLI binary can't be downloaded there), so we ran the
// same generator the CLI uses inside its Docker image, @supabase/postgres-meta
// 0.100.0, against a local PostgreSQL 16 with our 6 migrations applied
// (PG_META_GENERATE_TYPES=typescript, schema public, PostgREST 14.18 like the live
// project). The output is identical in format to `supabase gen types typescript`.
//
// When a migration changes, regenerate this file, e.g. with the Supabase CLI:
//   npx supabase gen types typescript --local > src/types/database.ts
//
// How to read it: Database["public"]["Tables"]["profiles"]["Row"] is the type of
// one row of profiles (like a Python TypedDict). "Insert" is what you may send when
// inserting (fields with a default are optional, marked "?"), "Update" is what
// you may send when updating (all optional). The helper types at the bottom
// (Tables<"profiles">, Enums<"app_role">) are shortcuts for the same thing.
// Passing Database to createClient<Database>() makes every query typed.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      alerts: {
        Row: {
          channel: Database["public"]["Enums"]["alert_channel"];
          check_id: string;
          created_at: string;
          error: string | null;
          escalation_step: number;
          id: string;
          recipient_id: string;
          sent_at: string | null;
          status: Database["public"]["Enums"]["alert_status"];
        };
        ComputedFields: never;
        Insert: {
          channel: Database["public"]["Enums"]["alert_channel"];
          check_id: string;
          created_at?: string;
          error?: string | null;
          escalation_step?: number;
          id?: string;
          recipient_id: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["alert_status"];
        };
        Update: {
          channel?: Database["public"]["Enums"]["alert_channel"];
          check_id?: string;
          created_at?: string;
          error?: string | null;
          escalation_step?: number;
          id?: string;
          recipient_id?: string;
          sent_at?: string | null;
          status?: Database["public"]["Enums"]["alert_status"];
        };
        Relationships: [
          {
            foreignKeyName: "alerts_check_id_fkey";
            columns: ["check_id"];
            isOneToOne: false;
            referencedRelation: "checks";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerts_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          details: NonNullable<Json>;
          id: number;
          target_id: string | null;
          target_type: string | null;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          details?: NonNullable<Json>;
          id?: never;
          target_id?: string | null;
          target_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      checks: {
        Row: {
          acknowledged_at: string | null;
          acknowledged_by: string | null;
          ai_level: Database["public"]["Enums"]["risk_level"] | null;
          ai_provider: string | null;
          answered_at: string | null;
          asks_money: Database["public"]["Enums"]["tri"] | null;
          caller_number_hash: string | null;
          claimed_identity: Database["public"]["Enums"]["claimed_identity"] | null;
          device_id: string | null;
          engine_version: string | null;
          handover: Database["public"]["Enums"]["handover_method"] | null;
          hard_rules: string[];
          id: string;
          protected_person_id: string;
          reason_codes: string[];
          risk_level: Database["public"]["Enums"]["risk_level"] | null;
          rushing: Database["public"]["Enums"]["tri"] | null;
          score: number | null;
          script_type: Database["public"]["Enums"]["script_type"] | null;
          secrecy: Database["public"]["Enums"]["tri"] | null;
          started_at: string;
          status: Database["public"]["Enums"]["check_status"];
          text_redacted: string | null;
        };
        ComputedFields: never;
        Insert: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          ai_level?: Database["public"]["Enums"]["risk_level"] | null;
          ai_provider?: string | null;
          answered_at?: string | null;
          asks_money?: Database["public"]["Enums"]["tri"] | null;
          caller_number_hash?: string | null;
          claimed_identity?: Database["public"]["Enums"]["claimed_identity"] | null;
          device_id?: string | null;
          engine_version?: string | null;
          handover?: Database["public"]["Enums"]["handover_method"] | null;
          hard_rules?: string[];
          id?: string;
          protected_person_id: string;
          reason_codes?: string[];
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          rushing?: Database["public"]["Enums"]["tri"] | null;
          score?: number | null;
          script_type?: Database["public"]["Enums"]["script_type"] | null;
          secrecy?: Database["public"]["Enums"]["tri"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["check_status"];
          text_redacted?: string | null;
        };
        Update: {
          acknowledged_at?: string | null;
          acknowledged_by?: string | null;
          ai_level?: Database["public"]["Enums"]["risk_level"] | null;
          ai_provider?: string | null;
          answered_at?: string | null;
          asks_money?: Database["public"]["Enums"]["tri"] | null;
          caller_number_hash?: string | null;
          claimed_identity?: Database["public"]["Enums"]["claimed_identity"] | null;
          device_id?: string | null;
          engine_version?: string | null;
          handover?: Database["public"]["Enums"]["handover_method"] | null;
          hard_rules?: string[];
          id?: string;
          protected_person_id?: string;
          reason_codes?: string[];
          risk_level?: Database["public"]["Enums"]["risk_level"] | null;
          rushing?: Database["public"]["Enums"]["tri"] | null;
          score?: number | null;
          script_type?: Database["public"]["Enums"]["script_type"] | null;
          secrecy?: Database["public"]["Enums"]["tri"] | null;
          started_at?: string;
          status?: Database["public"]["Enums"]["check_status"];
          text_redacted?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "checks_acknowledged_by_fkey";
            columns: ["acknowledged_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checks_device_id_fkey";
            columns: ["device_id"];
            isOneToOne: false;
            referencedRelation: "devices";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "checks_protected_person_id_fkey";
            columns: ["protected_person_id"];
            isOneToOne: false;
            referencedRelation: "protected_persons";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_invites: {
        Row: {
          created_at: string;
          display_name: string;
          expires_at: string;
          id: string;
          priority: number;
          protected_person_id: string;
          token_hash: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          expires_at: string;
          id?: string;
          priority: number;
          protected_person_id: string;
          token_hash: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          expires_at?: string;
          id?: string;
          priority?: number;
          protected_person_id?: string;
          token_hash?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "contact_invites_protected_person_id_fkey";
            columns: ["protected_person_id"];
            isOneToOne: false;
            referencedRelation: "protected_persons";
            referencedColumns: ["id"];
          },
        ];
      };
      devices: {
        Row: {
          id: string;
          label: string | null;
          last_seen_at: string | null;
          paired_at: string;
          protected_person_id: string;
          revoked_at: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          id?: string;
          label?: string | null;
          last_seen_at?: string | null;
          paired_at?: string;
          protected_person_id: string;
          revoked_at?: string | null;
          user_id: string;
        };
        Update: {
          id?: string;
          label?: string | null;
          last_seen_at?: string | null;
          paired_at?: string;
          protected_person_id?: string;
          revoked_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "devices_protected_person_id_fkey";
            columns: ["protected_person_id"];
            isOneToOne: false;
            referencedRelation: "protected_persons";
            referencedColumns: ["id"];
          },
        ];
      };
      districts: {
        Row: {
          code: string;
          name_bg: string;
        };
        ComputedFields: never;
        Insert: {
          code: string;
          name_bg: string;
        };
        Update: {
          code?: string;
          name_bg?: string;
        };
        Relationships: [];
      };
      pairing_codes: {
        Row: {
          code_hash: string;
          created_at: string;
          created_by: string;
          expires_at: string;
          id: string;
          protected_person_id: string;
          used_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          code_hash: string;
          created_at?: string;
          created_by: string;
          expires_at: string;
          id?: string;
          protected_person_id: string;
          used_at?: string | null;
        };
        Update: {
          code_hash?: string;
          created_at?: string;
          created_by?: string;
          expires_at?: string;
          id?: string;
          protected_person_id?: string;
          used_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "pairing_codes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pairing_codes_protected_person_id_fkey";
            columns: ["protected_person_id"];
            isOneToOne: false;
            referencedRelation: "protected_persons";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string;
          email_alerts: boolean;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          email_alerts?: boolean;
          id: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Update: {
          created_at?: string;
          display_name?: string;
          email_alerts?: boolean;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
        };
        Relationships: [];
      };
      protected_persons: {
        Row: {
          created_at: string;
          display_name: string;
          district_code: string;
          id: string;
          owner_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          district_code: string;
          id?: string;
          owner_id: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          district_code?: string;
          id?: string;
          owner_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "protected_persons_district_code_fkey";
            columns: ["district_code"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "protected_persons_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      rate_limits: {
        Row: {
          hits: number;
          key: string;
          window_start: string;
        };
        ComputedFields: never;
        Insert: {
          hits?: number;
          key: string;
          window_start: string;
        };
        Update: {
          hits?: number;
          key?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          caller_number_hash: string | null;
          description_redacted: string | null;
          district_code: string;
          id: string;
          occurred_on: string;
          reject_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          script_type: Database["public"]["Enums"]["script_type"];
          status: Database["public"]["Enums"]["report_status"];
          submitted_at: string;
        };
        ComputedFields: never;
        Insert: {
          caller_number_hash?: string | null;
          description_redacted?: string | null;
          district_code: string;
          id?: string;
          occurred_on: string;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          script_type: Database["public"]["Enums"]["script_type"];
          status?: Database["public"]["Enums"]["report_status"];
          submitted_at?: string;
        };
        Update: {
          caller_number_hash?: string | null;
          description_redacted?: string | null;
          district_code?: string;
          id?: string;
          occurred_on?: string;
          reject_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          script_type?: Database["public"]["Enums"]["script_type"];
          status?: Database["public"]["Enums"]["report_status"];
          submitted_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reports_district_code_fkey";
            columns: ["district_code"];
            isOneToOne: false;
            referencedRelation: "districts";
            referencedColumns: ["code"];
          },
          {
            foreignKeyName: "reports_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scam_scripts: {
        Row: {
          created_at: string;
          extra_keywords: string[];
          how_it_starts_bg: string;
          id: string;
          published: boolean;
          script_type: Database["public"]["Enums"]["script_type"];
          slug: string;
          title_bg: string;
          updated_at: string;
          updated_by: string | null;
          what_they_say_bg: string;
          what_to_do_bg: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          extra_keywords?: string[];
          how_it_starts_bg: string;
          id?: string;
          published?: boolean;
          script_type: Database["public"]["Enums"]["script_type"];
          slug: string;
          title_bg: string;
          updated_at?: string;
          updated_by?: string | null;
          what_they_say_bg: string;
          what_to_do_bg: string;
        };
        Update: {
          created_at?: string;
          extra_keywords?: string[];
          how_it_starts_bg?: string;
          id?: string;
          published?: boolean;
          script_type?: Database["public"]["Enums"]["script_type"];
          slug?: string;
          title_bg?: string;
          updated_at?: string;
          updated_by?: string | null;
          what_they_say_bg?: string;
          what_to_do_bg?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scam_scripts_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      trusted_contacts: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          phone: string | null;
          priority: number;
          protected_person_id: string;
          user_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          phone?: string | null;
          priority: number;
          protected_person_id: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          phone?: string | null;
          priority?: number;
          protected_person_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "trusted_contacts_protected_person_id_fkey";
            columns: ["protected_person_id"];
            isOneToOne: false;
            referencedRelation: "protected_persons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "trusted_contacts_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      app_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["app_role"];
      };
      get_map_stats: {
        Args: { weeks?: number };
        Returns: {
          district_code: string;
          report_count: number;
          script_type: Database["public"]["Enums"]["script_type"];
          week_start: string;
        }[];
      };
      has_family_access: { Args: { pid: string }; Returns: boolean };
      hit_rate_limit: {
        Args: { p_key: string; p_max_hits: number; p_window_seconds: number };
        Returns: boolean;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_device_of: { Args: { pid: string }; Returns: boolean };
      is_moderator: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_owner_of: { Args: { pid: string }; Returns: boolean };
    };
    Enums: {
      alert_channel: "realtime" | "push" | "email";
      alert_status: "pending" | "sent" | "failed";
      app_role: "family" | "protected" | "moderator" | "admin";
      check_status: "started" | "answered";
      claimed_identity: "police" | "relative" | "official" | "courier" | "other";
      handover_method: "courier_or_stranger" | "throw" | "bank_transfer" | "other";
      report_status: "pending" | "approved" | "rejected";
      risk_level: "green" | "yellow" | "red";
      script_type: "police" | "relative_in_trouble" | "fake_official" | "courier" | "unknown";
      tri: "yes" | "no" | "unsure";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      alert_channel: ["realtime", "push", "email"],
      alert_status: ["pending", "sent", "failed"],
      app_role: ["family", "protected", "moderator", "admin"],
      check_status: ["started", "answered"],
      claimed_identity: ["police", "relative", "official", "courier", "other"],
      handover_method: ["courier_or_stranger", "throw", "bank_transfer", "other"],
      report_status: ["pending", "approved", "rejected"],
      risk_level: ["green", "yellow", "red"],
      script_type: ["police", "relative_in_trouble", "fake_official", "courier", "unknown"],
      tri: ["yes", "no", "unsure"],
    },
  },
} as const;
