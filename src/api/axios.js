import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

// The backend's origin (baseURL without the trailing /api) — used to build
// URLs for files served outside the API, like /storage/... cover images.
// A plain "/storage/..." path resolves against the Vite dev server's own
// origin (localhost:5173), not the Laravel backend, so images 404.
export const apiOrigin = baseURL.replace(/\/api\/?$/, '')

const api = axios.create({
  baseURL,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
})

// Attach bearer token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tipiganan_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tipiganan_token')
      localStorage.removeItem('tipiganan_user')
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register') &&
          window.location.pathname !== '/') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
