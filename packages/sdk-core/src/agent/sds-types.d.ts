/**
 * Type declarations for SDS (Shared Data Server) namespace extensions.
 * This extends the @atproto/api types with SDS-specific endpoints.
 */

import "@atproto/api";

declare module "@atproto/api" {
  export interface ComNS {
    sds: {
      repo: {
        uploadBlob(
          data: Uint8Array,
          opts: {
            encoding: string;
            qp: { repo: string };
          },
        ): Promise<{
          success: boolean;
          data: {
            blob: {
              ref: { toString(): string } | string;
              mimeType: string;
              size: number;
            };
          };
        }>;
      };
    };
  }
}
