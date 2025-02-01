import { api } from './base';

export const datasetsApi = {
  list: () => api.get('/datasets'),
  upload: (formData: FormData) => {
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
  clean: (id: number, operations: any[]) => api.post(`/clean_dataset/${id}`, { operations }),
};