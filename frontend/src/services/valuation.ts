import api from './api'

export interface ValuationDashboardResponse {
  indices: Array<{
    id: number
    index_code: string
    index_name: string
    index_type: string
    valuation_date: string
    pe_ratio: number
    pb_ratio: number
    valuation_status: string
    pe_percentile_5y: number
  }>
}

export interface ValuationRankingResponse {
  ranking: Array<{
    id: number
    index_code: string
    index_name: string
    index_type: string
    valuation_date: string
    pe_ratio: number
    pb_ratio: number
    valuation_status: string
    pe_percentile_5y: number
    pb_percentile_5y: number
  }>
}

export interface BacktestRequest {
  indexCode: string
  initialAmount: number
  frequency: '日' | '周' | '月'
  duration: number
  lowPercentile?: number
  highPercentile?: number
  lowMultiple?: number
  highMultiple?: number
}

export interface BacktestResult {
  totalReturn: number
  annualizedReturn: number
  maxDrawdown: number
  sharpeRatio: number
}

export const valuationAPI = {
  getDashboard: () =>
    api.get<ValuationDashboardResponse>('/valuation/dashboard'),

  getRanking: () =>
    api.get<ValuationRankingResponse>('/valuation/ranking'),

  getIndexDetail: (code: string) =>
    api.get(`/valuation/index/${code}/detail`),

  runBacktest: (data: BacktestRequest) =>
    api.post<{ message: string; result: BacktestResult }>('/valuation/backtest', data)
}
