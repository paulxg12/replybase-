"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Button, Input, Card } from "@replybase/ui";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sentEmail, setSentEmail] = useState(false);

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.push("/dashboard/overview");
    }
  }, [status, session, router]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      await signIn("google", { redirect: false });
    } catch (err) {
      setError("Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate email
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      setLoading(false);
      return;
    }

    try {
      const result = await signIn("email", {
        email,
        redirect: false,
      });

      if (result?.error) {
        setError("Failed to send email. Please try again.");
      } else {
        setSentEmail(true);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard/overview";

  if (sentEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <div className="text-4xl">✓</div>
            <h2 className="text-2xl font-bold text-text-primary">Check your email</h2>
            <p className="text-text-secondary">
              We sent a magic link to <span className="font-semibold">{email}</span>
            </p>
            <p className="text-sm text-text-secondary">
              Click the link in the email to sign in. The link expires in 24 hours.
            </p>
            <Button
              onClick={() => setSentEmail(false)}
              variant="secondary"
              className="w-full mt-6"
            >
              ← Back to sign in
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 to-brand-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="space-y-8">
          {/* Logo / Title */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-text-primary">Replybase</h1>
            <p className="text-text-secondary">
              AI chatbot for Shopify merchants
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Sign In Methods */}
          <div className="space-y-4">
            {/* Google Sign In */}
            <Button
              onClick={handleGoogleSignIn}
              disabled={loading}
              variant="secondary"
              className="w-full"
            >
              {loading ? "Signing in..." : "Sign in with Google"}
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-text-secondary">OR</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email Sign In Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
              <Button
                type="submit"
                disabled={loading || !email}
                className="w-full"
              >
                {loading ? "Sending..." : "Sign in with Email"}
              </Button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-text-secondary">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </Card>
    </div>
  );
}
