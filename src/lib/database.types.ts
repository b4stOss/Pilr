export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      notification_log: {
        Row: {
          id: string;
          pill_id: string;
          recipient_id: string;
          notification_type: string;
          attempt_number: number;
          sent_at: string;
          success: boolean;
          error_message: string | null;
        };
        Insert: {
          id?: string;
          pill_id: string;
          recipient_id: string;
          notification_type: string;
          attempt_number?: number;
          sent_at?: string;
          success?: boolean;
          error_message?: string | null;
        };
        Update: {
          id?: string;
          pill_id?: string;
          recipient_id?: string;
          notification_type?: string;
          attempt_number?: number;
          sent_at?: string;
          success?: boolean;
          error_message?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_log_pill_id_fkey';
            columns: ['pill_id'];
            isOneToOne: false;
            referencedRelation: 'pill_tracking';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_log_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_queue: {
        Row: {
          id: string;
          pill_id: string;
          notification_type: string;
          recipient_id: string;
          scheduled_for: string;
          attempt_number: number;
          processed_at: string | null;
          success: boolean | null;
          error_message: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          pill_id: string;
          notification_type: string;
          recipient_id: string;
          scheduled_for: string;
          attempt_number?: number;
          processed_at?: string | null;
          success?: boolean | null;
          error_message?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          pill_id?: string;
          notification_type?: string;
          recipient_id?: string;
          scheduled_for?: string;
          attempt_number?: number;
          processed_at?: string | null;
          success?: boolean | null;
          error_message?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_queue_pill_id_fkey';
            columns: ['pill_id'];
            isOneToOne: false;
            referencedRelation: 'pill_tracking';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notification_queue_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      partnerships: {
        Row: {
          id: string;
          pill_taker_id: string;
          partner_id: string;
          status: string;
          notification_enabled: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          pill_taker_id: string;
          partner_id: string;
          status?: string;
          notification_enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          pill_taker_id?: string;
          partner_id?: string;
          status?: string;
          notification_enabled?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'partnerships_pill_taker_id_fkey';
            columns: ['pill_taker_id'];
            isOneToOne: false;
            referencedRelation: 'pill_takers';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'partnerships_partner_id_fkey';
            columns: ['partner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      pill_takers: {
        Row: {
          user_id: string;
          reminder_time: string;
          timezone: string | null;
          active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          reminder_time: string;
          timezone?: string | null;
          active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          reminder_time?: string;
          timezone?: string | null;
          active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pill_takers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      pill_tracking: {
        Row: {
          id: string;
          user_id: string;
          scheduled_time: string;
          status: string;
          taken_at: string | null;
          partner_notified_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          scheduled_time: string;
          status?: string;
          taken_at?: string | null;
          partner_notified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          scheduled_time?: string;
          status?: string;
          taken_at?: string | null;
          partner_notified_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'pill_tracking_new_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'pill_takers';
            referencedColumns: ['user_id'];
          },
        ];
      };
      users: {
        Row: {
          id: string;
          email: string | null;
          push_subscription: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          push_subscription?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string | null;
          push_subscription?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

export type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    ? (PublicSchema['Tables'] & PublicSchema['Views'])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
    ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
    ? PublicSchema['Enums'][PublicEnumNameOrOptions]
    : never;
