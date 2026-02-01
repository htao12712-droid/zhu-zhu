import axios from 'axios'
import { showToast } from 'vant'
import { useUserStore } from '@/stores/user'

const AUTH_DISABLED = (import.meta as any).env?.VITE_DISABLE_AUTH !== 'false'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000
})

api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          if (AUTH_DISABLED) break;
          const userStore = useUserStore()
          if (!userStore.isAuthenticated) {
            break
          }
          showToast('未授权,请重新登录')
          break
        case 403:
          showToast('权限不足')
          break
        case 404:
          showToast('请求的资源不存在')
          break
        case 500:
          showToast('服务器错误,请稍后重试')
          break
        default:
          showToast('请求失败')
      }
    } else if (error.request) {
      showToast('网络错误,请检查网络连接')
    }
    return Promise.reject(error)
  }
)

export default api
