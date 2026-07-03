import api from './axios'

export const thesesApi = {
  // GET /theses — public, supports ?q= &category_id= &year= &sort= &per_page=
  list: (params) => api.get('/theses', { params }),

  // GET /theses/{id} — public
  show: (id) => api.get(`/theses/${id}`),

  // POST /theses/{id}/view-token — protected, returns { token }
  getViewToken: (id) => api.post(`/theses/${id}/view-token`),

  // GET /theses/serve/{token} — protected, serves the PDF
  servePdf: (token) => api.get(`/theses/serve/${token}`, { responseType: 'blob' }),

  // Staff/Admin only
  store: (formData) => api.post('/theses', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.put(`/theses/${id}`, data),
  archive: (id) => api.patch(`/theses/${id}/archive`),
  download: (id) => api.get(`/theses/${id}/download`, { responseType: 'blob' }),

  // Super admin only
  destroy: (id) => api.delete(`/theses/${id}`),
}