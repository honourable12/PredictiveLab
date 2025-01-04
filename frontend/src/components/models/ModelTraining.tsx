import React from 'react';
import { useForm } from 'react-hook-form';
import type { Dataset } from '../datasets/DatasetList';

interface Props {
  datasets: Dataset[];
  onTrain: (data: any) => Promise<void>;
}

function ModelTraining({ datasets, onTrain }: Props) {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit(onTrain)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Model Name</label>
        <input
          type="text"
          {...register('name', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Dataset</label>
        <select
          {...register('dataset_id', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        >
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Model Type</label>
        <select
          {...register('model_type', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        >
          <option value="linear_regression">Linear Regression</option>
          <option value="logistic_regression">Logistic Regression</option>
          <option value="random_forest">Random Forest</option>
          <option value="decision_tree">Decision Tree</option>
          <option value="svm">SVM</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Target Column</label>
        <input
          type="text"
          {...register('target_column', { required: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
      </div>

      <button
        type="submit"
        className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
      >
        Train Model
      </button>
    </form>
  );
}

export default ModelTraining;