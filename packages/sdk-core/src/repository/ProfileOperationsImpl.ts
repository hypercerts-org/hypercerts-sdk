/**
 * ProfileOperationsImpl - User profile operations
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { NetworkError } from "../core/errors.js";
import type { ProfileOperations } from "./interfaces.js";
import type { UpdateResult } from "./types.js";

export class ProfileOperationsImpl implements ProfileOperations {
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
  ) {}

  async get(): Promise<{
    handle: string;
    displayName?: string;
    description?: string;
    avatar?: string;
    banner?: string;
    website?: string;
  }> {
    try {
      const result = await this.agent.getProfile({ actor: this.repoDid });

      if (!result.success) {
        throw new NetworkError("Failed to get profile");
      }

      return {
        handle: result.data.handle,
        displayName: result.data.displayName,
        description: result.data.description,
        avatar: result.data.avatar,
        banner: result.data.banner,
        // Note: website may not be available in standard profile
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to get profile: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }

  async update(params: {
    displayName?: string | null;
    description?: string | null;
    avatar?: Blob | null;
    banner?: Blob | null;
    website?: string | null;
  }): Promise<UpdateResult> {
    try {
      // Get existing profile record
      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
      });

      const existingProfile = (existing.data.value as Record<string, unknown>) || {};

      // Build updated profile
      const updatedProfile: Record<string, unknown> = { ...existingProfile };

      if (params.displayName !== undefined) {
        if (params.displayName === null) {
          delete updatedProfile.displayName;
        } else {
          updatedProfile.displayName = params.displayName;
        }
      }

      if (params.description !== undefined) {
        if (params.description === null) {
          delete updatedProfile.description;
        } else {
          updatedProfile.description = params.description;
        }
      }

      // Handle avatar upload
      if (params.avatar !== undefined) {
        if (params.avatar === null) {
          delete updatedProfile.avatar;
        } else {
          const arrayBuffer = await params.avatar.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
            encoding: params.avatar.type || "image/jpeg",
          });
          if (uploadResult.success) {
            updatedProfile.avatar = uploadResult.data.blob;
          }
        }
      }

      // Handle banner upload
      if (params.banner !== undefined) {
        if (params.banner === null) {
          delete updatedProfile.banner;
        } else {
          const arrayBuffer = await params.banner.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const uploadResult = await this.agent.com.atproto.repo.uploadBlob(uint8Array, {
            encoding: params.banner.type || "image/jpeg",
          });
          if (uploadResult.success) {
            updatedProfile.banner = uploadResult.data.blob;
          }
        }
      }

      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: updatedProfile,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update profile");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(`Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`, error);
    }
  }
}
