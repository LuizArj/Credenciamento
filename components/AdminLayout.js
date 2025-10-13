import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import Head from 'next/head';
import Image from 'next/image';
import { requirePermissions } from '../utils/permissions';

export default function AdminLayout({ children, title, requiredPermissions = ['manage_users'] }) {
  const router = useRouter();
  const { data: session, status } = useSession();

  // Redireciona para login se não tiver permissão (apenas no cliente)
  useEffect(() => {
    if (status === 'loading') return; // Ainda carregando

    if (!session) {
      router.replace('/login');
    } else if (!requirePermissions(session, requiredPermissions)) {
      router.replace('/access-denied');
    }
  }, [session, status, router, requiredPermissions]);

  // Mostra loading enquanto verifica a sessão
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

  // Se não tem sessão ou permissão, não renderiza nada (redirecionamento em andamento)
  if (!session) {
    return null; // Redirecionamento para login em andamento
  }

  if (!requirePermissions(session, requiredPermissions)) {
    return null; // Redirecionamento para access-denied em andamento
  }

  const navigation = [
    { name: 'Dashboard', href: '/painel-admin', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { name: 'Eventos', href: '/admin/events', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )},
    { name: 'Participantes', href: '/admin/participants', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { name: 'Permissões', href: '/admin/permissions', icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    )}
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <Head>
        <title>{title} - Credenciamento</title>
      </Head>

      {/* Sidebar para desktop */}
      <div className="hidden md:fixed md:inset-y-0 md:flex md:w-64 md:flex-col">
        <div className="flex-1 flex flex-col min-h-0 bg-sebrae-blue-dark">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <button 
                onClick={() => router.push('/')}
                className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-sebrae-blue-dark rounded"
                title="Voltar ao início"
              >
                <Image
                  src="/sebrae-logo-white.png"
                  alt="Logo Sebrae - Voltar ao início"
                  width={120}
                  height={40}
                  className="h-8 w-auto cursor-pointer"
                />
              </button>
            </div>
            <nav className="mt-8 flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const current = router.pathname === item.href;
                return (
                  <button
                    key={item.name}
                    onClick={() => router.push(item.href)}
                    className={`${
                      current
                        ? 'bg-sebrae-blue-darker text-white'
                        : 'text-white/80 hover:bg-sebrae-blue-darker hover:text-white'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex-shrink-0 flex bg-sebrae-blue-darker p-4">
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex-shrink-0 w-full group block"
            >
              <div className="flex items-center">
                <div>
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">
                    Sair do Sistema
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Cabeçalho móvel */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-100">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
            onClick={() => {
              // Implementar menu móvel aqui
            }}
          >
            <span className="sr-only">Abrir menu</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Cabeçalho da página */}
        <div className="sticky top-0 z-10 md:hidden flex justify-between items-center bg-sebrae-blue-dark px-4 py-3">
          <Image
            src="/sebrae-logo-white.png"
            alt="Logo Sebrae"
            width={90}
            height={30}
            className="h-6 w-auto"
          />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-white text-sm"
          >
            Sair
          </button>
        </div>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            </div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}