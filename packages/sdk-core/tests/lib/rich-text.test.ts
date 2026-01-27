import { describe, it, expect } from "vitest";
import { createFacetsFromText, createFacetsFromTextSync, RichText } from "../../src/lib/rich-text.js";

describe("Rich Text Utilities", () => {
  describe("createFacetsFromTextSync", () => {
    it("should detect URLs in text", () => {
      const text = "Check out https://example.org for more info";
      const result = createFacetsFromTextSync(text);

      expect(result.text).toBe(text);
      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(1);

      const facet = result.facets![0];
      expect(facet.features).toHaveLength(1);
      expect(facet.features[0].$type).toBe("app.bsky.richtext.facet#link");
      expect((facet.features[0] as { uri: string }).uri).toBe("https://example.org");
    });

    it("should detect hashtags in text", () => {
      const text = "Working on #sustainability and #impact";
      const result = createFacetsFromTextSync(text);

      expect(result.text).toBe(text);
      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(2);

      const tags = result.facets!.map((f) => (f.features[0] as { tag: string }).tag);
      expect(tags).toContain("sustainability");
      expect(tags).toContain("impact");
    });

    it("should detect mentions in text (without resolution)", () => {
      const text = "Thanks to @alice.bsky.social for helping";
      const result = createFacetsFromTextSync(text);

      expect(result.text).toBe(text);
      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(1);

      const facet = result.facets![0];
      expect(facet.features[0].$type).toBe("app.bsky.richtext.facet#mention");
      // Without agent, did is set to the handle (not resolved to actual DID)
      // This is valid for detection but would need resolution for posting
      expect((facet.features[0] as { did: string }).did).toBe("alice.bsky.social");
    });

    it("should detect multiple facet types in same text", () => {
      const text = "Visit https://example.org and follow @user.bsky.social #news";
      const result = createFacetsFromTextSync(text);

      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(3);

      const types = result.facets!.map((f) => f.features[0].$type);
      expect(types).toContain("app.bsky.richtext.facet#link");
      expect(types).toContain("app.bsky.richtext.facet#mention");
      expect(types).toContain("app.bsky.richtext.facet#tag");
    });

    it("should return undefined facets for plain text", () => {
      const text = "Just some plain text without any special formatting";
      const result = createFacetsFromTextSync(text);

      expect(result.text).toBe(text);
      expect(result.facets).toBeUndefined();
    });

    it("should handle empty text", () => {
      const result = createFacetsFromTextSync("");

      expect(result.text).toBe("");
      expect(result.facets).toBeUndefined();
    });

    it("should correctly calculate byte indices for ASCII text", () => {
      const text = "Go to https://example.org now";
      const result = createFacetsFromTextSync(text);

      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(1);

      const facet = result.facets![0];
      // "Go to " = 6 bytes, "https://example.org" = 19 bytes
      expect(facet.index.byteStart).toBe(6);
      expect(facet.index.byteEnd).toBe(25);
    });
  });

  describe("createFacetsFromText (async)", () => {
    it("should work without agent (same as sync)", async () => {
      const text = "Check https://example.org #test";
      const result = await createFacetsFromText(text);

      expect(result.text).toBe(text);
      expect(result.facets).toBeDefined();
      expect(result.facets).toHaveLength(2);
    });

    it("should detect facets in hypercert description", async () => {
      const description = `
This reforestation project planted 10,000 trees in the Amazon region.
Learn more at https://reforest.example.org

#climate #environment #sustainability

Implemented by @greenorg.bsky.social
      `.trim();

      const result = await createFacetsFromText(description);

      expect(result.facets).toBeDefined();
      // Should detect: 1 URL, 3 hashtags, 1 mention
      expect(result.facets!.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("RichText class export", () => {
    it("should export RichText class for advanced usage", () => {
      expect(RichText).toBeDefined();

      const rt = new RichText({ text: "Hello #world" });
      expect(rt.text).toBe("Hello #world");

      rt.detectFacetsWithoutResolution();
      expect(rt.facets).toBeDefined();
      expect(rt.facets).toHaveLength(1);
    });

    it("should allow iteration over segments", () => {
      const rt = new RichText({ text: "Visit https://example.org for info" });
      rt.detectFacetsWithoutResolution();

      const segments = [...rt.segments()];
      expect(segments.length).toBeGreaterThan(0);

      // Should have at least one segment that is a link
      const linkSegment = segments.find((s) => s.isLink());
      expect(linkSegment).toBeDefined();
      expect(linkSegment!.link?.uri).toBe("https://example.org");
    });
  });
});
