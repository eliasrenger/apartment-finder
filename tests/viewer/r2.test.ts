import { test, expect, mock, afterEach } from "bun:test";
import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fetchDbIfMissing, forceRefresh } from "../../viewer/r2";

const tmpDb = join(tmpdir(), `viewer-test-${Date.now()}.db`);

function makeMockClient(data: ArrayBuffer = new ArrayBuffer(16)) {
  return {
    file: (_key: string) => ({ arrayBuffer: async () => data }),
  } as any;
}

afterEach(() => {
  if (existsSync(tmpDb)) unlinkSync(tmpDb);
});

test("fetchDbIfMissing: fetches and writes DB when file is missing", async () => {
  await fetchDbIfMissing(tmpDb, makeMockClient());
  expect(existsSync(tmpDb)).toBe(true);
});

test("fetchDbIfMissing: skips fetch when local file already exists", async () => {
  await Bun.write(tmpDb, "existing");
  const spy = mock(async () => new ArrayBuffer(0));
  await fetchDbIfMissing(tmpDb, { file: () => ({ arrayBuffer: spy }) } as any);
  expect(spy).not.toHaveBeenCalled();
});

test("forceRefresh: re-fetches and overwrites even when local file exists", async () => {
  await Bun.write(tmpDb, "old-content");
  const newData = Buffer.from("new-content");
  await forceRefresh(tmpDb, makeMockClient(newData.buffer));
  const result = await Bun.file(tmpDb).text();
  expect(result).toBe("new-content");
});
