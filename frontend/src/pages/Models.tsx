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
  const [modelFeatures, setModelFeatures] = useState<string[]>([]);
  const [categoryEncoders, setCategoryEncoders] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    fetchModels();
    fetchDatasets();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await modelsApi.list();
      console.log("Models API Response:", response.data);
      setModels(response.data);
    } catch (error) {
      console.error("Error fetching models:", error);
      setError("Failed to fetch models.");
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await datasetsApi.list();
      console.log("Datasets API Response:", response.data);
      setDatasets(response.data);
    } catch (error) {
      console.error("Error fetching datasets:", error);
      setError("Failed to fetch datasets.");
    }
  };

 const handlePredict = async (id: number) => {
  try {
    console.log(`Fetching features for model ID: ${id}`); // ✅ Debug log

    const model = models.find(m => m.id === id);
    if (!model) {
      setError("Selected model not found.");
      return;
    }

    const response = await modelsApi.getFeatures(id);

    console.log("Model Features API Response:", response.data); // ✅ Debug log

    setModelFeatures(response.data.feature_columns || []);
    setCategoryEncoders(response.data.preprocessing?.label_encoders || {});

    setSelectedModel(model);
    setIsPredictionModalOpen(true);
  } catch (error: any) {
    console.error("Error fetching model features:", error);
    setError(error.response?.data?.detail || "Failed to get model features.");
  }
};


  const handlePredictionSubmit = async (data: any) => {
    if (!selectedModel) return;

    try {
      setError(null);

      // Convert input data into a comma-separated feature string
      const featureValuesArray = modelFeatures.map((feature) => {
        const value = data[feature];
        return isNaN(value) ? categoryEncoders[feature]?.[value] ?? value : value;
      });

      const featureValues = featureValuesArray.join(",");
      const formData = new FormData();
      formData.append("feature_values", featureValues);

      console.log("Final Prediction Form-Data:", featureValues);

      const response = await modelsApi.predict(selectedModel.id, formData);
      setPredictionResult(response.data);
      setIsPredictionModalOpen(false);
    } catch (error: any) {
      console.error("Prediction error:", error);
      setError(error.response?.data?.detail || "Failed to make prediction.");
    }
  };

  const handleExport = async (id: number) => {
    try {
      await modelsApi.export(id);
    } catch (error) {
      console.error("Export error:", error);
      setError("Failed to export model.");
    }
  };

  const handleViewPredictions = async (id: number) => {
    try {
      const model = models.find(m => m.id === id);
      if (!model) return;

      setSelectedModel(model);
      const response = await modelsApi.getPredictions(id);
      setPredictions(response.data);
      setIsPredictionsHistoryModalOpen(true);
    } catch (error) {
      console.error("Error fetching predictions:", error);
      setError("Failed to fetch predictions.");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Models</h1>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">
            {typeof error === "string" ? error : JSON.stringify(error, null, 2)}
          </p>
        </div>
      )}

      {predictionResult && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4">
          <h3 className="text-lg font-medium text-green-800">Prediction Result</h3>
          <p className="mt-2 text-green-700">
            Predicted value: {predictionResult.predictions?.[0]}
            {predictionResult.confidence_score && (
              <span className="ml-2">
                (Confidence: {(predictionResult.confidence_score * 100).toFixed(2)}%)
              </span>
            )}
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Train New Model</h2>
        <ModelTraining datasets={datasets} onTrain={fetchModels} />
        {isTraining && (
          <div className="mt-4 text-indigo-600">
            Training model... This may take a few moments.
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Models</h2>
        {models.length === 0 ? (
          <p className="text-gray-500">No models available. Train a new model first.</p>
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
            features={modelFeatures}
            categoryEncoders={categoryEncoders}
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
