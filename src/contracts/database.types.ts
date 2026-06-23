export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      content_version: {
        Row: {
          checksum: string | null
          content_key: string
          created_at: string
          id: string
          locale: string
          published_at: string
          version: string
        }
        Insert: {
          checksum?: string | null
          content_key: string
          created_at?: string
          id?: string
          locale: string
          published_at?: string
          version: string
        }
        Update: {
          checksum?: string | null
          content_key?: string
          created_at?: string
          id?: string
          locale?: string
          published_at?: string
          version?: string
        }
        Relationships: []
      }
      device_push_token: {
        Row: {
          apns_token: string | null
          created_at: string
          device_id: string
          enabled: boolean
          expo_push_token: string | null
          fcm_token: string | null
          id: string
          last_seen_at: string
          platform: Database["public"]["Enums"]["device_platform"]
          revoked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apns_token?: string | null
          created_at?: string
          device_id: string
          enabled?: boolean
          expo_push_token?: string | null
          fcm_token?: string | null
          id?: string
          last_seen_at?: string
          platform: Database["public"]["Enums"]["device_platform"]
          revoked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apns_token?: string | null
          created_at?: string
          device_id?: string
          enabled?: boolean
          expo_push_token?: string | null
          fcm_token?: string | null
          id?: string
          last_seen_at?: string
          platform?: Database["public"]["Enums"]["device_platform"]
          revoked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      event_log: {
        Row: {
          client_event_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          household_id: string
          id: string
          occurred_at: string
          payload: Json
          payload_version: number
          puppy_id: string
          updated_at: string
          version: number
        }
        Insert: {
          client_event_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          household_id: string
          id?: string
          occurred_at: string
          payload?: Json
          payload_version?: number
          puppy_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          client_event_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          household_id?: string
          id?: string
          occurred_at?: string
          payload?: Json
          payload_version?: number
          puppy_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_log_puppy_id_household_id_fkey"
            columns: ["puppy_id", "household_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      health_record: {
        Row: {
          completed_at: string | null
          created_at: string
          deleted_at: string | null
          id: string
          notes: string | null
          provider_name: string | null
          puppy_id: string
          record_type: string
          scheduled_for: string | null
          source: string
          status: string
          title: string
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          provider_name?: string | null
          puppy_id: string
          record_type: string
          scheduled_for?: string | null
          source: string
          status: string
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          notes?: string | null
          provider_name?: string | null
          puppy_id?: string
          record_type?: string
          scheduled_for?: string | null
          source?: string
          status?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "health_record_puppy_id_fkey"
            columns: ["puppy_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id"]
          },
        ]
      }
      household: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      household_membership: {
        Row: {
          accepted_at: string | null
          created_at: string
          household_id: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["household_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          household_id: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role: Database["public"]["Enums"]["household_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          household_id?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          role?: Database["public"]["Enums"]["household_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "household_membership_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      invite: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          email_hash: string | null
          expires_at: string
          household_id: string
          id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["household_role"]
          token_last4: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          email_hash?: string | null
          expires_at: string
          household_id: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["household_role"]
          token_last4?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          email_hash?: string | null
          expires_at?: string
          household_id?: string
          id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["household_role"]
          token_last4?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invite_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      media_asset: {
        Row: {
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          media_type: string
          puppy_id: string | null
          storage_bucket: string
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          media_type: string
          puppy_id?: string | null
          storage_bucket: string
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          media_type?: string
          puppy_id?: string | null
          storage_bucket?: string
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_asset_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_asset_puppy_household_fk"
            columns: ["puppy_id", "household_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "media_asset_puppy_id_fkey"
            columns: ["puppy_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_log: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          delivery_status: Database["public"]["Enums"]["notification_delivery_status"]
          error_category: string | null
          household_id: string | null
          id: string
          notification_type: string
          provider_message_id: string | null
          user_id: string | null
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivery_status: Database["public"]["Enums"]["notification_delivery_status"]
          error_category?: string | null
          household_id?: string | null
          id?: string
          notification_type: string
          provider_message_id?: string | null
          user_id?: string | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          delivery_status?: Database["public"]["Enums"]["notification_delivery_status"]
          error_category?: string | null
          household_id?: string | null
          id?: string
          notification_type?: string
          provider_message_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_log_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preference: {
        Row: {
          created_at: string
          household_id: string
          id: string
          quiet_hours: Json | null
          reminder_push_enabled: boolean
          timezone: string
          trusted_sitter_completion_push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          household_id: string
          id?: string
          quiet_hours?: Json | null
          reminder_push_enabled?: boolean
          timezone: string
          trusted_sitter_completion_push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          household_id?: string
          id?: string
          quiet_hours?: Json | null
          reminder_push_enabled?: boolean
          timezone?: string
          trusted_sitter_completion_push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preference_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      puppy: {
        Row: {
          age_weeks_estimate: number | null
          birth_date: string | null
          created_at: string
          deleted_at: string | null
          household_id: string
          id: string
          name: string
          quick_tracker_ids: string[]
          updated_at: string
        }
        Insert: {
          age_weeks_estimate?: number | null
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id: string
          id?: string
          name: string
          quick_tracker_ids?: string[]
          updated_at?: string
        }
        Update: {
          age_weeks_estimate?: number | null
          birth_date?: string | null
          created_at?: string
          deleted_at?: string | null
          household_id?: string
          id?: string
          name?: string
          quick_tracker_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "puppy_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          enabled: boolean
          id: string
          puppy_id: string
          quiet_hours: Json | null
          reminder_type: string
          schedule_rule: Json
          timezone: string
          trusted_sitter_visible: boolean
          updated_at: string
          version: number
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          enabled?: boolean
          id?: string
          puppy_id: string
          quiet_hours?: Json | null
          reminder_type: string
          schedule_rule?: Json
          timezone: string
          trusted_sitter_visible?: boolean
          updated_at?: string
          version?: number
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          enabled?: boolean
          id?: string
          puppy_id?: string
          quiet_hours?: Json | null
          reminder_type?: string
          schedule_rule?: Json
          timezone?: string
          trusted_sitter_visible?: boolean
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "reminder_puppy_id_fkey"
            columns: ["puppy_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_occurrence: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          action_taken: string | null
          created_at: string
          id: string
          local_notification_id: string | null
          reminder_id: string
          scheduled_for: string
          status: Database["public"]["Enums"]["reminder_occurrence_status"]
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          action_taken?: string | null
          created_at?: string
          id?: string
          local_notification_id?: string | null
          reminder_id: string
          scheduled_for: string
          status?: Database["public"]["Enums"]["reminder_occurrence_status"]
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          action_taken?: string | null
          created_at?: string
          id?: string
          local_notification_id?: string | null
          reminder_id?: string
          scheduled_for?: string
          status?: Database["public"]["Enums"]["reminder_occurrence_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_occurrence_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminder"
            referencedColumns: ["id"]
          },
        ]
      }
      share_link: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          expires_at: string
          household_id: string
          id: string
          puppy_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["share_role"]
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          expires_at: string
          household_id: string
          id?: string
          puppy_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["share_role"]
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string
          household_id?: string
          id?: string
          puppy_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["share_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "share_link_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "share_link_puppy_id_household_id_fkey"
            columns: ["puppy_id", "household_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id", "household_id"]
          },
        ]
      }
      share_scope: {
        Row: {
          created_at: string
          id: string
          scope: Database["public"]["Enums"]["share_scope_type"]
          selected_event_types:
            | Database["public"]["Enums"]["event_type"][]
            | null
          share_link_id: string
          timeline_from: string | null
          timeline_to: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          scope: Database["public"]["Enums"]["share_scope_type"]
          selected_event_types?:
            | Database["public"]["Enums"]["event_type"][]
            | null
          share_link_id: string
          timeline_from?: string | null
          timeline_to?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          scope?: Database["public"]["Enums"]["share_scope_type"]
          selected_event_types?:
            | Database["public"]["Enums"]["event_type"][]
            | null
          share_link_id?: string
          timeline_from?: string | null
          timeline_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "share_scope_share_link_id_fkey"
            columns: ["share_link_id"]
            isOneToOne: false
            referencedRelation: "share_link"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_entitlement: {
        Row: {
          created_at: string
          entitlement: string
          household_id: string
          id: string
          provider: string
          provider_customer_id_hash: string | null
          renews_at: string | null
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          entitlement: string
          household_id: string
          id?: string
          provider: string
          provider_customer_id_hash?: string | null
          renews_at?: string | null
          status: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          entitlement?: string
          household_id?: string
          id?: string
          provider?: string
          provider_customer_id_hash?: string | null
          renews_at?: string | null
          status?: Database["public"]["Enums"]["entitlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_entitlement_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
        ]
      }
      trusted_sitter_completion_event: {
        Row: {
          completed_by: string
          completion_type: string
          created_at: string
          household_id: string
          id: string
          puppy_id: string
          source_event_id: string | null
        }
        Insert: {
          completed_by: string
          completion_type: string
          created_at?: string
          household_id: string
          id?: string
          puppy_id: string
          source_event_id?: string | null
        }
        Update: {
          completed_by?: string
          completion_type?: string
          created_at?: string
          household_id?: string
          id?: string
          puppy_id?: string
          source_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trusted_sitter_completion_event_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "household"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trusted_sitter_completion_event_puppy_id_household_id_fkey"
            columns: ["puppy_id", "household_id"]
            isOneToOne: false
            referencedRelation: "puppy"
            referencedColumns: ["id", "household_id"]
          },
          {
            foreignKeyName: "trusted_sitter_completion_event_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "event_log"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      share_health_summary: {
        Row: {
          completed_at: string | null
          health_record_id: string | null
          scheduled_for: string | null
          share_link_id: string | null
          source: string | null
          status: string | null
          title: string | null
        }
        Relationships: []
      }
      share_link_view: {
        Row: {
          accepted_at: string | null
          expires_at: string | null
          household_id: string | null
          puppy_id: string | null
          revoked_at: string | null
          role: Database["public"]["Enums"]["share_role"] | null
          scopes: Database["public"]["Enums"]["share_scope_type"][] | null
          share_link_id: string | null
        }
        Relationships: []
      }
      share_puppy_profile: {
        Row: {
          age_weeks_estimate: number | null
          birth_date: string | null
          name: string | null
          puppy_id: string | null
          share_link_id: string | null
        }
        Relationships: []
      }
      share_routine_summary: {
        Row: {
          event_count: number | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          latest_time_bucket: string | null
          share_link_id: string | null
        }
        Relationships: []
      }
      share_selected_timeline: {
        Row: {
          actor_label: string | null
          event_id: string | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          occurred_at: string | null
          share_link_id: string | null
        }
        Relationships: []
      }
      share_training_notes: {
        Row: {
          duration_bucket: string | null
          event_id: string | null
          occurred_at: string | null
          occurred_time_bucket: string | null
          share_link_id: string | null
          training_topic: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      active_share_link_ids: { Args: never; Returns: string[] }
      bootstrap_current_user: {
        Args: { p_display_name?: string }
        Returns: {
          created: boolean
          household_id: string
        }[]
      }
      current_household_ids: { Args: never; Returns: string[] }
      current_share_health_summary: {
        Args: never
        Returns: {
          completed_at: string
          health_record_id: string
          scheduled_for: string
          share_link_id: string
          source: string
          status: string
          title: string
        }[]
      }
      current_share_link_metadata: {
        Args: never
        Returns: {
          accepted_at: string
          expires_at: string
          household_id: string
          puppy_id: string
          revoked_at: string
          role: Database["public"]["Enums"]["share_role"]
          scopes: Database["public"]["Enums"]["share_scope_type"][]
          share_link_id: string
        }[]
      }
      current_share_puppy_profile: {
        Args: never
        Returns: {
          age_weeks_estimate: number
          birth_date: string
          name: string
          puppy_id: string
          share_link_id: string
        }[]
      }
      current_share_routine_summary: {
        Args: never
        Returns: {
          event_count: number
          event_type: Database["public"]["Enums"]["event_type"]
          latest_time_bucket: string
          share_link_id: string
        }[]
      }
      current_share_selected_timeline: {
        Args: never
        Returns: {
          actor_label: string
          event_id: string
          event_type: Database["public"]["Enums"]["event_type"]
          occurred_at: string
          share_link_id: string
        }[]
      }
      current_share_training_notes: {
        Args: never
        Returns: {
          duration_bucket: string
          event_id: string
          occurred_at: string
          occurred_time_bucket: string
          share_link_id: string
          training_topic: string
        }[]
      }
      has_household_role: {
        Args: {
          allowed_roles: Database["public"]["Enums"]["household_role"][]
          target_household_id: string
        }
        Returns: boolean
      }
      quick_tracker_ids_are_unique: {
        Args: { tracker_ids: string[] }
        Returns: boolean
      }
      share_link_has_scope: {
        Args: {
          target_scope: Database["public"]["Enums"]["share_scope_type"]
          target_share_link_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      device_platform: "ios" | "android"
      entitlement_status:
        | "active"
        | "trialing"
        | "past_due"
        | "canceled"
        | "expired"
      event_type:
        | "potty"
        | "feeding"
        | "sleep"
        | "walk"
        | "zoomies"
        | "training"
        | "health_record_reference"
      household_role: "owner" | "caregiver" | "viewer"
      notification_channel: "push" | "email"
      notification_delivery_status:
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "suppressed"
      reminder_occurrence_status:
        | "scheduled"
        | "completed"
        | "skipped"
        | "missed"
        | "canceled"
      share_role: "trainer_viewer"
      share_scope_type:
        | "routine_summary"
        | "selected_timeline_range"
        | "training_notes"
        | "health_summary"
        | "puppy_profile"
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
      device_platform: ["ios", "android"],
      entitlement_status: [
        "active",
        "trialing",
        "past_due",
        "canceled",
        "expired",
      ],
      event_type: [
        "potty",
        "feeding",
        "sleep",
        "walk",
        "zoomies",
        "training",
        "health_record_reference",
      ],
      household_role: ["owner", "caregiver", "viewer"],
      notification_channel: ["push", "email"],
      notification_delivery_status: [
        "queued",
        "sent",
        "delivered",
        "failed",
        "suppressed",
      ],
      reminder_occurrence_status: [
        "scheduled",
        "completed",
        "skipped",
        "missed",
        "canceled",
      ],
      share_role: ["trainer_viewer"],
      share_scope_type: [
        "routine_summary",
        "selected_timeline_range",
        "training_notes",
        "health_summary",
        "puppy_profile",
      ],
    },
  },
} as const
