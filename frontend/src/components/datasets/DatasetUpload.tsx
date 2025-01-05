import React from 'react';
import { useForm } from 'react-hook-form';

interface Props {
  onUpload: (formData: FormData) => Promise<void>;
}

function DatasetUpload({ onUpload }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const onSubmit = async (data: any) => {
    try {
      const formData = new FormData();
      // Ensure file is the first file from the FileList
      formData.append('file', data.file[0]);
      // Add other form fields
      formData.append('name', data.name);
      // Only append description if it exists
      if (data.description) {
        formData.append('description', data.description);
      }
      
      await onUpload(formData);
      reset();
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Dataset Name</label>
        <input
          type="text"
          {...register('name', { required: 'Name is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message as string}</p>
        )}
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
          {...register('file', { 
            required: 'File is required',
            validate: {
              isCsv: (files) => {
                if (!files?.[0]) return 'File is required';
                return files[0].name.endsWith('.csv') || 'File must be a CSV';
              }
            }
          })}
          className="mt-1 block w-full"
        />
        {errors.file && (
          <p className="text-red-500 text-sm mt-1">{errors.file.message as string}</p>
        )}
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