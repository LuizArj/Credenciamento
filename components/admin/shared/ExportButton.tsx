/**
 * ExportButton Component
 * 
 * Dropdown button for exporting data to Excel or PDF with anonymization option.
 * Provides a clean interface for selecting export format and privacy options.
 * 
 * @module components/admin/shared/ExportButton
 * @example
 * ```tsx
 * <ExportButton
 *   onExport={(format, anonymize) => handleExport(format, anonymize)}
 *   disabled={!hasData}
 * />
 * ```
 */

import React, { useState, useRef, useEffect } from 'react';

export interface ExportButtonProps {
  /** Callback when export is triggered */
  onExport: (format: 'excel' | 'pdf', anonymize: boolean) => void | Promise<void>;
  /** Disable the button */
  disabled?: boolean;
  /** Button label */
  label?: string;
  /** Show anonymization option */
  showAnonymizeOption?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Button variant */
  variant?: 'primary' | 'secondary';
  /** Custom className */
  className?: string;
}

/**
 * ExportButton - Export data with format and anonymization options
 */
const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  disabled = false,
  label = 'Exportar',
  showAnonymizeOption = true,
  loading = false,
  variant = 'secondary',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [anonymize, setAnonymize] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setExporting(true);
      setIsOpen(false);
      await onExport(format, anonymize);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const getButtonClasses = () => {
    const base = 'relative inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    if (variant === 'primary') {
      return `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 disabled:bg-blue-300`;
    }
    
    return `${base} bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400`;
  };

  const isDisabled = disabled || loading || exporting;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDisabled}
        className={getButtonClasses()}
      >
        {(loading || exporting) ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
            Exportando...
          </>
        ) : (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {label}
            <svg
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !isDisabled && (
        <div className="absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1" role="menu">
            {/* Anonymization Option */}
            {showAnonymizeOption && (
              <div className="px-4 py-3 border-b border-gray-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={anonymize}
                    onChange={(e) => setAnonymize(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Anonimizar dados pessoais
                  </span>
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Remove CPF, email e telefone dos dados exportados
                </p>
              </div>
            )}

            {/* Export Options */}
            <div className="py-1">
              <button
                onClick={() => handleExport('excel')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                role="menuitem"
              >
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Exportar para Excel</div>
                  <div className="text-xs text-gray-500">
                    Planilha com todos os dados (.xlsx)
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleExport('pdf')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
                role="menuitem"
              >
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Exportar para PDF</div>
                  <div className="text-xs text-gray-500">
                    Documento formatado com gráficos (.pdf)
                  </div>
                </div>
              </button>
            </div>

            {/* Info */}
            <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600">
                <svg
                  className="inline h-3 w-3 mr-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                O download começará automaticamente
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;
