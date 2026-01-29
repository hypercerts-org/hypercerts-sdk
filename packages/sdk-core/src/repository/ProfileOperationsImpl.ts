/**
 * ProfileOperationsImpl - User profile operations supporting dual profiles.
 *
 * This module provides operations for managing AT Protocol profiles:
 * - Bluesky profiles (app.bsky.actor.profile) - Simple profiles with CDN images
 * - Certified profiles (app.certified.actor.profile) - Hypercerts profiles with pronouns/website
 *
 * @packageDocumentation
 */

import type { Agent, AppBskyActorDefs } from "@atproto/api";
import { NetworkError, ValidationError } from "../core/errors.js";
import { HYPERCERT_COLLECTIONS } from "../lexicons.js";
import { extractCidFromImage, getBlobUrl } from "../lib/blob-url.js";
import { AppCertifiedActorProfile, type HypercertImageRecord } from "../services/hypercerts/types.js";
import { validate } from "@hypercerts-org/lexicon";
import type {
  BlobOperations,
  BskyProfile,
  CertifiedProfile,
  CreateBskyProfileParams,
  CreateCertifiedProfileParams,
  ProfileOperations,
  UpdateBskyProfileParams,
  UpdateCertifiedProfileParams,
} from "./interfaces.js";
import { type CreateResult, type UpdateResult } from "./types.js";
import { AppBskyActorProfile } from "@atproto/api";

type ProfileCollection = typeof BSKY_PROFILE_NSID | typeof CERTIFIED_PROFILE_NSID;
const BSKY_PROFILE_NSID = HYPERCERT_COLLECTIONS.BSKY_PROFILE;
const CERTIFIED_PROFILE_NSID = HYPERCERT_COLLECTIONS.CERTIFIED_PROFILE;

/** Profile record key (always "self" for the user's own profile) */
const PROFILE_RKEY = "self";

