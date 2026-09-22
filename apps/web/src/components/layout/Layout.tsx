import React, { useState } from 'react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { QuickActionsModal } from '../QuickActionsModal';
import { CommandPalette } from '../CommandPalette';

interface LayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
  onRefresh?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentPath,
  onNavigate,
  onRefresh,
}) => {
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [quickActionTab, setQuickActionTab] = useState('payment');
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleOpenQuickActions = (tab: string = 'payment') => {
    setQuickActionTab(tab);
    setIsQuickActionsOpen(true);
  };

  const handleTriggerAction = (action: string) => {
    if (action === 'open_palette') {
      setIsCommandPaletteOpen(true);
    } else {
      handleOpenQuickActions(action);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        onOpenQuickActions={handleOpenQuickActions}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex flex-1">
        <Sidebar
          currentPath={currentPath}
          onNavigate={(p) => {
            onNavigate(p);
            setIsSidebarOpen(false);
          }}
          onOpenQuickActions={handleOpenQuickActions}
          isOpen={isSidebarOpen}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      <QuickActionsModal
        isOpen={isQuickActionsOpen}
        onClose={() => setIsQuickActionsOpen(false)}
        defaultTab={quickActionTab}
        onSuccess={onRefresh}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={(p) => {
          onNavigate(p);
          setIsSidebarOpen(false);
        }}
        onTriggerAction={handleTriggerAction}
      />
    </div>
  );
};
