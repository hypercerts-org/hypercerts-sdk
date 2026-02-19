/**
 * TypeScript types for hypercert lexicon schemas.
 *
 * Re-exports generated types and validation from `@hypercerts-org/lexicon`.
 *
 * @packageDocumentation
 */

// Re-export BlobRef from ATProto lexicon
export { BlobRef } from "@atproto/lexicon";
import type { Except, OverrideProperties, SetOptional } from "type-fest";

// Re-export everything from lexicon package
export {
  AppCertifiedActorProfile,
  AppCertifiedBadgeAward,
  AppCertifiedBadgeDefinition,
  AppCertifiedBadgeResponse,
  AppCertifiedLocation,
  ComAtprotoRepoStrongRef,
  HYPERCERTS_LEXICON_DOC,
  HYPERCERTS_LEXICON_JSON,
  HYPERCERTS_NSIDS,
  HYPERCERTS_NSIDS_BY_TYPE,
  HYPERCERTS_SCHEMA_DICT,
  HYPERCERTS_SCHEMAS,
  lexicons,
  // Namespaced types with validation (isRecord, validateRecord)
  OrgHypercertsClaimActivity,
  OrgHypercertsClaimAttachment,
  OrgHypercertsClaimCollection,
  OrgHypercertsClaimContributionDetails,
  OrgHypercertsClaimContributorInformation,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimRights,
  OrgHypercertsFundingReceipt,
  OrgHypercertsHelperWorkScopeTag,
  // Validation utilities
  validate,
} from "@hypercerts-org/lexicon";

// Re-export lexicon constants from SDK's lexicons module
export { HYPERCERT_COLLECTIONS, HYPERCERT_LEXICONS } from "../../lexicons.js";

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
  AppCertifiedActorProfile,
  AppCertifiedBadgeAward,
  AppCertifiedBadgeDefinition,
  AppCertifiedBadgeResponse,
  AppCertifiedDefs,
  AppCertifiedLocation,
  ComAtprotoRepoStrongRef,
  OrgHypercertsClaimActivity,
  OrgHypercertsClaimAttachment,
  OrgHypercertsClaimCollection,
  OrgHypercertsClaimContributionDetails,
  OrgHypercertsClaimContributorInformation,
  OrgHypercertsClaimEvaluation,
  OrgHypercertsClaimMeasurement,
  OrgHypercertsClaimRights,
  OrgHypercertsDefs,
  OrgHypercertsFundingReceipt,
  OrgHypercertsHelperWorkScopeTag,
} from "@hypercerts-org/lexicon";

// Re-export Bluesky profile types
export type { AppBskyActorProfile } from "@atproto/api";
// Re-export AppBskyRichtextFacet for rich text annotations
export type { AppBskyRichtextFacet } from "@atproto/api";

// ============================================================================
// Type Aliases
// ============================================================================

export type StrongRef = ComAtprotoRepoStrongRef.Main;

/**
 * A reference that can be either an AT-URI string or a resolved StrongRef.
 *
 * This type is commonly used for parameters that accept references to existing records,
 * where the caller can provide either:
 * - An AT-URI string (e.g., "at://did:plc:abc/org.hypercerts.claim.activity/xyz")
 * - A StrongRef object with both URI and CID
 *
 * The string form is typically resolved to a StrongRef internally by fetching the CID.
 *
 * @example String URI
 * ```typescript
 * const ref: RefUri = "at://did:plc:abc/collection/rkey";
 * ```
 *
 * @example StrongRef
 * ```typescript
 * const ref: RefUri = {
 *   $type: "com.atproto.repo.strongRef",
 *   uri: "at://...",
 *   cid: "bafy..."
 * };
 * ```
 */
export type RefUri = string | StrongRef;

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
/**
 * Hypercert attachment record.
 *
 * Attachments provide commentary, context, evidence, or documentary
 * material related to hypercert records.
 */
export type HypercertAttachment = OrgHypercertsClaimAttachment.Main;
export type HypercertCollection = OrgHypercertsClaimCollection.Main;

/**
 * Certified actor profile record (app.certified.actor.profile).
 * Extended profile with additional fields beyond Bluesky profiles.
 */
export type CertifiedProfileRecord = AppCertifiedActorProfile.Main;

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

