import axios from 'axios';

interface PredictionResponse {
  predictions: number[];
  confidence_score: number | null;
  received_features: Record<string, any>;
}

interface ModelFeatures {
  columns: Array<{
    name: string;
    dtype: string;
  }>;
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  headers: {
    'accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  }
});

// Add authorization interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); // Assuming token is stored in localStorage
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const predictionApi = {
  getFeatures: async (modelId: number): Promise<ModelFeatures> => {
    try {
      const response = await api.post(`/predict/${modelId}`);
      return response.data;
    } catch (error) {
      console.error('Error in getFeatures:', error);
      throw error;
    }
  },

  predict: async (modelId: number, featureValues: string): Promise<PredictionResponse> => {
    try {
      // Use URLSearchParams to properly format the data
      const params = new URLSearchParams();
      params.append('feature_values', featureValues);

      const response = await api.post(`/predict/${modelId}`, params);
      return response.data;
    } catch (error) {
      console.error('Error in predict:', error);
      throw error;
    }
  }
};