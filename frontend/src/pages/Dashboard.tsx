import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { datasetsApi, modelsApi } from '../services/api';
import { Database, Brain } from 'lucide-react';

function Dashboard() {
  const [stats, setStats] = useState({ datasets: 0, models: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [datasets, models] = await Promise.all([
        datasetsApi.list(),
        modelsApi.list()
      ]);
      setStats({
        datasets: datasets.data.length,
        models: models.data.length
      });
    };
    fetchStats();
  }, []);

  const chartData = [
    { name: 'Datasets', count: stats.datasets },
    { name: 'Models', count: stats.models }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <Database className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold">Total Datasets</h2>
              <p className="text-3xl font-bold text-indigo-600">{stats.datasets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center space-x-3">
            <Brain className="w-8 h-8 text-indigo-600" />
            <div>
              <h2 className="text-xl font-semibold">Total Models</h2>
              <p className="text-3xl font-bold text-indigo-600">{stats.models}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Overview</h2>
        <BarChart width={600} height={300} data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="count" fill="#4f46e5" />
        </BarChart>
      </div>
    </div>
  );
}

export default Dashboard;