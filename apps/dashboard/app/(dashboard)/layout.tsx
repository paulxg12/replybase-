import { ErrorBoundary } from "@/components/error-boundary";
import { NotificationBell } from "@/components/notification-bell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundary>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-60 bg-surface-muted border-r border-surface-border flex flex-col">
          <div className="p-6 border-b border-surface-border">
            <h1 className="text-2xl font-bold text-brand-500">Replybase</h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <a href="/dashboard/overview" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              Overview
            </a>
            <a href="/dashboard/conversations" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              Conversations
            </a>
            <a href="/dashboard/knowledge" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              Knowledge Base
            </a>
            <a href="/dashboard/widget" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              Widget
            </a>
            <a href="/dashboard/sync" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              Sync
            </a>
            <a href="/dashboard/api-keys" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              API Keys
            </a>
            <a href="/dashboard/settings" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
              Settings
            </a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Top nav */}
          <header className="h-14 border-b border-surface-border bg-white px-6 flex items-center justify-between">
            <div className="text-sm text-text-secondary">Dashboard</div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="w-8 h-8 rounded-full bg-brand-500" />
            </div>
          </header>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </main>
      </div>
    </ErrorBoundary>
  );
}
