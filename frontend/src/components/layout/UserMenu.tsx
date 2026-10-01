import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../features/auth/AuthContext';
import { RoleBadge } from '../ui/RoleBadge';
import { LogOut, ChevronDown, User } from 'lucide-react';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User profile and account options"
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <div className="w-7 h-7 rounded-full bg-emerald-900/60 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-semibold text-xs">
          {user.email ? user.email.slice(0, 2).toUpperCase() : <User className="w-3.5 h-3.5" />}
        </div>
        <div className="hidden md:flex flex-col text-left">
          <span className="text-xs font-medium text-zinc-200 truncate max-w-[130px]" title={user.email || ''}>
            {user.email || 'User'}
          </span>
          <RoleBadge role={user.role} className="mt-0.5 scale-90 origin-left" />
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 bottom-full mb-2 w-56 rounded-lg bg-zinc-900 border border-zinc-800 shadow-xl py-1 z-50 text-xs text-zinc-300"
        >
          <div className="px-3 py-2 border-b border-zinc-800">
            <p className="text-zinc-400 text-[11px]">Signed in as</p>
            <p className="font-semibold text-white truncate" title={user.email || ''}>
              {user.email || 'User'}
            </p>
            <div className="mt-1.5">
              <RoleBadge role={user.role} />
            </div>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-red-400 hover:text-red-300 hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};
