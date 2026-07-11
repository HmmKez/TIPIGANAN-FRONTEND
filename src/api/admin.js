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
  updateStatus: (id, status) => api.patch(`/theses/${id}/status`, { status }),
  remove:  (id)       => api.delete(`/theses/${id}`),        // requires delete_documents permission
}

// ============ CATEGORIES ============
export const categoriesApi = {
  list:   ()          => api.get('/categories'),
  create: (data)      => api.post('/categories', data),
  update: (id, data)  => api.put(`/categories/${id}`, data),
  remove: (id)        => api.delete(`/categories/${id}`),
  uploadCoverImage: (id, file) => {
    const formData = new FormData()
    formData.append('cover_image', file)
    return api.post(`/categories/${id}/cover-image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// ============ USERS (Staff + Super Admin) ============
export const usersApi = {
  list:    (params) => api.get('/users', { params }),
  get:     (id)     => api.get(`/users/${id}`),
  create:  (data)   => api.post('/users', data),                        // super_admin
  update:  (id, d)  => api.put(`/users/${id}`, d),                      // super_admin
  remove:  (id)     => api.delete(`/users/${id}`),                      // requires delete_accounts permission
  activate:   (id)  => api.patch(`/users/${id}/activate`),
  deactivate: (id)  => api.patch(`/users/${id}/deactivate`),
  resetPassword: (id, data) => api.post(`/users/${id}/reset-password`, data),
  grantPermission:  (id, permission) =>
    api.post(`/users/${id}/grant-permission`, { permission }),
  revokePermission: (id, permission) =>
    api.post(`/users/${id}/revoke-permission`, { permission }),
}

// ============ PERMISSIONS (Super Admin) ============
export const permissionsApi = {
  list: () => api.get('/permissions'),
}

// ============ AUDIT LOGS ============
export const auditApi = {
  list: (params) => api.get('/audit-logs', { params }),
  get:  (id)     => api.get(`/audit-logs/${id}`),
  exportPdf: (params) => api.get('/audit-logs/export', { params, responseType: 'blob' }),
}

// ============ REPORTS ============
// mostCited/mostSearched/usersOnline accept an optional
// { roles: 'student,teacher', date_from, date_to } filter object — omit
// any key to leave that dimension unfiltered.
export const reportsApi = {
  dashboard:    () => api.get('/reports/dashboard'),
  mostCited:    (params) => api.get('/reports/most-cited', { params }),
  byDepartment: () => api.get('/reports/by-department'),
  byYear:       () => api.get('/reports/by-year'),
  mostSearched: (params) => api.get('/reports/most-searched', { params }),
  usersOnline:  (params) => api.get('/reports/users-online', { params }),
  exportPdf:    (params) => api.get('/reports/export', { params, responseType: 'blob' }),
}

// ============ THESIS REPORTS (flagged content — Staff + Super Admin) ============
export const thesisReportsApi = {
  list:    (params) => api.get('/thesis-reports', { params }),
  resolve: (id)      => api.patch(`/thesis-reports/${id}/resolve`),
}
