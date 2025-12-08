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
  BlobPermissionSchema,
  RpcPermissionSchema,
  IdentityPermissionSchema,
  IncludePermissionSchema,
  PermissionSchema,
  PermissionBuilder,
  ScopePresets,
  buildScope,
  parseScope,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  mergeScopes,
  removePermissions,
  validateScope,
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
    expect(() => NsidSchema.parse("InvalidNSID")).toThrow(); // Need at least one dot
    expect(() => NsidSchema.parse("example")).toThrow(); // Need at least one dot
    expect(() => NsidSchema.parse(".example.com")).toThrow(); // Can't start with dot
    expect(() => NsidSchema.parse("example.com.")).toThrow(); // Can't end with dot
    expect(() => NsidSchema.parse("example..com")).toThrow(); // No consecutive dots
    expect(() => NsidSchema.parse("")).toThrow(); // Empty string
    expect(() => NsidSchema.parse("123.example.com")).toThrow(); // Can't start with number
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

describe("BlobPermissionSchema", () => {
  it("should transform blob with single MIME type", () => {
    const input = { type: "blob" as const, mimeTypes: ["image/*"] };
    const result = BlobPermissionSchema.parse(input);
    expect(result).toBe("blob:image/*");
  });

  it("should transform blob with multiple MIME types", () => {
    const input = { type: "blob" as const, mimeTypes: ["image/*", "video/*"] };
    const result = BlobPermissionSchema.parse(input);
    expect(result).toBe("blob?accept=image%2F*&accept=video%2F*");
  });

  it("should transform blob with specific MIME types", () => {
    const input = { type: "blob" as const, mimeTypes: ["image/png", "image/jpeg", "video/mp4"] };
    const result = BlobPermissionSchema.parse(input);
    expect(result).toBe("blob?accept=image%2Fpng&accept=image%2Fjpeg&accept=video%2Fmp4");
  });

  it("should reject empty MIME types array", () => {
    const input = { type: "blob" as const, mimeTypes: [] };
    expect(() => BlobPermissionSchema.parse(input)).toThrow();
  });

  it("should reject invalid MIME type format", () => {
    const input = { type: "blob" as const, mimeTypes: ["invalid"] };
    expect(() => BlobPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing mimeTypes field", () => {
    const input = { type: "blob" as const };
    expect(() => BlobPermissionSchema.parse(input)).toThrow();
  });
});

describe("RpcPermissionSchema", () => {
  it("should transform RPC with specific lexicon and wildcard audience", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "com.atproto.repo.createRecord",
      aud: "*",
    };
    const result = RpcPermissionSchema.parse(input);
    expect(result).toBe("rpc:com.atproto.repo.createRecord?aud=*");
  });

  it("should transform RPC with specific audience (URL encoded)", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "com.atproto.repo.createRecord",
      aud: "did:web:api.example.com",
    };
    const result = RpcPermissionSchema.parse(input);
    expect(result).toBe("rpc:com.atproto.repo.createRecord?aud=did%3Aweb%3Aapi.example.com");
  });

  it("should transform RPC with inheritAud flag", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "com.atproto.repo.createRecord",
      aud: "*",
      inheritAud: true,
    };
    const result = RpcPermissionSchema.parse(input);
    expect(result).toBe("rpc:com.atproto.repo.createRecord?aud=*&inheritAud=true");
  });

  it("should transform RPC with wildcard lexicon and specific aud", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "*",
      aud: "did:web:api.example.com",
    };
    const result = RpcPermissionSchema.parse(input);
    expect(result).toBe("rpc:*?aud=did%3Aweb%3Aapi.example.com");
  });

  it("should reject both wildcards (refinement)", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "*",
      aud: "*",
    };
    expect(() => RpcPermissionSchema.parse(input)).toThrow();
  });

  it("should reject invalid lexicon format", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "InvalidLexicon",
      aud: "*",
    };
    expect(() => RpcPermissionSchema.parse(input)).toThrow();
  });

  it("should reject empty audience", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "com.atproto.repo.createRecord",
      aud: "",
    };
    expect(() => RpcPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing aud field", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "com.atproto.repo.createRecord",
    };
    expect(() => RpcPermissionSchema.parse(input)).toThrow();
  });
});

