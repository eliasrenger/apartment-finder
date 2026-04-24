import { describe, test, expect, afterEach } from "bun:test";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  loadSearchConfig,
  parseSearchConfig,
  buildSearchUrl,
  OBJECT_TYPES,
  parseAnalysisConfig,
  loadAnalysisConfig,
} from "../../src/config/search-config";

const VALID_RAW = {
  areaIds: [123, 456],
  extendAreas: 5,
  objectType: "Lägenhet",
  minListPrice: 1_000_000,
  maxListPrice: 5_000_000,
  minLivingArea: 30,
  maxLivingArea: 120,
  minRooms: 2,
  maxRooms: 5,
};

const VALID_YAML = `
search:
  areaIds:
    - 123
    - 456
  extendAreas: 5
  objectType: "Lägenhet"
  minListPrice: 1000000
  maxListPrice: 5000000
  minLivingArea: 30
  maxLivingArea: 120
  minRooms: 2
  maxRooms: 5
`;

const createdPaths: string[] = [];

function tempYaml(content: string): string {
  const path = join(tmpdir(), `search-config-test-${Date.now()}-${Math.random()}.yaml`);
  writeFileSync(path, content, "utf-8");
  createdPaths.push(path);
  return path;
}

afterEach(() => {
  while (createdPaths.length > 0) {
    const p = createdPaths.pop()!;
    try { unlinkSync(p); } catch { /* already gone */ }
  }
});

// ---------------------------------------------------------------------------
// OBJECT_TYPES constant
// ---------------------------------------------------------------------------

