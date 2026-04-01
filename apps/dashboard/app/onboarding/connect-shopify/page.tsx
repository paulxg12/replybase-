"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Input, Card } from "@replybase/ui";

export default function ConnectShopifyPage() {
  const router = useRouter();
  const { status } = useSession();
  
  const [domain, setDomain] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!domain || !accessToken) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      // In a real app, you'd validate the Shopify credentials here
      // For now, just proceed to next step
      router.push("/onboarding/connect-gorgias");
    } catch (err) {
      setError("Failed to connect to Shopify. Please check your credentials.");
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
              <span>Step 1 of 4</span>
              <span>25%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-brand-500 rounded-full w-1/4" />
            </div>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-primary">
              Connect Shopify
            </h1>
            <p className="text-text-secondary text-sm">
              Connect your Shopify store to sync orders and enable WISMO detection
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
                Shopify Store Domain
              </label>
              <Input
                type="text"
                placeholder="mystore.myshopify.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-text-secondary">
                Find this in your Shopify admin settings
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">
                Access Token
              </label>
              <Input
                type="password"
                placeholder="shpat_..."
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={loading}
                required
              />
              <p className="text-xs text-text-secondary">
                Create a private app in Shopify to generate a token
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                disabled={loading}
                onClick={() => router.push("/dashboard/overview")}
              >
                Skip for now
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
                Shopify integration guide
              </a>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
