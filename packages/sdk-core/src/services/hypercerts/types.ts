/**
 * TypeScript types for hypercert lexicon schemas.
 *
 * Re-exports generated types and validation from `@hypercerts-org/lexicon`.
 *
 * @packageDocumentation
 */

// Re-export BlobRef from ATProto lexicon
export { BlobRef } from "@atproto/lexicon";
export type { JsonBlobRef } from "@atproto/lexicon";
import type { OverrideProperties, SetOptional } from "type-fest";

// Re-export everything from lexicon package
export {
  // Namespaced types with validation (isRecord, validateRecord)
  OrgHypercertsClaimActivity,
  OrgHypercertsClaimRights,
  OrgHypercertsClaimContributionDetails,
  OrgHypercertsClaimContributorInformation,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimEvidence,
  OrgHypercertsClaimCollection,
  OrgHypercertsHelperWorkScopeTag,
  AppCertifiedLocation,
  AppCertifiedBadgeAward,
  AppCertifiedBadgeDefinition,
  AppCertifiedBadgeResponse,
  OrgHypercertsFundingReceipt,
  ComAtprotoRepoStrongRef,
  // Validation utilities
  validate,
  HYPERCERTS_SCHEMAS,
  HYPERCERTS_SCHEMA_DICT,
  HYPERCERTS_NSIDS_BY_TYPE,
  HYPERCERTS_NSIDS,
  HYPERCERTS_LEXICON_JSON,
  HYPERCERTS_LEXICON_DOC,
  lexicons,
} from "@hypercerts-org/lexicon";

// Re-export lexicon constants from SDK's lexicons module
export { HYPERCERT_LEXICONS, HYPERCERT_COLLECTIONS } from "../../lexicons.js";

export type { AppCertifiedDefs, OrgHypercertsDefs } from "@hypercerts-org/lexicon";

/*
 * Dual import pattern: The lexicon package uses `export * as X` which exports namespaces (values).
 * We need both:
 * 1. `export { ... }` - re-exports namespaces for external consumers
 * 2. `import type { ... }` - makes names available locally for type aliases below
 *
 * Without the import, TypeScript wouldn't recognize OrgHypercertsClaimActivity etc.
 * when defining `type HypercertClaim = OrgHypercertsClaimActivity.Main`.
 */
import type {
  OrgHypercertsClaimActivity,
  OrgHypercertsClaimRights,
  OrgHypercertsClaimContributionDetails,
  OrgHypercertsClaimContributorInformation,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimEvidence,
  OrgHypercertsClaimCollection,
  OrgHypercertsHelperWorkScopeTag,
  AppCertifiedLocation,
  AppCertifiedBadgeAward,
  AppCertifiedBadgeDefinition,
  AppCertifiedBadgeResponse,
  OrgHypercertsFundingReceipt,
  ComAtprotoRepoStrongRef,
  OrgHypercertsDefs,
} from "@hypercerts-org/lexicon";

// ============================================================================
// Type Aliases
// ============================================================================

export type StrongRef = ComAtprotoRepoStrongRef.Main;

/**
 * Hypercert claim (activity) record.
 *
 * Represents a single hypercert activity with metadata including descriptions,
 * time periods, work scope, contributors, and optional rich text annotations.
 *
 * @remarks
 * **Rich Text Facets (beta.7+):**
 * - `shortDescriptionFacets` - Annotations for the short description text
 * - `descriptionFacets` - Annotations for the full description text
 *
 * Facets enable rich text features like mentions (@user), URLs, hashtags (#tag),
 * and other inline annotations. Each facet specifies:
 * - `index`: Byte range in the UTF-8 encoded text (byteStart, byteEnd)
 * - `features`: Array of feature objects (mention, link, tag, etc.)
 *
 * @example Basic claim without facets
 * ```typescript
 * const claim: HypercertClaim = {
 *   $type: "org.hypercerts.claim.activity",
 *   createdAt: new Date().toISOString(),
 *   shortDescription: "Community cleanup project",
 *   description: "Monthly beach cleanup initiative",
 *   startDate: "2024-01-01T00:00:00Z",
 *   endDate: "2024-12-31T23:59:59Z",
 *   // ... other fields
 * };
 * ```
 *
 * @example Claim with rich text facets
 * ```typescript
 * const claimWithFacets: HypercertClaim = {
 *   $type: "org.hypercerts.claim.activity",
 *   createdAt: new Date().toISOString(),
 *   shortDescription: "Organized by @alice for #sustainability",
 *   shortDescriptionFacets: [
 *     {
 *       index: { byteStart: 13, byteEnd: 19 },  // "@alice"
 *       features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:alice123" }]
 *     },
 *     {
 *       index: { byteStart: 24, byteEnd: 39 },  // "#sustainability"
 *       features: [{ $type: "app.bsky.richtext.facet#tag", tag: "sustainability" }]
 *     }
 *   ],
 *   description: "Visit https://example.com/cleanup for more info",
 *   descriptionFacets: [
 *     {
 *       index: { byteStart: 6, byteEnd: 33 },  // URL
 *       features: [{ $type: "app.bsky.richtext.facet#link", uri: "https://example.com/cleanup" }]
 *     }
 *   ],
 *   startDate: "2024-01-01T00:00:00Z",
 *   endDate: "2024-12-31T23:59:59Z",
 *   // ... other fields
 * };
 * ```
 *
 * @see {@link https://atproto.com/specs/richtext#facets|AT Protocol Rich Text Facets}
 */
