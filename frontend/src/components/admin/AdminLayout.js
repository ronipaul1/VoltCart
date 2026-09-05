import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/admin/dashboard',  label: 'Dashboard',  icon: '📊' },
  { path: '/admin/orders',     label: 'Orders',     icon: '📦' },
  { path: '/admin/products',   label: 'Products',   icon: '🌿' },
  { path: '/admin/customers',  label: 'Customers',  icon: '👥' },
  { path: '/admin/inventory',  label: 'Inventory',  icon: '📋' },
  { path: '/admin/finance',    label: 'Finance',    icon: '💰' },
  { path: '/admin/coupons',    label: 'Coupons',    icon: '🏷️' },
  { path: '/admin/reviews',    label: 'Reviews',    icon: '★' },
];

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-50 w-60 bg-green-900 text-white flex flex-col transition-transform duration-300 ease-in-out`}>
        {/* Logo */}
        <div className="p-5 border-b border-green-800">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">🌿</span>
            <div>
              <p className="font-bold text-base leading-none">VoltCart</p>
              <p className="text-xs text-green-400 mt-0.5">Admin Panel</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-green-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center font-bold text-sm">{user?.name?.charAt(0)}</div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-green-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${active ? 'bg-white text-green-900 shadow-sm' : 'text-green-200 hover:bg-green-800 hover:text-white'}`}>
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-green-800 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-green-200 hover:bg-green-800 hover:text-white transition-colors">
            🏠 Back to Store
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-900/30 hover:text-red-200 transition-colors">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setSidebarOpen(false)} />}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setSidebarOpen(true)}>
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-gray-700 capitalize">
              {NAV_ITEMS.find(n => location.pathname.startsWith(n.path))?.label || 'Admin'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/products" target="_blank" className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium hover:bg-green-100 transition-colors">View Store ↗</Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
