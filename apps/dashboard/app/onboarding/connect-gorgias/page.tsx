"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Input, Card } from "@replybase/ui";

export default function ConnectGorgiasPage() {
  const router = useRouter();
  const { status } = useSession();
  
  const [domain, setDomain] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!domain || !apiToken) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // In a real app, validate Gorgias credentials
      router.push("/onboarding/initial-sync");
    } catch (err) {
      setError("Failed to connect to Gorgias. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Step 2 of 4</span>
              <span>50%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-brand-500 rounded-full w-1/2" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Connect Gorgias
            </h1>
            <p className="text-text-secondary text-sm">
              Connect Gorgias to sync support tickets and build your knowledge base
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleNext} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Gorgias Subdomain
              </label>
              <Input
                type="text"
                placeholder="mystore"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-text-secondary">
                Your Gorgias subdomain (e.g., mystore.gorgias.com)
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                API Token
              </label>
              <Input
                type="password"
                placeholder="grg_..."
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-text-secondary">
                Generate in Gorgias Settings → API & Integrations
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={loading}
                onClick={() => router.back()}
              >
                Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Connecting..." : "Continue"}
              </Button>
            </div>
          </form>

          {/* Help Text */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs text-blue-700">
              <strong>Need help?</strong> Check our{" "}
              <a href="#" className="underline">
                Gorgias integration guide
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
