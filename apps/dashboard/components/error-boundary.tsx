"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
}

interface State {
  error: Error | null;
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service (e.g., Sentry)
    console.error("Error caught by boundary:", error, errorInfo);

    // Send to error tracking
    if (typeof window !== "undefined") {
      fetch("/api/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
        }),
      }).catch(() => {
        // Silently fail if error logging doesn't work
      });
    }
  }

  reset = () => {
    this.setState({ error: null, hasError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.reset);
      }

      return <DefaultErrorFallback error={this.state.error!} reset={this.reset} />;
    }

    return this.props.children;
  }
}

function DefaultErrorFallback({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-primary to-bg-secondary p-6">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="rounded-full bg-red-200 p-3">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-red-900">Something went wrong</h1>
              <p className="text-sm text-red-700">We've logged this error and are looking into it</p>
            </div>
          </div>

          <div className="mb-6 rounded-lg bg-white p-4 font-mono text-sm text-gray-700 overflow-auto max-h-48">
            <p className="text-red-600 font-semibold mb-2">{error.message}</p>
            <pre className="text-xs text-gray-600 whitespace-pre-wrap break-words">
              {error.stack}
            </pre>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-red-800">Here's what you can try:</p>
            <ul className="space-y-2 text-sm text-red-800 ml-4 list-disc">
              <li>Refresh the page to try again</li>
              <li>Clear your browser cache</li>
              <li>Try again in a few moments (server might be updating)</li>
              <li>Contact support if the problem persists</li>
            </ul>
          </div>

          <div className="mt-8 flex gap-4">
            <Button onClick={reset} className="bg-blue-600 hover:bg-blue-700">
              Try Again
            </Button>
            <Button
              onClick={() => (window.location.href = "/dashboard/overview")}
              variant="outline"
            >
              Go to Dashboard
            </Button>
            <a href="mailto:support@replybase.com">
              <Button variant="outline">Contact Support</Button>
            </a>
          </div>
        </div>

        <div className="mt-8 rounded-lg bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900 mb-2">Error Reference</h3>
          <p className="text-sm text-blue-800">
            If the problem persists, please include this error reference when contacting support:
          </p>
          <code className="mt-2 block bg-white p-2 rounded text-xs text-gray-600 font-mono break-all">
            {error.message} @ {new Date().toISOString()}
          </code>
        </div>
      </div>
    </div>
  );
}
