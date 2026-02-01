export interface Index {
  id: number;
  index_code: string;
  index_name: string;
  index_type: string;
  related_sectors?: string;
  created_at: Date;
  updated_at: Date;
}

export interface IndexValuation {
  id: number;
  index_id: number;
  valuation_date: Date;
  pe_ratio?: number;
  pb_ratio?: number;
  ps_ratio?: number;
  dividend_yield?: number;
  pe_percentile_5y?: number;
  pb_percentile_5y?: number;
  ps_percentile_5y?: number;
  valuation_status?: string;
  created_at: Date;
}

export interface IndexFund {
  id: number;
  index_id: number;
  fund_id: number;
  fund_type: string;
  correlation?: number;
  created_at: Date;
}
