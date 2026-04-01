"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    // Redirect to first step if authenticated
    if (status === "authenticated") {
      router.push("/onboarding/connect-shopify");
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-text-secondary">Loading...</p>
    </div>
  );
}
