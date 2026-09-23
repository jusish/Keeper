import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/layout/Layout';
import { AdminLayout } from './components/layout/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ContributionsPage } from './pages/ContributionsPage';
import { EventsPage } from './pages/EventsPage';
import { AccountsPage } from './pages/AccountsPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { AttendancePage } from './pages/AttendancePage';
import { MembersPage } from './pages/MembersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SuperAdminPortal } from './pages/admin/SuperAdminPortal';
import { DebtsPage } from './pages/DebtsPage';

export const App: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname || '/');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-semibold text-slate-400">Loading Keeper...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Dedicated enterprise shell for Super Admin
  if (user.role === 'SUPER_ADMIN') {
    let initialTab: 'overview' | 'communities' | 'users' | 'audit' = 'overview';
    if (currentPath === '/admin/communities') initialTab = 'communities';
    else if (currentPath === '/admin/users') initialTab = 'users';
    else if (currentPath === '/admin/audit' || currentPath === '/audit') initialTab = 'audit';

    return (
      <AdminLayout
        currentPath={currentPath}
        onNavigate={navigate}
      >
        <SuperAdminPortal
          key={refreshKey}
          initialTab={initialTab}
          onNavigate={navigate}
        />
      </AdminLayout>
    );
  }

  const renderPage = () => {
    if (currentPath.startsWith('/admin')) {
      return (
        <DashboardPage
          key={refreshKey}
          onNavigate={navigate}
          onOpenQuickActions={(tab) => {}}
        />
      );
    }
    if (currentPath === '/audit') {
      return <AuditLogsPage key={refreshKey} />;
    }
    if (currentPath === '/contributions') {
      return (
        <ContributionsPage
          key={refreshKey}
          onOpenQuickActions={(tab) => {}}
        />
      );
    }
    if (currentPath === '/events') {
      return (
        <EventsPage
          key={refreshKey}
          onOpenQuickActions={(tab) => {}}
        />
      );
    }
    if (currentPath === '/accounts') {
      return (
        <AccountsPage
          key={refreshKey}
          onOpenQuickActions={(tab) => {}}
        />
      );
    }
    if (currentPath === '/expenses') {
      return (
        <ExpensesPage
          key={refreshKey}
          onOpenQuickActions={(tab) => {}}
        />
      );
    }
    if (currentPath === '/debts') {
      return <DebtsPage key={refreshKey} />;
    }
    if (currentPath === '/attendance') {
      return <AttendancePage key={refreshKey} />;
    }
    if (currentPath === '/members') {
      return (
        <MembersPage
          key={refreshKey}
          onOpenQuickActions={(tab) => {}}
        />
      );
    }
    return (
      <DashboardPage
        key={refreshKey}
        onNavigate={navigate}
        onOpenQuickActions={(tab) => {}}
      />
    );
  };

  return (
    <Layout
      currentPath={currentPath}
      onNavigate={navigate}
      onRefresh={handleRefresh}
    >
      {renderPage()}
    </Layout>
  );
};
