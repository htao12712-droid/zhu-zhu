import api from './api'

export interface Fund {
  id: number
  fund_code: string
  fund_name: string
  fund_type: string
  fund_company?: string
  established_date?: string
  fund_size?: number
  manager_id?: number
  benchmark_index?: string
  status: string
}

export interface FundListResponse {
  funds: Fund[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}

export interface FundDetailResponse {
  fund: Fund & {
    manager_name?: string
    education?: string
    manager_start_date?: string
  }
}

export interface FundRealtimeEstimateResponse {
  estimate: {
    fund_code: string
    fund_name: string
    nav_date: string
    unit_nav: number
    estimate_nav: number
    estimate_change_pct: number
    updated_at: string
    source_timestamp: string
    received_at: string
    provider: string
    delayed: boolean
  }
}

export const fundAPI = {
  getList: (params?: { type?: string; page?: number; pageSize?: number }) =>
    api.get<FundListResponse>('/funds', { params }),

  getDetail: (id: number) =>
    api.get<FundDetailResponse>(`/funds/${id}`),

  getNavHistory: (id: number, days: number = 365) =>
    api.get(`/funds/${id}/nav`, { params: { days } }),

  getHoldings: (id: number, limit: number = 10) =>
    api.get(`/funds/${id}/holdings`, { params: { limit } }),

  search: (keyword: string, limit: number = 20) =>
    api.get('/funds/search', { params: { keyword, limit } }),

  getTop: (params?: { type?: string; limit?: number }) =>
    api.get('/funds/top', { params }),

  getRealtimeEstimate: (code: string) =>
    api.get<FundRealtimeEstimateResponse>(`/funds/realtime/${code}`)
}
