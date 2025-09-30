import { FC } from 'react';
import { Users, Calendar, CheckCircle, Clock } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

interface DashboardMetricsProps {
  metrics?: {
    totalParticipants: number;
    activeEvents: number;
    completedEvents: number;
    upcomingEvents: number;
    trends?: {
      participants: number;
      events: number;
    };
  };
  isLoading?: boolean;
}

const MetricCard: FC<MetricCardProps> = ({
  title,
  value,
  icon,
  trend,
  isLoading
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm">
    {isLoading ? (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
        <div className="h-8 bg-gray-200 rounded w-3/4"></div>
      </div>
    ) : (
      <>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
          <div className="text-gray-400">{icon}</div>
        </div>
        <div className="flex items-end space-x-3">
          <span className="text-2xl font-bold text-gray-800">{value}</span>
          {trend && (
            <span
              className={`text-sm font-medium ${
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
          )}
        </div>
      </>
    )}
  </div>
);

export const DashboardMetrics: FC<DashboardMetricsProps> = ({
  metrics,
  isLoading
}) => {
  return (
    <>
      <MetricCard
        title="Total de Participantes"
        value={metrics?.totalParticipants || 0}
        icon={<Users className="w-5 h-5" />}
        trend={
          metrics?.trends?.participants
            ? {
                value: metrics.trends.participants,
                isPositive: metrics.trends.participants > 0
              }
            : undefined
        }
        isLoading={isLoading}
      />
      <MetricCard
        title="Eventos Ativos"
        value={metrics?.activeEvents || 0}
        icon={<Calendar className="w-5 h-5" />}
        isLoading={isLoading}
      />
      <MetricCard
        title="Eventos Concluídos"
        value={metrics?.completedEvents || 0}
        icon={<CheckCircle className="w-5 h-5" />}
        isLoading={isLoading}
      />
      <MetricCard
        title="Próximos Eventos"
        value={metrics?.upcomingEvents || 0}
        icon={<Clock className="w-5 h-5" />}
        isLoading={isLoading}
      />
    </>
  );
};