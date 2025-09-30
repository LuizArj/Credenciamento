import { FC } from 'react';
import { Calendar, Users, MapPin } from 'lucide-react';
import Link from 'next/link';

interface Event {
  id: string;
  name: string;
  date: string;
  location?: string;
  participants: number;
  status: 'active' | 'completed' | 'upcoming';
}

interface EventsListProps {
  events?: Event[];
  isLoading?: boolean;
  className?: string;
}

const StatusBadge: FC<{ status: Event['status'] }> = ({ status }) => {
  const styles = {
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    upcoming: 'bg-blue-100 text-blue-800',
  };

  const labels = {
    active: 'Ativo',
    completed: 'Concluído',
    upcoming: 'Próximo',
  };

  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
};

export const EventsList: FC<EventsListProps> = ({
  events = [],
  isLoading,
  className = '',
}) => {
  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Eventos Recentes</h2>
        <Link
          href="/admin/eventos"
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Ver todos
        </Link>
      </div>

      <div className="space-y-6">
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            Nenhum evento encontrado
          </p>
        ) : (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0">
                <Calendar className="w-10 h-10 text-gray-400" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {event.name}
                  </p>
                  <StatusBadge status={event.status} />
                </div>
                
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Calendar className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  <span>{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                </div>
                
                {event.location && (
                  <div className="mt-1 flex items-center text-sm text-gray-500">
                    <MapPin className="flex-shrink-0 mr-1.5 h-4 w-4" />
                    <span>{event.location}</span>
                  </div>
                )}
                
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Users className="flex-shrink-0 mr-1.5 h-4 w-4" />
                  <span>{event.participants} participantes</span>
                </div>
              </div>

              <Link
                href={`/admin/eventos/${event.id}`}
                className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-700"
              >
                Detalhes →
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
};