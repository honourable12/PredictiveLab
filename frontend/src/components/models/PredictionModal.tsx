import React from 'react';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';

interface PredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
  features: string[];
  categoryEncoders: Record<string, Record<string, number>>; // Mapping categorical values
}

function PredictionModal({ isOpen, onClose, onSubmit, features, categoryEncoders }: PredictionModalProps) {
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (!isOpen) return null;

  const handleFormSubmit = (formData: any) => {
    // Convert input values to a formatted feature string
    const featureValuesArray = features.map((feature) => {
      const value = formData[feature];
      return isNaN(value) ? categoryEncoders[feature]?.[value] ?? value : value; // Encode categorical
    });

    const featureValues = featureValuesArray.join(","); // Convert array to comma-separated string

    const formDataObject = new FormData();
    formDataObject.append("feature_values", featureValues); // Add feature string to form-data

    console.log("Final Prediction Form-Data:", featureValues); // Debugging log

    onSubmit(formDataObject); // Send as form-data
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Make Prediction</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          {features.map((feature) => (
            <div key={feature}>
              <label className="block text-sm font-medium text-gray-700">
                {feature}
              </label>
              <input
                type="text"
                {...register(feature, {
                  required: `${feature} is required`,
                  validate: value => {
                    if (isNaN(value) && typeof value !== 'string') {
                      return 'Must be a number or text';
                    }
                    return true;
                  }
                })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200"
              />
              {errors[feature] && (
                <p className="text-red-500 text-sm mt-1">{errors[feature].message as string}</p>
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
      </div>
    </div>
  );
}

export default PredictionModal;
