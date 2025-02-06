import React, { useState, useEffect } from 'react';
import { modelsApi, datasetsApi } from '../services/api';
import ModelList from '../components/models/ModelList';
import ModelTraining from '../components/models/ModelTraining';
import PredictionModal from '../components/models/PredictionModal';
import PredictionsHistoryModal from '../components/models/PredictionsHistoryModal';
import type { Model } from '../components/models/ModelList';
import type { Dataset } from '../components/datasets/DatasetList';

function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  const [isPredictionsHistoryModalOpen, setIsPredictionsHistoryModalOpen] = useState(false);
  const [predictionResult, setPredictionResult] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModels = async () => {
    try {
      console.log("Fetching models...");
      const response = await modelsApi.list();
      console.log("Models fetched:", response.data);
      setModels(response.data);
    } catch (error: any) {
      console.error("Error fetching models:", error);
      setError(error.response?.data?.detail || "Failed to fetch models.");
    }
  };

  const fetchDatasets = async () => {
    try {
      console.log("Fetching datasets...");
      const response = await datasetsApi.list();
      console.log("Datasets fetched:", response.data);
      setDatasets(response.data);
    } catch (error: any) {
      console.error("Error fetching datasets:", error);
      setError(error.response?.data?.detail || "Failed to fetch datasets.");
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchModels(), fetchDatasets()]);
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleTrainModel = async (data: {
    dataset_id: number;
    target_column: string;
    ml_model_type: string;
    name: string;
    description?: string;
    drop_columns?: string[];
  }) => {
    try {
      console.log("Training model with data:", data);
      setIsTraining(true);
      setError(null);
      await modelsApi.train(data);
      await fetchModels();
    } catch (error: any) {
      console.error("Training error:", error);
      setError(error.response?.data?.detail || "Failed to train model.");
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = async (id: number) => {
    try {
      console.log("Handling prediction for model:", id);
      const model = models.find(m => m.id === id);
      if (!model) {
        throw new Error("Selected model not found.");
      }

      const featuresResponse = await modelsApi.getFeatures(id);
      setSelectedModel({ ...model, features: featuresResponse.data });
      setIsPredictionModalOpen(true);
    } catch (error: any) {
      console.error("Prediction error:", error);
      setError(error.response?.data?.detail || "Failed to handle prediction.");
    }
  };

  const handlePredictionSubmit = async (formData: FormData) => {
    if (!selectedModel) return;

    try {
      console.log("Submitting prediction for model:", selectedModel.id);
      setError(null);
      const response = await modelsApi.predict(selectedModel.id, formData);
      setPredictionResult(response.data);
      setIsPredictionModalOpen(false);
    } catch (error: any) {
      console.error("Prediction submission error:", error);
      setError(error.response?.data?.detail || "Failed to make prediction.");
    }
  };

  const handleViewPredictions = async (id: number) => {
    try {
      console.log("Viewing predictions for model:", id);
      const model = models.find(m => m.id === id);
      if (!model) {
        throw new Error("Selected model not found.");
      }

      setSelectedModel(model);
      const response = await modelsApi.getPredictions(id, currentPage);
      setPredictions(response.data);
      setIsPredictionsHistoryModalOpen(true);
    } catch (error: any) {
      console.error("Error fetching predictions:", error);
      setError(error.response?.data?.detail || "Failed to fetch predictions.");
    }
  };

  const handleExport = async (id: number) => {
    try {
      console.log("Exporting model:", id);
      await modelsApi.export(id);
    } catch (error: any) {
      console.error("Export error:", error);
      setError(error.response?.data?.detail || "Failed to export model.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Models</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {predictionResult && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <h3 className="text-lg font-medium text-green-800">Prediction Result</h3>
          <pre className="mt-2 text-green-700">
            {JSON.stringify(predictionResult, null, 2)}
          </pre>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Train New Model</h2>
        <ModelTraining datasets={datasets} onTrain={handleTrainModel} />
        {isTraining && (
          <div className="mt-4 text-indigo-600">
            Training model... This may take a few moments.
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Models</h2>
        {models.length === 0 ? (
          <p className="text-gray-500">No models available. Train a new model to get started.</p>
        ) : (
          <ModelList
            models={models}
            onPredict={handlePredict}
            onExport={handleExport}
            onViewPredictions={handleViewPredictions}
          />
        )}
      </div>

      {selectedModel && (
        <>
          <PredictionModal
            isOpen={isPredictionModalOpen}
            onClose={() => {
              setIsPredictionModalOpen(false);
              setSelectedModel(null);
              setPredictionResult(null);
            }}
            onSubmit={handlePredictionSubmit}
            modelId={selectedModel.id}
          />

          <PredictionsHistoryModal
            isOpen={isPredictionsHistoryModalOpen}
            onClose={() => {
              setIsPredictionsHistoryModalOpen(false);
              setSelectedModel(null);
            }}
            predictions={predictions}
            modelName={selectedModel.name}
          />
        </>
      )}
    </div>
  );
}

export default Models;