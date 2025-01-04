import React from 'react';
import { Table, TableHead, TableBody, TableRow } from '../ui/Table';
import { formatDate } from '../../utils/date';

export interface Model {
  id: number;
  name: string;
  description: string;
  model_type: string;
  created_at: string;
  dataset_id: number;
}

interface Props {
  models: Model[];
  onPredict: (id: number) => void;
  onExport: (id: number) => void;
  onViewPredictions: (id: number) => void;
}

function ModelList({ models, onPredict, onExport, onViewPredictions }: Props) {
  return (
    <Table>
      <TableHead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </TableHead>
      <TableBody>
        {models.map((model) => (
          <TableRow key={model.id}>
            <td>{model.name}</td>
            <td>{model.model_type}</td>
            <td>{formatDate(model.created_at)}</td>
            <td className="space-x-2">
              <button
                onClick={() => onPredict(model.id)}
                className="text-blue-600 hover:text-blue-800"
              >
                Predict
              </button>
              <button
                onClick={() => onExport(model.id)}
                className="text-green-600 hover:text-green-800"
              >
                Export
              </button>
              <button
                onClick={() => onViewPredictions(model.id)}
                className="text-indigo-600 hover:text-indigo-800"
              >
                History
              </button>
            </td>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default ModelList;