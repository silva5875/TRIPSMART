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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accommodation_reviews: {
        Row: {
          accommodation_name: string
          city_id: string
          comment: string | null
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          accommodation_name: string
          city_id: string
          comment?: string | null
          created_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          accommodation_name?: string
          city_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      activity_reviews: {
        Row: {
          activity_name: string
          city_id: string
          comment: string | null
          created_at: string
          id: string
          score: number
          user_id: string
        }
        Insert: {
          activity_name: string
          city_id: string
          comment?: string | null
          created_at?: string
          id?: string
          score: number
          user_id: string
        }
        Update: {
          activity_name?: string
          city_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      itinerary_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          itinerary_id: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          itinerary_id: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          itinerary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_comments_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "shared_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_likes: {
        Row: {
          created_at: string
          id: string
          itinerary_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_likes_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "shared_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      itinerary_ratings: {
        Row: {
          created_at: string
          id: string
          itinerary_id: string
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_id: string
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itinerary_ratings_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "shared_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          id: string
          imagem_perfil: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          imagem_perfil?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          imagem_perfil?: string | null
        }
        Relationships: []
      }
      saved_itineraries: {
        Row: {
          created_at: string
          id: string
          itinerary_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          itinerary_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          itinerary_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_itineraries_itinerary_id_fkey"
            columns: ["itinerary_id"]
            isOneToOne: false
            referencedRelation: "shared_itineraries"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_itineraries: {
        Row: {
          accommodation: Json | null
          budget: number
          budget_label: string
          city: string
          city_name: string
          created_at: string
          days: number
          description: string | null
          group_type: string
          id: string
          itinerary_data: Json | null
          likes_count: number | null
          local_transport: string | null
          map_data: Json | null
          month: number | null
          people: number
          rating_avg: number | null
          rating_count: number | null
          selected_spots: Json
          title: string
          transport_to_destination: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accommodation?: Json | null
          budget: number
          budget_label: string
          city: string
          city_name: string
          created_at?: string
          days?: number
          description?: string | null
          group_type?: string
          id?: string
          itinerary_data?: Json | null
          likes_count?: number | null
          local_transport?: string | null
          map_data?: Json | null
          month?: number | null
          people?: number
          rating_avg?: number | null
          rating_count?: number | null
          selected_spots?: Json
          title: string
          transport_to_destination?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accommodation?: Json | null
          budget?: number
          budget_label?: string
          city?: string
          city_name?: string
          created_at?: string
          days?: number
          description?: string | null
          group_type?: string
          id?: string
          itinerary_data?: Json | null
          likes_count?: number | null
          local_transport?: string | null
          map_data?: Json | null
          month?: number | null
          people?: number
          rating_avg?: number | null
          rating_count?: number | null
          selected_spots?: Json
          title?: string
          transport_to_destination?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      travel_history: {
        Row: {
          accommodation: string | null
          budget: number
          country: string
          created_at: string
          entertainment: string[]
          food: string[]
          group_type: string
          id: string
          local_transport: string | null
          month: number | null
          people: number
          restaurants: Json | null
          state: string
          tourist_spots: Json | null
          transport_to_destination: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accommodation?: string | null
          budget: number
          country: string
          created_at?: string
          entertainment?: string[]
          food?: string[]
          group_type?: string
          id?: string
          local_transport?: string | null
          month?: number | null
          people?: number
          restaurants?: Json | null
          state: string
          tourist_spots?: Json | null
          transport_to_destination?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accommodation?: string | null
          budget?: number
          country?: string
          created_at?: string
          entertainment?: string[]
          food?: string[]
          group_type?: string
          id?: string
          local_transport?: string | null
          month?: number | null
          people?: number
          restaurants?: Json | null
          state?: string
          tourist_spots?: Json | null
          transport_to_destination?: string | null
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
      [_ in never]: never
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
