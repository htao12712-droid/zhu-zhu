export interface BacktestTask {
  id: number;
  user_id: number;
  task_type: string;
  task_config: any;
  status: string;
  result_summary?: any;
  created_at: Date;
  completed_at?: Date;
}

export interface News {
  id: number;
  title: string;
  content?: string;
  news_type: string;
  source: string;
  publish_date: Date;
  url?: string;
  related_funds?: string;
  related_indices?: string;
  created_at: Date;
}

export interface ThemeTag {
  id: number;
  tag_name: string;
  description?: string;
  is_hot: boolean;
  display_order?: number;
  created_at: Date;
  updated_at: Date;
}

export interface ThemeFundRelation {
  id: number;
  theme_id: number;
  fund_id: number;
  correlation_score?: number;
  created_at: Date;
}
