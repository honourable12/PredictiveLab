import axios from 'axios';

const API_URL = 'http://localhost:8500';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const datasetsApi = {
  list: () => api.get('/datasets'),
  upload: (formData: FormData) => api.post('/dataset', formData),
  delete: (id: number) => api.delete(`/delete_dataset/${id}`),
  update: (id: number, formData: FormData) => api.put(`/update_dataset/${id}`, formData),
  visualize: (id: number) => api.get(`/visualize_dataset/${id}`),
  clean: (id: number, operations: any[]) => api.post(`/clean_dataset/${id}`, operations),
};

export const modelsApi = {
  list: () => api.get('/models'),
  train: (data: any) => api.post('/train', data),
  predict: (modelId: number, data: any) => api.post(`/predict/${modelId}`, data),
  getPredictions: (modelId: number, page = 1) => api.get(`/predictions/${modelId}?page=${page}`),
  export: (modelId: number) => api.get(`/export_model/${modelId}`),
  attachDataset: (modelId: number, datasetId: number) => 
    api.put(`/attach_dataset_to_model/${modelId}`, { dataset_id: datasetId }),
};

export const userApi = {
  getProfile: () => api.get('/profile'),
  deleteAccount: () => api.delete('/delete_account'),
};