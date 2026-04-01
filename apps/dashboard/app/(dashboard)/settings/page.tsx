"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { AlertCircle, CheckCircle2, Copy, LogOut, Trash2, AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/lib/use-toast";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"account" | "integrations" | "api" | "danger">("account");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Fetch merchant data
  const { data: merchant, isLoading: merchantLoading } = trpc.merchants.getCurrent.useQuery();

  // Delete account mutation
  const deleteAccountMutation = trpc.merchants.deleteAccount.useMutation();

  // Sign out
  const handleSignOut = async () => {
    setLoading(true);
    await fetch("/api/auth/signout", { method: "POST" });
    router.push("/login");
  };

  if (status === "loading" || merchantLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const shopifyConnected = !!merchant?.shopifyDomain;
  const gorgiastConnected = !!merchant?.gorgiasDomain;

  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary to-bg-secondary p-6">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary">Settings</h1>
          <p className="mt-2 text-text-secondary">Manage your account, integrations, and API access</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[250px_1fr]">
          {/* Tabs */}
          <div className="flex flex-col gap-2 lg:border-r lg:border-border-light lg:pr-6">
            {[
              { id: "account", label: "Account", icon: "👤" },
              { id: "integrations", label: "Integrations", icon: "🔗" },
              { id: "api", label: "API Keys", icon: "🔑" },
              { id: "danger", label: "Danger Zone", icon: "⚠️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`rounded-lg px-4 py-3 text-left font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-bg-secondary"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div>
            {/* Account Tab */}
            {activeTab === "account" && (
              <Card className="p-6">
                <h2 className="mb-6 text-xl font-bold text-text-primary">Account Information</h2>

                {/* Profile Section */}
                <div className="mb-8 space-y-4">
                  <h3 className="font-semibold text-text-primary">Profile</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Email</label>
                    <div className="mt-2 rounded-lg bg-bg-secondary px-4 py-3 text-text-primary">
                      {session?.user?.email}
                    </div>
                    <p className="mt-1 text-sm text-text-secondary">
                      Contact us to change your email address
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Name</label>
                    <div className="mt-2 rounded-lg bg-bg-secondary px-4 py-3 text-text-primary">
                      {session?.user?.name || "Not set"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary">
                      Member Since
                    </label>
                    <div className="mt-2 rounded-lg bg-bg-secondary px-4 py-3 text-text-primary">
                      {merchant?.createdAt
                        ? new Date(merchant.createdAt).toLocaleDateString()
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* Sign Out */}
                <div className="border-t border-border-light pt-6">
                  <Button
                    onClick={handleSignOut}
                    disabled={loading}
                    className="gap-2 bg-gray-600 hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    {loading ? "Signing out..." : "Sign Out"}
                  </Button>
                </div>
              </Card>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <Card className="p-6">
                <h2 className="mb-6 text-xl font-bold text-text-primary">Connected Integrations</h2>

                <div className="space-y-5">
                  {/* Shopify */}
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-4">
                    <div>
                      <h3 className="font-semibold text-text-primary">Shopify Store</h3>
                      {shopifyConnected ? (
                        <div className="mt-1 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-600">{merchant?.shopifyDomain}</p>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-text-secondary">Not connected</p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="ml-4"
                      onClick={() => router.push("/onboarding/connect-shopify")}
                    >
                      {shopifyConnected ? "Reconnect" : "Connect"}
                    </Button>
                  </div>

                  {/* Gorgias */}
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-4">
                    <div>
                      <h3 className="font-semibold text-text-primary">Gorgias Support</h3>
                      {gorgiastConnected ? (
                        <div className="mt-1 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <p className="text-sm text-green-600">{merchant?.gorgiasDomain}</p>
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-400" />
                          <p className="text-sm text-text-secondary">Not connected</p>
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      className="ml-4"
                      onClick={() => router.push("/onboarding/connect-gorgias")}
                    >
                      {gorgiastConnected ? "Reconnect" : "Connect"}
                    </Button>
                  </div>

                  {/* Stripe */}
                  <div className="flex items-center justify-between rounded-lg border border-border-light p-4">
                    <div>
                      <h3 className="font-semibold text-text-primary">Stripe Payments</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <p className="text-sm text-green-600">Connected</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      className="ml-4"
                      onClick={() => router.push("/dashboard/billing")}
                    >
                      Manage
                    </Button>
                  </div>
                </div>

                <div className="mt-8 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Tip:</strong> You can reconnect integrations anytime from here. Reconnecting will
                    refresh your data sync.
                  </p>
                </div>
              </Card>
            )}

            {/* API Keys Tab */}
            {activeTab === "api" && (
              <Card className="p-6">
                <h2 className="mb-2 text-xl font-bold text-text-primary">API Keys</h2>
                <p className="mb-6 text-text-secondary">
                  Use API keys to authenticate requests to the Replybase API
                </p>

                <div className="rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Coming soon!</strong> API key management will be available soon. For now, use your
                    widget public key found on the Widget page.
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <div>
                    <h3 className="font-semibold text-text-primary">Widget Public Key</h3>
                    <p className="mt-1 text-sm text-text-secondary">
                      Used to authenticate your embedded chat widget
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={merchant?.widgetPublicKey || ""}
                        readOnly
                        className="rounded-lg border border-border-light bg-bg-secondary px-4 py-2 pr-12 font-mono text-sm text-text-primary"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(merchant?.widgetPublicKey || "");
                          toast.success("Copied to clipboard!");
                        }}
                        className="flex-shrink-0 rounded-lg bg-primary p-2 text-white hover:bg-primary-dark"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-12 border-t border-border-light pt-6">
                  <h3 className="font-semibold text-text-primary">API Documentation</h3>
                  <p className="mt-2 text-sm text-text-secondary">
                    View our API reference to integrate Replybase with your systems
                  </p>
                  <Button className="mt-4" variant="outline">
                    Read API Docs (Coming Soon)
                  </Button>
                </div>
              </Card>
            )}

            {/* Danger Zone Tab */}
            {activeTab === "danger" && (
              <Card className="border-red-200 p-6">
                <div className="mb-6 flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                  <div>
                    <h2 className="text-xl font-bold text-red-700">Danger Zone</h2>
                    <p className="text-sm text-red-600">Irreversible actions</p>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="space-y-4 rounded-lg border border-red-200 bg-red-50 p-4">
                  <div>
                    <h3 className="font-semibold text-red-900">Delete Your Account</h3>
                    <p className="mt-2 text-sm text-red-800">
                      This will permanently delete your account and all associated data:
                    </p>
                    <ul className="mt-2 ml-4 space-y-1 text-sm text-red-800">
                      <li>• All chat conversations and statistics</li>
                      <li>• Knowledge base and embeddings</li>
                      <li>• API keys and integrations</li>
                      <li>• Billing history</li>
                    </ul>
                  </div>

                  {!showDeleteConfirm ? (
                    <Button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="gap-2 bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Account
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg bg-white p-4">
                      <p className="font-semibold text-red-900">Are you absolutely sure?</p>
                      <p className="text-sm text-red-800">
                        Type "<strong>delete my account</strong>" below to confirm this irreversible action.
                      </p>
                      <input
                        type="text"
                        placeholder="delete my account"
                        id="deleteConfirm"
                        className="w-full rounded-lg border border-red-300 px-4 py-2"
                      />
                      <div className="flex gap-3">
                        <Button
                          onClick={() => setShowDeleteConfirm(false)}
                          variant="outline"
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={async () => {
                            const input = (document.getElementById("deleteConfirm") as HTMLInputElement)
                              ?.value;
                            if (input === "delete my account") {
                              setLoading(true);
                              try {
                                await deleteAccountMutation.mutateAsync();
                                toast.success("Account deleted successfully");
                                setTimeout(() => router.push("/login"), 1500);
                              } catch (err) {
                                toast.error("Failed to delete account", {
                                  description: err instanceof Error ? err.message : "Unknown error",
                                });
                                setLoading(false);
                              }
                            } else {
                              toast.error('Please type "delete my account" exactly');
                            }
                          }}
                          disabled={loading}
                          className="flex-1 gap-2 bg-red-600 hover:bg-red-700"
                        >
                          {loading ? "Deleting..." : "Delete Account"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-lg bg-amber-50 p-4">
                  <p className="text-sm text-amber-900">
                    <strong>Note:</strong> We'll send a confirmation email before permanently deleting your
                    account. You have 7 days to cancel the deletion.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
