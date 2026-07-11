import api from './axios'

// Categories
export const categoriesApi = {
  list: () => api.get('/categories'),
  get: (id) => api.get(`/categories/${id}`),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  remove: (id) => api.delete(`/categories/${id}`),
}

// Favorites (Bookmarks)
export const favoritesApi = {
  list: () => api.get('/favorites'),
  add: (thesisId) => api.post(`/favorites/${thesisId}`),
  remove: (thesisId) => api.delete(`/favorites/${thesisId}`),
}

// Search
export const searchApi = {
  search: (params) => api.get('/search', { params }),
}

// Users
export const usersApi = {
  profile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  activate: (id) => api.patch(`/users/${id}/activate`),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  resetPassword: (id) => api.post(`/users/${id}/reset-password`),
}

// Audit Logs
export const auditLogsApi = {
  list: (params) => api.get('/audit-logs', { params }),
  get: (id) => api.get(`/audit-logs/${id}`),
}

// Reports
export const reportsApi = {
  dashboard: (params) => api.get('/reports/dashboard', { params }),
  mostCited: (params) => api.get('/reports/most-cited', { params }),
  byDepartment: (params) => api.get('/reports/by-department', { params }),
  byYear: (params) => api.get('/reports/by-year', { params }),
  mostSearched: (params) => api.get('/reports/most-searched', { params }),
  usersOnline: (params) => api.get('/reports/users-online', { params }),
}

// Citations
export const citationsApi = {
  list: (thesisId) => api.get(`/theses/${thesisId}/citations`),
  generate: (thesisId, params) => api.get(`/theses/${thesisId}/citations/generate`, { params }),
  logCopy: (thesisId, data) => api.post(`/theses/${thesisId}/citations/log`, data),
  // Staff + Super Admin only — editing the auto-generated APA/MLA text
  update: (thesisId, citationId, data) => api.put(`/theses/${thesisId}/citations/${citationId}`, data),
}
