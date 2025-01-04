import React from 'react';
import { Table, TableHead, TableBody, TableRow } from '../ui/Table';
import { formatDate } from '../../utils/date';

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
}

function DatasetList({ datasets, onDelete, onEdit, onVisualize }: Props) {
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
                className="text-blue-600 hover:text-blue-800"
              >
                Visualize
              </button>
              <button
                onClick={() => onEdit(dataset)}
                className="text-green-600 hover:text-green-800"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(dataset.id)}
                className="text-red-600 hover:text-red-800"
              >
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