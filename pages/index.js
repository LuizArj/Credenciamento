import Link from 'next/link';
import Image from 'next/image';
import { Calendar, QrCode, Users, LayoutDashboard } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import packageJson from '../package.json';

const menuItems = [
  {
    href: '/credenciamento-4events',
    title: 'Eventos (4Events)',
    description: 'Módulo integrado com a plataforma 4events',
    icon: Calendar,
    shortcut: '1',
  },
  {
    href: '/qrcode-sebrae',
    title: 'Gerar QR Code',
    description: 'Gerar QR Code a partir do CPF',
    icon: QrCode,
    shortcut: '2',
  },
  {
    href: '/credenciamento-sas',
    title: 'Eventos (SAS)',
    description: 'Credenciamento direto dos participantes',
    icon: Users,
    shortcut: '3',
  },
  {
    href: '/admin',
    title: 'Administração',
    description: 'Dashboard de gestão em tempo real',
    icon: LayoutDashboard,
    shortcut: '4',
  },
];

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [activeModule, setActiveModule] = useState(null);

  // Redireciona para a página de login se não estiver autenticado
  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/login');
    }
  }, [session, status, router]);

  // Verificar se usuário tem acesso ao módulo admin
  const userRoles = session?.user?.roles || [];
  const hasAdminAccess = userRoles.includes('admin') || userRoles.includes('manager');

  // Filtrar módulos baseado nas permissões
  const availableModules = menuItems.filter((item) => {
    // Se não for o módulo admin, mostrar sempre
    if (item.href !== '/admin') return true;
    // Se for admin, mostrar apenas para admin e manager
    return hasAdminAccess;
  });

  // Gerenciador de atalhos de teclado
  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.altKey) {
        const item = availableModules.find((item) => item.shortcut === event.key);
        if (item) {
          setActiveModule(item.href);
          setLoading(true);
          window.location.href = item.href;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [availableModules]);

  const handleModuleClick = (href) => {
    setActiveModule(href);
    setLoading(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E67C3] to-[#0A4DA6] flex flex-col">
      {/* Header com Logo */}
      <header className="w-full p-4 flex justify-between items-center">
        <Image
          src="/sebrae-logo-white.png"
          alt="Sebrae"
          width={150}
          height={60}
          className="transition-transform hover:scale-105"
        />
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-white/80 hover:text-white transition-colors text-sm flex items-center gap-2"
        >
          Sair
        </button>
      </header>

      {/* Conteúdo Principal - Centralizado Vertical e Horizontalmente */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl">
          <h1 className="text-xl font-semibold text-white/90 text-center mb-8">
            Escolha um módulo para continuar
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableModules.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleModuleClick(item.href)}
                  className="group focus:outline-none focus:ring-2 focus:ring-white/50 rounded-xl"
                >
                  <div
                    className={`
                    relative bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-6
                    hover:bg-white/20 transition-all duration-300
                    ${activeModule === item.href ? 'bg-white/20' : ''}
                  `}
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-white/10 rounded-lg">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-white mb-1">{item.title}</h2>
                        <p className="text-sm text-white/80">{item.description}</p>
                        <span className="absolute top-4 right-4 text-xs text-white/60">
                          Alt + {item.shortcut}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full p-4 text-center text-white/60 text-sm">
        © {new Date().getFullYear()} UTIC - Sebrae RR - Sistema de Credenciamento | v
        {packageJson.version}
      </footer>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white"></div>
        </div>
      )}
    </div>
  );
}
