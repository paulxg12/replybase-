"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { ToastProvider } from "@/components/toast-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ToastProvider />
      {children}
    </SessionProvider>
  );
}
