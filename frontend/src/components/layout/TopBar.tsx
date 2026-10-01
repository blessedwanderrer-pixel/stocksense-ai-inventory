import React from 'react';
import { Menu, Warehouse } from 'lucide-react';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  onOpenMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenMobileMenu }) => {
  return (
    <header className="lg:hidden h-16 bg-zinc-950 text-white border-b border-zinc-800 px-4 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="p-2 -ml-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-emerald-600 flex items-center justify-center text-white">
            <Warehouse className="w-4 h-4" />
          </div>
          <span className="font-bold tracking-tight text-sm">StockSense</span>
        </div>
      </div>

      <div className="flex items-center">
        <UserMenu />
      </div>
    </header>
  );
};
