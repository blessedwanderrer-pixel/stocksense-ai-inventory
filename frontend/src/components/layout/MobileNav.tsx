import React, { useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { RoleBadge } from '../ui/RoleBadge';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Warehouse,
  X,
  LogOut,
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const dashboardPath = user?.role === 'manager' ? '/manager' : '/staff';

  const navItems = [
    { label: 'Dashboard', path: dashboardPath, icon: <LayoutDashboard className="w-5 h-5" />, isAvailable: true },
    { label: 'Inventory', path: '/inventory', icon: <Boxes className="w-5 h-5" />, isAvailable: true },
    { label: 'Stock Movements', path: '/movements', icon: <ArrowLeftRight className="w-5 h-5" />, isAvailable: true },
    { label: 'Reports', path: '/reports', icon: <BarChart3 className="w-5 h-5" />, isAvailable: true },
    { label: 'AI Assistant', path: '/assistant', icon: <Bot className="w-5 h-5" />, isAvailable: true, badge: 'Live' },
  ];

  // Keyboard accessibility: Escape key and focus trapping
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Focus first interactive element
    closeButtonRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation Drawer"
      className="fixed inset-0 z-50 lg:hidden flex"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        ref={drawerRef}
        className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-950 text-zinc-300 shadow-2xl border-r border-zinc-800"
      >
        {/* Header */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Warehouse className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base">StockSense</span>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="p-4 bg-zinc-900/60 border-b border-zinc-800/80">
            <p className="text-[11px] text-zinc-400">Signed in as</p>
            <p className="text-xs font-semibold text-white truncate">{user.email}</p>
            <div className="mt-1.5">
              <RoleBadge role={user.role} />
            </div>
          </div>
        )}

        {/* Links */}
        <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto" aria-label="Mobile Navigation Links">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-600/15 text-emerald-400 font-semibold border border-emerald-500/20'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`
              }
            >
              <div className="flex items-center gap-3">
                <span className="text-zinc-400">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                {item.badge}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-red-400 bg-red-950/30 border border-red-900/40 hover:bg-red-950/60 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};
