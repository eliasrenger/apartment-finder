import { describe, test, expect } from "bun:test";
import path from "node:path";

const fixturesDir = path.resolve(import.meta.dir, "fixtures");

describe("src/index.ts entry point contract", () => {
  describe("fixture: entry-success.ts", () => {
    test("exits with code 0 on successful run", () => {
      const result = Bun.spawnSync(["bun", path.join(fixturesDir, "entry-success.ts")]);
      expect(result.exitCode).toBe(0);
    });
  });

  describe("fixture: entry-failure.ts", () => {
    test("exits with non-zero code on failed run", () => {
      const result = Bun.spawnSync(["bun", path.join(fixturesDir, "entry-failure.ts")]);
      expect(result.exitCode).not.toBe(0);
    });

    test("writes at least one valid JSON line with level=error to stdout on failure", () => {
      const result = Bun.spawnSync(["bun", path.join(fixturesDir, "entry-failure.ts")], {
        stdout: "pipe",
      });

      const stdout = result.stdout.toString("utf8");
      const lines = stdout.split("\n").filter((line) => line.trim() !== "");

      const hasErrorEntry = lines.some((line) => {
        try {
          const parsed = JSON.parse(line);
          return parsed.level === "error";
        } catch {
          return false;
        }
      });

      expect(hasErrorEntry).toBe(true);
    });
  });
});
