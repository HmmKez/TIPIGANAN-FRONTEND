import api from './axios'

export const authApi = {
  // Accounts sign in with their 5-digit school ID number, not an email — it is
  // the identifier the school's own systems use, and the key their API will
  // later use to fetch the person's name and details.
  login: (idNumber, password) => api.post('/auth/login', { id_number: idNumber, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
}

export function currentUser() {
  try {
    const raw = localStorage.getItem('tipiganan_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('tipiganan_token')
    localStorage.removeItem('tipiganan_user')
  }
}