// ============================================================================
// Lexicon Object Wrapper Type Aliases
// ============================================================================

/**
 * Inline contributor identity object wrapper.
 * Stores a DID or other identifier directly in the activity record without
 * creating a separate contributorInformation record.
 */
export type HypercertContributorIdentity = OrgHypercertsClaimActivity.ContributorIdentity;

/**
 * Inline contributor role object wrapper.
 * Stores a role string directly in the activity record without
 * creating a separate contributionDetails record.
 */
export type HypercertContributorRole = OrgHypercertsClaimActivity.ContributorRole;

/**
 * Inline work scope string object wrapper.
 * Stores a free-form scope string directly in the activity record.
 */
export type HypercertWorkScopeString = OrgHypercertsClaimActivity.WorkScopeString;

/**
 * Certified DID object wrapper used in evaluator lists.
 */
export type CertifiedDid = AppCertifiedDefs.Did;

// ============================================================================
// Input Helper Functions
// ============================================================================

/**
 * Creates a contributorIdentity inline object from a string.
 *
 * Use this when you want to embed a contributor DID directly in the activity
 * record without creating a separate contributorInformation record.
 *
 * @example
 * ```typescript
 * contributorIdentity("did:plc:alice123")
 * // → { $type: "org.hypercerts.claim.activity#contributorIdentity", identity: "did:plc:alice123" }
 * ```
 */
export function contributorIdentity(identity: string): HypercertContributorIdentity {
  return { $type: "org.hypercerts.claim.activity#contributorIdentity", identity };
}

/**
 * Creates a contributorRole inline object from a string.
 *
 * Use this when you want to embed a role string directly in the activity
 * record without creating a separate contributionDetails record.
 *
 * @example
 * ```typescript
 * contributorRole("Developer")
 * // → { $type: "org.hypercerts.claim.activity#contributorRole", role: "Developer" }
 * ```
 */
export function contributorRole(role: string): HypercertContributorRole {
  return { $type: "org.hypercerts.claim.activity#contributorRole", role };
}

/**
 * Creates a workScopeString inline object from a string.
 *
 * Use this when you want to embed a work scope string directly in the
 * activity record.
 *
 * @example
 * ```typescript
 * workScopeString("Climate Action")
 * // → { $type: "org.hypercerts.claim.activity#workScopeString", scope: "Climate Action" }
 * ```
 */
export function workScopeString(scope: string): HypercertWorkScopeString {
  return { $type: "org.hypercerts.claim.activity#workScopeString", scope };
}

/**
 * Creates a certified DID object from a plain DID string.
 *
 * Use this when building evaluator arrays for evaluation records.
 *
 * @example
 * ```typescript
 * certifiedDid("did:plc:evaluator123")
 * // → { $type: "app.certified.defs#did", did: "did:plc:evaluator123" }
 * ```
 */
