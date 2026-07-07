// All admin API calls — one place, thin wrappers over your Laravel routes.
// Every function matches an endpoint from tipiganan-backend/routes/api.php.
import api from './axios'

// ============ THESES (Staff + Super Admin) ============
export const thesesApi = {
  list:    (params) => api.get('/theses', { params }),
  get:     (id)     => api.get(`/theses/${id}`),
  create:  (formData) => api.post('/theses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update:  (id, data) => api.put(`/theses/${id}`, data),
  archive: (id)       => api.patch(`/theses/${id}/archive`),
  remove:  (id)       => api.delete(`/theses/${id}`),        // super_admin only
}

// ============ CATEGORIES ============
export const categoriesApi = {
  list:   ()          => api.get('/categories'),
  create: (data)      => api.post('/categories', data),
  update: (id, data)  => api.put(`/categories/${id}`, data),
  remove: (id)        => api.delete(`/categories/${id}`),
}

// ============ USERS (Staff + Super Admin) ============
export const usersApi = {
  list:    (params) => api.get('/users', { params }),
  get:     (id)     => api.get(`/users/${id}`),
  create:  (data)   => api.post('/users', data),                        // super_admin
  update:  (id, d)  => api.put(`/users/${id}`, d),                      // super_admin
  remove:  (id)     => api.delete(`/users/${id}`),                      // super_admin
  activate:   (id)  => api.patch(`/users/${id}/activate`),
  deactivate: (id)  => api.patch(`/users/${id}/deactivate`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  grantPermission:  (id, permission) =>
    api.post(`/users/${id}/grant-permission`, { permission }),
  revokePermission: (id, permission) =>
    api.post(`/users/${id}/revoke-permission`, { permission }),
}

// ============ AUDIT LOGS ============
export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
  get:  (id)     => api.get(`/audit-logs/${id}`),
}

// ============ REPORTS ============
export const reportsApi = {
  dashboard:    () => api.get('/reports/dashboard'),
  mostCited:    () => api.get('/reports/most-cited'),
  byDepartment: () => api.get('/reports/by-department'),
  byYear:       () => api.get('/reports/by-year'),
  mostSearched: () => api.get('/reports/most-searched'),
  mostActive:   () => api.get('/reports/most-active'),
  peakHours:    () => api.get('/reports/peak-hours'),
}
