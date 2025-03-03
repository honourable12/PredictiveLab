import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { modelsApi } from '../../services/api';

interface Column {
  name: string;
  dtype: string;
}

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  modelId: number;
}

function PredictionModal({ isOpen, onClose, onSubmit, modelId }: PredictionModalProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [predictionResult, setPredictionResult] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm();

  useEffect(() => {
    const fetchColumns = async () => {
      try {
        setIsLoading(true);
        const response = await modelsApi.getFeatures(modelId);

        if (!response?.columns || !Array.isArray(response.columns)) {
          throw new Error("Invalid response structure from API");
        }

        setColumns(response.columns);
      } catch (error) {
        console.error("Error fetching columns:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen && modelId) {
      fetchColumns();
    }
  }, [isOpen, modelId]);

  useEffect(() => {
    if (!isOpen) {
      reset();
      setPredictionResult(null);
    }
  }, [isOpen, reset]);

  const handleFormSubmit = async (data: Record<string, string>) => {
    const formData = new FormData();
    const featureValues = columns.map(column => data[column.name] || "").join(',');
    formData.append('feature_values', featureValues);

    try {
      const result = await onSubmit(formData);
      setPredictionResult(result as unknown as string);
    } catch (error) {
      console.error("Error making prediction:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Make Prediction</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="py-4 text-center text-gray-600">Loading model features...</div>
        ) : columns.length > 0 ? (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {columns.map((column) => (
              <div key={column.name}>
                <label className="block text-sm font-medium text-gray-700">
                  {column.name} ({column.dtype})
                </label>
                <input
                  type={column.dtype.includes('int') || column.dtype.includes('float') ? "number" : "text"}
                  {...register(column.name, {
                    required: `${column.name} is required`,
                    validate: value => {
                      if (column.dtype.includes('float') || column.dtype.includes('int')) {
                        return !isNaN(parseFloat(value)) || `${column.name} must be a number`;
                      }
                      return true;
                    }
                  })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
                />
                {errors[column.name] && (
                  <p className="text-red-500 text-sm mt-1">{errors[column.name]?.message as string}</p>
                )}
              </div>
            ))}

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Predict
              </button>
            </div>
          </form>
        ) : (
          <p className="text-center text-gray-600">No features available.</p>
        )}
      </div>

      {predictionResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Prediction Result</h2>
              <button onClick={() => setPredictionResult(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-700">{predictionResult}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default PredictionModal;
