import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://tipbk.materdeicollege.com/api'

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
        // The login page shows why, once. The server explains the cases it knows
        // (deactivated, no longer on the school's list); anything else is an
        // ordinary expired session.
        sessionStorage.setItem('tipiganan_signed_out_reason',
          error.response?.data?.reason && error.response?.data?.message
            ? error.response.data.message
            : 'You have been signed out. Please sign in again.')
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default api
