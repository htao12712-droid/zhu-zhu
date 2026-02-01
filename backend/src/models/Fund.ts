export interface FundManager {
  id: number;
  name: string;
  gender?: string;
  education?: string;
  start_date?: Date;
  current_company?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Fund {
  id: number;
  fund_code: string;
  fund_name: string;
  fund_type: string;
  fund_company?: string;
  established_date?: Date;
  fund_size?: number;
  manager_id?: number;
  benchmark_index?: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface FundNavHistory {
  id: number;
  fund_id: number;
  nav_date: Date;
  unit_nav: number;
  accumulated_nav: number;
  daily_return?: number;
  created_at: Date;
}

export interface FundHoldings {
  id: number;
  fund_id: number;
  report_period: string;
  report_type: string;
  security_code: string;
  security_name: string;
  security_type: string;
  holding_ratio: number;
  holding_value?: number;
  created_at: Date;
}
