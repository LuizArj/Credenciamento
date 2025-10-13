/**
 * FilterBar Component
 * 
 * Reusable search and filter component for admin pages.
 * Provides search input, date range filters, status filters, and action buttons.
 * 
 * @module components/admin/shared/FilterBar
 * @example
 * ```tsx
 * <FilterBar
 *   searchPlaceholder="Buscar eventos..."
 *   onSearch={(value) => setSearch(value)}
 *   onFilterChange={(filters) => setFilters(filters)}
 *   statusOptions={[
 *     { value: 'active', label: 'Ativo' },
 *     { value: 'inactive', label: 'Inativo' }
 *   ]}
 *   actions={[
 *     { label: 'Exportar', onClick: handleExport, icon: 'download' },
 *     { label: 'Novo', onClick: handleNew, icon: 'plus', variant: 'primary' }
 *   ]}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterAction {
  label: string;
  onClick: () => void;
  icon?: 'download' | 'plus' | 'refresh' | 'sync';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}

export interface FilterValues {
  search: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export interface FilterBarProps {
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Callback when search value changes (debounced) */
  onSearch?: (value: string) => void;
  /** Callback when any filter changes */
  onFilterChange?: (filters: FilterValues) => void;
  /** Status filter options */
  statusOptions?: FilterOption[];
  /** Show date range filters */
  showDateFilters?: boolean;
  /** Additional custom filters */
  customFilters?: React.ReactNode;
  /** Action buttons to display */
  actions?: FilterAction[];
  /** Debounce delay for search (ms) */
  debounceDelay?: number;
  /** Initial filter values */
  initialValues?: Partial<FilterValues>;
}

/**
 * FilterBar - Reusable search and filter component
 */
const FilterBar: React.FC<FilterBarProps> = ({
  searchPlaceholder = 'Buscar...',
  onSearch,
  onFilterChange,
  statusOptions,
  showDateFilters = false,
  customFilters,
  actions = [],
  debounceDelay = 500,
  initialValues = {},
}) => {
  const [filters, setFilters] = useState<FilterValues>({
    search: initialValues.search || '',
    status: initialValues.status || '',
    dateFrom: initialValues.dateFrom || '',
    dateTo: initialValues.dateTo || '',
    ...initialValues,
  });

  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchValue !== filters.search) {
        handleFilterUpdate('search', searchValue);
      }
    }, debounceDelay);

    return () => clearTimeout(timeoutId);
  }, [searchValue, debounceDelay]);

  const handleFilterUpdate = useCallback(
    (key: string, value: any) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);

      if (key === 'search' && onSearch) {
        onSearch(value);
      }

      if (onFilterChange) {
        onFilterChange(newFilters);
      }
    },
    [filters, onSearch, onFilterChange]
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleClearFilters = () => {
    const clearedFilters: FilterValues = {
      search: '',
      status: '',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
    setSearchValue('');
    if (onSearch) onSearch('');
    if (onFilterChange) onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== '' && value !== undefined
  );

  const getIconPath = (icon?: string) => {
    switch (icon) {
      case 'download':
        return 'M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3';
      case 'plus':
        return 'M12 4.5v15m7.5-7.5h-15';
      case 'refresh':
        return 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99';
      case 'sync':
        return 'M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99';
      default:
        return '';
    }
  };

  const getButtonClasses = (variant?: string) => {
    const base = 'px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
      case 'danger':
        return `${base} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300`;
      case 'secondary':
      default:
        return `${base} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      {/* Search Row */}
      <div className="flex flex-col lg:flex-row gap-4 mb-4">
        {/* Search Input */}
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchValue}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Status Filter */}
        {statusOptions && statusOptions.length > 0 && (
          <div className="w-full lg:w-48">
            <select
              value={filters.status}
              onChange={(e) => handleFilterUpdate('status', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Todos os status</option>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Date Filters Row */}
      {showDateFilters && (
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => handleFilterUpdate('dateFrom', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => handleFilterUpdate('dateTo', e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      )}

      {/* Custom Filters */}
      {customFilters && <div className="mb-4">{customFilters}</div>}

      {/* Actions Row */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        {/* Clear Filters */}
        <div>
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Action Buttons */}
        {actions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled || action.loading}
                className={`${getButtonClasses(action.variant)} flex items-center gap-2`}
              >
                {action.loading ? (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  action.icon && (
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={getIconPath(action.icon)}
                      />
                    </svg>
                  )
                )}
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterBar;
