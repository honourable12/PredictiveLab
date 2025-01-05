import { api } from './base';

export const modelsApi = {
  list: () => api.get('/models'),
  train: (data: any) => api.post('/train', data),
  predict: (modelId: number, data: any) => api.post(`/predict/${modelId}`, data),
  getPredictions: (modelId: number, page = 1) => api.get(`/predictions/${modelId}?page=${page}`),
  export: (modelId: number) => api.get(`/export_model/${modelId}`),
  attachDataset: (modelId: number, datasetId: number) => 
    api.put(`/attach_dataset_to_model/${modelId}`, { dataset_id: datasetId }),
};