export type HypercertClaim = OrgHypercertsClaimActivity.Main;

export type HypercertRights = OrgHypercertsClaimRights.Main;
export type HypercertContributionDetails = OrgHypercertsClaimContributionDetails.Main;
export type HypercertContributorInformation = OrgHypercertsClaimContributorInformation.Main;
/** Contributor entry in an activity - can be inline or reference external records */
export type HypercertContributor = OrgHypercertsClaimActivity.Contributor;
export type HypercertMeasurement = OrgHypercertsClaimMeasurement.Main;
export type HypercertEvaluation = OrgHypercertsClaimEvaluation.Main;
export type HypercertEvidence = OrgHypercertsClaimEvidence.Main;
export type HypercertCollection = OrgHypercertsClaimCollection.Main;

/**
 * Collection item with optional weight.
 *
 * Represents a single item in a collection's `items` array. Each item can reference
 * either an activity or another collection (nested collections), with an optional
 * weight for proportional attribution.
 *
 * @remarks
 * Structure (beta.7+):
 * - `itemIdentifier` (required): StrongRef to the item (activity or collection)
 * - `itemWeight` (optional): Positive numeric value as string for proportional weighting
 *
 * @example Basic item without weight
 * ```typescript
 * const item: HypercertCollectionItem = {
 *   itemIdentifier: {
 *     uri: "at://did:plc:abc123/org.hypercerts.claim.activity/xyz789",
 *     cid: "bafyreiabc123..."
 *   }
 * };
 * ```
 *
 * @example Item with weight for proportional attribution
 * ```typescript
 * const weightedItem: HypercertCollectionItem = {
 *   itemIdentifier: {
 *     uri: "at://did:plc:abc123/org.hypercerts.claim.activity/xyz789",
 *     cid: "bafyreiabc123..."
 *   },
 *   itemWeight: "2.5"  // This activity has 2.5x weight compared to items with weight "1"
 * };
 * ```
 *
 * @example Nested collection
 * ```typescript
 * const nestedCollection: HypercertCollectionItem = {
 *   itemIdentifier: {
 *     uri: "at://did:plc:abc123/org.hypercerts.claim.collection/sub789",
 *     cid: "bafyreiabc456..."
 *   },
 *   itemWeight: "1.0"
 * };
 * ```
 */
export type HypercertCollectionItem = OrgHypercertsClaimCollection.Item;
/** Work scope tag for creating reusable scope atoms */
export type HypercertWorkScopeTag = OrgHypercertsHelperWorkScopeTag.Main;
export type HypercertLocation = AppCertifiedLocation.Main;
export type BadgeAward = AppCertifiedBadgeAward.Main;
export type BadgeDefinition = AppCertifiedBadgeDefinition.Main;
export type BadgeResponse = AppCertifiedBadgeResponse.Main;
export type FundingReceipt = OrgHypercertsFundingReceipt.Main;

// ============================================================================
// SDK Input Helper Types
// ATProto API infers $type from the collection
// ============================================================================

/**
 * Image input for SDK operations.
 *
 * Accepts either:
 * - A string URI reference (for external images)
 * - A Blob to be uploaded (will be converted to SmallImage or LargeImage)
 *
 * The SDK will convert these inputs to the appropriate lexicon types.
 */
export type HypercertImage = string | Blob;

/**
 * Lexicon-defined image types (union of Uri and image blob types).
 *
 * Used when working with stored records. Can be:
 * - OrgHypercertsDefs.Uri - External image reference
 * - OrgHypercertsDefs.SmallImage - Uploaded blob for avatars/thumbnails
 * - OrgHypercertsDefs.LargeImage - Uploaded blob for banners/covers
 */
