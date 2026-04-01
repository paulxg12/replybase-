"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button, Card } from "@replybase/ui";

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { status } = useSession();

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-8">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-text-secondary">
              <span>Step 4 of 4</span>
              <span>100%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-brand-500 rounded-full w-full" />
            </div>
          </div>

          {/* Success Message */}
          <div className="space-y-6 text-center">
            <div className="space-y-4">
              <div className="text-6xl">🎉</div>
              <h1 className="text-3xl font-bold text-text-primary">
                You're All Set!
              </h1>
            </div>

            <p className="text-text-secondary">
              Your Replybase chatbot is now live and ready to handle customer questions.
            </p>

            {/* Features Grid */}
            <div className="space-y-3 text-left">
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-lg">✓</span>
                <div>
                  <p className="font-medium text-text-primary text-sm">
                    Knowledge Base
                  </p>
                  <p className="text-xs text-text-secondary">
                    Your tickets are now indexed
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-lg">✓</span>
                <div>
                  <p className="font-medium text-text-primary text-sm">
                    AI Chatbot
                  </p>
                  <p className="text-xs text-text-secondary">
                    Ready to answer customer questions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <span className="text-lg">✓</span>
                <div>
                  <p className="font-medium text-text-primary text-sm">
                    Order Lookup
                  </p>
                  <p className="text-xs text-text-secondary">
                    Answers "where is my order?" automatically
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-left">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                What's Next?
              </p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>📦 Get your embed code from the Widget tab</li>
                <li>🔗 Add the widget to your Shopify store</li>
                <li>📊 Monitor conversations on the dashboard</li>
              </ul>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => router.push("/dashboard/widget")}
              className="w-full"
            >
              Get Embed Code
            </Button>
            <Button
              variant="secondary"
              onClick={() => router.push("/dashboard/overview")}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
