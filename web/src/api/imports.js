// src/api/imports.js
// Imports, posts, wilayas and demo-data calls. Uses the same axios instance as system3.js.
import apiClient from './client.js';

const unwrap = (res) => res.data.data;

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Downloads go through axios (not a plain <a href>) so the auth header is sent.
async function download(path, filename) {
  const res = await apiClient.get(path, { responseType: 'blob' });
  saveBlob(res.data, filename);
}

export const importsApi = {
  list: (params) => apiClient.get('/imports', { params }).then(unwrap),
  /** formData must contain the "file"; type/mode/onError are set before calling preview. */
  preview: (type, formData) => {
    formData.set('type', type);
    return apiClient.post('/imports/preview', formData).then(unwrap);
  },
  /** options: { mode, onError } chosen in wizard step 4 */
  commit: (id, options = {}) => apiClient.post(`/imports/${id}/commit`, options).then(unwrap),
  rollback: (id) => apiClient.post(`/imports/${id}/rollback`).then(unwrap),
  getDetail: (id) => apiClient.get(`/imports/${id}`).then(unwrap),
  downloadErrorsCsv: (id) => download(`/imports/${id}/errors.csv`, `import-${id}-errors.csv`),
  downloadTemplate: (type) => download(`/imports/template/${type}`, `${type}-template.csv`),
};

export const postsApi = {
  list: (params) => apiClient.get('/posts', { params }).then(unwrap),
  create: (data) => apiClient.post('/posts', data).then(unwrap),
  update: (id, data) => apiClient.patch(`/posts/${id}`, data).then(unwrap),
  remove: (id) => apiClient.delete(`/posts/${id}`).then(unwrap),
};

export const wilayasApi = {
  list: () => apiClient.get('/wilayas').then(unwrap),
};

export const demoApi = {
  seed: (companyId) => apiClient.post(`/admin/demo-data/${companyId}/seed`).then(unwrap),
  purge: (companyId) => apiClient.post(`/admin/demo-data/${companyId}/purge`).then(unwrap),
};
