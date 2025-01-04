import React, { useState, useEffect } from 'react';
import { datasetsApi } from '../services/api';
import DatasetList from '../components/datasets/DatasetList';
import DatasetUpload from '../components/datasets/DatasetUpload';
import type { Dataset } from '../components/datasets/DatasetList';

function Datasets() {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
    const response = await datasetsApi.visualize(id);
    console.log('Dataset visualization:', response.data);
    // TODO: Implement visualization modal/component
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Datasets</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Upload New Dataset</h2>
        <DatasetUpload onUpload={handleUpload} />
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Your Datasets</h2>
        <DatasetList
          datasets={datasets}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onVisualize={handleVisualize}
        />
      </div>
    </div>
  );
}

export default Datasets;