export type HypercertImageRecord = OrgHypercertsDefs.Uri | OrgHypercertsDefs.SmallImage | OrgHypercertsDefs.LargeImage;
/** Hypercert with resolved metadata */
export type HypercertWithMetadata = HypercertClaim & {
  resolvedRights?: HypercertRights;
  resolvedLocation?: HypercertLocation;
};

/** Project type alias (collection with type="project") */
export type HypercertProject = HypercertCollection & { type: "project" };

/** Project with resolved metadata */
export type HypercertProjectWithMetadata = HypercertCollection & {
  resolvedLocation?: HypercertLocation;
  resolvedActivities?: HypercertClaim[];
};

export type { OrgHypercertsClaimCollection as CollectionLexicon } from "@hypercerts-org/lexicon";

// ============================================================================
// SDK Input Helper Types (Derived from Lexicon)
// ============================================================================

/**
 * Input type for collection items.
 *
 * Same as {@link HypercertCollectionItem} but with `$type` field optional since
 * the SDK will automatically populate it when creating records.
 *
 * @example
 * ```typescript
 * const items: CollectionItemInput[] = [
 *   {
 *     itemIdentifier: { uri: "at://did:plc:abc/org.hypercerts.claim.activity/123", cid: "bafyrei..." },
 *     itemWeight: "1.0"
 *   },
 *   {
 *     itemIdentifier: { uri: "at://did:plc:abc/org.hypercerts.claim.activity/456", cid: "bafyrei..." },
 *     itemWeight: "2.5"  // This activity weighted 2.5x more
 *   }
 * ];
 * ```
 */
export type CollectionItemInput = SetOptional<OrgHypercertsClaimCollection.Item, "$type">;

/**
 * Parameters for specifying a location in collection/project operations.
 * Supports three ways to specify location:
 *
 * 1. **StrongRef** - Direct reference with uri and cid (no record creation)
 * 2. **AT-URI string** - Reference to existing location record
 * 3. **Location object** - Full location data (lpVersion, srs, locationType, location, etc.)
 *    with optional `$type` and `createdAt` fields
 *    where-as location field can be a Blob (e.g., GeoJSON) that will be uploaded
 *
 * @example Using a StrongRef (no record creation)
 * ```typescript
 * const location: AttachLocationParams = { uri: "at://did:plc:test/app.certified.location/abc", cid: "bafyrei..." };
 * ```
 *
 * @example Using an AT-URI (fetches existing record)
 * ```typescript
 * const location: AttachLocationParams = "at://did:plc:test/app.certified.location/xyz";
 * ```
 *
 * @example Using a location object
 * ```typescript
 * const location: AttachLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "coordinate-decimal",
 *   location: "https://locationuri.com",
 *   name: "San Francisco",
 * };
 * ```
 */

export type CreateLocationParams = OverrideProperties<
  SetOptional<HypercertLocation, "$type" | "createdAt">,
  {
    location: string | Blob | HypercertLocation["location"];
  }
>;

export type LocationParams = StrongRef | string | CreateLocationParams;

/**
 * SDK input parameters for creating a collection.
 * Derived from lexicon type with $type and createdAt removed.
 * avatar/banner accept HypercertImage (string URI or Blob) for user convenience.
 * Location can be provided inline or via attachLocationToCollection().
 */
export type CreateCollectionParams = OverrideProperties<
  SetOptional<OrgHypercertsClaimCollection.Main, "$type" | "createdAt">,
  {
    avatar?: HypercertImage;
    banner?: HypercertImage;
    items: CollectionItemInput[];
    /**
     * Optional location to attach to the collection.
     * Can be:
     * - StrongRef to reference existing location (uri + cid)
     * - string (AT-URI) to reference existing location (CID will be fetched)
     * - Location object to create a new location record
     */
    location?: LocationParams;
  }
>;

/**
 * SDK input parameters for updating a collection.
 * All fields are optional.
 * avatar/banner accept HypercertImage (string URI or Blob), or null to remove.
 * Location can be updated inline or removed with null.
 */
export type UpdateCollectionParams = Omit<Partial<CreateCollectionParams>, "avatar" | "banner" | "location"> & {
  avatar?: HypercertImage | null;
  banner?: HypercertImage | null;
  location?: LocationParams | null;
};

export type CreateCollectionResult = {
  uri: string;
  cid: string;
  record: HypercertCollection;
  locationUri?: string;
};

/**
 * SDK input parameters for creating a project.
 * Projects are collections with type="project" (set automatically).
 */
export type CreateProjectParams = CreateCollectionParams;

/**
 * SDK input parameters for updating a project.
 */
export type UpdateProjectParams = UpdateCollectionParams;

export type CreateProjectResult = CreateCollectionResult;
