import React, { useState, useEffect } from 'react';
import { modelsApi, datasetsApi } from '../services/api';
import ModelList from '../components/models/ModelList';
import ModelTraining from '../components/models/ModelTraining';
import type { Model } from '../components/models/ModelList';
import type { Dataset } from '../components/datasets/DatasetList';

function Models() {
  const [models, setModels] = useState<Model[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);

  useEffect(() => {
    fetchModels();
    fetchDatasets();
  }, []);

  const fetchModels = async () => {
    const response = await modelsApi.list();
    setModels(response.data);
  };

  const fetchDatasets = async () => {
    const response = await datasetsApi.list();
    setDatasets(response.data);
  };

  const handleTrain = async (data: any) => {
    await modelsApi.train(data);
    await fetchModels();
  };

  const handlePredict = async (id: number) => {
    // TODO: Implement prediction modal/form
    console.log('Predict with model:', id);
  };

  const handleExport = async (id: number) => {
    await modelsApi.export(id);
  };

  const handleViewPredictions = async (id: number) => {
    const response = await modelsApi.getPredictions(id);
    console.log('Predictions:', response.data);
    // TODO: Implement predictions history modal
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Models</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Train New Model</h2>
        <ModelTraining datasets={datasets} onTrain={handleTrain} />
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