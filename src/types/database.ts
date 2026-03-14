export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      institutions: {
        Row: {
          id: string
          name: string
          slug: string
          address: string | null
          phone: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          slug: string
          address?: string | null
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          address?: string | null
          phone?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      users: {
        Row: {
          id: string
          institution_id: string | null
          full_name: string | null
          role: "admin" | "radiologist" | "clinician" | "technician" | null
          specialization: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          institution_id?: string | null
          full_name?: string | null
          role?: "admin" | "radiologist" | "clinician" | "technician" | null
          specialization?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          institution_id?: string | null
          full_name?: string | null
          role?: "admin" | "radiologist" | "clinician" | "technician" | null
          specialization?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
      patients: {
        Row: {
          id: string
          institution_id: string
          mrn: string
          full_name: string
          date_of_birth: string | null
          gender: "M" | "F" | "Other" | "Unknown" | null
          phone: string | null
          email: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          institution_id: string
          mrn: string
          full_name: string
          date_of_birth?: string | null
          gender?: "M" | "F" | "Other" | "Unknown" | null
          phone?: string | null
          email?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          institution_id?: string
          mrn?: string
          full_name?: string
          date_of_birth?: string | null
          gender?: "M" | "F" | "Other" | "Unknown" | null
          phone?: string | null
          email?: string | null
          created_at?: string | null
        }
      }
      studies: {
        Row: {
          id: string
          institution_id: string
          patient_id: string
          accession_number: string | null
          study_instance_uid: string | null
          modality: string
          body_part: string | null
          study_description: string | null
          study_date: string | null
          referring_physician: string | null
          status: "unread" | "in_progress" | "reported" | "verified" | "amended" | null
          priority: "stat" | "urgent" | "routine" | null
          assigned_to: string | null
          num_series: number | null
          num_images: number | null
          storage_path: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          institution_id: string
          patient_id: string
          accession_number?: string | null
          study_instance_uid?: string | null
          modality?: string
          body_part?: string | null
          study_description?: string | null
          study_date?: string | null
          referring_physician?: string | null
          status?: "unread" | "in_progress" | "reported" | "verified" | "amended" | null
          priority?: "stat" | "urgent" | "routine" | null
          assigned_to?: string | null
          num_series?: number | null
          num_images?: number | null
          storage_path?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          institution_id?: string
          patient_id?: string
          accession_number?: string | null
          study_instance_uid?: string | null
          modality?: string
          body_part?: string | null
          study_description?: string | null
          study_date?: string | null
          referring_physician?: string | null
          status?: "unread" | "in_progress" | "reported" | "verified" | "amended" | null
          priority?: "stat" | "urgent" | "routine" | null
          assigned_to?: string | null
          num_series?: number | null
          num_images?: number | null
          storage_path?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      series: {
        Row: {
          id: string
          study_id: string
          series_instance_uid: string | null
          series_number: number | null
          series_description: string | null
          modality: string | null
          num_images: number | null
          storage_path: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          study_id: string
          series_instance_uid?: string | null
          series_number?: number | null
          series_description?: string | null
          modality?: string | null
          num_images?: number | null
          storage_path?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          study_id?: string
          series_instance_uid?: string | null
          series_number?: number | null
          series_description?: string | null
          modality?: string | null
          num_images?: number | null
          storage_path?: string | null
          created_at?: string | null
        }
      }
      images: {
        Row: {
          id: string
          series_id: string
          study_id: string
          sop_instance_uid: string | null
          instance_number: number | null
          storage_path: string
          file_size: number | null
          rows: number | null
          columns: number | null
          bits_allocated: number | null
          photometric: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          series_id: string
          study_id: string
          sop_instance_uid?: string | null
          instance_number?: number | null
          storage_path: string
          file_size?: number | null
          rows?: number | null
          columns?: number | null
          bits_allocated?: number | null
          photometric?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          series_id?: string
          study_id?: string
          sop_instance_uid?: string | null
          instance_number?: number | null
          storage_path?: string
          file_size?: number | null
          rows?: number | null
          columns?: number | null
          bits_allocated?: number | null
          photometric?: string | null
          created_at?: string | null
        }
      }
      reports: {
        Row: {
          id: string
          study_id: string
          institution_id: string
          radiologist_id: string | null
          template_id: string | null
          clinical_history: string | null
          technique: string | null
          findings: string
          impression: string
          recommendation: string | null
          critical_finding: boolean | null
          status: "draft" | "preliminary" | "final" | "amended" | "addendum" | null
          signed_at: string | null
          signed_by: string | null
          hl7_sent: boolean | null
          hl7_sent_at: string | null
          hl7_message_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          study_id: string
          institution_id: string
          radiologist_id?: string | null
          template_id?: string | null
          clinical_history?: string | null
          technique?: string | null
          findings?: string
          impression?: string
          recommendation?: string | null
          critical_finding?: boolean | null
          status?: "draft" | "preliminary" | "final" | "amended" | "addendum" | null
          signed_at?: string | null
          signed_by?: string | null
          hl7_sent?: boolean | null
          hl7_sent_at?: string | null
          hl7_message_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          study_id?: string
          institution_id?: string
          radiologist_id?: string | null
          template_id?: string | null
          clinical_history?: string | null
          technique?: string | null
          findings?: string
          impression?: string
          recommendation?: string | null
          critical_finding?: boolean | null
          status?: "draft" | "preliminary" | "final" | "amended" | "addendum" | null
          signed_at?: string | null
          signed_by?: string | null
          hl7_sent?: boolean | null
          hl7_sent_at?: string | null
          hl7_message_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      report_templates: {
        Row: {
          id: string
          institution_id: string | null
          name: string
          modality: string | null
          body_part: string | null
          technique_text: string | null
          findings_prompt: string | null
          impression_prompt: string | null
          is_global: boolean | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          institution_id?: string | null
          name: string
          modality?: string | null
          body_part?: string | null
          technique_text?: string | null
          findings_prompt?: string | null
          impression_prompt?: string | null
          is_global?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          institution_id?: string | null
          name?: string
          modality?: string | null
          body_part?: string | null
          technique_text?: string | null
          findings_prompt?: string | null
          impression_prompt?: string | null
          is_global?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
      }
      worklist_items: {
        Row: {
          id: string
          study_id: string
          institution_id: string
          assigned_to: string | null
          priority: "stat" | "urgent" | "routine" | null
          due_by: string | null
          notes: string | null
          status: "pending" | "in_progress" | "completed" | "on_hold" | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          study_id: string
          institution_id: string
          assigned_to?: string | null
          priority?: "stat" | "urgent" | "routine" | null
          due_by?: string | null
          notes?: string | null
          status?: "pending" | "in_progress" | "completed" | "on_hold" | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          study_id?: string
          institution_id?: string
          assigned_to?: string | null
          priority?: "stat" | "urgent" | "routine" | null
          due_by?: string | null
          notes?: string | null
          status?: "pending" | "in_progress" | "completed" | "on_hold" | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
