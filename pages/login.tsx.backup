import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Login() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showLocalLogin, setShowLocalLogin] = useState(false);
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [errorMessage, setErrorMessage] = useState('');
  
  useEffect(() => {
    if (session) {
      router.push('/');
    }
  }, [session, router]);

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    const result = await signIn('credentials', {
      username: credentials.username,
      password: credentials.password,
      redirect: false
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleKeycloakLogin = () => {
    setIsLoading(true);
    signIn('keycloak', { callbackUrl: '/' });
  };

  const handleShowLocalLogin = () => {
    setShowLocalLogin(true);
    setErrorMessage('');
  };

  const handleBackToMain = () => {
    setShowLocalLogin(false);
    setErrorMessage('');
    setCredentials({ username: '', password: '' });
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
            <h1 className="text-2xl font-semibold text-white text-center mb-8">
              Bem-vindo ao Sistema
            </h1>

            {!showLocalLogin ? (
              // Tela Principal - Escolha do Tipo de Login
              <div className="space-y-6">
                {/* Botão Login Local */}
                <button
                  onClick={handleShowLocalLogin}
                  disabled={isLoading}
                  className="w-full bg-white/20 hover:bg-white/30 text-white py-4 px-6 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 flex items-center justify-center gap-3 font-medium text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Login Local
                </button>

                {/* Botão Login Corporativo */}
                <button
                  onClick={handleKeycloakLogin}
                  disabled={isLoading}
                  className="w-full bg-blue-500/80 hover:bg-blue-600/80 text-white py-4 px-6 rounded-xl backdrop-blur-sm border border-blue-400/30 transition-all duration-300 flex items-center justify-center gap-3 font-medium text-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  Login com Conta Corporativa
                </button>

                <div className="mt-6 text-center">
                  <p className="text-white/80 text-sm">
                    Escolha o tipo de login para continuar
                  </p>
                </div>
              </div>
            ) : (
              // Tela de Login Local
              <div className="space-y-6">
                {/* Botão Voltar */}
                <button
                  onClick={handleBackToMain}
                  className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                  </svg>
                  Voltar
                </button>

                <div className="text-center mb-6">
                  <h2 className="text-xl font-medium text-white mb-2">Login Local</h2>
                  <p className="text-white/70 text-sm">Entre com suas credenciais locais</p>
                </div>

                {/* Formulário de Login Local */}
                <form onSubmit={handleLocalLogin} className="space-y-4">
                  <div>
                    <input
                      type="text"
                      name="username"
                      placeholder="Usuário"
                      value={credentials.username}
                      onChange={e => setCredentials({...credentials, username: e.target.value})}
                      className="w-full bg-white/10 text-white placeholder-white/50 py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      name="password"
                      placeholder="Senha"
                      value={credentials.password}
                      onChange={e => setCredentials({...credentials, password: e.target.value})}
                      className="w-full bg-white/10 text-white placeholder-white/50 py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/40"
                      disabled={isLoading}
                      required
                    />
                  </div>
                  
                  {errorMessage && (
                    <div className="bg-red-500/20 border border-red-400/30 text-red-200 px-4 py-3 rounded-lg text-sm">
                      {errorMessage}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isLoading || !credentials.username || !credentials.password}
                    className="w-full bg-white/20 hover:bg-white/30 disabled:bg-white/10 disabled:opacity-50 text-white py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 flex items-center justify-center gap-2 font-medium"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/20 border-t-white"></div>
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 text-center text-white/60 text-sm">
        © {new Date().getFullYear()} Sebrae - Sistema de Credenciamento
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