describe("IdentityPermissionSchema", () => {
  it("should transform identity:handle", () => {
    const input = { type: "identity" as const, attr: "handle" as const };
    const result = IdentityPermissionSchema.parse(input);
    expect(result).toBe("identity:handle");
  });

  it("should transform identity:* (wildcard)", () => {
    const input = { type: "identity" as const, attr: "*" as const };
    const result = IdentityPermissionSchema.parse(input);
    expect(result).toBe("identity:*");
  });

  it("should reject invalid attr values", () => {
    const input = { type: "identity" as const, attr: "invalid" };
    expect(() => IdentityPermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing attr field", () => {
    const input = { type: "identity" as const };
    expect(() => IdentityPermissionSchema.parse(input)).toThrow();
  });
});

describe("IncludePermissionSchema", () => {
  it("should transform include without audience", () => {
    const input = { type: "include" as const, nsid: "com.example.authBasicFeatures" };
    const result = IncludePermissionSchema.parse(input);
    expect(result).toBe("include:com.example.authBasicFeatures");
  });

  it("should transform include with audience (URL encoded)", () => {
    const input = {
      type: "include" as const,
      nsid: "com.example.authBasicFeatures",
      aud: "did:web:api.example.com",
    };
    const result = IncludePermissionSchema.parse(input);
    expect(result).toBe("include:com.example.authBasicFeatures?aud=did%3Aweb%3Aapi.example.com");
  });

  it("should reject invalid NSID format", () => {
    const input = { type: "include" as const, nsid: "InvalidNSID" };
    expect(() => IncludePermissionSchema.parse(input)).toThrow();
  });

  it("should reject missing nsid field", () => {
    const input = { type: "include" as const };
    expect(() => IncludePermissionSchema.parse(input)).toThrow();
  });
});

describe("PermissionSchema (Union)", () => {
  it("should accept account permission", () => {
    const input = { type: "account" as const, attr: "email" as const };
    const result = PermissionSchema.parse(input);
    expect(result).toBe("account:email");
  });

  it("should accept repo permission", () => {
    const input = { type: "repo" as const, collection: "app.bsky.feed.post" };
    const result = PermissionSchema.parse(input);
    expect(result).toBe("repo:app.bsky.feed.post");
  });

  it("should accept blob permission", () => {
    const input = { type: "blob" as const, mimeTypes: ["image/*"] };
    const result = PermissionSchema.parse(input);
    expect(result).toBe("blob:image/*");
  });

  it("should accept RPC permission", () => {
    const input = {
      type: "rpc" as const,
      lexicon: "com.atproto.repo.createRecord",
      aud: "*",
    };
    const result = PermissionSchema.parse(input);
    expect(result).toBe("rpc:com.atproto.repo.createRecord?aud=*");
  });

  it("should accept identity permission", () => {
    const input = { type: "identity" as const, attr: "handle" as const };
    const result = PermissionSchema.parse(input);
    expect(result).toBe("identity:handle");
  });

  it("should accept include permission", () => {
    const input = { type: "include" as const, nsid: "com.example.authBasicFeatures" };
    const result = PermissionSchema.parse(input);
    expect(result).toBe("include:com.example.authBasicFeatures");
  });

  it("should reject invalid permission type", () => {
    const input = { type: "invalid" };
    expect(() => PermissionSchema.parse(input)).toThrow();
  });
});

describe("PermissionBuilder", () => {
  describe("Transitional Scopes", () => {
    it("should add transitional scopes", () => {
      const builder = new PermissionBuilder();
      builder.transition("email").transition("generic");
      const result = builder.build();
      expect(result).toEqual(["transition:email", "transition:generic"]);
    });

    it("should validate transitional scope values", () => {
      const builder = new PermissionBuilder();
      expect(() => builder.transition("invalid" as "email")).toThrow();
    });
  });

  describe("Account Permissions", () => {
    it("should add account:email without action", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail();
      expect(builder.build()).toEqual(["account:email"]);
    });

    it("should add account:email with read action", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read");
      expect(builder.build()).toEqual(["account:email?action=read"]);
    });

    it("should add account:email with manage action", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("manage");
      expect(builder.build()).toEqual(["account:email?action=manage"]);
    });

    it("should add account:repo without action", () => {
      const builder = new PermissionBuilder();
      builder.accountRepo();
      expect(builder.build()).toEqual(["account:repo"]);
    });

    it("should add account:repo with manage action", () => {
      const builder = new PermissionBuilder();
      builder.accountRepo("manage");
      expect(builder.build()).toEqual(["account:repo?action=manage"]);
    });

    it("should use generic account() method", () => {
      const builder = new PermissionBuilder();
      builder.account("email", "read").account("repo", "manage");
      expect(builder.build()).toEqual(["account:email?action=read", "account:repo?action=manage"]);
    });
  });

  describe("Repository Permissions", () => {
    it("should add repo read permission (no actions)", () => {
      const builder = new PermissionBuilder();
      builder.repoRead("app.bsky.feed.post");
      expect(builder.build()).toEqual(["repo:app.bsky.feed.post"]);
    });

    it("should add repo write permission (create + update)", () => {
      const builder = new PermissionBuilder();
      builder.repoWrite("app.bsky.feed.post");
      expect(builder.build()).toEqual(["repo:app.bsky.feed.post?action=create&action=update"]);
    });

    it("should add repo full permission (create + update + delete)", () => {
      const builder = new PermissionBuilder();
      builder.repoFull("app.bsky.feed.post");
      expect(builder.build()).toEqual(["repo:app.bsky.feed.post?action=create&action=update&action=delete"]);
    });

    it("should add repo with custom actions", () => {
      const builder = new PermissionBuilder();
      builder.repo("app.bsky.feed.post", ["create", "delete"]);
      expect(builder.build()).toEqual(["repo:app.bsky.feed.post?action=create&action=delete"]);
    });

    it("should add repo with wildcard collection", () => {
      const builder = new PermissionBuilder();
      builder.repoWrite("*");
      expect(builder.build()).toEqual(["repo:*?action=create&action=update"]);
    });
  });

  describe("Blob Permissions", () => {
    it("should add blob with single MIME type", () => {
      const builder = new PermissionBuilder();
      builder.blob("image/*");
      expect(builder.build()).toEqual(["blob:image/*"]);
    });

    it("should add blob with multiple MIME types", () => {
      const builder = new PermissionBuilder();
      builder.blob(["image/*", "video/*"]);
      expect(builder.build()).toEqual(["blob?accept=image%2F*&accept=video%2F*"]);
    });

    it("should add blob with specific MIME types", () => {
      const builder = new PermissionBuilder();
      builder.blob(["image/png", "image/jpeg", "video/mp4"]);
      expect(builder.build()).toEqual(["blob?accept=image%2Fpng&accept=image%2Fjpeg&accept=video%2Fmp4"]);
    });
  });

  describe("RPC Permissions", () => {
    it("should add RPC with specific lexicon and wildcard aud", () => {
      const builder = new PermissionBuilder();
      builder.rpc("com.atproto.repo.createRecord", "*");
      expect(builder.build()).toEqual(["rpc:com.atproto.repo.createRecord?aud=*"]);
    });

    it("should add RPC with specific lexicon and specific aud", () => {
      const builder = new PermissionBuilder();
      builder.rpc("com.atproto.repo.createRecord", "did:web:api.example.com");
      expect(builder.build()).toEqual(["rpc:com.atproto.repo.createRecord?aud=did%3Aweb%3Aapi.example.com"]);
    });

    it("should add RPC with inheritAud flag", () => {
      const builder = new PermissionBuilder();
      builder.rpc("com.atproto.repo.createRecord", "did:web:api.example.com", true);
      expect(builder.build()).toEqual([
        "rpc:com.atproto.repo.createRecord?aud=did%3Aweb%3Aapi.example.com&inheritAud=true",
      ]);
    });

    it("should add RPC with wildcard lexicon", () => {
      const builder = new PermissionBuilder();
      builder.rpc("*", "did:web:api.example.com");
      expect(builder.build()).toEqual(["rpc:*?aud=did%3Aweb%3Aapi.example.com"]);
    });

    it("should reject both wildcards", () => {
      const builder = new PermissionBuilder();
      expect(() => builder.rpc("*", "*")).toThrow();
    });
  });

  describe("Identity Permissions", () => {
    it("should add identity:handle permission", () => {
      const builder = new PermissionBuilder();
      builder.identity("handle");
      expect(builder.build()).toEqual(["identity:handle"]);
    });

    it("should add identity:* permission", () => {
      const builder = new PermissionBuilder();
      builder.identity("*");
      expect(builder.build()).toEqual(["identity:*"]);
    });
  });

  describe("Include Permissions", () => {
    it("should add include without audience", () => {
      const builder = new PermissionBuilder();
      builder.include("com.example.authBasicFeatures");
      expect(builder.build()).toEqual(["include:com.example.authBasicFeatures"]);
    });

    it("should add include with audience", () => {
      const builder = new PermissionBuilder();
      builder.include("com.example.authBasicFeatures", "did:web:api.example.com");
      expect(builder.build()).toEqual(["include:com.example.authBasicFeatures?aud=did%3Aweb%3Aapi.example.com"]);
    });
  });

  describe("Custom and Special Permissions", () => {
    it("should add custom permission string", () => {
      const builder = new PermissionBuilder();
      builder.custom("custom:permission");
      expect(builder.build()).toEqual(["custom:permission"]);
    });

    it("should add atproto scope", () => {
      const builder = new PermissionBuilder();
      builder.atproto();
      expect(builder.build()).toEqual(["atproto"]);
    });
  });

  describe("Builder Methods", () => {
    it("should support method chaining", () => {
      const builder = new PermissionBuilder();
      const result = builder
        .accountEmail("read")
        .repoWrite("app.bsky.feed.post")
        .blob("image/*")
        .identity("handle")
        .build();

      expect(result).toEqual([
        "account:email?action=read",
        "repo:app.bsky.feed.post?action=create&action=update",
        "blob:image/*",
        "identity:handle",
      ]);
    });

    it("should count permissions", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read").repoWrite("app.bsky.feed.post");
      expect(builder.count()).toBe(2);
    });

    it("should clear permissions", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read").repoWrite("app.bsky.feed.post");
      expect(builder.count()).toBe(2);
      builder.clear();
      expect(builder.count()).toBe(0);
      expect(builder.build()).toEqual([]);
    });

    it("should return a copy of permissions array (immutable)", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read");
      const result1 = builder.build();
      const result2 = builder.build();

      expect(result1).toEqual(result2);
      expect(result1).not.toBe(result2); // Different array instances
    });

    it("should allow reuse after clear", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read");
      expect(builder.build()).toEqual(["account:email?action=read"]);

      builder.clear().repoWrite("app.bsky.feed.post");
      expect(builder.build()).toEqual(["repo:app.bsky.feed.post?action=create&action=update"]);
    });
  });

  describe("Complex Scenarios", () => {
    it("should build email access scope set", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read").repoRead("app.bsky.actor.profile");

      expect(builder.build()).toEqual(["account:email?action=read", "repo:app.bsky.actor.profile"]);
    });

    it("should build posting app scope set", () => {
      const builder = new PermissionBuilder();
      builder
        .repoWrite("app.bsky.feed.post")
        .repoWrite("app.bsky.feed.like")
        .repoWrite("app.bsky.feed.repost")
        .blob(["image/*", "video/*"]);

      expect(builder.build()).toEqual([
        "repo:app.bsky.feed.post?action=create&action=update",
        "repo:app.bsky.feed.like?action=create&action=update",
        "repo:app.bsky.feed.repost?action=create&action=update",
        "blob?accept=image%2F*&accept=video%2F*",
      ]);
    });

    it("should build moderation app scope set", () => {
      const builder = new PermissionBuilder();
      builder.repoFull("*").identity("handle");

      expect(builder.build()).toEqual(["repo:*?action=create&action=update&action=delete", "identity:handle"]);
    });

    it("should combine transitional and granular scopes", () => {
      const builder = new PermissionBuilder();
      builder.transition("email").accountEmail("read").repoRead("app.bsky.actor.profile");

      expect(builder.build()).toEqual(["transition:email", "account:email?action=read", "repo:app.bsky.actor.profile"]);
    });
  });
});

