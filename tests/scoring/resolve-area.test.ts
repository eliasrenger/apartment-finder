import { test, expect, describe } from "bun:test";
import { resolveAreaPrice } from "../../src/scoring/resolve-area";

describe("resolveAreaPrice – direct district match", () => {
  test("returns price for known district name", () => {
    const price = resolveAreaPrice("Vasastan", null, null);
    expect(price).toBeGreaterThan(0);
  });

  test("returns price for Östermalm", () => {
    const price = resolveAreaPrice("Östermalm", null, null);
    expect(price).toBeGreaterThan(0);
  });

  test("returns price for Södermalm", () => {
    const price = resolveAreaPrice("Södermalm", null, null);
    expect(price).toBeGreaterThan(0);
  });
});

describe("resolveAreaPrice – alias sub-neighbourhood", () => {
  test("resolves SoFo to Södermalm price", () => {
    const direct = resolveAreaPrice("Södermalm", null, null);
    const alias = resolveAreaPrice("SoFo", null, null);
    expect(alias).toBe(direct);
  });

  test("resolves Odenplan to Vasastan price", () => {
    const direct = resolveAreaPrice("Vasastan", null, null);
    const alias = resolveAreaPrice("Odenplan", null, null);
    expect(alias).toBe(direct);
  });

  test("resolves Gärdet to Östermalm price", () => {
    const direct = resolveAreaPrice("Östermalm", null, null);
    const alias = resolveAreaPrice("Gärdet", null, null);
    expect(alias).toBe(direct);
  });
});

describe("resolveAreaPrice – postal code fallback", () => {
  test("falls back to postal code when neighbourhood is unrecognised", () => {
    // Postal code 113 xx → Vasastan
    const fallback = resolveAreaPrice("Okänd stadsdel", "113 45", null);
    const direct = resolveAreaPrice("Vasastan", null, null);
    expect(fallback).toBe(direct);
  });

  test("falls back to postal code when neighbourhood is null", () => {
    const fallback = resolveAreaPrice(null, "114 22", null);
    expect(fallback).toBeGreaterThan(0);
  });
});

describe("resolveAreaPrice – municipality fallback", () => {
  test("falls back to municipality when neighbourhood and postal code are unrecognised", () => {
    const fallback = resolveAreaPrice("Okänd stadsdel", "999 99", "Stockholm");
    expect(fallback).toBeGreaterThan(0);
  });

  test("falls back to municipality when neighbourhood and postal code are null", () => {
    const fallback = resolveAreaPrice(null, null, "Stockholm");
    expect(fallback).toBeGreaterThan(0);
  });
});

describe("resolveAreaPrice – all lookups fail", () => {
  test("returns null when all inputs are null", () => {
    expect(resolveAreaPrice(null, null, null)).toBeNull();
  });

  test("returns null when all inputs are unrecognised strings", () => {
    expect(resolveAreaPrice("X", "999 99", "Okänd")).toBeNull();
  });
});
