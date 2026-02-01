import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const AUTH_DISABLED = (import.meta as any).env?.VITE_DISABLE_AUTH !== 'false';
  const savedToken = localStorage.getItem('token');
  const token = ref<string | null>(savedToken || (AUTH_DISABLED ? 'demo' : null))
  const userInfo = ref<any>(AUTH_DISABLED ? {
    id: 1,
    phone: '00000000000',
    email: 'demo@local',
    nickname: '演示用户',
    member_level: 2,
    member_expires_at: null
  } : null)

  const isAuthenticated = computed(() => !!token.value)

  const login = (newToken: string, user: any) => {
    token.value = newToken
    userInfo.value = user
    localStorage.setItem('token', newToken)
  }

  const logout = () => {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('token')
  }

  return {
    token,
    userInfo,
    isAuthenticated,
    login,
    logout
  }
})