describe("Scope Utility Functions", () => {
  describe("buildScope", () => {
    it("should join permissions with spaces", () => {
      const permissions = ["account:email?action=read", "repo:app.bsky.feed.post"];
      const scope = buildScope(permissions);
      expect(scope).toBe("account:email?action=read repo:app.bsky.feed.post");
    });

    it("should handle single permission", () => {
      const permissions = ["account:email"];
      const scope = buildScope(permissions);
      expect(scope).toBe("account:email");
    });

    it("should handle empty array", () => {
      const permissions: string[] = [];
      const scope = buildScope(permissions);
      expect(scope).toBe("");
    });

    it("should handle complex permissions with query params", () => {
      const permissions = [
        "account:email?action=read",
        "repo:app.bsky.feed.post?action=create&action=update",
        "blob?accept=image%2F*&accept=video%2F*",
      ];
      const scope = buildScope(permissions);
      expect(scope).toBe(
        "account:email?action=read repo:app.bsky.feed.post?action=create&action=update blob?accept=image%2F*&accept=video%2F*",
      );
    });
  });

  describe("parseScope", () => {
    it("should split scope string by spaces", () => {
      const scope = "account:email?action=read repo:app.bsky.feed.post";
      const permissions = parseScope(scope);
      expect(permissions).toEqual(["account:email?action=read", "repo:app.bsky.feed.post"]);
    });

    it("should handle single permission", () => {
      const scope = "account:email";
      const permissions = parseScope(scope);
      expect(permissions).toEqual(["account:email"]);
    });

    it("should handle empty string", () => {
      const scope = "";
      const permissions = parseScope(scope);
      expect(permissions).toEqual([]);
    });

    it("should handle multiple spaces between permissions", () => {
      const scope = "account:email   repo:app.bsky.feed.post";
      const permissions = parseScope(scope);
      expect(permissions).toEqual(["account:email", "repo:app.bsky.feed.post"]);
    });

    it("should trim whitespace", () => {
      const scope = "  account:email repo:app.bsky.feed.post  ";
      const permissions = parseScope(scope);
      expect(permissions).toEqual(["account:email", "repo:app.bsky.feed.post"]);
    });
  });

  describe("hasPermission", () => {
    const scope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";

    it("should return true when permission exists", () => {
      expect(hasPermission(scope, "account:email?action=read")).toBe(true);
      expect(hasPermission(scope, "repo:app.bsky.feed.post")).toBe(true);
      expect(hasPermission(scope, "blob:image/*")).toBe(true);
    });

    it("should return false when permission does not exist", () => {
      expect(hasPermission(scope, "account:repo")).toBe(false);
      expect(hasPermission(scope, "identity:handle")).toBe(false);
    });

    it("should perform exact matching", () => {
      expect(hasPermission(scope, "account:email")).toBe(false);
      expect(hasPermission(scope, "blob:video/*")).toBe(false);
    });

    it("should handle empty scope", () => {
      expect(hasPermission("", "account:email")).toBe(false);
    });
  });

  describe("hasAllPermissions", () => {
    const scope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";

    it("should return true when all permissions exist", () => {
      expect(hasAllPermissions(scope, ["account:email?action=read", "blob:image/*"])).toBe(true);
      expect(hasAllPermissions(scope, ["account:email?action=read", "repo:app.bsky.feed.post"])).toBe(true);
    });

    it("should return false when any permission is missing", () => {
      expect(hasAllPermissions(scope, ["account:email?action=read", "account:repo"])).toBe(false);
      expect(hasAllPermissions(scope, ["identity:handle"])).toBe(false);
    });

    it("should handle empty required permissions array", () => {
      expect(hasAllPermissions(scope, [])).toBe(true);
    });

    it("should handle empty scope", () => {
      expect(hasAllPermissions("", ["account:email"])).toBe(false);
    });
  });

  describe("hasAnyPermission", () => {
    const scope = "account:email?action=read repo:app.bsky.feed.post";

    it("should return true when at least one permission exists", () => {
      expect(hasAnyPermission(scope, ["account:email?action=read", "account:repo"])).toBe(true);
      expect(hasAnyPermission(scope, ["identity:handle", "repo:app.bsky.feed.post"])).toBe(true);
    });

    it("should return false when no permissions exist", () => {
      expect(hasAnyPermission(scope, ["account:repo", "identity:handle"])).toBe(false);
      expect(hasAnyPermission(scope, ["blob:image/*"])).toBe(false);
    });

    it("should handle empty check permissions array", () => {
      expect(hasAnyPermission(scope, [])).toBe(false);
    });

    it("should handle empty scope", () => {
      expect(hasAnyPermission("", ["account:email"])).toBe(false);
    });
  });

  describe("mergeScopes", () => {
    it("should merge multiple scopes and deduplicate", () => {
      const scope1 = "account:email?action=read repo:app.bsky.feed.post";
      const scope2 = "repo:app.bsky.feed.post blob:image/*";
      const merged = mergeScopes([scope1, scope2]);

      const permissions = parseScope(merged);
      expect(permissions).toHaveLength(3);
      expect(permissions).toContain("account:email?action=read");
      expect(permissions).toContain("repo:app.bsky.feed.post");
      expect(permissions).toContain("blob:image/*");
    });

    it("should handle empty scopes array", () => {
      const merged = mergeScopes([]);
      expect(merged).toBe("");
    });

    it("should handle single scope", () => {
      const scope = "account:email repo:app.bsky.feed.post";
      const merged = mergeScopes([scope]);
      expect(merged).toBe(scope);
    });

    it("should deduplicate permissions across multiple scopes", () => {
      const scope1 = "account:email";
      const scope2 = "account:email repo:app.bsky.feed.post";
      const scope3 = "account:email";
      const merged = mergeScopes([scope1, scope2, scope3]);

      const permissions = parseScope(merged);
      expect(permissions).toHaveLength(2);
      expect(permissions).toContain("account:email");
      expect(permissions).toContain("repo:app.bsky.feed.post");
    });
  });

  describe("removePermissions", () => {
    const scope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";

    it("should remove specified permissions", () => {
      const filtered = removePermissions(scope, ["blob:image/*"]);
      expect(filtered).toBe("account:email?action=read repo:app.bsky.feed.post");
    });

    it("should remove multiple permissions", () => {
      const filtered = removePermissions(scope, ["account:email?action=read", "blob:image/*"]);
      expect(filtered).toBe("repo:app.bsky.feed.post");
    });

    it("should handle removing non-existent permissions", () => {
      const filtered = removePermissions(scope, ["account:repo"]);
      expect(filtered).toBe(scope);
    });

    it("should handle empty removal array", () => {
      const filtered = removePermissions(scope, []);
      expect(filtered).toBe(scope);
    });

    it("should handle removing all permissions", () => {
      const filtered = removePermissions(scope, [
        "account:email?action=read",
        "repo:app.bsky.feed.post",
        "blob:image/*",
      ]);
      expect(filtered).toBe("");
    });
  });

  describe("validateScope", () => {
    it("should validate well-formed scopes", () => {
      const scope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";
      const result = validateScope(scope);
      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });

    it("should validate transitional scopes", () => {
      const scope = "transition:email transition:generic";
      const result = validateScope(scope);
      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });

    it("should validate atproto scope", () => {
      const scope = "atproto";
      const result = validateScope(scope);
      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });

    it("should detect invalid permission prefixes", () => {
      const scope = "account:email invalid:permission another:bad";
      const result = validateScope(scope);
      expect(result.isValid).toBe(false);
      expect(result.invalidPermissions).toEqual(["invalid:permission", "another:bad"]);
    });

    it("should detect malformed permissions", () => {
      const scope = "account:email malformed";
      const result = validateScope(scope);
      expect(result.isValid).toBe(false);
      expect(result.invalidPermissions).toEqual(["malformed"]);
    });

    it("should handle empty scope", () => {
      const scope = "";
      const result = validateScope(scope);
      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });

    it("should validate blob permissions with and without colon", () => {
      const scope1 = "blob:image/*";
      const scope2 = "blob?accept=image%2F*";
      expect(validateScope(scope1).isValid).toBe(true);
      expect(validateScope(scope2).isValid).toBe(true);
    });

    it("should validate all permission types", () => {
      const scope =
        "atproto transition:email account:email repo:* blob:image/* rpc:* identity:handle include:com.example.scope";
      const result = validateScope(scope);
      expect(result.isValid).toBe(true);
      expect(result.invalidPermissions).toEqual([]);
    });
  });

  describe("Integration: Builder with Utilities", () => {
    it("should work with PermissionBuilder output", () => {
      const builder = new PermissionBuilder();
      builder.accountEmail("read").repoWrite("app.bsky.feed.post").blob("image/*");

      const permissions = builder.build();
      const scope = buildScope(permissions);

      expect(hasPermission(scope, "account:email?action=read")).toBe(true);
      expect(hasPermission(scope, "repo:app.bsky.feed.post?action=create&action=update")).toBe(true);
      expect(hasPermission(scope, "blob:image/*")).toBe(true);
    });

    it("should parse and rebuild scope correctly", () => {
      const originalScope = "account:email?action=read repo:app.bsky.feed.post blob:image/*";
      const parsed = parseScope(originalScope);
      const rebuilt = buildScope(parsed);

      expect(rebuilt).toBe(originalScope);
    });

    it("should merge builder outputs", () => {
      const builder1 = new PermissionBuilder();
      builder1.accountEmail("read");

      const builder2 = new PermissionBuilder();
      builder2.repoWrite("app.bsky.feed.post");

      const scope1 = buildScope(builder1.build());
      const scope2 = buildScope(builder2.build());
      const merged = mergeScopes([scope1, scope2]);

      expect(hasPermission(merged, "account:email?action=read")).toBe(true);
      expect(hasPermission(merged, "repo:app.bsky.feed.post?action=create&action=update")).toBe(true);
    });
  });
});

