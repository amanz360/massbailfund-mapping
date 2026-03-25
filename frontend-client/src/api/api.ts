import axios from 'axios'

const API_DOMAIN_URL = import.meta.env.VITE_API_DOMAIN_URL || 'http://127.0.0.1:8080/'

const api = axios.create({
  baseURL: `${API_DOMAIN_URL}api/`,
})

export default api
