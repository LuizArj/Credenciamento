const colors = {
  primary: {
    blue: {
      DEFAULT: '#004B8D',
      dark: '#003866',
      light: '#0066CC',
      hover: '#005CA3',
    },
    red: {
      DEFAULT: '#DC2626',
      dark: '#B91C1C',
      hover: '#EF4444',
    },
    green: {
      DEFAULT: '#059669',
      dark: '#047857',
      hover: '#10B981',
    },
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },
};

const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  32: '8rem',
  40: '10rem',
  48: '12rem',
  56: '14rem',
  64: '16rem',
};

const typography = {
  fontFamily: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Georgia', 'serif'],
    mono: ['Menlo', 'monospace'],
  },
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

const borderRadius = {
  none: '0',
  sm: '0.125rem',
  DEFAULT: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  full: '9999px',
};

const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
};

export const theme = {
  colors,
  spacing,
  typography,
  borderRadius,
  shadows,
  // Componentes comuns
  components: {
    button: {
      base: 'font-semibold rounded-lg transition-colors duration-200',
      variants: {
        primary: 'bg-primary-blue text-white hover:bg-primary-blue-hover',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-primary-red text-white hover:bg-primary-red-hover',
        success: 'bg-primary-green text-white hover:bg-primary-green-hover',
      },
      sizes: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-6 py-3 text-lg',
      },
    },
    input: {
      base: 'w-full rounded-lg border border-gray-300 shadow-sm transition-colors duration-200',
      focus: 'focus:border-primary-blue focus:ring-1 focus:ring-primary-blue',
      error: 'border-primary-red focus:border-primary-red focus:ring-primary-red',
      sizes: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2',
        lg: 'px-4 py-3 text-lg',
      },
    },
  },
} as const;