describe("ScopePresets", () => {
  describe("Basic Presets", () => {
    it("should provide EMAIL_READ preset", () => {
      expect(ScopePresets.EMAIL_READ).toBe("account:email?action=read");
    });

    it("should provide PROFILE_READ preset", () => {
      expect(ScopePresets.PROFILE_READ).toBe("repo:app.bsky.actor.profile");
    });

    it("should provide PROFILE_WRITE preset", () => {
      expect(ScopePresets.PROFILE_WRITE).toBe("repo:app.bsky.actor.profile?action=create&action=update");
    });

    it("should provide POST_WRITE preset", () => {
      expect(ScopePresets.POST_WRITE).toBe("repo:app.bsky.feed.post?action=create&action=update");
    });

    it("should provide IMAGE_UPLOAD preset", () => {
      expect(ScopePresets.IMAGE_UPLOAD).toBe("blob:image/*");
    });

    it("should provide MEDIA_UPLOAD preset", () => {
      expect(ScopePresets.MEDIA_UPLOAD).toBe("blob?accept=image%2F*&accept=video%2F*");
    });
  });

  describe("Complex Presets", () => {
    it("should provide SOCIAL_WRITE preset", () => {
      const permissions = parseScope(ScopePresets.SOCIAL_WRITE);
      expect(permissions).toHaveLength(3);
      expect(permissions).toContain("repo:app.bsky.feed.like?action=create&action=update");
      expect(permissions).toContain("repo:app.bsky.feed.repost?action=create&action=update");
      expect(permissions).toContain("repo:app.bsky.graph.follow?action=create&action=update");
    });

    it("should provide POSTING_APP preset", () => {
      const permissions = parseScope(ScopePresets.POSTING_APP);
      expect(permissions).toHaveLength(4);
      expect(permissions).toContain("repo:app.bsky.feed.post?action=create&action=update");
      expect(permissions).toContain("repo:app.bsky.feed.like?action=create&action=update");
      expect(permissions).toContain("repo:app.bsky.feed.repost?action=create&action=update");
      expect(permissions).toContain("blob?accept=image%2F*&accept=video%2F*");
    });

    it("should provide EMAIL_AND_PROFILE preset", () => {
      const permissions = parseScope(ScopePresets.EMAIL_AND_PROFILE);
      expect(permissions).toHaveLength(2);
      expect(permissions).toContain("account:email?action=read");
      expect(permissions).toContain("repo:app.bsky.actor.profile");
    });
  });

  describe("Access Level Presets", () => {
    it("should provide READ_ONLY preset", () => {
      expect(ScopePresets.READ_ONLY).toBe("repo:*");
    });

    it("should provide FULL_ACCESS preset", () => {
      expect(ScopePresets.FULL_ACCESS).toBe("repo:*?action=create&action=update&action=delete");
    });
  });

  describe("Transitional Presets", () => {
    it("should provide TRANSITION_EMAIL preset", () => {
      expect(ScopePresets.TRANSITION_EMAIL).toBe("transition:email");
    });

    it("should provide TRANSITION_GENERIC preset", () => {
      expect(ScopePresets.TRANSITION_GENERIC).toBe("transition:generic");
    });
  });

  describe("Preset Usage", () => {
    it("should work with parseScope", () => {
      const permissions = parseScope(ScopePresets.POSTING_APP);
      expect(permissions.length).toBeGreaterThan(0);
    });

    it("should work with hasPermission", () => {
      expect(hasPermission(ScopePresets.EMAIL_READ, "account:email?action=read")).toBe(true);
      expect(hasPermission(ScopePresets.EMAIL_READ, "account:repo")).toBe(false);
    });

    it("should work with mergeScopes", () => {
      const merged = mergeScopes([ScopePresets.EMAIL_READ, ScopePresets.POST_WRITE]);
      expect(hasPermission(merged, "account:email?action=read")).toBe(true);
      expect(hasPermission(merged, "repo:app.bsky.feed.post?action=create&action=update")).toBe(true);
    });

    it("should be valid scopes", () => {
      expect(validateScope(ScopePresets.EMAIL_READ).isValid).toBe(true);
      expect(validateScope(ScopePresets.POSTING_APP).isValid).toBe(true);
      expect(validateScope(ScopePresets.FULL_ACCESS).isValid).toBe(true);
      expect(validateScope(ScopePresets.TRANSITION_EMAIL).isValid).toBe(true);
    });
  });

  describe("Preset Immutability", () => {
    it("should be readonly (const assertion)", () => {
      expect(typeof ScopePresets.EMAIL_READ).toBe("string");
      expect(typeof ScopePresets.POSTING_APP).toBe("string");
    });
  });
});
