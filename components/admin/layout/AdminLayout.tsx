import { FC, ReactNode, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard,
  Calendar,
  Users,
  FileText,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface AdminLayoutProps {
  children: ReactNode;
}

interface MenuItem {
  title: string;
  icon: ReactNode;
  href: string;
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: <LayoutDashboard className="w-5 h-5" />,
    href: '/admin'
  },
  {
    title: 'Eventos',
    icon: <Calendar className="w-5 h-5" />,
    href: '/admin/eventos'
  },
  {
    title: 'Participantes',
    icon: <Users className="w-5 h-5" />,
    href: '/admin/participantes'
  },
  {
    title: 'Relatórios',
    icon: <FileText className="w-5 h-5" />,
    href: '/admin/relatorios'
  },
  {
    title: 'Configurações',
    icon: <Settings className="w-5 h-5" />,
    href: '/admin/configuracoes'
  }
];

export const AdminLayout: FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = async () => {
    // Implementar logout
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-40 h-screen transition-transform
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          w-64 bg-white border-r border-gray-200
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 py-5 border-b">
            <Link href="/admin" className="flex items-center space-x-2">
              <img src="/sebrae-logo.png" alt="Sebrae" className="h-8" />
              <span className="font-semibold text-gray-800">Admin</span>
            </Link>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center px-4 py-3 text-sm rounded-lg transition-colors
                  ${
                    router.pathname === item.href
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {item.icon}
                <span className="ml-3">{item.title}</span>
              </Link>
            ))}
          </nav>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 rounded-lg hover:bg-gray-50"
            >
              <LogOut className="w-5 h-5" />
              <span className="ml-3">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className={`
            fixed bottom-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-full shadow-lg
            ${isSidebarOpen ? 'hidden' : 'block'}
          `}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content */}
      <main
        className={`
          transition-all duration-200 ease-in-out
          ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-0'}
        `}
      >
        {children}
      </main>
    </div>
  );
};