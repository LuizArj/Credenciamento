/**
 * EventCard Component
 *
 * Card view for events - optimized for mobile display
 *
 * @module components/admin/events/EventCard
 */

import React from 'react';
import { formatDateBR, formatDateRange } from '../../../lib/utils/date-format';

interface Event {
  id: string;
  nome: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  modalidade: string;
  tipo_evento: string;
  status: string;
  codevento_sas?: string;
  totalRegistrations?: number;
}

interface EventCardProps {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate">{event.nome}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {formatDateRange(event.data_inicio, event.data_fim)}
          </p>
        </div>
        <span
          className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full flex-shrink-0 ${
            event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {event.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-xs text-gray-500">Local</p>
          <p className="text-sm font-medium text-gray-900 truncate">{event.local}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Modalidade</p>
          <p className="text-sm font-medium text-gray-900">{event.modalidade || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Tipo</p>
          <p className="text-sm font-medium text-gray-900">{event.tipo_evento || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Inscritos</p>
          <p className="text-sm font-medium text-gray-900">{event.totalRegistrations || 0}</p>
        </div>
      </div>

      {/* SAS Code Badge */}
      {event.codevento_sas && (
        <div className="mb-3">
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
            SAS: {event.codevento_sas}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('Tem certeza que deseja remover este evento?')) {
              onDelete();
            }
          }}
          className="inline-flex items-center justify-center px-3 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default EventCard;
