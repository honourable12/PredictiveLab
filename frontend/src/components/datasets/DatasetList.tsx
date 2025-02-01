import React, { useState } from 'react';
import { Table, TableHead, TableBody, TableRow } from '../ui/Table';
import { formatDate } from '../../utils/date';
import { Eye, Trash2, Edit2, Sparkles } from 'lucide-react';

export interface Dataset {
  id: number;
  name: string;
  description: string;
  columns: string[];
  row_count: number;
  created_at: string;
}

interface Props {
  datasets: Dataset[];
  onDelete: (id: number) => void;
  onEdit: (dataset: Dataset) => void;
  onVisualize: (id: number) => void;
  onClean: (id: number, operations: any[]) => void;
}

function DatasetList({ datasets, onDelete, onEdit, onVisualize, onClean }: Props) {
  const [selectedDataset, setSelectedDataset] = useState<number | null>(null);

  const handleClean = (id: number) => {
    const operations = [
      { type: 'handle_missing', strategy: 'drop' },
      { type: 'remove_duplicates' }
    ];
    onClean(id, operations);
  };

  return (
    <Table>
      <TableHead>
        <tr>
          <th>Name</th>
          <th>Description</th>
          <th>Rows</th>
          <th>Created</th>
          <th>Actions</th>
        </tr>
      </TableHead>
      <TableBody>
        {datasets.map((dataset) => (
          <TableRow key={dataset.id}>
            <td>{dataset.name}</td>
            <td>{dataset.description}</td>
            <td>{dataset.row_count}</td>
            <td>{formatDate(dataset.created_at)}</td>
            <td className="space-x-2">
              <button
                onClick={() => onVisualize(dataset.id)}
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                title="Visualize Dataset"
              >
                <Eye className="w-4 h-4 mr-1" />
                Visualize
              </button>
              <button
                onClick={() => handleClean(dataset.id)}
                className="text-purple-600 hover:text-purple-800 inline-flex items-center"
                title="Clean Dataset"
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Clean
              </button>
              <button
                onClick={() => onEdit(dataset)}
                className="text-green-600 hover:text-green-800 inline-flex items-center"
                title="Edit Dataset"
              >
                <Edit2 className="w-4 h-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => onDelete(dataset.id)}
                className="text-red-600 hover:text-red-800 inline-flex items-center"
                title="Delete Dataset"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </button>
            </td>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default DatasetList;