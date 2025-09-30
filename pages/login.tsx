import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import Image from 'next/image';

export default function Login() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
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
        <Image
          src="/sebrae-logo-white.png"
          alt="Sebrae"
          width={150}
          height={60}
          className="transition-transform hover:scale-105"
          priority
        />
      </header>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-8">
            <h1 className="text-2xl font-semibold text-white text-center mb-8">
              Bem-vindo ao Sistema
            </h1>

            <div className="space-y-6">
              {/* Login Keycloak (Sebrae) */}
              <button
                onClick={handleKeycloakLogin}
                disabled={isLoading}
                className="w-full bg-white/20 hover:bg-white/30 text-white py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 flex items-center justify-center gap-2"
              >
                {isLoading ? 'Entrando...' : 'Login Sebrae'}
              </button>

              {/* Divisor */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-transparent text-white/60">ou</span>
                </div>
              </div>

              {/* Login Local */}
              <form onSubmit={handleLocalLogin} className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Usuário"
                    value={credentials.username}
                    onChange={e => setCredentials({...credentials, username: e.target.value})}
                    className="w-full bg-white/10 text-white placeholder-white/50 py-2 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <input
                    type="password"
                    name="password"
                    placeholder="Senha"
                    value={credentials.password}
                    onChange={e => setCredentials({...credentials, password: e.target.value})}
                    className="w-full bg-white/10 text-white placeholder-white/50 py-2 px-4 rounded-xl backdrop-blur-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                    disabled={isLoading}
                  />
                </div>
                {errorMessage && (
                  <div className="text-red-300 text-sm mt-2">
                    {errorMessage}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-3 px-4 rounded-xl backdrop-blur-sm border border-white/20 transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? 'Entrando...' : 'Login Local'}
                </button>
              </form>
            </div>

            <div className="mt-8 text-center">
              <p className="text-white/80 text-sm mb-4">
                Clique abaixo para fazer login com sua conta Sebrae
              </p>

              <button
                onClick={handleKeycloakLogin}
                disabled={isLoading}
                className="w-full bg-blue-500/80 hover:bg-blue-600/80 text-white py-3 px-4 rounded-xl backdrop-blur-sm border border-blue-400/30 transition-all duration-300 font-medium"
              >
                {isLoading ? 'Entrando...' : 'Continuar com Sebrae'}
              </button>
            </div>
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