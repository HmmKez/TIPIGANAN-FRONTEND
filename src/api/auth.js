import api from './axios'

export const authApi = {
  // Accounts sign in with their 5-digit school ID number, not an email — it is
  // the identifier the school's own systems use, and the key their API will
  // later use to fetch the person's name and details.
  login: (idNumber, password) => api.post('/auth/login', { id_number: idNumber, password }),
  // Asked once when the registration page opens: { verification_required }.
  // False (the default) shows the standard single-step form; true shows the
  // two-step "check the ID against the school's records first" form.
  registrationOptions: () => api.get('/auth/register/options'),
  // Step one of the two-step form: check the ID number against the school's
  // records before asking for anything else.
  verifyIdNumber: (idNumber) => api.post('/auth/register/verify', { id_number: idNumber }),
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