"use client";

import { toast } from "sonner";

export function useToast() {
  return {
    success: (message: string, options?: { description?: string }) =>
      toast.success(message, options),
    error: (message: string, options?: { description?: string }) =>
      toast.error(message, options),
    message: (message: string, options?: { description?: string }) =>
      toast(message, options),
  };
}
