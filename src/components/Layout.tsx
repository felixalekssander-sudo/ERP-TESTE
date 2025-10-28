import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  FileText,
  Factory,
  ClipboardCheck,
  ShoppingBag,
  Package,
  Users,
  Bell,
  Menu,
  X
} from 'lucide-react';
import { googleSheets } from '../lib/googleSheets';
import type { Notification } from '../lib/types';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

export default function Layout({ children, currentView, onNavigate }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadNotifications();

    const interval = setInterval(() => {
      loadNotifications();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const loadNotifications = async () => {
    const data = await googleSheets.fetchFromSheet(googleSheets.SHEET_NAMES.notifications);
    const sorted = data
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 20);

    setNotifications(sorted);
    setUnreadCount(sorted.filter(n => !n.is_read && n.is_read !== 'true').length);
  };

  const markAsRead = async (id: string) => {
    await googleSheets.updateInSheet(googleSheets.SHEET_NAMES.notifications, id, {
      is_read: true
    });
    loadNotifications();
  };

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'sales', icon: ShoppingCart, label: 'Pedidos de Venda' },
    { id: 'proposals', icon: FileText, label: 'Propostas' },
    { id: 'production', icon: Factory, label: 'Produção' },
    { id: 'quality', icon: ClipboardCheck, label: 'Qualidade' },
    { id: 'purchases', icon: ShoppingBag, label: 'Compras' },
    { id: 'suppliers', icon: Users, label: 'Fornecedores' },
    { id: 'inventory', icon: Package, label: 'Estoque' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 fixed h-full z-20`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          {isSidebarOpen && <h1 className="text-xl font-bold">Sistema de Produção</h1>}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-800 rounded-lg"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="mt-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${
                  currentView === item.id ? 'bg-slate-800 border-l-4 border-blue-500' : ''
                }`}
              >
                <Icon size={20} />
                {isSidebarOpen && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <div className={`flex-1 ${isSidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-slate-800">
            {menuItems.find(item => item.id === currentView)?.label || 'Dashboard'}
          </h2>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-slate-100 rounded-lg relative"
            >
              <Bell size={24} className="text-slate-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-slate-200 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-slate-200 font-semibold">
                  Notificações
                </div>
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-slate-500">
                    Nenhuma notificação
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${
                        !notif.is_read ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => markAsRead(notif.id)}
                    >
                      <div className="font-medium text-slate-800">{notif.title}</div>
                      <div className="text-sm text-slate-600 mt-1">{notif.message}</div>
                      <div className="text-xs text-slate-400 mt-2">
                        {new Date(notif.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </header>

        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
