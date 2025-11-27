/**
 * ProfileOperationsImpl - User profile operations.
 *
 * This module provides the implementation for AT Protocol profile
 * management, including fetching and updating user profiles.
 *
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import { NetworkError } from "../core/errors.js";
import type { ProfileOperations } from "./interfaces.js";
import type { UpdateResult } from "./types.js";

/**
 * Implementation of profile operations for user profile management.
 *
 * Profiles in AT Protocol are stored as records in the `app.bsky.actor.profile`
 * collection with the special rkey "self". This class provides a convenient
 * API for reading and updating profile data.
 *
 * @remarks
 * This class is typically not instantiated directly. Access it through
 * {@link Repository.profile}.
 *
 * **Profile Fields**:
 * - `handle`: Read-only, managed by the PDS
 * - `displayName`: User's display name (max 64 chars typically)
 * - `description`: Profile bio (max 256 chars typically)
 * - `avatar`: Profile picture blob reference
 * - `banner`: Banner image blob reference
 * - `website`: User's website URL (may not be available on all servers)
 *
 * @example
 * ```typescript
 * // Get profile
 * const profile = await repo.profile.get();
 * console.log(`${profile.displayName} (@${profile.handle})`);
 *
 * // Update profile
 * await repo.profile.update({
 *   displayName: "New Name",
 *   description: "Updated bio",
 * });
 *
 * // Update with new avatar
 * const avatarBlob = new Blob([imageData], { type: "image/png" });
 * await repo.profile.update({ avatar: avatarBlob });
 *
 * // Remove a field
 * await repo.profile.update({ website: null });
 * ```
 *
 * @internal
 */
export class ProfileOperationsImpl implements ProfileOperations {
  /**
   * Creates a new ProfileOperationsImpl.
   *
   * @param agent - AT Protocol Agent for making API calls
   * @param repoDid - DID of the repository/user
   * @param _serverUrl - Server URL (reserved for future use)
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private _serverUrl: string,
  ) {}

  /**
   * Gets the repository's profile.
   *
   * @returns Promise resolving to profile data
   * @throws {@link NetworkError} if the profile cannot be fetched
   *
   * @remarks
   * This method fetches the full profile using the `getProfile` API,
   * which includes resolved information like follower counts on some
   * servers. For hypercerts SDK usage, the basic profile fields are
   * returned.
   *
   * **Note**: The `website` field may not be available on all AT Protocol
   * servers. Standard Bluesky profiles don't include this field.
   *
   * @example
   * ```typescript
   * const profile = await repo.profile.get();
   *
   * console.log(`Handle: @${profile.handle}`);
   * console.log(`Name: ${profile.displayName || "(not set)"}`);
   * console.log(`Bio: ${profile.description || "(no bio)"}`);
   *
   * if (profile.avatar) {
   *   // Avatar is a URL or blob reference
   *   console.log(`Avatar: ${profile.avatar}`);
   * }
   * ```
   */
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
      throw new NetworkError(
        `Failed to get profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Updates the repository's profile.
   *
   * @param params - Fields to update. Pass `null` to remove a field.
   *                 Omitted fields are preserved from the existing profile.
   * @returns Promise resolving to update result with new URI and CID
   * @throws {@link NetworkError} if the update fails
   *
   * @remarks
   * This method performs a read-modify-write operation:
   * 1. Fetches the existing profile record
   * 2. Merges in the provided updates
   * 3. Writes the updated profile back
   *
   * **Image Handling**: When providing `avatar` or `banner` as a Blob,
   * the image is automatically uploaded and the blob reference is stored
   * in the profile.
   *
   * **Field Removal**: Pass `null` to explicitly remove a field. Omitting
   * a field (not including it in params) preserves the existing value.
   *
   * @example Update display name and bio
   * ```typescript
   * await repo.profile.update({
   *   displayName: "Alice",
   *   description: "Building impact certificates",
   * });
   * ```
   *
   * @example Update avatar image
   * ```typescript
   * // From a file input
   * const file = document.getElementById("avatar").files[0];
   * await repo.profile.update({ avatar: file });
   *
   * // From raw data
   * const response = await fetch("https://example.com/my-avatar.png");
   * const blob = await response.blob();
   * await repo.profile.update({ avatar: blob });
   * ```
   *
   * @example Remove description
   * ```typescript
   * // Removes the description field entirely
   * await repo.profile.update({ description: null });
   * ```
   *
   * @example Multiple updates at once
   * ```typescript
   * const newAvatar = new Blob([avatarData], { type: "image/png" });
   * const newBanner = new Blob([bannerData], { type: "image/jpeg" });
   *
   * await repo.profile.update({
   *   displayName: "New Name",
   *   description: "New bio",
   *   avatar: newAvatar,
   *   banner: newBanner,
   * });
   * ```
   */
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
      throw new NetworkError(
        `Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }
}
