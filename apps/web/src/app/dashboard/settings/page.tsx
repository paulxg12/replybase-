"use client";

import { useSession } from "next-auth/react";

export default function SettingsPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-text-secondary">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h2 className="text-2xl font-semibold text-text-primary">Settings</h2>

      {/* Gorgias API Key */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Gorgias Integration</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary">Subdomain</label>
            <input
              type="text"
              placeholder="your-store"
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">API Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-text-primary">API Key</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <button className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600">
            Save Gorgias Settings
          </button>
        </div>
      </div>

      {/* Crawl URLs */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Web Crawl URLs</h3>
        <p className="text-sm text-text-secondary mb-4">
          Add URLs to your FAQ pages, product pages, or help center. We'll crawl and index them weekly.
        </p>
        <div className="space-y-2">
          <input
            type="url"
            placeholder="https://your-store.com/faq"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600">
            Add URL
          </button>
        </div>
      </div>

      {/* Plan Management */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Plan Management</h3>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <p className="font-semibold text-text-primary">Free Plan</p>
            <p className="text-sm text-text-secondary">100 chats/month, basic support</p>
          </div>
          <button className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600">
            Upgrade
          </button>
        </div>
      </div>

      {/* Account */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Account</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm text-text-secondary">Email</label>
            <p className="text-text-primary">{session?.user?.email || "—"}</p>
          </div>
          <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
