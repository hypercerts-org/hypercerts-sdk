import { describe, it, expect } from "vitest";
import {
  ATPROTO_SCOPE,
  TRANSITION_SCOPES,
  TransitionScopeSchema,
  AccountAttrSchema,
  AccountActionSchema,
  RepoActionSchema,
  IdentityAttrSchema,
  MimeTypeSchema,
  NsidSchema,
  AccountPermissionSchema,
  RepoPermissionSchema,
} from "../../src/auth/permissions.js";

describe("Permission Constants", () => {
  it("should export ATPROTO_SCOPE constant", () => {
    expect(ATPROTO_SCOPE).toBe("atproto");
  });

  it("should export TRANSITION_SCOPES with correct values", () => {
    expect(TRANSITION_SCOPES.GENERIC).toBe("transition:generic");
    expect(TRANSITION_SCOPES.CHAT).toBe("transition:chat.bsky");
    expect(TRANSITION_SCOPES.EMAIL).toBe("transition:email");
  });
});

describe("TransitionScopeSchema", () => {
  it("should accept valid transitional scopes", () => {
    expect(TransitionScopeSchema.parse("transition:generic")).toBe("transition:generic");
    expect(TransitionScopeSchema.parse("transition:chat.bsky")).toBe("transition:chat.bsky");
    expect(TransitionScopeSchema.parse("transition:email")).toBe("transition:email");
  });

  it("should reject invalid transitional scopes", () => {
    expect(() => TransitionScopeSchema.parse("atproto")).toThrow();
    expect(() => TransitionScopeSchema.parse("transition:invalid")).toThrow();
    expect(() => TransitionScopeSchema.parse("invalid")).toThrow();
    expect(() => TransitionScopeSchema.parse("")).toThrow();
  });
});

describe("AccountAttrSchema", () => {
  it("should accept valid account attributes", () => {
    expect(AccountAttrSchema.parse("email")).toBe("email");
    expect(AccountAttrSchema.parse("repo")).toBe("repo");
  });

  it("should reject invalid account attributes", () => {
    expect(() => AccountAttrSchema.parse("invalid")).toThrow();
    expect(() => AccountAttrSchema.parse("handle")).toThrow();
    expect(() => AccountAttrSchema.parse("")).toThrow();
  });
});

describe("AccountActionSchema", () => {
  it("should accept valid account actions", () => {
    expect(AccountActionSchema.parse("read")).toBe("read");
    expect(AccountActionSchema.parse("manage")).toBe("manage");
  });

  it("should reject invalid account actions", () => {
    expect(() => AccountActionSchema.parse("create")).toThrow();
    expect(() => AccountActionSchema.parse("delete")).toThrow();
    expect(() => AccountActionSchema.parse("invalid")).toThrow();
    expect(() => AccountActionSchema.parse("")).toThrow();
  });
});

describe("RepoActionSchema", () => {
  it("should accept valid repository actions", () => {
    expect(RepoActionSchema.parse("create")).toBe("create");
    expect(RepoActionSchema.parse("update")).toBe("update");
    expect(RepoActionSchema.parse("delete")).toBe("delete");
  });

  it("should reject invalid repository actions", () => {
    expect(() => RepoActionSchema.parse("read")).toThrow();
    expect(() => RepoActionSchema.parse("manage")).toThrow();
    expect(() => RepoActionSchema.parse("invalid")).toThrow();
    expect(() => RepoActionSchema.parse("")).toThrow();
  });
});

describe("IdentityAttrSchema", () => {
  it("should accept valid identity attributes", () => {
    expect(IdentityAttrSchema.parse("handle")).toBe("handle");
    expect(IdentityAttrSchema.parse("*")).toBe("*");
  });

  it("should reject invalid identity attributes", () => {
    expect(() => IdentityAttrSchema.parse("email")).toThrow();
    expect(() => IdentityAttrSchema.parse("repo")).toThrow();
    expect(() => IdentityAttrSchema.parse("invalid")).toThrow();
    expect(() => IdentityAttrSchema.parse("")).toThrow();
  });
});

