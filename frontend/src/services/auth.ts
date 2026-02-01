import api from './api'

export interface AuthResponse {
  message: string
  token: string
  user: {
    id: number
    phone: string
    email?: string
    nickname?: string
    member_level: number
    member_expires_at?: string
  }
}

export const authAPI = {
  register: (data: { phone: string; password: string; nickname?: string; email?: string }) =>
    api.post<AuthResponse>('/auth/register', data),

  login: (data: { phone: string; password: string }) =>
    api.post<AuthResponse>('/auth/login', data),

  logout: () =>
    api.post('/auth/logout'),

  getProfile: () =>
    api.get('/auth/profile'),

  updateProfile: (data: { nickname?: string; avatar_url?: string }) =>
    api.put('/auth/profile', data),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data)
}
