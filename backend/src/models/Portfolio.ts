export interface UserHolding {
  id: number;
  user_id: number;
  fund_id: number;
  holding_shares: number;
  cost_price: number;
  cost_amount?: number;
  source: string;
  sync_platform?: string;
  created_at: Date;
  updated_at: Date;
}

export interface SimulatedPortfolio {
  id: number;
  user_id: number;
  portfolio_name: string;
  initial_capital: number;
  start_date: Date;
  current_value?: number;
  total_return?: number;
  description?: string;
  is_public: boolean;
  follow_source_id?: number;
  created_at: Date;
  updated_at: Date;
}

export interface SimulatedPortfolioAllocation {
  id: number;
  portfolio_id: number;
  fund_id: number;
  allocation_ratio: number;
  created_at: Date;
  updated_at: Date;
}

export interface StopLossProfitSetting {
  id: number;
  user_id: number;
  fund_id: number;
  stop_profit_type?: string;
  stop_profit_value?: number;
  stop_loss_type?: string;
  stop_loss_value?: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}
