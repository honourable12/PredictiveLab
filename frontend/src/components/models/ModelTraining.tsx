import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { Dataset } from '../datasets/DatasetList';

interface ModelTrainingForm {
  dataset_id: number;
  name: string;
  target_column: string;
  model_type: string;
  description?: string;
  drop_columns?: string[];
}

interface Props {
  datasets: Dataset[];
  onTrain: (data: {
    dataset_id: number;
    target_column: string;
    ml_model_type: string;
    name: string;
    description?: string;
    drop_columns?: string[];
  }) => Promise<void>;
}

function ModelTraining({ datasets, onTrain }: Props) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<ModelTrainingForm>();
  const [columns, setColumns] = useState<string[]>([]);
  const selectedDatasetId = watch('dataset_id');

  useEffect(() => {
    if (selectedDatasetId) {
      const dataset = datasets.find(d => d.id === Number(selectedDatasetId));
      if (dataset) {
        setColumns(dataset.columns);
      }
    }
  }, [selectedDatasetId, datasets]);

  const onSubmit = (data: ModelTrainingForm) => {
    const formattedData = {
      dataset_id: Number(data.dataset_id),
      target_column: data.target_column,
      ml_model_type: data.model_type,
      name: data.name,
      description: data.description,
      drop_columns: data.drop_columns
    };

    console.log("Submitting training data:", formattedData);
    onTrain(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Model Name</label>
        <input
          type="text"
          {...register('name', { required: 'Model name is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Dataset</label>
        <select
          {...register('dataset_id', {
            required: 'Dataset is required',
            valueAsNumber: true // Ensure the value is a number
          })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        >
          <option value="">Select a dataset</option>
          {datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))}
        </select>
        {errors.dataset_id && (
          <p className="text-red-500 text-sm mt-1">{errors.dataset_id.message}</p>
        )}
      </div>

      {columns.length > 0 && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Column</label>
            <select
              {...register('target_column', { required: 'Target column is required' })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
            >
              <option value="">Select target column</option>
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            {errors.target_column && (
              <p className="text-red-500 text-sm mt-1">{errors.target_column.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Drop Columns (Optional)</label>
            <select
              multiple
              {...register('drop_columns')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              size={Math.min(5, columns.length)}
            >
              {columns.map((column) => (
                <option key={column} value={column}>
                  {column}
                </option>
              ))}
            </select>
            <p className="text-sm text-gray-500 mt-1">
              Hold Ctrl/Cmd to select multiple columns to drop
            </p>
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">Model Type</label>
        <select
          {...register('model_type', { required: 'Model type is required' })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
        >
          <option value="">Select a model type</option>
          <option value="linear_regression">Linear Regression</option>
          <option value="logistic_regression">Logistic Regression</option>
          <option value="random_forest">Random Forest</option>
          <option value="decision_tree">Decision Tree</option>
          <option value="svm">SVM</option>
        </select>
        {errors.model_type && (
          <p className="text-red-500 text-sm mt-1">{errors.model_type.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
        <textarea
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
          rows={3}
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