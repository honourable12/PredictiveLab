import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data', // Set default content type for file uploads
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
  upload: (formData: FormData) => {
    // Log form data for debugging
    console.log('Uploading dataset with form data:', {
      name: formData.get('name'),
      description: formData.get('description'),
      file: formData.get('file'),
    });
    return api.post('/dataset', formData);
  },
  delete: (id: number) => api.delete(`/delete_dataset/${id}`),
  update: (id: number, formData: FormData) => api.put(`/update_dataset/${id}`, formData),
  visualize: (id: number) => api.get(`/visualize_dataset/${id}`),
};

export const modelsApi = {
  list: () => api.get('/models'),
  train: (data: any) => api.post('/train', data),
  predict: async (modelId: number, formData: FormData, token: string) => {
    try {
      console.log(`Sending prediction request for model ID: ${modelId}`);
      const response = await api.post(`/predict/${modelId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      console.log("Prediction response:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("Prediction API error:", error.response || error);
      throw error;
    }
  },
  getPredictions: (modelId: number, page = 1) => api.get(`/predictions/${modelId}?page=${page}`),
  export: (modelId: number) => api.get(`/export_model/${modelId}`),
  attachDataset: (modelId: number, datasetId: number) =>
    api.put(`/attach_dataset_to_model/${modelId}`, { dataset_id: datasetId }),
  getFeatures: async (modelId: number) => {
    try {
      console.log(`Fetching model features for model ID: ${modelId}`);
      const response = await api.get(`/predict/${modelId}`);
      console.log("API Response for /predict:", response.data);
      return response.data;
    } catch (error: any) {
      console.error("API Error on /predict:", error.response || error);
      throw error;
    }
  },
};



export const userApi = {
  getProfile: () => api.get('/profile'),
  deleteAccount: () => api.delete('/delete_account'),
};
