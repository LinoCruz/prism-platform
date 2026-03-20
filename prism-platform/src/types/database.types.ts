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
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["announcement_id"]
          },
          {
            foreignKeyName: "announcement_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      announcements: {
        Row: {
          announcement_id: string
          body: string
          created_at: string
          created_by_admin_id: string
          expires_at: string | null
          priority: number
          title: string
        }
        Insert: {
          announcement_id?: string
          body: string
          created_at?: string
          created_by_admin_id: string
          expires_at?: string | null
          priority?: number
          title: string
        }
        Update: {
          announcement_id?: string
          body?: string
          created_at?: string
          created_by_admin_id?: string
          expires_at?: string | null
          priority?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string
          module_id: string
          module_order: number
          title: string
          video_url: string | null
        }
        Insert: {
          course_id: string
          created_at?: string
          module_id?: string
          module_order?: number
          title: string
          video_url?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string
          module_id?: string
          module_order?: number
          title?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      courses: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          title: string
        }
        Insert: {
          course_id?: string
          created_at?: string
          description?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          title?: string
        }
        Relationships: []
      }
      form_answers: {
        Row: {
          answer_id: string
          answers: Json
          created_at: string
          form_id: string
          form_title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer_id?: string
          answers?: Json
          created_at?: string
          form_id: string
          form_title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer_id?: string
          answers?: Json
          created_at?: string
          form_id?: string
          form_title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          }
        ]
      }
      instructions: {
        Row: {
          instruction_id: string
          title: string
          content: string
          target_role: Database["public"]["Enums"]["user_role"]
          display_order: number
          published: boolean
          media: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          instruction_id?: string
          title: string
          content: string
          target_role: Database["public"]["Enums"]["user_role"]
          display_order?: number
          published?: boolean
          media?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          instruction_id?: string
          title?: string
          content?: string
          target_role?: Database["public"]["Enums"]["user_role"]
          display_order?: number
          published?: boolean
          media?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instructions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          message: string
          notification_id: string
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          message: string
          notification_id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          message?: string
          notification_id?: string
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          attempt_id: string
          completed_at: string | null
          passed: boolean
          quiz_id: string
          score: number | null
          started_at: string
          user_id: string
        }
        Insert: {
          attempt_id?: string
          completed_at?: string | null
          passed?: boolean
          quiz_id: string
          score?: number | null
          started_at?: string
          user_id: string
        }
        Update: {
          attempt_id?: string
          completed_at?: string | null
          passed?: boolean
          quiz_id?: string
          score?: number | null
          started_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["quiz_id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          is_correct: boolean
          option_id: string
          option_text: string
          question_id: string
        }
        Insert: {
          is_correct?: boolean
          option_id?: string
          option_text: string
          question_id: string
        }
        Update: {
          is_correct?: boolean
          option_id?: string
          option_text?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["question_id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          question_id: string
          question_order: number
          question_text: string
          quiz_id: string
        }
        Insert: {
          question_id?: string
          question_order?: number
          question_text: string
          quiz_id: string
        }
        Update: {
          question_id?: string
          question_order?: number
          question_text?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["quiz_id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          created_at: string
          quiz_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          quiz_id?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      review_audits: {
        Row: {
          action: Database["public"]["Enums"]["audit_action"] | null
          audit_id: string
          auditor_id: string
          completed_at: string | null
          decision: Database["public"]["Enums"]["audit_decision"] | null
          feedback: string | null
          review_id: string
          score: number | null
          started_at: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["audit_action"] | null
          audit_id?: string
          auditor_id: string
          completed_at?: string | null
          decision?: Database["public"]["Enums"]["audit_decision"] | null
          feedback?: string | null
          review_id: string
          score?: number | null
          started_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["audit_action"] | null
          audit_id?: string
          auditor_id?: string
          completed_at?: string | null
          decision?: Database["public"]["Enums"]["audit_decision"] | null
          feedback?: string | null
          review_id?: string
          score?: number | null
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "review_audits_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "task_reviews"
            referencedColumns: ["review_id"]
          },
        ]
      }
      review_fixes: {
        Row: {
          created_at: string
          fix_id: string
          new_version_id: string | null
          review_id: string
          reviewer_id: string
        }
        Insert: {
          created_at?: string
          fix_id?: string
          new_version_id?: string | null
          review_id: string
          reviewer_id: string
        }
        Update: {
          created_at?: string
          fix_id?: string
          new_version_id?: string | null
          review_id?: string
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_fixes_new_version_id_fkey"
            columns: ["new_version_id"]
            isOneToOne: false
            referencedRelation: "task_versions"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "review_fixes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "task_reviews"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "review_fixes_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_attempts: {
        Row: {
          attempt_id: string
          attempt_number: number
          claimed_at: string
          rework_due_to_review_id: string | null
          submitted_at: string | null
          task_id: string
          trainer_id: string
          version_id: string | null
        }
        Insert: {
          attempt_id?: string
          attempt_number?: number
          claimed_at?: string
          rework_due_to_review_id?: string | null
          submitted_at?: string | null
          task_id: string
          trainer_id: string
          version_id?: string | null
        }
        Update: {
          attempt_id?: string
          attempt_number?: number
          claimed_at?: string
          rework_due_to_review_id?: string | null
          submitted_at?: string | null
          task_id?: string
          trainer_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_attempts_rework_due_to_review_id_fkey"
            columns: ["rework_due_to_review_id"]
            isOneToOne: false
            referencedRelation: "task_reviews"
            referencedColumns: ["review_id"]
          },
          {
            foreignKeyName: "task_attempts_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_attempts_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_attempts_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "task_versions"
            referencedColumns: ["version_id"]
          },
        ]
      }
      task_events: {
        Row: {
          created_at: string
          event_id: string
          label: string
          timestamp: string
          version_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string
          label: string
          timestamp: string
          version_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          label?: string
          timestamp?: string
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_events_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "task_versions"
            referencedColumns: ["version_id"]
          },
        ]
      }
      task_reviews: {
        Row: {
          completed_at: string | null
          decision: Database["public"]["Enums"]["review_decision"] | null
          feedback: string | null
          review_id: string
          review_number: number
          reviewer_id: string
          score: number | null
          started_at: string
          task_id: string
          version_id: string | null
        }
        Insert: {
          completed_at?: string | null
          decision?: Database["public"]["Enums"]["review_decision"] | null
          feedback?: string | null
          review_id?: string
          review_number?: number
          reviewer_id: string
          score?: number | null
          started_at?: string
          task_id: string
          version_id?: string | null
        }
        Update: {
          completed_at?: string | null
          decision?: Database["public"]["Enums"]["review_decision"] | null
          feedback?: string | null
          review_id?: string
          review_number?: number
          reviewer_id?: string
          score?: number | null
          started_at?: string
          task_id?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_reviews_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_reviews_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "task_versions"
            referencedColumns: ["version_id"]
          },
        ]
      }
      task_rework_locks: {
        Row: {
          created_at: string
          expires_at: string
          lock_id: string
          task_id: string
          trainer_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          lock_id?: string
          task_id: string
          trainer_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          lock_id?: string
          task_id?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_rework_locks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: true
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_rework_locks_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_versions: {
        Row: {
          created_at: string
          created_by_user_id: string
          data_payload: Json
          parent_version_id: string | null
          source: Database["public"]["Enums"]["version_source"]
          task_id: string
          version_id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          data_payload?: Json
          parent_version_id?: string | null
          source: Database["public"]["Enums"]["version_source"]
          task_id: string
          version_id?: string
          version_number?: number
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          data_payload?: Json
          parent_version_id?: string | null
          source?: Database["public"]["Enums"]["version_source"]
          task_id?: string
          version_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_versions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "task_versions_parent_version_id_fkey"
            columns: ["parent_version_id"]
            isOneToOne: false
            referencedRelation: "task_versions"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "task_versions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      tasks: {
        Row: {
          batch_id: string | null
          created_at: string
          current_version_id: string | null
          external_id: string | null
          final_signedoff_at: string | null
          is_reported: boolean
          question: string | null
          report_note: string | null
          reservation_expires_at: string | null
          reserved_for_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          current_version_id?: string | null
          external_id?: string | null
          final_signedoff_at?: string | null
          is_reported?: boolean
          question?: string | null
          report_note?: string | null
          reservation_expires_at?: string | null
          reserved_for_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          current_version_id?: string | null
          external_id?: string | null
          final_signedoff_at?: string | null
          is_reported?: boolean
          question?: string | null
          report_note?: string | null
          reservation_expires_at?: string | null
          reserved_for_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "task_versions"
            referencedColumns: ["version_id"]
          },
          {
            foreignKeyName: "tasks_reserved_for_id_fkey"
            columns: ["reserved_for_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_time: {
        Row: {
          time_id: string
          task_id: string
          expert_id: string
          role: Database["public"]["Enums"]["user_role"]
          reference_type: Database["public"]["Enums"]["time_reference_type"]
          reference_id: string
          segment_start: string
          segment_end: string | null
          last_heartbeat_at: string | null
        }
        Insert: {
          time_id?: string
          task_id: string
          expert_id: string
          role: Database["public"]["Enums"]["user_role"]
          reference_type: Database["public"]["Enums"]["time_reference_type"]
          reference_id: string
          segment_start?: string
          segment_end?: string | null
          last_heartbeat_at?: string | null
        }
        Update: {
          time_id?: string
          task_id?: string
          expert_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          reference_type?: Database["public"]["Enums"]["time_reference_type"]
          reference_id?: string
          segment_start?: string
          segment_end?: string | null
          last_heartbeat_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_time_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
          {
            foreignKeyName: "task_time_expert_id_fkey"
            columns: ["expert_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      task_temporal_values: {
        Row: {
          id: string
          task_id: string
          value: string
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          value: string
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          value?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_temporal_values_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["task_id"]
          },
        ]
      }
      training_requirements: {
        Row: {
          course_id: string
          created_at: string
          expires_after_days: number | null
          mandatory: boolean
          requirement_id: string
          role_required: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_after_days?: number | null
          mandatory?: boolean
          requirement_id?: string
          role_required: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_after_days?: number | null
          mandatory?: boolean
          requirement_id?: string
          role_required?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: [
          {
            foreignKeyName: "training_requirements_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
        ]
      }
      user_requirements: {
        Row: {
          assigned_at: string
          completed_at: string | null
          id: string
          requirement_id: string
          status: Database["public"]["Enums"]["requirement_status"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          completed_at?: string | null
          id?: string
          requirement_id: string
          status?: Database["public"]["Enums"]["requirement_status"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          completed_at?: string | null
          id?: string
          requirement_id?: string
          status?: Database["public"]["Enums"]["requirement_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "training_requirements"
            referencedColumns: ["requirement_id"]
          },
          {
            foreignKeyName: "user_requirements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["user_id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          display_name: string
          email: string
          first_name: string | null
          last_login_at: string | null
          last_name: string | null
          personal_email: string | null
          role: Database["public"]["Enums"]["user_role"]
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          email: string
          first_name?: string | null
          last_login_at?: string | null
          last_name?: string | null
          personal_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string
          first_name?: string | null
          last_login_at?: string | null
          last_name?: string | null
          personal_email?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
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
      audit_action: "approve" | "send_back_to_reviewer" | "fix_themselves"
      time_reference_type: "attempt" | "review" | "audit" | "review_fix"
      audit_decision: "approved" | "needs_changes"
      notification_type:
        | "TASK_REWORK"
        | "REVIEW_COMPLETED"
        | "AUDIT_FEEDBACK"
        | "COURSE_REQUIRED"
        | "ANNOUNCEMENT"
      requirement_status: "pending" | "completed" | "expired"
      review_decision: "approved" | "rework" | "fixed_and_approved"
      task_status:
        | "available"
        | "reserved"
        | "claimed"
        | "completed"
        | "in_review"
        | "sent_for_rework"
        | "reworking"
        | "fixed"
        | "approved"
        | "auditing"
        | "reviewer_fixing"
        | "signed_off"
        | "delivered"
      user_role: "trainee" | "trainer" | "reviewer" | "auditor" | "admin"
      version_source: "trainer" | "reviewer" | "auditor"
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
      audit_action: ["approve", "send_back_to_reviewer", "fix_themselves"],
      time_reference_type: ["attempt", "review", "audit", "review_fix"],
      audit_decision: ["approved", "needs_changes"],
      notification_type: [
        "TASK_REWORK",
        "REVIEW_COMPLETED",
        "AUDIT_FEEDBACK",
        "COURSE_REQUIRED",
        "ANNOUNCEMENT",
      ],
      requirement_status: ["pending", "completed", "expired"],
      review_decision: ["approved", "rework", "fixed_and_approved"],
      task_status: [
        "available",
        "reserved",
        "claimed",
        "completed",
        "in_review",
        "sent_for_rework",
        "reworking",
        "fixed",
        "approved",
        "auditing",
        "reviewer_fixing",
        "signed_off",
        "delivered",
      ],
      user_role: ["trainee", "trainer", "reviewer", "auditor", "admin"],
      version_source: ["trainer", "reviewer", "auditor"],
    },
  },
} as const
