"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        if (status !== "authenticated") return;
        // Stats loaded from API
        const res = await fetch(`/api/kb?merchantId=${(session?.user as any)?.merchantId}&limit=1`);
        const data = await res.json();
        setStats(data.data);
      } catch (error) {
        console.error("Failed to load stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, [status, session]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-text-primary">Dashboard</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-text-secondary">Total KB Entries</div>
          <div className="text-3xl font-bold text-text-primary mt-2">
            {stats?.total || 0}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-text-secondary">Sync Status</div>
          <div className="text-3xl font-bold text-brand-500 mt-2">
            {(session?.user as any)?.merchantSyncStatus || "PENDING"}
          </div>
        </div>
        <div className="bg-white border rounded-lg p-6">
          <div className="text-sm text-text-secondary">Plan</div>
          <div className="text-3xl font-bold text-text-primary mt-2">Free</div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h3>
        <div className="flex gap-4">
          <a href="/dashboard/knowledge-base" className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600">
            Manage Knowledge Base
          </a>
          <a href="/dashboard/embed" className="px-4 py-2 border border-gray-300 text-text-primary rounded-md hover:bg-gray-50">
            Get Embed Code
          </a>
          <a href="/dashboard/settings" className="px-4 py-2 border border-gray-300 text-text-primary rounded-md hover:bg-gray-50">
            Settings
          </a>
        </div>
      </div>
    </div>
  );
}
