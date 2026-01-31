import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { initConvexTest } from "./setup.test";
import { api } from "./_generated/api";

describe("example", () => {
  beforeEach(async () => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  test("seed and get", async () => {
    const t = initConvexTest();
    await t.mutation(api.example.seed, {});

    const entry = await t.query(api.example.get, { key: ["config", "ui", "theme"] });
    expect(entry?.value).toBe("dark");

    const all = await t.query(api.example.list, { prefix: [] });
    expect(all.length).toBeGreaterThan(0);
  });
});
