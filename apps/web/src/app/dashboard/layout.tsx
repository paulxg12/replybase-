import { NotificationBell } from "@/components/notification-bell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-surface-muted border-r border-surface-border flex flex-col">
        <div className="p-6 border-b border-surface-border">
          <h1 className="text-2xl font-bold text-brand-500">Replybase</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/dashboard" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
            Overview
          </a>
          <a href="/dashboard/knowledge-base" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
            Knowledge Base
          </a>
          <a href="/dashboard/settings" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
            Settings
          </a>
          <a href="/dashboard/embed" className="block px-4 py-2 rounded-md hover:bg-gray-100 text-text-primary">
            Embed Widget
          </a>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-surface-border bg-white px-6 flex items-center justify-between">
          <div className="text-sm text-text-secondary">Dashboard</div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <div className="w-8 h-8 rounded-full bg-brand-500" />
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </main>
    </div>
  );
}
