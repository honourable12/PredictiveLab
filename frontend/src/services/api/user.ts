import { api } from './base';

export const userApi = {
  getProfile: () => api.get('/profile'),
  deleteAccount: () => api.delete('/delete_account'),
};