import api from './api'

export interface PerformanceAnalysis {
  totalReturn: number
  annualizedReturn: number
  volatility: number
  sharpeRatio: number
  maxDrawdown: number
  winRate: number
  comparison: Array<{
    period: string
    fundReturn: number
    benchmarkReturn: number
    categoryAverageReturn: number
    rank: number
    percentile: number
  }>
}

export interface RiskAnalysis {
  volatility: number
  maxDrawdown: number
  sharpeRatio: number
  winRate: number
  riskLevel: string
  annualizedReturn: number
}

export interface HoldingsAnalysis {
  top10HoldingRatio: number
  top5HoldingRatio: number
  industryConcentration: Array<{
    industry: string
    ratio: number
  }>
  styleExposure: {
    largeCap: number
    midCap: number
    smallCap: number
  }
  riskLevel: string
}

export interface ManagerAnalysis {
  managerId: number
  managerName: string
  careerAnnualReturn: number
  careerWinRate: number
  managedFundsCount: number
  totalManagedAssets: number
  performanceTrend: Array<{
    year: number
    annualReturn: number
  }>
  styleStability: number
}

export const analysisAPI = {
  getPerformance: (fundId: number, days: number = 365) =>
    api.get<PerformanceAnalysis>(`/analysis/${fundId}/performance`, { params: { days } }),

  getRisk: (fundId: number, days: number = 365) =>
    api.get<RiskAnalysis>(`/analysis/${fundId}/risk`, { params: { days } }),

  getHoldings: (fundId: number) =>
    api.get<HoldingsAnalysis>(`/analysis/${fundId}/holdings`),

  getManager: (fundId: number) =>
    api.get<{ manager: ManagerAnalysis }>(`/analysis/${fundId}/manager`),

  calculateCorrelation: (fundIds: number[]) =>
    api.post<{ fundIds: number[]; correlationMatrix: number[][] }>('/analysis/correlation', { fundIds })
}
