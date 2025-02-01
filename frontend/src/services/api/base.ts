import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
});

// Intercept requests and set headers dynamically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // ✅ Conditionally set Content-Type based on the request URL
  if (config.url?.includes('/register') || config.url?.includes('/login')) {
    config.headers['Content-Type'] = 'multipart/form-data';
  } else {
    config.headers['Content-Type'] = 'application/json'; // Use JSON for other requests
  }

  return config;
});
