/**
 * Simple className merge utility (avoids clsx dependency).
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
