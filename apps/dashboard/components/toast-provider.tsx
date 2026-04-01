"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      theme="light"
      richColors
      expand={false}
      visibleToasts={5}
    />
  );
}
