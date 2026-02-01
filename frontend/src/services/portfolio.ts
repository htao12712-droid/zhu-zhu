import api from './api'

export interface Holding {
  id: number
  fund_id: number
  fund_code: string
  fund_name: string
  fund_type: string
  holding_shares: number
  cost_price: number
  cost_amount: number
  current_nav: number
  current_value: number
  return_rate: number
  source: string
  created_at: string
  updated_at: string
}

export interface PortfolioSummary {
  totalCost: number
  totalValue: number
  totalReturn: number
}

export interface PortfolioResponse {
  holdings: Holding[]
  summary: PortfolioSummary
}

export interface RiskDiagnosisResponse {
  allocation: Array<{
    fund_type: string
    fund_count: number
    total_cost: number
    total_value: number
    allocation_ratio: number
  }>
  warnings: string[]
  totalValue: number
}

export const portfolioAPI = {
  getPortfolio: () =>
    api.get<PortfolioResponse>('/portfolio'),

  addHolding: (data: { fundId: number; holdingShares: number; costPrice: number }) =>
    api.post<{ message: string; holding: Holding }>('/portfolio', data),

  updateHolding: (id: number, data: { holdingShares: number; costPrice: number }) =>
    api.put<{ message: string; holding: Holding }>(`/portfolio/${id}`, data),

  deleteHolding: (id: number) =>
    api.delete<{ message: string }>(`/portfolio/${id}`),

  getRiskDiagnosis: () =>
    api.get<RiskDiagnosisResponse>('/portfolio/risk-diagnosis'),

  getSimulatedPortfolios: () =>
    api.get('/portfolio/simulated'),

  createSimulatedPortfolio: (data: {
    portfolioName: string
    initialCapital: number
    startDate: string
    description?: string
    isPublic?: boolean
  }) =>
    api.post<{ message: string; portfolio: any }>('/portfolio/simulated', data),

  getSimulatedPortfolioAllocations: (portfolioId: number) =>
    api.get(`/portfolio/simulated/${portfolioId}`),

  addStopLossProfitSetting: (data: {
    fundId: number
    stopProfitType?: string
    stopProfitValue?: number
    stopLossType?: string
    stopLossValue?: number
  }) =>
    api.post<{ message: string; setting: any }>('/portfolio/stop-loss-profit', data)
}
