import { FC } from 'react';
import { Clock } from 'lucide-react';

interface Activity {
  id: string;
  type: 'checkin' | 'event_created' | 'report_generated' | 'user_action';
  description: string;
  user: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities?: Activity[];
  isLoading?: boolean;
  className?: string;
}

const ActivityIcon: FC<{ type: Activity['type'] }> = ({ type }) => {
  const styles = {
    checkin: 'bg-green-100 text-green-600',
    event_created: 'bg-blue-100 text-blue-600',
    report_generated: 'bg-purple-100 text-purple-600',
    user_action: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className={`p-2 rounded-full ${styles[type]}`}>
      <Clock className="w-5 h-5" />
    </div>
  );
};

export const RecentActivity: FC<RecentActivityProps> = ({
  activities = [],
  isLoading,
  className = '',
}) => {
  const formatTimeAgo = (timestamp: string) => {
    try {
      const date = new Date(timestamp);

      // Verificar se a data é válida
      if (isNaN(date.getTime())) {
        return 'Data inválida';
      }

      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

      if (seconds < 60) return 'agora mesmo';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}min atrás`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h atrás`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d atrás`;
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error, timestamp);
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex space-x-4">
              <div className="rounded-full bg-gray-200 h-10 w-10"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Atividade Recente</h2>

      <div className="space-y-6">
        {activities.length === 0 ? (
          <p className="text-gray-500 text-center py-4">Nenhuma atividade recente</p>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <ActivityIcon type={activity.type} />

              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <div className="mt-1 flex items-center text-xs text-gray-500">
                  <span className="font-medium">{activity.user}</span>
                  <span className="mx-1">•</span>
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
