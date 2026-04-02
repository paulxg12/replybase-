"use client";

import { useSession } from "next-auth/react";
import { ReactNode } from "react";

interface PlanGateProps {
  requiredPlan: "starter" | "growth" | "scale";
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Stripe-gated feature wrapper. Hides children if merchant's plan is insufficient.
 */
export function PlanGate({ requiredPlan, children, fallback }: PlanGateProps) {
  const { data: session } = useSession();

  const planHierarchy = { free: 0, starter: 1, growth: 2, scale: 3 };
  const currentPlan = (session?.user as any)?.plan || "free";
  const hasAccess = (planHierarchy[currentPlan as keyof typeof planHierarchy] || 0) >=
    (planHierarchy[requiredPlan] || 0);

  if (hasAccess) return <>{children}</>;

  return (
    fallback || (
      <div className="bg-gray-50 border rounded-lg p-6 text-center">
        <p className="text-text-secondary mb-2">
          This feature requires the <strong className="capitalize">{requiredPlan}</strong> plan.
        </p>
        <a
          href="/dashboard/settings"
          className="px-4 py-2 bg-brand-500 text-white rounded-md hover:bg-brand-600 inline-block"
        >
          Upgrade Plan
        </a>
      </div>
    )
  );
}
