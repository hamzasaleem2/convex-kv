import { mutation, query } from "./_generated/server.js";
import { components } from "./_generated/api.js";
import { kvClientFactory } from "../../src/client/index.js";
import { v } from "convex/values";

const kv = kvClientFactory(components.convexKv);

export const set = mutation({
  args: {
    key: v.array(v.string()),
    value: v.any(),
    metadata: v.optional(v.any()),
    ttl: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const rawKv = kv.use([]);
    await rawKv.set(ctx, args.key, args.value, {
      metadata: args.metadata,
      ttl: args.ttl,
      expiresAt: args.expiresAt,
    });
  },
});


export const get = query({
  args: { key: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rawKv = kv.use([]);
    return await rawKv.getWithMetadata(ctx, args.key);
  },
});

export const remove = mutation({
  args: { key: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rawKv = kv.use([]);
    await rawKv.delete(ctx, args.key);
  },
});
export const vacuum = mutation({
  handler: async (ctx) => {
    const rawKv = kv.use([]);
    return await ctx.runMutation(components.convexKv.kv.vacuum, {});
  },
});


export const list = query({
  args: {
    prefix: v.array(v.string()),
    includeValues: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const rawKv = kv.use([]);
    return await rawKv.getAll(ctx, args.prefix, { includeValues: args.includeValues });
  },
});


export const seed = mutation({
  handler: async (ctx) => {
    const rawKv = kv.use([]);
    // Clear first
    await rawKv.deleteAll(ctx, []);

    // Seed hierarchical data
    await rawKv.set(ctx, ["config", "api"], { url: "https://api.example.com", timeout: 5000 });
    await rawKv.set(ctx, ["config", "ui", "theme"], "dark");
    await rawKv.set(ctx, ["users", "1", "profile"], { name: "Alice", active: true });
    await rawKv.set(ctx, ["users", "1", "sessions", "101"], { login: Date.now() });
    await rawKv.set(ctx, ["users", "2", "profile"], { name: "Bob", active: false });
    await rawKv.set(ctx, ["stats", "daily", "2024-01-31"], { visits: 1050 });
  }
});