describe("MimeTypeSchema", () => {
  it("should accept valid MIME type patterns", () => {
    expect(MimeTypeSchema.parse("image/*")).toBe("image/*");
    expect(MimeTypeSchema.parse("video/*")).toBe("video/*");
    expect(MimeTypeSchema.parse("audio/*")).toBe("audio/*");
    expect(MimeTypeSchema.parse("text/html")).toBe("text/html");
    expect(MimeTypeSchema.parse("application/json")).toBe("application/json");
    expect(MimeTypeSchema.parse("image/png")).toBe("image/png");
    expect(MimeTypeSchema.parse("video/mp4")).toBe("video/mp4");
  });

  it("should accept MIME types with numbers and hyphens", () => {
    expect(MimeTypeSchema.parse("application/json-ld")).toBe("application/json-ld");
    expect(MimeTypeSchema.parse("application/ld+json")).toBe("application/ld+json");
    expect(MimeTypeSchema.parse("image/svg+xml")).toBe("image/svg+xml");
  });

  it("should reject invalid MIME type patterns", () => {
    expect(() => MimeTypeSchema.parse("invalid")).toThrow();
    expect(() => MimeTypeSchema.parse("image")).toThrow();
    expect(() => MimeTypeSchema.parse("/png")).toThrow();
    expect(() => MimeTypeSchema.parse("image/")).toThrow();
    expect(() => MimeTypeSchema.parse("")).toThrow();
  });

  it("should accept MIME types in any case (case-insensitive)", () => {
    // MIME types are case-insensitive per RFC 2045
    expect(MimeTypeSchema.parse("IMAGE/*")).toBe("IMAGE/*");
    expect(MimeTypeSchema.parse("Image/Png")).toBe("Image/Png");
  });

  it("should provide helpful error message for invalid MIME types", () => {
    try {
      MimeTypeSchema.parse("invalid");
      expect.fail("Should have thrown");
    } catch (error) {
      const zodError = error as { issues: Array<{ message: string }> };
      expect(zodError.issues[0].message).toContain("Invalid MIME type pattern");
      expect(zodError.issues[0].message).toContain("type/subtype");
    }
  });
});

describe("NsidSchema", () => {
  it("should accept valid NSID formats", () => {
    expect(NsidSchema.parse("app.bsky.feed.post")).toBe("app.bsky.feed.post");
    expect(NsidSchema.parse("com.example.myrecord")).toBe("com.example.myrecord");
    expect(NsidSchema.parse("org.example.test.nested.record")).toBe("org.example.test.nested.record");
  });

  it("should accept NSIDs with hyphens", () => {
    expect(NsidSchema.parse("com.example-app.record")).toBe("com.example-app.record");
    expect(NsidSchema.parse("app.my-test.record")).toBe("app.my-test.record");
  });

  it("should reject invalid NSID formats", () => {
    expect(() => NsidSchema.parse("InvalidNSID")).toThrow();
    expect(() => NsidSchema.parse("example")).toThrow(); // Need at least one dot
    expect(() => NsidSchema.parse(".example.com")).toThrow(); // Can't start with dot
    expect(() => NsidSchema.parse("example.com.")).toThrow(); // Can't end with dot
    expect(() => NsidSchema.parse("Example.com")).toThrow(); // Must be lowercase
    expect(() => NsidSchema.parse("example..com")).toThrow(); // No consecutive dots
    expect(() => NsidSchema.parse("")).toThrow();
  });

  it("should provide helpful error message for invalid NSIDs", () => {
    try {
      NsidSchema.parse("InvalidNSID");
      expect.fail("Should have thrown");
    } catch (error) {
      const zodError = error as { issues: Array<{ message: string }> };
      expect(zodError.issues[0].message).toContain("Invalid NSID format");
      expect(zodError.issues[0].message).toContain("reverse-DNS");
    }
  });
});

