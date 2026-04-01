"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function BillingPage() {
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">Billing</h1>
        <p className="text-text-secondary mt-2">
          Manage your plan and subscription
        </p>
      </div>

      {/* Free Tier Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-2xl font-bold text-blue-900 mb-2">
          🎉 Replybase Free Tier
        </h2>
        <p className="text-blue-800 mb-4">
          You're currently using the free tier of Replybase with full access to all core features:
        </p>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span> Unlimited conversations
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span> Unlimited knowledge base entries
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span> Weekly sync from Shopify and Gorgias
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span> AI-powered chat widget
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span> Real-time notifications
          </li>
          <li className="flex items-center gap-2">
            <span className="text-lg">✅</span> API key management
          </li>
        </ul>
      </div>

      {/* Future Plans Notice */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-purple-900 mb-2">
          💼 Coming Soon: Premium Plans
        </h2>
        <p className="text-purple-800 mb-4">
          We're working on premium plans with advanced features:
        </p>
        <ul className="space-y-2 text-sm text-purple-800">
          <li>✨ Advanced analytics and reporting</li>
          <li>🔐 Custom branding for your widget</li>
          <li>🚀 Priority support</li>
          <li>⚡ Higher rate limits for API keys</li>
          <li>🌍 Multi-language support</li>
        </ul>
      </div>

      {/* Free Plan Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-surface-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Plan Limits
          </h3>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-text-secondary">Monthly Conversations</p>
              <p className="text-2xl font-bold text-brand-500">Unlimited</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Knowledge Base Entries</p>
              <p className="text-2xl font-bold text-brand-500">Unlimited</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">API Key Rate Limit</p>
              <p className="text-2xl font-bold text-brand-500">1,000 req/hr</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Sync Frequency</p>
              <p className="text-2xl font-bold text-brand-500">Weekly</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-surface-border p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Included Features
          </h3>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="text-brand-500">✓</span> Shopify integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-500">✓</span> Gorgias integration
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-500">✓</span> Vector search
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-500">✓</span> AI chat widget
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-500">✓</span> Analytics
            </li>
            <li className="flex items-center gap-2">
              <span className="text-brand-500">✓</span> Chat history
            </li>
          </ul>
        </div>
      </div>

      {/* Support Section */}
      <div className="bg-gray-50 rounded-lg border border-surface-border p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-2">
          Questions about plans?
        </h3>
        <p className="text-text-secondary mb-4">
          We're still building our pricing model. Contact us to discuss your needs!
        </p>
        <a
          href="mailto:support@replybase.com"
          className="text-brand-500 hover:text-brand-600 font-medium"
        >
          support@replybase.com
        </a>
      </div>
    </div>
  );
}
