// Generated from the TaxSteps Supabase project (generate_typescript_types). Regenerate after schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.18' }
  public: {
    Tables: {
      api_usage: {
        Row: { created_at: string; id: number; kind: string; user_id: string }
        Insert: { created_at?: string; id?: never; kind: string; user_id: string }
        Update: { created_at?: string; id?: never; kind?: string; user_id?: string }
        Relationships: []
      }
      categories: {
        Row: {
          archived: boolean; color: string; created_at: string; icon: string; id: string; name: string
          sort: number; updated_at: string; user_id: string
        }
        Insert: {
          archived?: boolean; color?: string; created_at?: string; icon?: string; id?: string; name: string
          sort?: number; updated_at?: string; user_id?: string
        }
        Update: {
          archived?: boolean; color?: string; created_at?: string; icon?: string; id?: string; name?: string
          sort?: number; updated_at?: string; user_id?: string
        }
        Relationships: []
      }
      document_types: {
        Row: { code: string; label: string; sort: number }
        Insert: { code: string; label: string; sort?: number }
        Update: { code?: string; label?: string; sort?: number }
        Relationships: []
      }
      documents: {
        Row: {
          amount: number; category_id: string | null; created_at: string; currency: string; description: string | null
          document_type: string; expense_type: string; id: string; invoice_number: string | null; merchant_name: string
          metadata: Json; payment_method: string | null; source: string; status: string; tax_amount: number | null
          tax_label: string | null; title: string | null; transaction_date: string; updated_at: string; user_id: string
        }
        Insert: {
          amount: number; category_id?: string | null; created_at?: string; currency: string; description?: string | null
          document_type?: string; expense_type?: string; id?: string; invoice_number?: string | null; merchant_name: string
          metadata?: Json; payment_method?: string | null; source?: string; status?: string; tax_amount?: number | null
          tax_label?: string | null; title?: string | null; transaction_date: string; updated_at?: string; user_id?: string
        }
        Update: {
          amount?: number; category_id?: string | null; created_at?: string; currency?: string; description?: string | null
          document_type?: string; expense_type?: string; id?: string; invoice_number?: string | null; merchant_name?: string
          metadata?: Json; payment_method?: string | null; source?: string; status?: string; tax_amount?: number | null
          tax_label?: string | null; title?: string | null; transaction_date?: string; updated_at?: string; user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: 'documents_category_id_user_id_fkey'
            columns: ['category_id', 'user_id']
            isOneToOne: false
            referencedRelation: 'categories'
            referencedColumns: ['id', 'user_id']
          },
          {
            foreignKeyName: 'documents_document_type_fkey'
            columns: ['document_type']
            isOneToOne: false
            referencedRelation: 'document_types'
            referencedColumns: ['code']
          },
        ]
      }
      google_connections: {
        Row: {
          created_at: string; default_sheet_name: string | null; default_spreadsheet_id: string | null
          google_email: string | null; refresh_token_enc: string; updated_at: string; user_id: string
        }
        Insert: {
          created_at?: string; default_sheet_name?: string | null; default_spreadsheet_id?: string | null
          google_email?: string | null; refresh_token_enc: string; updated_at?: string; user_id: string
        }
        Update: {
          created_at?: string; default_sheet_name?: string | null; default_spreadsheet_id?: string | null
          google_email?: string | null; refresh_token_enc?: string; updated_at?: string; user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_name: string | null; country: string | null; created_at: string; currency: string
          full_name: string | null; fy_start_day: number; fy_start_month: number; id: string; locale: string
          tax_number: string | null; timezone: string; updated_at: string
        }
        Insert: {
          business_name?: string | null; country?: string | null; created_at?: string; currency?: string
          full_name?: string | null; fy_start_day?: number; fy_start_month?: number; id: string; locale?: string
          tax_number?: string | null; timezone?: string; updated_at?: string
        }
        Update: {
          business_name?: string | null; country?: string | null; created_at?: string; currency?: string
          full_name?: string | null; fy_start_day?: number; fy_start_month?: number; id?: string; locale?: string
          tax_number?: string | null; timezone?: string; updated_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      consume_rate_limit: {
        Args: { p_kind: string; p_per_day: number; p_per_hour: number; p_user_id: string }
        Returns: boolean
      }
      document_summary: {
        Args: { p_filters?: Json; p_from?: string; p_to?: string }
        Returns: Json
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