describe("AccountPermissionSchema", () => {
  it("should transform account:email without action", () => {
    const input = { type: "account" as const, attr: "email" as const };
    const result = AccountPermissionSchema.parse(input);
    expect(result).toBe("account:email");
  });

  it("should transform account:email with read action", () => {
    const input = { type: "account" as const, attr: "email" as const, action: "read" as const };
    const result = AccountPermissionSchema.parse(input);
    expect(result).toBe("account:email?action=read");
  });

  it("should transform account:email with manage action", () => {
    const input = { type: "account" as const, attr: "email" as const, action: "manage" as const };
    const result = AccountPermissionSchema.parse(input);
    expect(result).toBe("account:email?action=manage");
  });

  it("should transform account:repo without action", () => {
    const input = { type: "account" as const, attr: "repo" as const };
    const result = AccountPermissionSchema.parse(input);
    expect(result).toBe("account:repo");
  });

  it("should transform account:repo with manage action", () => {
    const input = { type: "account" as const, attr: "repo" as const, action: "manage" as const };
    const result = AccountPermissionSchema.parse(input);
    expect(result).toBe("account:repo?action=manage");
  });

  it("should reject invalid attr values", () => {
    const input = { type: "account" as const, attr: "invalid" };
    expect(() => AccountPermissionSchema.parse(input)).toThrow();
  });

  it("should reject invalid action values", () => {
    const input = { type: "account" as const, attr: "email" as const, action: "delete" };
    expect(() => AccountPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing type field", () => {
    const input = { attr: "email" as const };
    expect(() => AccountPermissionSchema.parse(input)).toThrow();
  });

  it("should reject wrong type value", () => {
    const input = { type: "repo", attr: "email" as const };
    expect(() => AccountPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing attr field", () => {
    const input = { type: "account" as const };
    expect(() => AccountPermissionSchema.parse(input)).toThrow();
  });
});

describe("RepoPermissionSchema", () => {
  it("should transform repo with NSID collection without actions", () => {
    const input = { type: "repo" as const, collection: "app.bsky.feed.post" };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:app.bsky.feed.post");
  });

  it("should transform repo with wildcard collection", () => {
    const input = { type: "repo" as const, collection: "*" };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:*");
  });

  it("should transform repo with single action", () => {
    const input = {
      type: "repo" as const,
      collection: "app.bsky.feed.post",
      actions: ["create" as const],
    };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:app.bsky.feed.post?action=create");
  });

  it("should transform repo with multiple actions", () => {
    const input = {
      type: "repo" as const,
      collection: "app.bsky.feed.post",
      actions: ["create" as const, "update" as const],
    };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:app.bsky.feed.post?action=create&action=update");
  });

  it("should transform repo with all three actions", () => {
    const input = {
      type: "repo" as const,
      collection: "com.example.record",
      actions: ["create" as const, "update" as const, "delete" as const],
    };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:com.example.record?action=create&action=update&action=delete");
  });

  it("should transform repo with wildcard and delete action", () => {
    const input = {
      type: "repo" as const,
      collection: "*",
      actions: ["delete" as const],
    };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:*?action=delete");
  });

  it("should handle empty actions array (no query params)", () => {
    const input = {
      type: "repo" as const,
      collection: "app.bsky.feed.post",
      actions: [],
    };
    const result = RepoPermissionSchema.parse(input);
    expect(result).toBe("repo:app.bsky.feed.post");
  });

  it("should reject invalid NSID format", () => {
    const input = { type: "repo" as const, collection: "InvalidNSID" };
    expect(() => RepoPermissionSchema.parse(input)).toThrow();
  });

  it("should reject invalid action values", () => {
    const input = {
      type: "repo" as const,
      collection: "app.bsky.feed.post",
      actions: ["invalid"],
    };
    expect(() => RepoPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing type field", () => {
    const input = { collection: "app.bsky.feed.post" };
    expect(() => RepoPermissionSchema.parse(input)).toThrow();
  });

  it("should reject wrong type value", () => {
    const input = { type: "account", collection: "app.bsky.feed.post" };
    expect(() => RepoPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing collection field", () => {
    const input = { type: "repo" as const };
    expect(() => RepoPermissionSchema.parse(input)).toThrow();
  });
});