describe("OBJECT_TYPES", () => {
  test("contains exactly the six allowed values", () => {
    expect(OBJECT_TYPES).toContain("Lägenhet");
    expect(OBJECT_TYPES).toContain("Villa");
    expect(OBJECT_TYPES).toContain("Gård");
    expect(OBJECT_TYPES).toContain("Fritidshus");
    expect(OBJECT_TYPES).toContain("Kedjehus-Parhus-Radhus");
    expect(OBJECT_TYPES).toContain("Tomt/Mark");
    expect(OBJECT_TYPES).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// parseSearchConfig
// ---------------------------------------------------------------------------

describe("parseSearchConfig — valid input", () => {
  test("returns a SearchConfig when all required fields are present", () => {
    const config = parseSearchConfig(VALID_RAW);
    expect(config.areaIds).toEqual([123, 456]);
    expect(config.extendAreas).toBe(5);
    expect(config.objectType).toBe("Lägenhet");
    expect(config.minListPrice).toBe(1_000_000);
    expect(config.maxListPrice).toBe(5_000_000);
    expect(config.minLivingArea).toBe(30);
    expect(config.maxLivingArea).toBe(120);
    expect(config.minRooms).toBe(2);
    expect(config.maxRooms).toBe(5);
  });
});

describe("parseSearchConfig — invalid objectType", () => {
  test("throws for an unknown objectType", () => {
    expect(() => parseSearchConfig({ ...VALID_RAW, objectType: "Bungalow" })).toThrow();
  });

  test("throws for an empty-string objectType", () => {
    expect(() => parseSearchConfig({ ...VALID_RAW, objectType: "" })).toThrow();
  });
});

describe("parseSearchConfig — missing required fields", () => {
  test("throws when areaIds is absent", () => {
    const { areaIds: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when objectType is absent", () => {
    const { objectType: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when minListPrice is absent", () => {
    const { minListPrice: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when maxListPrice is absent", () => {
    const { maxListPrice: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when minLivingArea is absent", () => {
    const { minLivingArea: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when maxLivingArea is absent", () => {
    const { maxLivingArea: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when minRooms is absent", () => {
    const { minRooms: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });

  test("throws when maxRooms is absent", () => {
    const { maxRooms: _, ...rest } = VALID_RAW;
    expect(() => parseSearchConfig(rest)).toThrow();
  });
});

describe("parseSearchConfig — each allowed objectType is accepted", () => {
  for (const objectType of OBJECT_TYPES) {
    test(`accepts objectType "${objectType}"`, () => {
      const config = parseSearchConfig({ ...VALID_RAW, objectType });
      expect(config.objectType).toBe(objectType);
    });
  }
});

// ---------------------------------------------------------------------------
// loadSearchConfig
// ---------------------------------------------------------------------------

describe("loadSearchConfig — valid YAML file", () => {
  test("returns a SearchConfig with correct values", () => {
    const config = loadSearchConfig(tempYaml(VALID_YAML));
    expect(config.areaIds).toEqual([123, 456]);
    expect(config.extendAreas).toBe(5);
    expect(config.objectType).toBe("Lägenhet");
    expect(config.minListPrice).toBe(1_000_000);
    expect(config.maxListPrice).toBe(5_000_000);
    expect(config.minLivingArea).toBe(30);
    expect(config.maxLivingArea).toBe(120);
    expect(config.minRooms).toBe(2);
    expect(config.maxRooms).toBe(5);
  });
});

describe("loadSearchConfig — invalid objectType in YAML", () => {
  test("throws before scraping begins", () => {
    const yaml = VALID_YAML.replace('"Lägenhet"', '"Bungalow"');
    expect(() => loadSearchConfig(tempYaml(yaml))).toThrow();
  });
});

describe("loadSearchConfig — missing required field in YAML", () => {
  test("throws and error message identifies the missing areaIds field", () => {
    const yaml = `
search:
  extendAreas: 5
  objectType: "Lägenhet"
  minListPrice: 1000000
  maxListPrice: 5000000
  minLivingArea: 30
  maxLivingArea: 120
  minRooms: 2
  maxRooms: 5
`;
    let thrown: unknown;
    try { loadSearchConfig(tempYaml(yaml)); } catch (e) { thrown = e; }
    expect(thrown).toBeDefined();
    const message = thrown instanceof Error ? thrown.message : String(thrown);
    expect(message.toLowerCase()).toMatch(/areaid/i);
  });
});

// ---------------------------------------------------------------------------
// buildSearchUrl
// ---------------------------------------------------------------------------

describe("buildSearchUrl — URL contains all config parameters", () => {
  test("page=1 URL contains all expected query parameters", () => {
    const config = parseSearchConfig(VALID_RAW);
    const url = buildSearchUrl(config, 1);
    const parsed = new URL(url);

    // areaIds — comma-separated value
    const rawAreaIds = parsed.searchParams.get("areaIds") ?? parsed.searchParams.getAll("areaIds").join(",");
    expect(rawAreaIds).toMatch(/123/);
    expect(rawAreaIds).toMatch(/456/);

    expect(parsed.searchParams.get("extendAreas")).not.toBeNull();
    expect(decodeURIComponent(parsed.searchParams.get("objectType") ?? "")).toBe("Lägenhet");
    expect(parsed.searchParams.get("minListPrice")).toBe("1000000");
    expect(parsed.searchParams.get("maxListPrice")).toBe("5000000");
    expect(parsed.searchParams.get("minLivingArea")).toBe("30");
    expect(parsed.searchParams.get("maxLivingArea")).toBe("120");
    expect(parsed.searchParams.get("minRooms")).toBe("2");
    expect(parsed.searchParams.get("maxRooms")).toBe("5");
    expect(parsed.searchParams.get("page")).toBe("1");
  });
});

describe("buildSearchUrl — pagination", () => {
  test("page=3 appears in the URL", () => {
    const url = buildSearchUrl(parseSearchConfig(VALID_RAW), 3);
    expect(new URL(url).searchParams.get("page")).toBe("3");
  });

  test("page=1 and page=3 produce different URLs", () => {
    const config = parseSearchConfig(VALID_RAW);
    expect(buildSearchUrl(config, 1)).not.toBe(buildSearchUrl(config, 3));
  });
});

describe("buildSearchUrl — objectType URL-encoding", () => {
  test("Lägenhet decodes back correctly via URL", () => {
    const url = buildSearchUrl(parseSearchConfig({ ...VALID_RAW, objectType: "Lägenhet" }), 1);
    expect(decodeURIComponent(new URL(url).searchParams.get("objectType") ?? "")).toBe("Lägenhet");
    expect(url.split("?")[1]).toMatch(/%[0-9A-Fa-f]{2}/);
  });

  test("Tomt/Mark decodes back correctly via URL", () => {
    const url = buildSearchUrl(parseSearchConfig({ ...VALID_RAW, objectType: "Tomt/Mark" }), 1);
    expect(decodeURIComponent(new URL(url).searchParams.get("objectType") ?? "")).toBe("Tomt/Mark");
  });
});

describe("buildSearchUrl — hostname", () => {
  test("URL hostname is booli.se", () => {
    const url = buildSearchUrl(parseSearchConfig(VALID_RAW), 1);
    expect(new URL(url).hostname).toMatch(/booli\.se$/);
  });
});

// ---------------------------------------------------------------------------
// parseAnalysisConfig
// ---------------------------------------------------------------------------

describe("parseAnalysisConfig — valid block", () => {
  test("returns correct types when both fields provided", () => {
    const config = parseAnalysisConfig({ scoreThreshold: 75, maxSteps: 15 });
    expect(config.scoreThreshold).toBe(75);
    expect(config.maxSteps).toBe(15);
  });
});

describe("parseAnalysisConfig — missing block returns defaults", () => {
  test("returns scoreThreshold: 70 and maxSteps: 20 when called with undefined", () => {
    const config = parseAnalysisConfig(undefined);
    expect(config.scoreThreshold).toBe(70);
    expect(config.maxSteps).toBe(20);
  });

  test("returns scoreThreshold: 70 and maxSteps: 20 when called with empty object", () => {
    const config = parseAnalysisConfig({});
    expect(config.scoreThreshold).toBe(70);
    expect(config.maxSteps).toBe(20);
  });
});

describe("parseAnalysisConfig — invalid scoreThreshold throws", () => {
  test("throws when scoreThreshold is negative", () => {
    expect(() => parseAnalysisConfig({ scoreThreshold: -1 })).toThrow();
  });

  test("throws when scoreThreshold exceeds 100", () => {
    expect(() => parseAnalysisConfig({ scoreThreshold: 101 })).toThrow();
  });

  test("throws when maxSteps is zero or negative", () => {
    expect(() => parseAnalysisConfig({ maxSteps: 0 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// loadAnalysisConfig
// ---------------------------------------------------------------------------

describe("loadAnalysisConfig — analysis block present in YAML", () => {
  test("loads scoreThreshold and maxSteps from YAML", () => {
    const yaml = `
search:
  areaIds: [1]
  extendAreas: 0
  objectType: "Lägenhet"
  minListPrice: 1000000
  maxListPrice: 5000000
  minLivingArea: 30
  maxLivingArea: 120
  minRooms: 2
  maxRooms: 5
analysis:
  scoreThreshold: 80
  maxSteps: 10
`;
    const config = loadAnalysisConfig(tempYaml(yaml));
    expect(config.scoreThreshold).toBe(80);
    expect(config.maxSteps).toBe(10);
  });
});

describe("loadAnalysisConfig — analysis block absent returns defaults", () => {
  test("returns defaults when config.yaml has no analysis section", () => {
    const config = loadAnalysisConfig(tempYaml(VALID_YAML));
    expect(config.scoreThreshold).toBe(70);
    expect(config.maxSteps).toBe(20);
  });
});
