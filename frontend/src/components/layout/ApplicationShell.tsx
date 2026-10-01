import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

interface ApplicationShellProps {
  children: React.ReactNode;
}

export const ApplicationShell: React.FC<ApplicationShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col lg:flex-row antialiased text-zinc-900">
      {/* Desktop Persistent Sidebar */}
      <Sidebar className="hidden lg:flex" />

      {/* Mobile Top Navigation */}
      <TopBar onOpenMobileMenu={() => setMobileMenuOpen(true)} />

      {/* Mobile Navigation Drawer */}
      <MobileNav
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
};
