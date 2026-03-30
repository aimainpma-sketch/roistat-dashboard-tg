export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  app: {
    Tables: {
      user_roles: {
        Row: {
          created_at: string;
          role: "admin" | "editor" | "viewer";
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          role: "admin" | "editor" | "viewer";
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          role?: "admin" | "editor" | "viewer";
          updated_at?: string;
          user_id?: string;
        };
      };
      dimension_levels: {
        Row: {
          enabled: boolean;
          label: string;
          level_index: number;
          sort_order: number;
        };
        Insert: {
          enabled?: boolean;
          label: string;
          level_index: number;
          sort_order?: number;
        };
        Update: {
          enabled?: boolean;
          label?: string;
          level_index?: number;
          sort_order?: number;
        };
      };
      dashboard_views: {
        Row: {
          column_order: string[] | null;
          default_max_depth: number;
          enabled: boolean;
          metric_id: string;
          position: number;
          title: string;
          view_key: string;
          visible_columns: string[] | null;
        };
        Insert: {
          column_order?: string[] | null;
          default_max_depth?: number;
          enabled?: boolean;
          metric_id: string;
          position?: number;
          title: string;
          view_key: string;
          visible_columns?: string[] | null;
        };
        Update: {
          column_order?: string[] | null;
          default_max_depth?: number;
          enabled?: boolean;
          metric_id?: string;
          position?: number;
          title?: string;
          view_key?: string;
          visible_columns?: string[] | null;
        };
      };
      user_dashboard_prefs: {
        Row: {
          channel_filter: string | null;
          expanded_paths: string[] | null;
          grain: "day" | "week";
          user_id: string;
          view_key: string;
        };
        Insert: {
          channel_filter?: string | null;
          expanded_paths?: string[] | null;
          grain?: "day" | "week";
          user_id: string;
          view_key: string;
        };
        Update: {
          channel_filter?: string | null;
          expanded_paths?: string[] | null;
          grain?: "day" | "week";
          user_id?: string;
          view_key?: string;
        };
      };
    };
    Functions: {
      get_current_role_v1: {
        Args: Record<string, never>;
        Returns: "admin" | "editor" | "viewer";
      };
    };
  };
  reporting: {
    Tables: {
      roistat_fact_source: {
        Row: {
          channel: string;
          cpl: number;
          created_at: string;
          gross_margin: number;
          id: number;
          leads: number;
          level_1_key: string | null;
          level_1_label: string | null;
          level_2_key: string | null;
          level_2_label: string | null;
          level_3_key: string | null;
          level_3_label: string | null;
          level_4_key: string | null;
          level_4_label: string | null;
          level_5_key: string | null;
          level_5_label: string | null;
          level_6_key: string | null;
          level_6_label: string | null;
          level_7_key: string | null;
          level_7_label: string | null;
          meetings_scheduled: number;
          mqlt: number;
          report_date: string;
          revenue: number;
          sales: number;
          source_snapshot_key: string | null;
          spend: number;
          week_start: string;
        };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      roistat_fact_v1: {
        Row: {
          channel: string;
          cpl: number;
          gross_margin: number;
          leads: number;
          level_1_key: string | null;
          level_1_label: string | null;
          level_2_key: string | null;
          level_2_label: string | null;
          level_3_key: string | null;
          level_3_label: string | null;
          level_4_key: string | null;
          level_4_label: string | null;
          level_5_key: string | null;
          level_5_label: string | null;
          level_6_key: string | null;
          level_6_label: string | null;
          level_7_key: string | null;
          level_7_label: string | null;
          meetings_scheduled: number;
          mqlt: number;
          report_date: string;
          revenue: number;
          sales: number;
          spend: number;
          week_start: string;
        };
      };
    };
    Functions: {
      get_metric_tree_v1: {
        Args: {
          metric_id: string;
          date_from: string;
          date_to: string;
          grain?: "day" | "week";
          channel_filter?: string | null;
          max_depth?: number;
        };
        Returns: Json;
      };
      get_gross_margin_mix_v1: {
        Args: {
          date_from: string;
          date_to: string;
          grain?: "day" | "week";
          channel_filter?: string | null;
        };
        Returns: Json;
      };
    };
  };
};
