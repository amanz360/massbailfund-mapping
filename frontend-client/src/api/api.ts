import axios from 'axios'

const API_DOMAIN_URL = import.meta.env.VITE_API_DOMAIN_URL || 'http://127.0.0.1:8000/'

const api = axios.create({
  baseURL: `${API_DOMAIN_URL}api/`,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('MBF_ACCESS_TOKEN')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — could refresh here
      console.warn('Unauthorized — redirecting to login')
    }
    return Promise.reject(error)
  },
)

export default api
