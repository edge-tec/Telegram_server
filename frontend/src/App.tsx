import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TelegramAccount, apiClient } from './api/client';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AutoReplyBuilder } from './pages/AutoReplyBuilder';
import { AdminAutoReplyPage } from './pages/AdminAutoReply';
import { VariablesManager } from './pages/VariablesManager';
import { SchedulerCalendar } from './pages/SchedulerCalendar';
import { AutomationSettings } from './pages/AutomationSettings';
import { AutomationTimeline } from './pages/AutomationTimeline';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Inbox } from './pages/Inbox';
import { Templates } from './pages/Templates';
import { Campaigns } from './pages/Campaigns';
import { MediaLibrary } from './pages/MediaLibrary';
import { Blacklist } from './pages/Blacklist';
import { Users } from './pages/Users';

const queryClient = new QueryClient();

export function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('auto_replies');
  const [accounts, setAccounts] = useState<TelegramAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiClient.get('/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error('Failed to load accounts', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const connectedCount = accounts.filter((a) => a.status === 'connected').length;

  return (
    <div className="flex min-h-screen bg-slate-50/70 text-slate-900 font-sans">
      {/* MailsZo Modern Glass Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        connectedCount={connectedCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          onSelectAccount={setSelectedAccountId}
          onRefresh={fetchAccounts}
          isRefreshing={isRefreshing}
        />

        <main className="flex-1 overflow-y-auto">
          {/* Telegram Automation Module v3.0 Pages */}
          {currentTab === 'auto_replies' && <AutoReplyBuilder accounts={accounts} />}
          {currentTab === 'admin_auto_replies' && <AdminAutoReplyPage accounts={accounts} />}
          {currentTab === 'campaigns' && <Campaigns accounts={accounts} />}
          {currentTab === 'templates' && <Templates />}
          {currentTab === 'media' && <MediaLibrary />}
          {currentTab === 'variables' && <VariablesManager />}
          {currentTab === 'scheduler' && <SchedulerCalendar />}
          {currentTab === 'analytics' && <Dashboard />}
          {currentTab === 'logs' && <AutomationTimeline />}
          {currentTab === 'settings' && <AutomationSettings />}

          {/* CRM & Platform Management Pages */}
          {currentTab === 'accounts' && <Accounts accounts={accounts} onRefresh={fetchAccounts} />}
          {currentTab === 'inbox' && <Inbox selectedAccountId={selectedAccountId} />}
          {currentTab === 'blacklist' && <Blacklist />}
          {currentTab === 'users' && <Users />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
