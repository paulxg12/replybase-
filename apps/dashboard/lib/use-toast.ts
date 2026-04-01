import { toast } from "sonner";

export const useToast = () => {
  return {
    // Success toast (green)
    success: (message: string, options?: { description?: string; duration?: number }) =>
      toast.success(message, {
        description: options?.description,
        duration: options?.duration ?? 3000,
      }),

    // Error toast (red)
    error: (message: string, options?: { description?: string; duration?: number }) =>
      toast.error(message, {
        description: options?.description,
        duration: options?.duration ?? 4000,
      }),

    // Loading toast (blue) - returns a promise for proper timing
    loading: (message: string) => toast.loading(message),

    // Update a toast
    dismiss: (id: string | number) => toast.dismiss(id),

    // Custom message (default gray)
    message: (message: string, options?: { description?: string; duration?: number }) =>
      toast.message(message, {
        description: options?.description,
        duration: options?.duration ?? 3000,
      }),

    // Promise-based toast for async operations
    async: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string;
        success: string;
        error: string;
      }
    ) => {
      return toast.promise(promise, messages);
    },
  };
};
