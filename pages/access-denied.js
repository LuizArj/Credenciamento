import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';

export default function AccessDenied() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Se não está logado, redirecionar para login
    if (status !== 'loading' && !session) {
      router.push('/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-sebrae-blue mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Redirecionamento em andamento
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>Acesso Negado - Credenciamento</title>
      </Head>

      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <button 
              onClick={() => router.push('/')}
              className="inline-block hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-sebrae-blue focus:ring-offset-2 rounded"
              title="Voltar ao início"
            >
              <Image
                src="/sebrae-logo-white.png"
                alt="Logo Sebrae - Voltar ao início"
                width={200}
                height={80}
                className="mx-auto h-16 w-auto filter invert cursor-pointer"
              />
            </button>
            
            <div className="mt-8">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100">
                <svg 
                  className="h-12 w-12 text-red-600" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
              
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Acesso Negado
              </h2>
              
              <p className="mt-4 text-lg text-gray-600">
                Você não tem permissão para acessar esta área do sistema.
              </p>
              
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg 
                      className="h-5 w-5 text-yellow-400" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Informações do Usuário
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p><strong>Usuário:</strong> {session.user?.name || session.user?.email}</p>
                      <p><strong>Email:</strong> {session.user?.email}</p>
                      <p>
                        <strong>Permissões atuais:</strong> {' '}
                        {session.user?.roles?.length > 0 
                          ? session.user.roles.join(', ')
                          : 'Nenhuma permissão atribuída'
                        }
                      </p>
                      {session.user?.roles?.length > 0 && (
                        <div className="mt-2">
                          <p className="font-medium">O que suas permissões permitem:</p>
                          <ul className="mt-1 list-disc list-inside text-xs">
                            {session.user.roles.map(role => (
                              <li key={role}>
                                <strong>{role}:</strong> {getRoleDescription(role)}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 space-y-4">
                <p className="text-sm text-gray-600">
                  Para solicitar acesso, entre em contato com o administrador do sistema.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => router.back()}
                    className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  >
                    Voltar
                  </button>
                  
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-sebrae-blue text-white py-2 px-4 rounded-md hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-sebrae-blue transition-colors"
                  >
                    Ir para Início
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Função para obter descrição das roles
function getRoleDescription(role) {
  const descriptions = {
    admin: 'Acesso total ao sistema (usuários, eventos, participantes, relatórios)',
    manager: 'Gerenciar eventos e participantes, visualizar relatórios',
    operator: 'Gerenciar participantes de eventos'
  };
  
  return descriptions[role] || 'Permissão personalizada';
}