/**
 * Implementation of profile operations supporting dual profiles.
 *
 * This class provides operations for both Bluesky and Certified profiles:
 * - Bluesky profiles: Simple AT Protocol profiles with avatar/banner as CDN URLs
 * - Certified profiles: Hypercerts profiles hypercerts image format
 *
 * @remarks
 * This class is typically not instantiated directly. Access it through
 * {@link Repository.profile}.
 *
 * **Profile Types**:
 * - `app.bsky.actor.profile`: Standard Bluesky profile, images are simple blob refs
 * - `app.certified.actor.profile`: Hypercerts profile, images wrapped in smallImage/largeImage. Omits some bsky profile properties like pinnedPost labels etc
 *
 * @example
 * ```typescript
 * // Get Bluesky profile
 * const bskyProfile = await repo.profile.getBskyProfile();
 * console.log(bskyProfile.displayName);
 * console.log(bskyProfile.avatar); // CDN URL
 *
 * // Get Certified profile
 * const certifiedProfile = await repo.profile.getCertifiedProfile();
 * console.log(certifiedProfile.pronouns); // "she/her"
 * console.log(certifiedProfile.avatar); // Blob URL
 *
 * // Create/update profiles
 * await repo.profile.createBskyProfile({ displayName: "Alice" });
 * await repo.profile.updateBskyProfile({ description: "New bio" });
 *
 * await repo.profile.createCertifiedProfile({
 *   displayName: "Alice",
 *   pronouns: "she/her",
 * });
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
   * @param pdsUrl - PDS URL for constructing blob URLs
   *
   * @internal
   */
  constructor(
    private agent: Agent,
    private repoDid: string,
    private blobs: BlobOperations,
    private pdsUrl: string,
  ) {}

  /**
   * Converts a Hypercert image record to a URL string.
   *
   * - URI format: returns the URI string directly
   * - Blob format (smallImage/largeImage): constructs blob URL using PDS
   *
   * @param image - Hypercert image record
   * @returns URL string
   * @throws {Error} If image format is invalid or blob CID cannot be extracted
   *
   * @internal
   */
  private imageToUrl(image: HypercertImageRecord): string {
    const result = extractCidFromImage(image);
    if (!result) {
      throw new Error("Unable to extract CID or URI from image record");
    }
    if (result.startsWith("http://") || result.startsWith("https://")) {
      return result;
    }

    // Otherwise, it's a CID - construct blob URL
    return getBlobUrl(this.pdsUrl, this.repoDid, result);
  }

  /**
   * Applies an image field (avatar/banner) with format-specific wrapping.
   *
   * - null: removes the field
   * - undefined: no change
   * - Blob: uploads and wraps according to collection format
   *
   * @param result - The profile record being built
   * @param field - Field name ("avatar" or "banner")
   * @param value - Blob to upload, null to remove, or undefined to skip
   * @param collection - Profile collection NSID (determines image wrapping format)
   *
   * @internal
   */
  private async applyImageField(
    result: Record<string, unknown>,
    field: string,
    value: Blob | null | undefined,
    collection: ProfileCollection,
  ): Promise<void> {
    if (value === undefined) return;

    if (value === null) {
      delete result[field];
      return;
    }

    const blobRef = await this.blobs.upload(value);

    // Bsky profiles use simple blob refs, Certified profiles wrap in smallImage/largeImage
    if (collection === BSKY_PROFILE_NSID) {
      result[field] = blobRef;
    } else {
      const isLargeImage = field === "banner";
      result[field] = {
        $type: isLargeImage ? "org.hypercerts.defs#largeImage" : "org.hypercerts.defs#smallImage",
        image: blobRef,
      };
    }
  }

  /**
   * Validates a profile record against the appropriate lexicon schema.
   *
   * @param profile - The profile record to validate
   * @param collection - Profile collection NSID (determines validation schema)
   * @throws {ValidationError} If validation fails
   * @internal
   */
  private validateProfileRecord(profile: Record<string, unknown>, collection: ProfileCollection): void {
    if (collection === CERTIFIED_PROFILE_NSID) {
      const validation = validate(profile, CERTIFIED_PROFILE_NSID, "main", false);
      if (!validation.success) {
        throw new ValidationError(`Invalid profile record: ${validation.error?.message}`);
      }
    }
    if (collection === BSKY_PROFILE_NSID) {
      const validation = AppBskyActorProfile.validateMain(profile);
      if (!validation.success) {
        throw new ValidationError(`Invalid profile record: ${validation.error?.message}`);
      }
    }
  }

  /**
   * Creates a profile record with lexicon validation.
   *
   * @param collection - NSID of the collection (Bsky or Certified profile)
   * @param params - Profile creation parameters
   * @returns Promise resolving to create result with URI and CID
   * @throws {ValidationError} if validation fails
   * @throws {NetworkError} if creation fails
   * @internal
   */
  private async createProfileRecord(
    collection: ProfileCollection,
    params: CreateBskyProfileParams | CreateCertifiedProfileParams,
  ): Promise<CreateResult> {
    try {
      const { avatar, banner, $type, createdAt, ...otherFields } = params;

      const profile: Record<string, unknown> = {
        $type: $type ?? collection,
        createdAt: createdAt ?? new Date().toISOString(),
        ...otherFields,
      };

      await this.applyImageField(profile, "avatar", avatar, collection);
      await this.applyImageField(profile, "banner", banner, collection);

      // Validate profile record against lexicon schema
      this.validateProfileRecord(profile, collection);

      const result = await this.agent.com.atproto.repo.createRecord({
        repo: this.repoDid,
        collection,
        rkey: PROFILE_RKEY,
        record: profile,
      });

      if (!result.success) {
        throw new NetworkError("Failed to create profile");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ValidationError) throw error;
      throw new NetworkError(
        `Failed to create profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Updates a profile record with proper null handling and validation.
   *
   * @param collection - NSID of the collection (Bsky or Certified profile)
   * @param params - Profile update parameters (partial, with null for deletions)
   * @returns Promise resolving to update result with URI and CID
   * @throws {NetworkError} if profile not found or update fails
   * @throws {ValidationError} if validation fails
   * @internal
   */
  private async updateProfileRecord(
    collection: ProfileCollection,
    params: UpdateBskyProfileParams | UpdateCertifiedProfileParams,
  ): Promise<UpdateResult> {
    try {
      const existing = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection,
        rkey: PROFILE_RKEY,
      });

      if (!existing.success) {
        throw new NetworkError("Profile not found");
      }
      const { avatar, banner, ...otherFields } = params;
      const updatedProfile: Record<string, unknown> = {
        ...existing.data.value,
      };
      // Apply non-image field updates, handling null deletions
      for (const [key, value] of Object.entries(otherFields)) {
        if (value === null) {
          delete updatedProfile[key];
        } else if (value !== undefined) {
          updatedProfile[key] = value;
        }
      }

      await this.applyImageField(updatedProfile, "avatar", avatar, collection);
      await this.applyImageField(updatedProfile, "banner", banner, collection);

      // Validate updated record against lexicon schema
      this.validateProfileRecord(updatedProfile, collection);

      const result = await this.agent.com.atproto.repo.putRecord({
        repo: this.repoDid,
        collection,
        rkey: PROFILE_RKEY,
        record: updatedProfile,
      });

      if (!result.success) {
        throw new NetworkError("Failed to update profile");
      }

      return { uri: result.data.uri, cid: result.data.cid };
    } catch (error) {
      if (error instanceof NetworkError || error instanceof ValidationError) throw error;
      throw new NetworkError(
        `Failed to update profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Gets Bluesky profile (app.bsky.actor.profile).
   *
   * @returns Promise resolving to Bluesky profile data
   * @throws {NetworkError} If profile cannot be fetched
   *
   * @example
   * ```typescript
   * const bskyProfile = await repo.profile.getBskyProfile();
   * console.log(bskyProfile.displayName); // "Alice"
   * console.log(bskyProfile.avatar); // "https://cdn.bsky.app/..."
   * ```
   */
  async getBskyProfile(): Promise<BskyProfile> {
    try {
      const profileResult = await this.agent.getProfile({ actor: this.repoDid });

      if (!profileResult.success) {
        throw new NetworkError("Failed to get Bluesky profile");
      }

      return profileResult.data as AppBskyActorDefs.ProfileViewDetailed;
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to get Bluesky profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Gets Certified profile (app.certified.actor.profile).
   *
   * Returns the profile record with avatar and banner converted to blob URLs.
   * Includes the user's handle fetched from getProfile(). If getProfile() fails,
   * handle is set to empty string.
   *
   * @returns Promise resolving to Certified profile data
   * @throws {NetworkError} If profile record cannot be fetched
   *
   * @example
   * ```typescript
   * const certifiedProfile = await repo.profile.getCertifiedProfile();
   * console.log(certifiedProfile.displayName); // "Alice"
   * console.log(certifiedProfile.pronouns); // "she/her"
   * console.log(certifiedProfile.avatar); // "https://pds.../xrpc/..."
   * ```
   */
  async getCertifiedProfile(): Promise<CertifiedProfile> {
    try {
      // Fetch handle from Bluesky profile (non-blocking)
      let handle = "";
      try {
        const profileResult = await this.agent.getProfile({ actor: this.repoDid });
        if (profileResult.success) {
          handle = (profileResult.data as { handle: string }).handle;
        }
      } catch {
        // Ignore error, use empty string for handle
        handle = "";
      }

      // Fetch certified profile record
      const recordResult = await this.agent.com.atproto.repo.getRecord({
        repo: this.repoDid,
        collection: CERTIFIED_PROFILE_NSID,
        rkey: PROFILE_RKEY,
      });

      if (!recordResult.success) {
        throw new NetworkError("Failed to get Certified profile");
      }

      const profileRecord = recordResult.data.value as AppCertifiedActorProfile.Main;

      let avatar: string | undefined;
      let banner: string | undefined;

      if (profileRecord.avatar) {
        avatar = this.imageToUrl(profileRecord.avatar as HypercertImageRecord);
      }

      if (profileRecord.banner) {
        banner = this.imageToUrl(profileRecord.banner as HypercertImageRecord);
      }

      return {
        ...profileRecord,
        handle,
        avatar,
        banner,
      };
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError(
        `Failed to get Certified profile: ${error instanceof Error ? error.message : "Unknown error"}`,
        error,
      );
    }
  }

  /**
   * Creates Bluesky profile (app.bsky.actor.profile).
   *
   * @param params - Profile fields to set
   * @returns Promise resolving to create result with URI and CID
   * @throws {NetworkError} If creation fails
   *
   * @example
   * ```typescript
   * await repo.profile.createBskyProfile({
   *   displayName: "Alice",
   *   description: "Building impact certificates",
   * });
   * ```
   */
  async createBskyProfile(params: CreateBskyProfileParams): Promise<CreateResult> {
    return this.createProfileRecord(BSKY_PROFILE_NSID, params);
  }

  /**
   * Updates Bluesky profile (app.bsky.actor.profile).
   *
   * @param params - Fields to update (pass null to remove)
   * @returns Promise resolving to update result with URI and CID
   * @throws {NetworkError} If update fails
   *
   * @example
   * ```typescript
   * await repo.profile.updateBskyProfile({
   *   displayName: "New Name",
   *   description: null,  // Remove description
   * });
   * ```
   */
  async updateBskyProfile(params: UpdateBskyProfileParams): Promise<UpdateResult> {
    return this.updateProfileRecord(BSKY_PROFILE_NSID, params);
  }

  /**
   * Creates Certified profile (app.certified.actor.profile).
   *
   * @param params - Profile fields to set
   * @returns Promise resolving to create result with URI and CID
   * @throws {NetworkError} If creation fails
   *
   * @example
   * ```typescript
   * await repo.profile.createCertifiedProfile({
   *   displayName: "Alice",
   *   description: "Building impact certificates",
   *   pronouns: "she/her",
   *   website: "https://alice.com",
   * });
   * ```
   */
  async createCertifiedProfile(params: CreateCertifiedProfileParams): Promise<CreateResult> {
    return this.createProfileRecord(CERTIFIED_PROFILE_NSID, params);
  }

  /**
   * Updates Certified profile (app.certified.actor.profile).
   *
   * @param params - Fields to update (pass null to remove)
   * @returns Promise resolving to update result with URI and CID
   * @throws {NetworkError} If update fails
   *
   * @example
   * ```typescript
   * await repo.profile.updateCertifiedProfile({
   *   displayName: "New Name",
   *   pronouns: null,  // Remove pronouns
   * });
   * ```
   */
  async updateCertifiedProfile(params: UpdateCertifiedProfileParams): Promise<UpdateResult> {
    return this.updateProfileRecord(CERTIFIED_PROFILE_NSID, params);
  }
}
