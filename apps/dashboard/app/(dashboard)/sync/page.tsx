"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, CardContent } from "@replybase/ui";
import { trpc } from "@/lib/trpc";
import { LoadingSpinner } from "@replybase/ui";
import { useToast } from "@/lib/use-toast";

interface SyncJob {
  id: string;
  status: string;
  ticketsFetched: number | null;
  chunksCreated: number | null;
  error: string | null;
  createdAt: Date;
  completedAt: Date | null;
}

export default function SyncPage() {
  const { status: authStatus } = useSession();
  const toast = useToast();
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [syncHistory, setSyncHistory] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadSyncStatus();
    }
  }, [authStatus]);

  // Auto-refresh when syncing
  useEffect(() => {
    if (syncStatus?.isCurrentlySyncing) {
      const interval = setInterval(loadSyncStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [syncStatus?.isCurrentlySyncing]);

  const loadSyncStatus = async () => {
    try {
      setLoading(true);
      setError("");
      const [status, history] = await Promise.all([
        trpc.sync.getStatus.query(),
        trpc.sync.getHistory.query({ limit: 10 }),
      ]);
      setSyncStatus(status);
      setSyncHistory(history as any);
    } catch (err) {
      setError("Failed to load sync status");
      toast.error("Failed to load sync status");
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    setTriggering(true);

    try {
      await trpc.sync.triggerManualSync.mutate();
      toast.success("Sync started! Check back in a moment.");
      await loadSyncStatus();
    } catch (err: any) {
      setError(err.message || "Failed to trigger sync");
      toast.error("Failed to trigger sync", {
        description: err.message || "Please check your integrations and try again",
      });
    } finally {
      setTriggering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "READY":
        return "bg-green-100 text-green-700";
      case "SYNCING":
        return "bg-blue-100 text-blue-700";
      case "PENDING":
        return "bg-yellow-100 text-yellow-700";
      case "ERROR":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "READY":
        return "✓";
      case "SYNCING":
        return "⟳";
      case "PENDING":
        return "⏱";
      case "ERROR":
        return "⚠";
      default:
        return "•";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-text-primary">
            Sync Status
          </h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage your knowledge base synchronization
          </p>
        </div>
        <Button
          onClick={handleTriggerSync}
          disabled={triggering || syncStatus?.isCurrentlySyncing}
        >
          {triggering ? "Starting..." : "Sync Now"}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary mb-1">Status</p>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(
                    syncStatus?.status
                  )}`}
                >
                  {getStatusIcon(syncStatus?.status)} {syncStatus?.status}
                </span>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary mb-1">Last Synced</p>
              <p className="text-lg font-semibold text-text-primary">
                {syncStatus?.lastSyncedAt
                  ? new Date(syncStatus.lastSyncedAt).toLocaleDateString()
                  : "Never"}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-text-secondary mb-1">Currently Syncing</p>
              <p className="text-lg font-semibold text-text-primary">
                {syncStatus?.isCurrentlySyncing ? "Yes" : "No"}
              </p>
            </div>
          </div>

          {syncStatus?.lastJob && (
            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
              <h4 className="font-semibold text-text-primary">Last Job Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-text-secondary">Tickets Fetched</p>
                  <p className="text-xl font-bold text-text-primary">
                    {syncStatus.lastJob.ticketsFetched || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-text-secondary">Chunks Created</p>
                  <p className="text-xl font-bold text-text-primary">
                    {syncStatus.lastJob.chunksCreated || 0}
                  </p>
                </div>
              </div>
              {syncStatus.lastJob.error && (
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-sm text-red-700">
                    Error: {syncStatus.lastJob.error}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
        </CardHeader>
        <CardContent>
          {syncHistory.length === 0 ? (
            <p className="text-center text-text-secondary text-sm py-6">
              No sync history
            </p>
          ) : (
            <div className="space-y-2">
              {syncHistory.map((job) => (
                <div
                  key={job.id}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${getStatusColor(
                            job.status
                          )}`}
                        >
                          {getStatusIcon(job.status)} {job.status}
                        </span>
                        <span className="text-xs text-text-secondary">
                          {new Date(job.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm space-y-1">
                        <p>
                          <span className="text-text-secondary">Tickets:</span>{" "}
                          <span className="font-semibold text-text-primary">
                            {job.ticketsFetched || 0}
                          </span>
                        </p>
                        <p>
                          <span className="text-text-secondary">Chunks:</span>{" "}
                          <span className="font-semibold text-text-primary">
                            {job.chunksCreated || 0}
                          </span>
                        </p>
                      </div>

                      {job.error && (
                        <p className="text-xs text-red-600">Error: {job.error}</p>
                      )}

                      {job.completedAt && (
                        <p className="text-xs text-text-secondary">
                          Completed:{" "}
                          {new Date(job.completedAt).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-950 mb-2">Auto Sync</h4>
        <p className="text-sm text-blue-800">
          Your knowledge base syncs automatically every Sunday at 2:00 AM UTC. Manual syncs can be triggered anytime.
        </p>
      </Card>
    </div>
  );
}
