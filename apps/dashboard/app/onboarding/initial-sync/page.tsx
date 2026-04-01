"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Card } from "@replybase/ui";
import { trpc } from "@/lib/trpc";

export default function InitialSyncPage() {
  const router = useRouter();
  const { status } = useSession();
  
  const [syncStatus, setSyncStatus] = useState<"pending" | "syncing" | "complete" | "error">("pending");
  const [progress, setProgress] = useState(0);
  const [ticketsFetched, setTicketsFetched] = useState(0);
  const [chunksCreated, setChunksCreated] = useState(0);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  // Poll sync status
  useEffect(() => {
    if (syncStatus === "syncing") {
      const interval = setInterval(async () => {
        try {
          const result = await trpc.sync.getStatus.query();
          
          if (result.lastJob) {
            setTicketsFetched(result.lastJob.ticketsFetched || 0);
            setChunksCreated(result.lastJob.chunksCreated || 0);
            
            if (result.lastJob.status === "READY") {
              setSyncStatus("complete");
              setProgress(100);
            } else if (result.lastJob.status === "ERROR") {
              setSyncStatus("error");
              setError(result.lastJob.error || "Sync failed");
            } else {
              // Estimate progress based on activity
              setProgress(Math.min(80, ticketsFetched * 5));
            }
          }
        } catch (err) {
          // Ignore errors during polling
        }
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [syncStatus, ticketsFetched]);

  const handleStartSync = async () => {
    setSyncStatus("syncing");
    setProgress(10);
    
    try {
      await trpc.sync.triggerManualSync.mutate();
    } catch (err) {
      setSyncStatus("error");
      setError("Failed to start sync");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Step 3 of 4</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-brand-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Content */}
          {syncStatus === "pending" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">
                  Ready to Sync
                </h1>
                <p className="text-text-secondary text-sm">
                  We'll fetch your support tickets from Gorgias and build your knowledge base
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="text-xl">📝</div>
                  <div>
                    <p className="font-medium text-text-primary">Fetch Tickets</p>
                    <p className="text-xs text-text-secondary">Import all your support conversations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-xl">📚</div>
                  <div>
                    <p className="font-medium text-text-primary">Build Knowledge Base</p>
                    <p className="text-xs text-text-secondary">Create embeddings for AI training</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-xl">⚡</div>
                  <div>
                    <p className="font-medium text-text-primary">Go Live</p>
                    <p className="text-xs text-text-secondary">Start handling customer questions</p>
                  </div>
                </div>
              </div>

              <Button onClick={handleStartSync} className="w-full">
                Start Sync Now
              </Button>
            </div>
          )}

          {syncStatus === "syncing" && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">
                  Syncing...
                </h1>
                <p className="text-text-secondary text-sm">
                  This usually takes 1-5 minutes
                </p>
              </div>

              <div className="animate-spin">
                <div className="text-4xl">⟳</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-brand-500">
                    {ticketsFetched}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Tickets</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-brand-500">
                    {chunksCreated}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Chunks</p>
                </div>
              </div>

              <p className="text-xs text-text-secondary">
                Don't close this window while syncing
              </p>
            </div>
          )}

          {syncStatus === "complete" && (
            <div className="space-y-6 text-center">
              <div className="text-5xl">✓</div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">
                  Sync Complete!
                </h1>
                <p className="text-text-secondary text-sm">
                  Your knowledge base is ready
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {ticketsFetched}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Tickets</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {chunksCreated}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Chunks</p>
                </div>
              </div>

              <Button onClick={() => router.push("/onboarding/complete")} className="w-full">
                Continue
              </Button>
            </div>
          )}

          {syncStatus === "error" && (
            <div className="space-y-6">
              <div className="text-5xl text-center">⚠️</div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-text-primary">
                  Sync Failed
                </h1>
                <p className="text-text-secondary text-sm">
                  {error}
                </p>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => router.back()}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  onClick={() => {
                    setSyncStatus("pending");
                    setProgress(0);
                    setError("");
                  }}
                  className="flex-1"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
