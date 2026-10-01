import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';
import { UserMenu } from './UserMenu';
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  BarChart3,
  Bot,
  Warehouse,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '' }) => {
  const { user } = useAuth();
  const dashboardPath = user?.role === 'manager' ? '/manager' : '/staff';

  const navItems = [
    {
      label: 'Dashboard',
      path: dashboardPath,
      icon: <LayoutDashboard className="w-4 h-4" />,
      isAvailable: true,
    },
    {
      label: 'Inventory',
      path: '/inventory',
      icon: <Boxes className="w-4 h-4" />,
      isAvailable: true,
    },
    {
      label: 'Stock Movements',
      path: '/movements',
      icon: <ArrowLeftRight className="w-4 h-4" />,
      isAvailable: true,
    },
    {
      label: 'Reports',
      path: '/reports',
      icon: <BarChart3 className="w-4 h-4" />,
      isAvailable: true,
    },
    {
      label: 'AI Assistant',
      path: '/assistant',
      icon: <Bot className="w-4 h-4" />,
      badge: 'Live',
      isAvailable: true,
    },
  ];

  return (
    <aside
      className={`w-64 bg-zinc-950 text-zinc-300 flex flex-col justify-between border-r border-zinc-800/80 shrink-0 select-none ${className}`}
      aria-label="Primary Navigation Sidebar"
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 px-6 flex items-center gap-3 border-b border-zinc-800/80">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
              <span>StockSense</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400 bg-emerald-950/70 border border-emerald-800 px-1.5 py-0.2 rounded">
                Retail
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Inventory Operations</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-4 space-y-1.5" aria-label="Main Navigation">
          <div className="px-3 pb-2 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
            Workspace
          </div>

          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
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
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    item.isAvailable
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700/50'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Menu Footer */}
      <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50">
        <UserMenu />
      </div>
    </aside>
  );
};
