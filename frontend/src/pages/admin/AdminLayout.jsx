import React from 'react';
import { Navigate, Outlet, NavLink, useNavigate } from 'react-router-dom';
import { ClipboardList, BarChart3, Users, LogOut, QrCode, UtensilsCrossed } from 'lucide-react';

const AdminLayout = () => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  if (!token) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/admin/login');
  };

  const navItems = [
    { path: '/admin/orders', label: 'Orders & Bills', icon: ClipboardList },
    { path: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
    { path: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { path: '/admin/crm', label: 'CRM & Campaigns', icon: Users },
    { path: '/admin/tables', label: 'Table QR codes', icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-admin-bg flex flex-col md:flex-row text-white">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex print:hidden w-64 bg-admin-sidebar border-r border-gray-800 flex-col">
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold text-brand-accent">Spice Bistro</h2>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
        <nav className="flex-grow py-4">
          <ul className="space-y-1 px-3">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand-accent/10 text-brand-accent border-l-4 border-brand-accent'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-l-4 border-transparent'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 text-gray-400 hover:text-red-400 px-4 py-2 w-full transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
          <p className="mt-2 px-4 text-[10px] tracking-wide text-gray-600">
            Powered by <span className="font-semibold text-gray-500">DineFlow</span>
          </p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-y-auto pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden print:hidden fixed bottom-0 left-0 right-0 bg-admin-sidebar border-t border-gray-800 z-50">
        <ul className="flex justify-around items-center h-16">
          {navItems.map((item) => (
            <li key={item.path} className="flex-1">
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center h-full gap-1 ${
                    isActive ? 'text-brand-accent' : 'text-gray-500'
                  }`
                }
              >
                <item.icon size={20} />
                <span className="text-[10px]">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default AdminLayout;
