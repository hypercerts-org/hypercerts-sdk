
import { describe, it, expect } from "vitest";
import { stableStringify } from "../../src/lib/crypto.js";

describe("stableStringify", () => {
    it("should stringify primitives", () => {
        expect(stableStringify(1)).toBe("1");
        expect(stableStringify("test")).toBe('"test"');
        expect(stableStringify(true)).toBe("true");
        expect(stableStringify(null)).toBe("null");
    });

    it("should sort object keys", () => {
        const obj = { c: 3, a: 1, b: 2 };
        expect(stableStringify(obj)).toBe('{"a":1,"b":2,"c":3}');
    });

    it("should sort nested object keys", () => {
        const obj = {
            z: { y: 2, x: 1 },
            a: { c: 3, b: 4 },
        };
        expect(stableStringify(obj)).toBe('{"a":{"b":4,"c":3},"z":{"x":1,"y":2}}');
    });

    it("should preserve array order", () => {
        const arr = [3, 1, 2];
        expect(stableStringify(arr)).toBe("[3,1,2]");
    });

    it("should sort objects inside arrays", () => {
        const arr = [
            { b: 2, a: 1 },
            { d: 4, c: 3 },
        ];
        expect(stableStringify(arr)).toBe('[{"a":1,"b":2},{"c":3,"d":4}]');
    });

    it("should ignore undefined, functions, and symbols", () => {
        const obj = {
            a: 1,
            b: undefined,
            c: () => { },
            d: Symbol("test"),
            e: 2,
        };
        expect(stableStringify(obj)).toBe('{"a":1,"e":2}');
    });

    it("should return undefined for non-serializable top-level inputs", () => {
        expect(stableStringify(undefined)).toBeUndefined();
        expect(stableStringify(() => { })).toBeUndefined();
        expect(stableStringify(Symbol("test"))).toBeUndefined();
    });

    it("should handle mixed complex structures", () => {
        const obj = {
            id: 1,
            meta: {
                tags: ["b", "a"], // Array order preserved
                info: { y: 2, x: 1 } // Object keys sorted
            }
        };
        expect(stableStringify(obj)).toBe('{"id":1,"meta":{"info":{"x":1,"y":2},"tags":["b","a"]}}');
    });
});
