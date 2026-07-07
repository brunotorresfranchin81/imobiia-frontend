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
      ai_scores: {
        Row: {
          company_id: string
          generated_at: string
          id: string
          lead_id: string
          reasoning: string
          score: string
          suggested_action: string
        }
        Insert: {
          company_id: string
          generated_at?: string
          id?: string
          lead_id: string
          reasoning: string
          score: string
          suggested_action: string
        }
        Update: {
          company_id?: string
          generated_at?: string
          id?: string
          lead_id?: string
          reasoning?: string
          score?: string
          suggested_action?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_scores_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_summaries: {
        Row: {
          company_id: string
          content: string
          generated_at: string
          id: string
          lead_id: string
        }
        Insert: {
          company_id: string
          content: string
          generated_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          company_id?: string
          content?: string
          generated_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_summaries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_summaries_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"] | null
          admin_id: string
          company_id: string
          created_at: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["audit_action"] | null
          admin_id: string
          company_id: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"] | null
          admin_id?: string
          company_id?: string
          created_at?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          phone: string | null
          state: string | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          phone?: string | null
          state?: string | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          lead_id: string
          next_actions: string | null
          raw_messages: Json
          started_at: string
          status: Database["public"]["Enums"]["conversation_status"]
          summary: string | null
          typebot_session_id: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          lead_id: string
          next_actions?: string | null
          raw_messages?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          summary?: string | null
          typebot_session_id?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          lead_id?: string
          next_actions?: string | null
          raw_messages?: Json
          started_at?: string
          status?: Database["public"]["Enums"]["conversation_status"]
          summary?: string | null
          typebot_session_id?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interactions: {
        Row: {
          channel: Database["public"]["Enums"]["interaction_channel"] | null
          content: string | null
          created_at: string | null
          created_by: string
          direction: Database["public"]["Enums"]["direction"] | null
          duration_seconds: number | null
          id: string
          lead_id: string
          notes: string | null
          property_id: string | null
          result: Database["public"]["Enums"]["interaction_result"] | null
          type: Database["public"]["Enums"]["interaction_type"] | null
        }
        Insert: {
          channel?: Database["public"]["Enums"]["interaction_channel"] | null
          content?: string | null
          created_at?: string | null
          created_by: string
          direction?: Database["public"]["Enums"]["direction"] | null
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          property_id?: string | null
          result?: Database["public"]["Enums"]["interaction_result"] | null
          type?: Database["public"]["Enums"]["interaction_type"] | null
        }
        Update: {
          channel?: Database["public"]["Enums"]["interaction_channel"] | null
          content?: string | null
          created_at?: string | null
          created_by?: string
          direction?: Database["public"]["Enums"]["direction"] | null
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          property_id?: string | null
          result?: Database["public"]["Enums"]["interaction_result"] | null
          type?: Database["public"]["Enums"]["interaction_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "interactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          code: string
          company_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          updated_at: string | null
          used_count: number | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          updated_at?: string | null
          used_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_properties: {
        Row: {
          created_at: string | null
          interest_level: string | null
          lead_id: string
          property_id: string
        }
        Insert: {
          created_at?: string | null
          interest_level?: string | null
          lead_id: string
          property_id: string
        }
        Update: {
          created_at?: string | null
          interest_level?: string | null
          lead_id?: string
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_properties_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          company_id: string
          id: string
          lead_id: string
          new_status: string
          old_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          company_id: string
          id?: string
          lead_id: string
          new_status: string
          old_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          company_id?: string
          id?: string
          lead_id?: string
          new_status?: string
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_status_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          budget_max: number | null
          budget_min: number | null
          company_id: string
          created_at: string | null
          email: string
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          preferred_neighborhoods: string[] | null
          source: Database["public"]["Enums"]["lead_source"] | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          company_id: string
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_neighborhoods?: string[] | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          budget_max?: number | null
          budget_min?: number | null
          company_id?: string
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          preferred_neighborhoods?: string[] | null
          source?: Database["public"]["Enums"]["lead_source"] | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachments: string[] | null
          channel: Database["public"]["Enums"]["message_channel"] | null
          company_id: string
          content: string
          created_by: string | null
          direction: Database["public"]["Enums"]["direction"] | null
          id: string
          lead_id: string
          read_at: string | null
          sent_at: string
        }
        Insert: {
          attachments?: string[] | null
          channel?: Database["public"]["Enums"]["message_channel"] | null
          company_id: string
          content: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["direction"] | null
          id?: string
          lead_id: string
          read_at?: string | null
          sent_at?: string
        }
        Update: {
          attachments?: string[] | null
          channel?: Database["public"]["Enums"]["message_channel"] | null
          company_id?: string
          content?: string
          created_by?: string | null
          direction?: Database["public"]["Enums"]["direction"] | null
          id?: string
          lead_id?: string
          read_at?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          body: string
          company_id: string
          created_at: string | null
          id: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          body: string
          company_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          title: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          body?: string
          company_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_at: string | null
          changed_by: string
          id: string
          new_price: number | null
          old_price: number | null
          property_id: string
          reason: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          property_id: string
          reason?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          property_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active: boolean | null
          avatar_url: string | null
          company_id: string
          created_at: string | null
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          active?: boolean | null
          avatar_url?: string | null
          company_id: string
          created_at?: string | null
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          active?: boolean | null
          avatar_url?: string | null
          company_id?: string
          created_at?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      properties: {
        Row: {
          address: string
          area_m2: number | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          company_id: string
          created_at: string | null
          created_by: string
          description: string | null
          documents: string[] | null
          featured: boolean | null
          id: string
          neighborhood: string | null
          operation_type: Database["public"]["Enums"]["property_intent"] | null
          parking_spots: number | null
          photos: string[] | null
          price: number | null
          property_type: Database["public"]["Enums"]["property_type"] | null
          published: boolean | null
          reference_code: string
          slug: string | null
          state: string | null
          status: Database["public"]["Enums"]["property_status"] | null
          suites: number | null
          title: string
          updated_at: string | null
          zip_code: string | null
        }
        Insert: {
          address: string
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          company_id: string
          created_at?: string | null
          created_by: string
          description?: string | null
          documents?: string[] | null
          featured?: boolean | null
          id?: string
          neighborhood?: string | null
          operation_type?: Database["public"]["Enums"]["property_intent"] | null
          parking_spots?: number | null
          photos?: string[] | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          published?: boolean | null
          reference_code: string
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          suites?: number | null
          title: string
          updated_at?: string | null
          zip_code?: string | null
        }
        Update: {
          address?: string
          area_m2?: number | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          company_id?: string
          created_at?: string | null
          created_by?: string
          description?: string | null
          documents?: string[] | null
          featured?: boolean | null
          id?: string
          neighborhood?: string | null
          operation_type?: Database["public"]["Enums"]["property_intent"] | null
          parking_spots?: number | null
          photos?: string[] | null
          price?: number | null
          property_type?: Database["public"]["Enums"]["property_type"] | null
          published?: boolean | null
          reference_code?: string
          slug?: string | null
          state?: string | null
          status?: Database["public"]["Enums"]["property_status"] | null
          suites?: number | null
          title?: string
          updated_at?: string | null
          zip_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "properties_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          active: boolean
          created_at: string
          email: string
          id: string
          name: string
          notify_whatsapp: boolean
          updated_at: string
          whatsapp: string | null
          workspace_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email: string
          id: string
          name: string
          notify_whatsapp?: boolean
          updated_at?: string
          whatsapp?: string | null
          workspace_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string
          id?: string
          name?: string
          notify_whatsapp?: boolean
          updated_at?: string
          whatsapp?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      visits: {
        Row: {
          assigned_to: string
          checked_in_at: string | null
          checked_out_at: string | null
          created_at: string | null
          created_by: string
          duration_minutes: number | null
          feedback: string | null
          id: string
          lead_id: string
          property_id: string
          rating: number | null
          scheduled_at: string
          status: Database["public"]["Enums"]["visit_status"] | null
        }
        Insert: {
          assigned_to: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string | null
          created_by: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          lead_id: string
          property_id: string
          rating?: number | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["visit_status"] | null
        }
        Update: {
          assigned_to?: string
          checked_in_at?: string | null
          checked_out_at?: string | null
          created_at?: string | null
          created_by?: string
          duration_minutes?: number | null
          feedback?: string | null
          id?: string
          lead_id?: string
          property_id?: string
          rating?: number | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["visit_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "visits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visits_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          name: string
          onboarding_completed_at: string | null
          plan: Database["public"]["Enums"]["workspace_plan"]
          settings: Json
          updated_at: string
          whatsapp_number: string | null
          zapi_connected: boolean
          zapi_connected_at: string | null
          zapi_instance_id: string | null
          zapi_token: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          onboarding_completed_at?: string | null
          plan?: Database["public"]["Enums"]["workspace_plan"]
          settings?: Json
          updated_at?: string
          whatsapp_number?: string | null
          zapi_connected?: boolean
          zapi_connected_at?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          onboarding_completed_at?: string | null
          plan?: Database["public"]["Enums"]["workspace_plan"]
          settings?: Json
          updated_at?: string
          whatsapp_number?: string | null
          zapi_connected?: boolean
          zapi_connected_at?: string | null
          zapi_instance_id?: string | null
          zapi_token?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      vgv_summary: {
        Row: {
          company_id: string | null
          vgv_ativo: number | null
          vgv_reservado: number | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_invite_code: {
        Args: { p_expires_in?: string; p_max_uses?: number }
        Returns: {
          code: string
          company_id: string
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          max_uses: number | null
          updated_at: string | null
          used_count: number | null
        }
        SetofOptions: {
          from: "*"
          to: "invites"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_company_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      current_workspace_id: { Args: never; Returns: string }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_company_by_invite_code: { Args: { p_code: string }; Returns: Json }
      get_dashboard_metrics: { Args: never; Returns: Json }
      get_lead_messages: {
        Args: { p_lead_id: string }
        Returns: {
          content: string
          conversation_id: string
          sender: string
          sent_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      audit_action: "create" | "update" | "delete"
      conversation_status:
        | "ativa"
        | "encerrada"
        | "encerrada_por_inatividade"
        | "transferida"
      direction: "inbound" | "outbound"
      interaction_channel:
        | "telefone"
        | "email"
        | "whatsapp"
        | "presencial"
        | "online"
      interaction_result:
        | "interesse_alto"
        | "interesse_medio"
        | "interesse_baixo"
        | "desinteressado"
        | "sem_contato"
        | "outro"
      interaction_type:
        | "chamada"
        | "email"
        | "whatsapp"
        | "visita"
        | "reuniao"
        | "proposta"
        | "contato_inicial"
        | "follow_up"
      interest_level: "frio" | "morno" | "quente"
      lead_intent: "compra" | "aluguel" | "indefinido"
      lead_source: "site" | "portal" | "indicacao" | "outro"
      lead_status:
        | "novo"
        | "qualificado"
        | "em_visita"
        | "proposta"
        | "fechado"
        | "perdido"
      message_channel: "whatsapp" | "email" | "chat"
      notification_type:
        | "visit_reminder"
        | "lead_assigned"
        | "price_change"
        | "message_received"
        | "visit_confirmed"
      property_intent: "venda" | "aluguel"
      property_status: "ativo" | "reservado" | "vendido" | "arquivado"
      property_type: "apartamento" | "casa" | "comercial" | "terreno" | "outro"
      qualification_status: "incompleto" | "completo"
      user_role: "corretor" | "gestor" | "admin"
      visit_status:
        | "agendada"
        | "confirmada"
        | "realizada"
        | "cancelada"
        | "nao_compareceu"
      workspace_plan: "free" | "starter" | "pro"
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
      audit_action: ["create", "update", "delete"],
      conversation_status: [
        "ativa",
        "encerrada",
        "encerrada_por_inatividade",
        "transferida",
      ],
      direction: ["inbound", "outbound"],
      interaction_channel: [
        "telefone",
        "email",
        "whatsapp",
        "presencial",
        "online",
      ],
      interaction_result: [
        "interesse_alto",
        "interesse_medio",
        "interesse_baixo",
        "desinteressado",
        "sem_contato",
        "outro",
      ],
      interaction_type: [
        "chamada",
        "email",
        "whatsapp",
        "visita",
        "reuniao",
        "proposta",
        "contato_inicial",
        "follow_up",
      ],
      interest_level: ["frio", "morno", "quente"],
      lead_intent: ["compra", "aluguel", "indefinido"],
      lead_source: ["site", "portal", "indicacao", "outro"],
      lead_status: [
        "novo",
        "qualificado",
        "em_visita",
        "proposta",
        "fechado",
        "perdido",
      ],
      message_channel: ["whatsapp", "email", "chat"],
      notification_type: [
        "visit_reminder",
        "lead_assigned",
        "price_change",
        "message_received",
        "visit_confirmed",
      ],
      property_intent: ["venda", "aluguel"],
      property_status: ["ativo", "reservado", "vendido", "arquivado"],
      property_type: ["apartamento", "casa", "comercial", "terreno", "outro"],
      qualification_status: ["incompleto", "completo"],
      user_role: ["corretor", "gestor", "admin"],
      visit_status: [
        "agendada",
        "confirmada",
        "realizada",
        "cancelada",
        "nao_compareceu",
      ],
      workspace_plan: ["free", "starter", "pro"],
    },
  },
} as const
