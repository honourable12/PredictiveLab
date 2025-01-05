import React, { useState, useEffect } from 'react';
import { modelsApi, datasetsApi } from '../services/api';
import ModelList from '../components/models/ModelList';
import ModelTraining from '../components/models/ModelTraining';
import type { Model } from '../components/models/ModelList';
import type { Dataset } from '../components/datasets/DatasetList';

function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchModels();
    fetchDatasets();
  }, []);

  const fetchModels = async () => {
    try {
      const response = await modelsApi.list();
      setModels(response.data);
    } catch (error) {
      console.error('Error fetching models:', error);
      setError('Failed to fetch models');
    }
  };

  const fetchDatasets = async () => {
    try {
      const response = await datasetsApi.list();
      setDatasets(response.data);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setError('Failed to fetch datasets');
    }
  };

  const handleTrain = async (data: any) => {
    try {
      setIsTraining(true);
      setError(null);
      await modelsApi.train(data);
      await fetchModels();
    } catch (error: any) {
      console.error('Training error:', error);
      setError(error.response?.data?.detail || 'Failed to train model');
    } finally {
      setIsTraining(false);
    }
  };

  const handlePredict = async (id: number) => {
    // TODO: Implement prediction modal/form
    console.log('Predict with model:', id);
  };

  const handleExport = async (id: number) => {
    try {
      await modelsApi.export(id);
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export model');
    }
  };

  const handleViewPredictions = async (id: number) => {
    try {
      const response = await modelsApi.getPredictions(id);
      console.log('Predictions:', response.data);
      // TODO: Implement predictions history modal
    } catch (error) {
      console.error('Error fetching predictions:', error);
      setError('Failed to fetch predictions');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Models</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Train New Model</h2>
        <ModelTraining 
          datasets={datasets} 
          onTrain={handleTrain} 
        />
        {isTraining && (
          <div className="mt-4 text-indigo-600">
            Training model... This may take a few moments.
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Models</h2>
        <ModelList
          models={models}
          onPredict={handlePredict}
          onExport={handleExport}
          onViewPredictions={handleViewPredictions}
        />
      </div>
    </div>
  );
}

export default Models;