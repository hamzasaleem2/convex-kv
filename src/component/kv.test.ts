/// <reference types="vite/client" />

import { describe, expect, test } from "vitest";
import { api } from "./_generated/api.js";
import { initConvexTest } from "./setup.test.js";


describe("component kv", () => {
  test("basic kv operations", async () => {
    const t = initConvexTest();

    // Set and get
    await t.mutation(api.kv.set, { key: ["users", "1"], value: { name: "Alice" } });
    const user = await t.query(api.kv.get, { key: ["users", "1"] });
    expect(user?.value).toEqual({ name: "Alice" });


    // Has
    const exists = await t.query(api.kv.has, { key: ["users", "1"] });
    expect(exists).toBe(true);
    const missing = await t.query(api.kv.has, { key: ["users", "2"] });
    expect(missing).toBe(false);

    // List with prefix
    await t.mutation(api.kv.set, { key: ["users", "2"], value: { name: "Bob" } });
    await t.mutation(api.kv.set, { key: ["posts", "1"], value: { title: "Post 1" } });

    const users = await t.query(api.kv.list, { prefix: ["users"] });
    expect(users.entries).toHaveLength(2);

    const all = await t.query(api.kv.getAll, { prefix: [] });
    expect(all).toHaveLength(3);

    // Verify hierarchical isolation
    await t.mutation(api.kv.set, { key: ["a"], value: "parent" });
    await t.mutation(api.kv.set, { key: ["a", "b"], value: "child" });
    await t.mutation(api.kv.set, { key: ["aa"], value: "sibling" });

    const aPrefix = await t.query(api.kv.getAll, { prefix: ["a"] });
    // Should contain ["a"] and ["a", "b"] but NOT ["aa"]
    expect(aPrefix.map(e => e.key)).toContainEqual(["a"]);
    expect(aPrefix.map(e => e.key)).toContainEqual(["a", "b"]);
    expect(aPrefix.map(e => e.key)).not.toContainEqual(["aa"]);
    expect(aPrefix.length).toBe(2);

    // Delete
    await t.mutation(api.kv.remove, { key: ["users", "1"] });
    const userAfterDelete = await t.query(api.kv.get, { key: ["users", "1"] });
    expect(userAfterDelete).toBeNull();
  });
});
