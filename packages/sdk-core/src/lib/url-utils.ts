/**
 * Regular expression to match a valid URI with a scheme.
 *
 * Matches strings that start with a scheme (one or more alphanumeric characters,
 * plus, period, or hyphen) followed by a colon. This covers schemes that the
 * native URL constructor may not support (e.g., `at://`, `ipfs://`).
 *
 * @see https://www.rfc-editor.org/rfc/rfc3986#section-3.1
 * @internal
 */
const URI_SCHEME_REGEX = /^[a-zA-Z][a-zA-Z0-9+\-.]*:/;

/**
 * Check if a string is a valid URI with a scheme.
 *
 * Validates that the string is a properly formatted URI. Uses the native
 * `URL` constructor for standard schemes (http, https, ftp, etc.) and falls
 * back to scheme detection for non-standard schemes like `at://` and `ipfs://`
 * that the `URL` constructor does not support.
 *
 * @param uri - The string to validate
 * @returns True if the string is a valid URI with a scheme, false otherwise
 *
 * @example
 * ```typescript
 * isValidUri("https://example.com/report.pdf"); // true
 * isValidUri("ipfs://QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG"); // true
 * isValidUri("at://did:plc:abc/org.col/rkey"); // true
 * isValidUri("not-a-uri"); // false
 * isValidUri(""); // false
 * ```
 */
export function isValidUri(uri: string): boolean {
  if (!uri) return false;

  try {
    new URL(uri);
    return true;
  } catch {
    return URI_SCHEME_REGEX.test(uri);
  }
}

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
