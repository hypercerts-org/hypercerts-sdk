/**
 * Type guard to check if a URL is a loopback address.
 *
 * Loopback addresses are used for local development and testing.
 * They include localhost, 127.0.0.1, and [::1] (IPv6 loopback).
 *
 * @param url - The URL to check
 * @returns True if the URL is a loopback address
 *
 * @example
 * ```typescript
 * isLoopbackUrl('http://localhost:3000'); // true
 * isLoopbackUrl('http://127.0.0.1:8080'); // true
 * isLoopbackUrl('http://[::1]:3000'); // true
 * isLoopbackUrl('http://example.com'); // false
 * isLoopbackUrl('https://localhost:3000'); // false (must be http)
 * ```
 */
export function isLoopbackUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:") {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  } catch {
    return false;
  }
}
