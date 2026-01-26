/**
 * Crypto utilities for the SDK.
 */

import { NetworkError, ValidationError } from "../core/errors.js";

/**
 * Deterministically stringifies an object by sorting keys recursively.
 * Handles deeply nested objects and null values correctly.
 */
export function stableStringify(obj: unknown): string | undefined {
    if (obj === undefined || typeof obj === "function" || typeof obj === "symbol") {
        return undefined;
    }
    if (obj === null || typeof obj !== "object") {
        return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
        return JSON.stringify(obj.map((item) => {
            const val = stableStringify(item);
            return val === undefined ? null : JSON.parse(val);
        }));
    }

    const sortedKeys = Object.keys(obj as object).sort();
    const sortedObj: Record<string, unknown> = {};

    for (const key of sortedKeys) {
        const value = (obj as Record<string, unknown>)[key];
        const str = stableStringify(value);
        // Skip undefined or non-serializable values
        if (str === undefined) continue;
        sortedObj[key] = JSON.parse(str);
    }

    return JSON.stringify(sortedObj);
}

/**
 * Computes the SHA-256 hash of a JSON-serializable object.
 * Returns the hash as a hexadecimal string.
 *
 * @param content - The content to hash (will be JSON serialized)
 * @returns The SHA-256 hash of the content
 * @throws {ValidationError} If content is not serializable (e.g. undefined, function, symbol)
 */
export async function sha256Hash(content: unknown): Promise<string> {
    // Use stable stringification to ensure deterministic output
    const jsonString = stableStringify(content);

    if (jsonString === undefined) {
        throw new ValidationError(`Content illegal: not serializable (type: ${typeof content})`);
    }

    const msgBuffer = new TextEncoder().encode(jsonString);

    if (typeof crypto !== "undefined" && crypto.subtle) {
        // Browser / Modern Node.js
        const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } else {
        // Fallback for older environments or specific setups if global crypto isn't available
        try {
            // Dynamic import to avoid breaking browser builds if bundler doesn't handle it

            const { createHash } = await import("node:crypto");
            const hash = createHash("sha256").update(jsonString).digest("hex");
            return hash;
        } catch (e) {
            throw new NetworkError("SHA-256 hashing not supported in this environment", e);
        }
    }
}
