import React from 'react';
import { X } from 'lucide-react';
import { formatDate } from '../../utils/date';

interface Prediction {
  id: number;
  input_data: Record<string, any>;
  prediction: any;
  created_at: string;
}

interface PredictionsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  predictions: Prediction[];
  modelName: string;
}

function PredictionsHistoryModal({ isOpen, onClose, predictions, modelName }: PredictionsHistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Prediction History - {modelName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Input Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prediction
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {predictions.map((prediction) => (
                <tr key={prediction.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(prediction.created_at)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(prediction.input_data, null, 2)}
                    </pre>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {prediction.prediction}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>



        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default PredictionsHistoryModal;