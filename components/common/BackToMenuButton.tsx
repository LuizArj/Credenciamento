// components/common/BackToMenuButton.tsx
import { useRouter } from 'next/router';
import Link from 'next/link';

interface BackToMenuButtonProps {
  className?: string;
  onBeforeNavigate?: () => void;
}

export function BackToMenuButton({ className = '', onBeforeNavigate }: BackToMenuButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onBeforeNavigate) {
      onBeforeNavigate();
    }
    // Remove dados da sessão ao voltar
    sessionStorage.removeItem('painel-admin-session');
    localStorage.removeItem('adminToken');
    router.push('/');
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 ${className}`}
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
      </svg>
      Voltar ao Menu Principal
    </button>
  );
}