export function certifiedDid(did: string): CertifiedDid {
  return { $type: "app.certified.defs#did", did };
}
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
 * Parameters for creating a location record.
 *
 * The `location` field accepts multiple formats:
 * - **Simple string** - Free-form text like "New York, NY, USA" (wrapped in URI ref)
 * - **URL string** - External location data like "https://example.com/location.geojson"
 * - **Blob** - Binary data (e.g., GeoJSON file) that will be uploaded
 * - **Structured object** - Full lexicon-defined location object
 *
 * @example Simple text location (beta.13+)
 * ```typescript
 * const location: CreateLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "coordinate-decimal",
 *   location: "New York, NY, USA",  // Simple string - wrapped in URI ref
 *   name: "Project Site",
 * };
 * ```
 *
 * @example URL reference
 * ```typescript
 * const location: CreateLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "coordinate-decimal",
 *   location: "https://example.com/location.geojson",
 *   name: "San Francisco",
 * };
 * ```
 *
 * @example Blob upload (GeoJSON file)
 * ```typescript
 * const geojsonBlob = new Blob([JSON.stringify(geojsonData)], { type: "application/geo+json" });
 * const location: CreateLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "geojson",
 *   location: geojsonBlob,  // Will be uploaded and stored as blob ref
 *   name: "Protected Area",
 * };
 * ```
 *
 * @example Structured location object
 * ```typescript
 * const location: CreateLocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "coordinate-decimal",
 *   location: {
 *     $type: "org.hypercerts.defs#uri",
 *     uri: "geo:37.7749,-122.4194"
 *   },
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

/**
 * Union type for specifying a location in SDK methods.
 *
 * Accepts three forms:
 * 1. **string** - AT-URI pointing to an existing location record
 * 2. **StrongRef** - Direct reference with uri and cid
 * 3. **CreateLocationParams** - Location object to create a new record
 *
 * @example Using an AT-URI (fetches existing record)
 * ```typescript
 * const location: LocationParams = "at://did:plc:test/app.certified.location/xyz";
 * ```
 *
 * @example Using a StrongRef (no record fetch needed)
 * ```typescript
 * const location: LocationParams = { uri: "at://did:plc:test/app.certified.location/abc", cid: "bafyrei..." };
 * ```
 *
 * @example Using CreateLocationParams (creates new record)
 * ```typescript
 * const location: LocationParams = {
 *   lpVersion: "1.0.0",
 *   srs: "EPSG:4326",
 *   locationType: "coordinate-decimal",
 *   location: "San Francisco, CA, USA",
 *   name: "Project Headquarters",
 * };
 * ```
 */
export type LocationParams = RefUri | CreateLocationParams;

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

// ============================================================================
// Measurement Types
// ============================================================================

/**
 * SDK type for measurement records.
 * Alias for the lexicon Main type, used in SDK operations.
 *
 * @see HypercertMeasurement - Equivalent alias
 */
export type Measurement = OrgHypercertsClaimMeasurement.Main;

/**
 * SDK input parameters for creating a measurement.
 *
 * Measurements quantify the impact claimed in a hypercert with
 * specific metrics, values, and units.
 *
 * @example Basic measurement
 * ```typescript
 * const params: CreateMeasurementParams = {
 *   subject: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
 *   metric: "Carbon Offset",
 *   unit: "tons CO2e",
 *   value: "150",
 * };
 * ```
 *
 * @example Full measurement with all options
 * ```typescript
 * const params: CreateMeasurementParams = {
 *   subject: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
 *   metric: "Forest Area Restored",
 *   unit: "hectares",
 *   value: "500",
 *   startDate: "2024-01-01T00:00:00Z",
 *   endDate: "2024-12-31T23:59:59Z",
 *   locations: [{ uri: "at://did:plc:.../app.certified.location/...", cid: "..." }],
 *   measurers: ["did:plc:auditor1", "did:plc:auditor2"],
 *   methodType: "satellite-imagery",
 *   methodURI: "https://example.com/methodology",
 *   evidenceURI: ["https://example.com/audit-report"],
 *   comment: "Verified through satellite imagery analysis",
 * };
 * ```
 */

export type CreateMeasurementParams = OverrideProperties<
  SetOptional<OrgHypercertsClaimMeasurement.Main, "$type" | "createdAt">,
  {
    /**
     * AT-URI of the subject being measured (activity, collection, etc.).
     * This will be converted to a StrongRef (uri + cid).
     * or if its a strong ref will be stored as is
     */
    subject: RefUri;

    /**
     * Geographic locations where the measurement was taken.
     * Can be StrongRefs, AT-URIs, or location objects.
     * if location objects; location records will be created and then stored as strong ref
     */
    locations?: LocationParams[];
  }
>;

/**
 * SDK input parameters for updating a measurement.
 * All fields are optional for partial/patch updates.
 *
 * Note: `subject` is excluded as it is immutable after creation.
 *
 * @example Updating a measurement's value
 * ```typescript
 * const updateParams: UpdateMeasurementParams = {
 *   value: "200",
 *   comment: "Updated measurement after re-verification",
 * };
 * ```
 *
 * @example Updating locations
 * ```typescript
 * const updateParams: UpdateMeasurementParams = {
 *   locations: [{ uri: "at://did:plc:.../app.certified.location/new", cid: "..." }],
 * };
 * ```
 */
export type UpdateMeasurementParams = Partial<Except<CreateMeasurementParams, "subject">>;

/**
 * Union type for referencing measurements in SDK methods.
 *
 * Accepts:
 * 1. **string** - AT-URI pointing to an existing measurement record
 * 2. **StrongRef** - Direct reference with uri and cid
 * 3. **CreateMeasurementParams** - Inline measurement object for creation
 *
 * @example Using an AT-URI
 * ```typescript
 * const measurement: MeasurementParams = "at://did:plc:abc/org.hypercerts.claim.measurement/xyz";
 * ```
 *
 * @example Using a StrongRef
 * ```typescript
 * const measurement: MeasurementParams = { uri: "at://...", cid: "bafyrei..." };
 * ```
 *
 * @example Using inline params
 * ```typescript
 * const measurement: MeasurementParams = {
 *   subject: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
 *   metric: "Carbon Offset",
 *   unit: "tons CO2e",
 *   value: "150",
 * };
 * ```
 */
export type MeasurementParams = RefUri | CreateMeasurementParams;

// ============================================================================
// Attachment Types
// ============================================================================

/**
 * SDK input parameters for creating an attachment.
 *
 * Attachments provide commentary, context, evidence, or documentary material
 * related to hypercert records.
 *
 * @remarks
 * Schema structure (beta.13+):
 * - `subjects` (array) - one or more subject records this attachment relates to
 * - `content` (required array) - one or more URIs or blob references
 * - `contentType` (optional) - type/category of the content
 * - `location` (optional) - associated geographic location
 * - Rich text facets support for descriptions
 *
 * Both `subjects` and `content` accept single values or arrays for convenience,
 * and will be normalized to arrays internally.
 *
 * @example Single subject with single content
 * ```typescript
 * const params: CreateAttachmentParams = {
 *   subjects: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
 *   content: "https://example.com/report.pdf",
 *   title: "Impact Report",
 *   contentType: "report"
 * };
 * ```
 *
 * @example Multiple subjects with mixed content
 * ```typescript
 * const params: CreateAttachmentParams = {
 *   subjects: [
 *     "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
 *     { uri: "at://...", cid: "..." }
 *   ],
 *   content: [
 *     "https://example.com/report.pdf",
 *     new Blob(["data"], { type: "application/pdf" })
 *   ],
 *   title: "Multi-source Evidence",
 *   location: { uri: "at://did:plc:.../app.certified.location/...", cid: "..." }
 * };
 * ```
 *
 * @example With rich text facets
 * ```typescript
 * const params: CreateAttachmentParams = {
 *   subjects: "at://did:plc:abc/org.hypercerts.claim.activity/xyz",
 *   content: "https://example.com/report.pdf",
 *   title: "Report",
 *   shortDescription: "Report by @alice",
 *   shortDescriptionFacets: [
 *     {
 *       index: { byteStart: 10, byteEnd: 16 },
 *       features: [{ $type: "app.bsky.richtext.facet#mention", did: "did:plc:alice" }]
 *     }
 *   ]
 * };
 * ```
 */
export type CreateAttachmentParams = OverrideProperties<
  SetOptional<HypercertAttachment, "$type" | "createdAt">,
  {
    /**
     * Subject(s) this attachment relates to.
     * Can be:
     * - Single AT-URI string (will fetch CID to create StrongRef)
     * - Single StrongRef (uri + cid)
     * - Array of AT-URIs or StrongRefs
     *
     * Will be normalized to an array of StrongRefs internally.
     */
    subjects: RefUri | RefUri[];

    /**
     * Content of the attachment.
     * Can be:
     * - Single URI string
     * - Single Blob (will be uploaded)
     * - Array of URIs and/or Blobs
     *
     * Will be normalized to an array internally.
     * This field is required.
     */
    content: string | Blob | Array<string | Blob>;

    /**
     * Optional location to attach.
     * Can be:
     * - StrongRef to reference existing location (uri + cid)
     * - string (AT-URI) to reference existing location (CID will be fetched)
     * - Location object to create a new location record
     */
    location?: LocationParams;
  }
>;

/**
 * SDK input parameters for updating an attachment.
 * All fields are optional for partial updates.
 */
export type UpdateAttachmentParams = Partial<CreateAttachmentParams>;

/**
 * Union type for specifying an attachment reference.
 * Can be:
 * - AT-URI string pointing to existing attachment
 * - StrongRef with uri and cid
 * - Full attachment params object to create new attachment
 */
export type AttachmentParams = RefUri | CreateAttachmentParams;

export type CreateCertifiedProfileParams = SetOptional<AppCertifiedActorProfile.Main, "createdAt" | "$type">;
