import axios from 'axios';

// Base axios instance with common config
export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
  },
});

// Models API endpoints
export const modelsApi = {
  list: () => api.get('/models'),

  train: (data: {
    dataset_id: number;
    target_column: string;
    ml_model_type: string;
    name: string;
    description?: string;
    drop_columns?: string[];
  }) =>
    api.post('/train', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  predict: (modelId: number, formData: FormData) =>
    api.post(`/predict/${modelId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  getPredictions: (modelId: number, page = 1) =>
    api.get(`/predictions/${modelId}?page=${page}`),

  export: (modelId: number) =>
    api.get(`/export_model/${modelId}`),

  getFeatures: async (modelId: number) => {
    try {
      console.log(`Fetching model features for model ID: ${modelId}`);
      const response = await api.get(`/predict/${modelId}`);
      console.log("API Response for /predict:", response.data);
      return response;
    } catch (error: any) {
      console.error("API Error on /predict:", error.response || error);
      throw error;
    }
  },
};
