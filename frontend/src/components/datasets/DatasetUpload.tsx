import React from 'react';
import { useForm } from 'react-hook-form';

interface Props {
  onUpload: (formData: FormData) => Promise<void>;
}

function DatasetUpload({ onUpload }: Props) {
  const { register, handleSubmit, reset } = useForm();

  const onSubmit = async (data: any) => {
    const formData = new FormData();
    formData.append('file', data.file[0]);
    formData.append('name', data.name);
    formData.append('description', data.description);
    
    await onUpload(formData);
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Dataset Name</label>
        <input
          type="text"
          {...register('name', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">CSV File</label>
        <input
          type="file"
          accept=".csv"
          {...register('file', { required: true })}
          className="mt-1 block w-full"
        />
      </div>
      
      <button
        type="submit"
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        Upload Dataset
      </button>
    </form>
  );
}

export default DatasetUpload;