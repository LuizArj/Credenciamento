/**
 * StatsCard Component
 * 
 * Display statistics with icons, formatting, and trend indicators.
 * Used in dashboards and report panels to show key metrics.
 * 
 * @module components/admin/shared/StatsCard
 * @example
 * ```tsx
 * <StatsCard
 *   title="Total de Participantes"
 *   value={1234}
 *   icon="users"
 *   trend={{ value: 12.5, isPositive: true }}
 *   subtitle="vs. mês anterior"
 *   color="blue"
 * />
 * ```
 */

import React from 'react';

export type IconType = 'users' | 'check' | 'calendar' | 'trending' | 'clock' | 'ticket' | 'badge' | 'chart';
export type ColorType = 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray';

export interface StatsTrend {
  value: number;
  isPositive: boolean;
  label?: string;
}

export interface StatsCardProps {
  /** Main title of the stat */
  title: string;
  /** Main value to display */
  value: number | string;
  /** Icon to display */
  icon?: IconType;
  /** Optional trend indicator */
  trend?: StatsTrend;
  /** Subtitle or description */
  subtitle?: string;
  /** Color theme */
  color?: ColorType;
  /** Format value as currency */
  formatAsCurrency?: boolean;
  /** Format value as percentage */
  formatAsPercentage?: boolean;
  /** Click handler for interactive cards */
  onClick?: () => void;
  /** Loading state */
  loading?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * StatsCard - Display statistics with formatting
 */
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  color = 'blue',
  formatAsCurrency = false,
  formatAsPercentage = false,
  onClick,
  loading = false,
  className = '',
}) => {
  const getIconPath = (iconType?: IconType): string => {
    switch (iconType) {
      case 'users':
        return 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z';
      case 'check':
        return 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'calendar':
        return 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z';
      case 'trending':
        return 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6';
      case 'clock':
        return 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
      case 'ticket':
        return 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z';
      case 'badge':
        return 'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z';
      case 'chart':
        return 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z';
      default:
        return 'M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z';
    }
  };

  const getColorClasses = (colorType: ColorType) => {
    switch (colorType) {
      case 'blue':
        return {
          bg: 'bg-blue-50',
          icon: 'bg-blue-500',
          text: 'text-blue-600',
        };
      case 'green':
        return {
          bg: 'bg-green-50',
          icon: 'bg-green-500',
          text: 'text-green-600',
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          icon: 'bg-yellow-500',
          text: 'text-yellow-600',
        };
      case 'red':
        return {
          bg: 'bg-red-50',
          icon: 'bg-red-500',
          text: 'text-red-600',
        };
      case 'purple':
        return {
          bg: 'bg-purple-50',
          icon: 'bg-purple-500',
          text: 'text-purple-600',
        };
      case 'gray':
        return {
          bg: 'bg-gray-50',
          icon: 'bg-gray-500',
          text: 'text-gray-600',
        };
    }
  };

  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    if (formatAsCurrency) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(val);
    }
    
    if (formatAsPercentage) {
      return `${val.toFixed(1)}%`;
    }
    
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  const colors = getColorClasses(color);
  const isClickable = !!onClick;

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className={`h-12 w-12 rounded-md ${colors.bg}`} />
            </div>
            <div className="ml-5 w-full">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        bg-white rounded-lg shadow p-6 transition-all
        ${isClickable ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
        ${className}
      `}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center">
        {icon && (
          <div className="flex-shrink-0">
            <div className={`h-12 w-12 rounded-md ${colors.icon} flex items-center justify-center`}>
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={getIconPath(icon)}
                />
              </svg>
            </div>
          </div>
        )}
        <div className={`${icon ? 'ml-5' : ''} w-full`}>
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="mt-1 flex items-baseline justify-between">
              <div className="flex items-baseline text-2xl font-semibold text-gray-900">
                {formatValue(value)}
              </div>
              {trend && (
                <div
                  className={`
                    ml-2 flex items-baseline text-sm font-semibold
                    ${trend.isPositive ? 'text-green-600' : 'text-red-600'}
                  `}
                >
                  <svg
                    className={`
                      self-center flex-shrink-0 h-5 w-5
                      ${trend.isPositive ? 'text-green-500' : 'text-red-500'}
                      ${trend.isPositive ? '' : 'rotate-180'}
                    `}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="ml-1">{Math.abs(trend.value)}%</span>
                </div>
              )}
            </dd>
            {subtitle && (
              <dd className="mt-1 text-xs text-gray-500">{subtitle}</dd>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
