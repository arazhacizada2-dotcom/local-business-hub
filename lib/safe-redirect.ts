/**
 * Prevent open redirects — only allow same-origin relative paths.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes(":\\")) {
    return fallback;
  }
  return path;
}
