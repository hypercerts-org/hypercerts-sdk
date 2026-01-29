/**
 * ProfileOperationsImpl - User profile operations.
 *
 * This module provides the implementation for AT Protocol profile
 * management, including fetching and updating user profiles.
 *
 * @packageDocumentation
 */

import type { Agent } from "@atproto/api";
import type { JsonBlobRef } from "@atproto/lexicon";
import { NetworkError } from "../core/errors.js";
import type { BlobInput, BlobOperations, ProfileOperations, ProfileParams } from "./interfaces.js";
import type { CreateResult, UpdateResult } from "./types.js";
import { uploadResultToBlobRef } from "./types.js";

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
 * // Update with new avatar (Blob - will be uploaded)
 * const avatarBlob = new Blob([imageData], { type: "image/png" });
 * await repo.profile.update({ avatar: avatarBlob });
 *
 * // Update with existing blob reference (no re-upload)
 * const existingRef = { $type: "blob", ref: { $link: "bafyrei..." }, mimeType: "image/png", size: 1234 };
 * await repo.profile.update({ avatar: existingRef });
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
   * @param blobs - Blob operations for uploading images
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private blobs: BlobOperations,
  ) {}

  /**
   * Applies a simple field (string or null) to the profile.
   *
   * @internal
   */
  private applySimpleField(result: Record<string, unknown>, field: string, value: string | null | undefined): void {
    if (value === undefined) return;

    if (value === null) {
      delete result[field];
    } else {
      result[field] = value;
    }
  }

  /**
   * Checks if a value is an existing JsonBlobRef.
   *
   * JsonBlobRef has the structure: { $type: "blob", ref: { $link }, mimeType, size }
   *
   * @internal
   */
  private isJsonBlobRef(value: unknown): value is JsonBlobRef {
    return (
      typeof value === "object" &&
      value !== null &&
      "$type" in value &&
      (value as Record<string, unknown>).$type === "blob" &&
      "ref" in value &&
      "mimeType" in value &&
      "size" in value
    );
  }

  /**
   * Applies a blob field to the profile, uploading if needed.
   *
   * Handles three input types:
   * - undefined: Field is not modified
   * - null: Field is removed from the profile
   * - Blob: Uploaded and converted to JsonBlobRef
   * - JsonBlobRef: Used directly without re-uploading
   *
   * @internal
   */
  private async applyBlobField(
    result: Record<string, unknown>,
    field: string,
    input: BlobInput | null | undefined,
  ): Promise<void> {
    if (input === undefined) return;

    if (input === null) {
      delete result[field];
    } else if (this.isJsonBlobRef(input)) {
      // Use existing blob ref directly
      result[field] = input;
    } else {
      // Upload new blob
      const uploadResult = await this.blobs.upload(input);
      result[field] = uploadResultToBlobRef(uploadResult);
    }
  }

  /**
   * Applies profile params to a profile record, handling null values for deletion.
   *
   * Ensures $type and createdAt are always present on the record, using
   * nullish coalescing to allow callers to override defaults.
   *
   * @internal
   */
  private async mergeParamsIntoProfile(
    profile: Record<string, unknown>,
    params: ProfileParams,
  ): Promise<Record<string, unknown>> {
    const result = { ...profile };

    // Ensure $type and createdAt are always present
    result.$type = params.$type ?? (result.$type as string | undefined) ?? "app.bsky.actor.profile";
    result.createdAt = params.createdAt ?? (result.createdAt as string | undefined) ?? new Date().toISOString();

    this.applySimpleField(result, "displayName", params.displayName);
    this.applySimpleField(result, "description", params.description);
    this.applySimpleField(result, "website", params.website);
    await this.applyBlobField(result, "avatar", params.avatar);
    await this.applyBlobField(result, "banner", params.banner);

    return result;
  }

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
   * Creates a new profile for the repository.
   *
   * @param params - Profile fields to set
   * @returns Promise resolving to create result with URI and CID
   * @throws {@link NetworkError} if the creation fails
   *
   * @remarks
   * Use this method when no profile exists yet. If a profile already exists,
   * use {@link update} instead.
   *
   * **Image Handling**: When providing `avatar` or `banner` as a Blob,
   * the image is automatically uploaded and the blob reference is stored
   * in the profile.
   *
   * @example Create a basic profile
   * ```typescript
   * await repo.profile.create({
   *   displayName: "Alice",
   *   description: "Building impact certificates",
   * });
   * ```
   *
   * @example Create a profile with avatar
   * ```typescript
   * const avatarBlob = new Blob([avatarData], { type: "image/png" });
   * await repo.profile.create({
   *   displayName: "Alice",
   *   description: "Building impact certificates",
   *   avatar: avatarBlob,
   * });
   * ```
   */
  async create(params: ProfileParams): Promise<CreateResult> {
    try {
      const profile = await this.mergeParamsIntoProfile({}, params);

      const createParams = {
        repo: this.repoDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: profile,
      };

      const result = await this.agent.com.atproto.repo.createRecord(createParams);

      if (!result.success) {
        throw new NetworkError("Failed to create profile");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to create profile: ${error instanceof Error ? error.message : "Unknown error"}`,
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
  async update(params: ProfileParams): Promise<UpdateResult> {
    try {
      // Get existing profile record
      const getParams = {
        repo: this.repoDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
      };

      const existing = await this.agent.com.atproto.repo.getRecord(getParams);

      if (!existing.success) {
        throw new NetworkError("Profile not found. Use create() for new profiles.");
      }

      const existingProfile = (existing.data.value as Record<string, unknown>) || {};
      const updatedProfile = await this.mergeParamsIntoProfile(existingProfile, params);

      const putParams = {
        repo: this.repoDid,
        collection: "app.bsky.actor.profile",
        rkey: "self",
        record: updatedProfile,
      };

      const result = await this.agent.com.atproto.repo.putRecord(putParams);

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
