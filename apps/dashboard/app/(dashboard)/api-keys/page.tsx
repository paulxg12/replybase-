"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/lib/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, RefreshCw, Trash2, Eye, EyeOff } from "lucide-react";

interface ApiKeyListItem {
  id: string;
  name: string;
  masked: string;
  rateLimit: number;
  usageCount: number;
  lastUsedAt: Date | null;
}

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const toast = useToast();

  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRateLimit, setNewKeyRateLimit] = useState("1000");
  const [generatedKey, setGeneratedKey] = useState<{
    key: string;
    prefix: string;
  } | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [rateLimitEdit, setRateLimitEdit] = useState<{
    keyId: string;
    newLimit: string;
  } | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);

  // Fetch API keys
  const keysQuery = trpc.apiKeys.listApiKeys.useQuery();

  // Generate new key mutation
  const generateMutation = trpc.apiKeys.generateApiKey.useMutation();

  // Revoke key mutation
  const revokeMutation = trpc.apiKeys.revokeApiKey.useMutation();

  // Update rate limit mutation
  const updateRateLimitMutation =
    trpc.apiKeys.updateApiKeyRateLimit.useMutation();

  if (!session) {
    router.push("/login");
    return null;
  }

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newKeyName.trim()) {
      toast.error("Key name is required");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        name: newKeyName,
        rateLimit: parseInt(newKeyRateLimit),
      });

      setGeneratedKey(result);
      setNewKeyName("");
      setNewKeyRateLimit("1000");

      // Refetch keys
      await keysQuery.refetch();

      toast.success("API key generated successfully");
    } catch (err) {
      toast.error("Failed to generate API key", {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      await revokeMutation.mutateAsync({ keyId });
      await keysQuery.refetch();
      setRevokeConfirm(null);
      toast.success("API key revoked");
    } catch (err) {
      toast.error("Failed to revoke API key");
    }
  };

  const handleUpdateRateLimit = async () => {
    if (!rateLimitEdit) return;

    try {
      const newLimit = parseInt(rateLimitEdit.newLimit);
      if (newLimit < 10 || newLimit > 100000) {
        toast.error("Rate limit must be between 10 and 100,000");
        return;
      }

      await updateRateLimitMutation.mutateAsync({
        keyId: rateLimitEdit.keyId,
        newRateLimit: newLimit,
      });

      await keysQuery.refetch();
      setRateLimitEdit(null);
      toast.success("Rate limit updated");
    } catch (err) {
      toast.error("Failed to update rate limit");
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  const keys = (keysQuery.data ?? []) as ApiKeyListItem[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-text-primary">API Keys</h1>
        <p className="text-text-secondary mt-2">
          Manage API keys for programmatic access to Replybase
        </p>
      </div>

      {/* Generated Key Modal */}
      {generatedKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-blue-900 mb-4">
            🎉 API Key Generated
          </h2>
          <p className="text-sm text-blue-800 mb-4">
            Save this key somewhere safe. You won't be able to see it again!
          </p>
          <div className="bg-white border border-blue-300 rounded p-4 font-mono text-sm mb-4 flex items-center justify-between">
            <span className="text-blue-900 break-all">{generatedKey.key}</span>
            <button
              onClick={() => handleCopyKey(generatedKey.key)}
              className="ml-4 p-2 hover:bg-gray-100 rounded flex-shrink-0"
            >
              <Copy size={16} className="text-blue-600" />
            </button>
          </div>
          <button
            onClick={() => setGeneratedKey(null)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}

      {/* Generate New Key Section */}
      <div className="bg-white rounded-lg border border-surface-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Generate New Key
        </h2>
        <form onSubmit={handleGenerateKey} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Key Name
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="e.g., Mobile App, CI/CD Pipeline"
              className="w-full px-3 py-2 border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Rate Limit (requests/hour)
            </label>
            <input
              type="number"
              value={newKeyRateLimit}
              onChange={(e) => setNewKeyRateLimit(e.target.value)}
              min="10"
              max="100000"
              className="w-full px-3 py-2 border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-text-secondary mt-1">
              Default is 1000 requests per hour
            </p>
          </div>

          <button
            type="submit"
            disabled={generateMutation.isPending}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50 transition-colors"
          >
            {generateMutation.isPending ? "Generating..." : "Generate Key"}
          </button>
        </form>
      </div>

      {/* API Keys List */}
      <div className="bg-white rounded-lg border border-surface-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Active Keys
        </h2>

        {keysQuery.isLoading ? (
          <div className="text-center py-8">
            <RefreshCw className="animate-spin mx-auto mb-2 text-text-secondary" />
            <p className="text-text-secondary">Loading API keys...</p>
          </div>
        ) : keys.length === 0 ? (
          <p className="text-text-secondary text-center py-8">
            No API keys yet. Generate one above to get started.
          </p>
        ) : (
          <div className="space-y-3">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-4 border border-surface-border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-medium text-text-primary">{key.name}</h3>
                  <div className="text-sm text-text-secondary mt-1 space-y-1">
                    <p>Key: {key.masked}</p>
                    <p>
                      Usage: {key.usageCount} / {key.rateLimit} req/hr
                    </p>
                    {key.lastUsedAt && (
                      <p>
                        Last used:{" "}
                        {new Date(key.lastUsedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Rate Limit Edit */}
                  {rateLimitEdit?.keyId === key.id ? (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="number"
                        value={rateLimitEdit.newLimit}
                        onChange={(e) =>
                          setRateLimitEdit({
                            ...rateLimitEdit,
                            newLimit: e.target.value,
                          })
                        }
                        min="10"
                        max="100000"
                        className="w-24 px-2 py-1 border border-surface-border rounded text-sm"
                      />
                      <button
                        onClick={handleUpdateRateLimit}
                        disabled={updateRateLimitMutation.isPending}
                        className="px-3 py-1 bg-brand-500 text-white text-sm rounded hover:bg-brand-600 disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setRateLimitEdit(null)}
                        className="px-3 py-1 bg-gray-200 text-text-primary text-sm rounded hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() =>
                        setRateLimitEdit({
                          keyId: key.id,
                          newLimit: key.rateLimit.toString(),
                        })
                      }
                      className="mt-2 text-xs text-brand-500 hover:underline"
                    >
                      Edit rate limit
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => setRevokeConfirm(key.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Revoke this API key"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Revoke Confirmation Dialog */}
      <AlertDialog open={revokeConfirm !== null} onOpenChange={(open) => {
        if (!open) setRevokeConfirm(null);
      }}>
        <AlertDialogContent>
          <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently revoke the API key. Any applications using
            this key will stop working. This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (revokeConfirm) {
                  handleRevokeKey(revokeConfirm);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Revoke Key
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Documentation Section */}
      <div className="bg-gray-50 rounded-lg border border-surface-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          📚 Using API Keys
        </h2>
        <div className="space-y-3 text-sm text-text-secondary">
          <div>
            <h4 className="font-medium text-text-primary mb-1">
              Send Key in Header:
            </h4>
            <code className="bg-white px-3 py-2 rounded border border-surface-border block font-mono text-xs">
              Authorization: Bearer rk_test_...
            </code>
          </div>
          <div>
            <h4 className="font-medium text-text-primary mb-1">
              Example Request:
            </h4>
            <code className="bg-white px-3 py-2 rounded border border-surface-border block font-mono text-xs">
              curl -H "Authorization: Bearer YOUR_KEY" \
              <br />
              https://api.replybase.com/widget/validate
            </code>
          </div>
          <p>
            Each API key is rate-limited to protect our infrastructure. When
            you cross your rate limit, requests will be rejected with a 429
            status code.
          </p>
        </div>
      </div>
    </div>
  );
}
