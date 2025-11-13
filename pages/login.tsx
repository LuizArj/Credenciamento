import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';
import packageJson from '../package.json';

export default function Login() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      void router.push('/');
    }
  }, [session, router]);

  const handleKeycloakLogin = () => {
    setIsLoading(true);
    void signIn('keycloak', { callbackUrl: '/' });
  };

  // Se estiver carregando a sessão ou já estiver autenticado, mostra loading
  if (session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex flex-col">
      {/* Header com Logo */}
      <header className="w-full p-4">
        <button
          onClick={() => router.push('/')}
          className="hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded"
          title="Voltar ao início"
        >
          <Image
            src="/sebrae-logo-white.png"
            alt="Sebrae - Voltar ao início"
            width={150}
            height={60}
            className="transition-transform hover:scale-105"
            priority
          />
        </button>
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
            <h1 className="text-2xl font-semibold text-white text-center mb-2">
              Bem-vindo ao Sistema de Credenciamento
            </h1>
            <p className="text-white/80 text-center mb-8 text-sm">
              Faça login com sua conta corporativa Sebrae
            </p>

            {/* Botão Login Corporativo */}
            <button
              onClick={handleKeycloakLogin}
              disabled={isLoading}
              className="w-full bg-blue-500/80 hover:bg-blue-600/80 disabled:bg-blue-400/50 text-white py-4 px-6 rounded-xl backdrop-blur-sm border border-blue-400/30 transition-all duration-300 flex items-center justify-center gap-3 font-medium text-lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white"></div>
                  Conectando...
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                  Entrar com Conta Corporativa
                </>
              )}
            </button>

            <div className="mt-6 text-center">
              <p className="text-white/70 text-sm">Use suas credenciais do Keycloak Sebrae</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 text-center text-white/60 text-sm">
        © {new Date().getFullYear()} UTIC - Sebrae RR - Sistema de Credenciamento | v
        {packageJson.version}
      </footer>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
        </div>
      )}
    </div>
  );
}
