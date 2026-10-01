// Auto-generated TypeScript types matching supabase/migrations/0001_init.sql

export type Role = 'owner' | 'editor' | 'viewer'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          created_at: string
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          created_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          owner_id: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          created_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: Role
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: Role
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: Role
          created_at?: string
        }
      }
      forms: {
        Row: {
          id: string
          project_id: string
          name: string
          content: FormContent
          version: number
          created_by: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          content?: FormContent
          version?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          content?: FormContent
          version?: number
          created_by?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attachments: {
        Row: {
          id: string
          form_id: string
          field_ref: string | null
          file_name: string
          mime: string | null
          size: number | null
          storage_path: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          form_id: string
          field_ref?: string | null
          file_name: string
          mime?: string | null
          size?: number | null
          storage_path: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          form_id?: string
          field_ref?: string | null
          file_name?: string
          mime?: string | null
          size?: number | null
          storage_path?: string
          created_by?: string | null
          created_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          project_id: string
          email: string
          role: Role
          invited_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          email: string
          role?: Role
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          email?: string
          role?: Role
          invited_by?: string | null
          created_at?: string
        }
      }
    }
    Functions: {
      is_project_member: {
        Args: { pid: string }
        Returns: boolean
      }
      project_role: {
        Args: { pid: string }
        Returns: Role | null
      }
      shares_project: {
        Args: { other: string }
        Returns: boolean
      }
      form_project: {
        Args: { fid: string }
        Returns: string
      }
      save_form: {
        Args: { p_id: string; p_content: FormContent; p_expected_version: number }
        Returns: number
      }
      accept_my_invitations: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}

// -----------------------------------------------------------------------
// Form content shape — mirrors the prototype's in-memory model exactly.
// The entire form lives in forms.content (a jsonb column).
// -----------------------------------------------------------------------

export interface FormContent {
  fields: FormField[]
  buttons: FormButton[]
  statuses: StatusModel
  notes?: string
}

export interface FormField {
  id: string
  type: FieldType
  label: string
  key: string
  considered?: boolean
  // per-type answers (see TYPES in the prototype)
  [key: string]: unknown
}

export interface FormButton {
  id: string
  considered?: boolean
  [key: string]: unknown
}

export interface StatusModel {
  list: Status[]
  initials: string[]    // ids of initial states
  terminals: string[]   // ids of terminal states
  transitions: Transition[]
}

export interface Status {
  id: string
  name: string
  color: string
}

export interface Transition {
  id: string
  from: string
  to: string
  label?: string
  condition?: string
}

export type FieldType =
  | 'shortText'
  | 'longText'
  | 'email'
  | 'number'
  | 'currency'
  | 'phone'
  | 'date'
  | 'dropdown'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'lookup'
  | 'calculated'
  | 'table'
