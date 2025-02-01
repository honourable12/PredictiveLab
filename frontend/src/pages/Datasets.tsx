import React, { useState, useEffect } from 'react';
import { datasetsApi } from '../services/api';
import DatasetList from '../components/datasets/DatasetList';
import DatasetUpload from '../components/datasets/DatasetUpload';
import type { Dataset } from '../components/datasets/DatasetList';

function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [visualizationData, setVisualizationData] = useState<any>(null);

  useEffect(() => {
    fetchDatasets();
  }, []);

  const fetchDatasets = async () => {
    const response = await datasetsApi.list();
    setDatasets(response.data);
  };

  const handleUpload = async (formData: FormData) => {
    try {
      setIsUploading(true);
      await datasetsApi.upload(formData);
      await fetchDatasets();
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      await datasetsApi.delete(id);
      await fetchDatasets();
    }
  };

  const handleEdit = async (dataset: Dataset) => {
    const newName = prompt('Enter new name:', dataset.name);
    const newDescription = prompt('Enter new description:', dataset.description);

    if (newName && newDescription) {
      const formData = new FormData();
      formData.append('name', newName);
      formData.append('description', newDescription);

      await datasetsApi.update(dataset.id, formData);
      await fetchDatasets();
    }
  };

  const handleVisualize = async (id: number) => {
    try {
      const response = await datasetsApi.visualize(id);
      setVisualizationData(response.data);
      // Show visualization modal or component
    } catch (error) {
      console.error('Visualization error:', error);
    }
  };

  const handleClean = async (id: number, operations: any[]) => {
    try {
      const response = await datasetsApi.clean(id, operations);
      console.log('Dataset cleaned:', response.data);
      await fetchDatasets();
    } catch (error) {
      console.error('Cleaning error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datasets</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Upload New Dataset</h2>
        <DatasetUpload onUpload={handleUpload} />
      </div>

      {visualizationData && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Dataset Summary</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Shape</h3>
              <p>Rows: {visualizationData.shape[0]}, Columns: {visualizationData.shape[1]}</p>
            </div>
            <div>
              <h3 className="font-medium">Columns</h3>
              <ul className="list-disc list-inside">
                {visualizationData.columns.map((col: string) => (
                  <li key={col}>{col} ({visualizationData.dtypes[col]})</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-medium">Missing Values</h3>
              <ul className="list-disc list-inside">
                {Object.entries(visualizationData.missing_values).map(([col, count]: [string, any]) => (
                  <li key={col}>{col}: {count}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Datasets</h2>
        <DatasetList
          datasets={datasets}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onVisualize={handleVisualize}
          onClean={handleClean}
        />
      </div>
    </div>
  );
}

export default Datasets;