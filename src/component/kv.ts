import { v } from "convex/values";
import {
  mutation,
  query,
} from "./_generated/server.js";
import { api } from "./_generated/api.js";

const DELIMITER = "\x00";

function joinKey(key: string[]): string {
  return key.join(DELIMITER);
}

/**
 * Removes up to 100 expired keys.
 * Can be scheduled periodically or called by a manager.
 */
export const vacuum = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    // Only fetch keys that EXPLICITLY have an expiresAt field and it is in the past
    const expired = await ctx.db
      .query("kv")
      .withIndex("expiresAt", (q) => q.lt("expiresAt", now))
      .take(100);

    let deleted = 0;
    for (const doc of expired) {
      // Double check safety: never delete if expiresAt is missing or in the future
      if (doc.expiresAt && doc.expiresAt < now) {
        await ctx.db.delete(doc._id);
        deleted++;
      }
    }
    return { count: deleted };
  },
});

export const get = query({
  args: { key: v.array(v.string()) },
  returns: v.union(v.null(), v.object({
    key: v.array(v.string()),
    value: v.any(),
    metadata: v.optional(v.any()),
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const path = joinKey(args.key);
    const entry = await ctx.db
      .query("kv")
      .withIndex("path", (q) => q.eq("path", path))
      .unique();
    if (!entry) return null;

    // Filter expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      return null;
    }

    return {
      key: entry.key,
      value: entry.value,
      metadata: entry.metadata,
      updatedAt: entry.updatedAt,
      expiresAt: entry.expiresAt,
    };
  },
});

export const has = query({
  args: { key: v.array(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const path = joinKey(args.key);
    const entry = await ctx.db
      .query("kv")
      .withIndex("path", (q) => q.eq("path", path))
      .unique();
    if (!entry) return false;
    // Filter expired
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      return false;
    }
    return true;
  },
});

export const set = mutation({
  args: {
    key: v.array(v.string()),
    value: v.any(),
    metadata: v.optional(v.any()),
    ttl: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const path = joinKey(args.key);
    const existing = await ctx.db
      .query("kv")
      .withIndex("path", (q) => q.eq("path", path))
      .unique();

    let expiresAt = args.expiresAt;
    if (args.ttl !== undefined) {
      expiresAt = Date.now() + args.ttl;
    }

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.value,
        metadata: args.metadata,
        updatedAt: Date.now(),
        // Explicitly clear or update expiresAt
        expiresAt: expiresAt ?? (args.ttl === undefined && args.expiresAt === undefined ? undefined : existing.expiresAt),
      });
    } else {
      await ctx.db.insert("kv", {
        key: args.key,
        path,
        value: args.value,
        metadata: args.metadata,
        updatedAt: Date.now(),
        expiresAt,
      });
    }

    return null;
  },
});


export const remove = mutation({
  args: { key: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const path = joinKey(args.key);
    const existing = await ctx.db
      .query("kv")
      .withIndex("path", (q) => q.eq("path", path))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return null;
  },
});

/**
 * Strict hierarchical range:
 * If prefix is ["a"], path is "a".
 * We want "a" and any "a\x00...".
 * Lexicographically, "a\x00" < "a\x01".
 * And "ab" > "a\x01".
 * So [pathPrefix, pathPrefix + "\x01") correctly captures exactly the hierarchy.
 */
function getPrefixRange(q: any, pathPrefix: string) {
  if (pathPrefix.length === 0) return q;
  return q.gte("path", pathPrefix).lt("path", pathPrefix + "\x01");
}

export const list = query({
  args: {
    prefix: v.array(v.string()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    includeValues: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pathPrefix = joinKey(args.prefix);
    const query = ctx.db.query("kv").withIndex("path", (q) => getPrefixRange(q, pathPrefix));

    const results = await query.paginate({
      numItems: args.limit ?? 100,
      cursor: args.cursor ?? null,
    });

    const now = Date.now();
    return {
      entries: results.page
        .filter(e => !e.expiresAt || e.expiresAt > now)
        .map(e => ({
          key: e.key,
          ...(args.includeValues !== false ? { value: e.value } : {}),
          metadata: e.metadata,
          updatedAt: e.updatedAt,
          expiresAt: e.expiresAt,
        })),
      continueCursor: results.continueCursor,
      isDone: results.isDone,
    };
  },
});

export const getAll = query({
  args: {
    prefix: v.array(v.string()),
    includeValues: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const pathPrefix = joinKey(args.prefix);
    const entries = await ctx.db.query("kv").withIndex("path", (q) =>
      getPrefixRange(q, pathPrefix)
    ).take(1000);

    const now = Date.now();
    return entries
      .filter(e => !e.expiresAt || e.expiresAt > now)
      .map(e => ({
        key: e.key,
        ...(args.includeValues !== false ? { value: e.value } : {}),
        metadata: e.metadata,
        updatedAt: e.updatedAt,
        expiresAt: e.expiresAt,
      }));
  },
});



export const deleteAll = mutation({
  args: { prefix: v.array(v.string()) },
  handler: async (ctx, args) => {
    const pathPrefix = joinKey(args.prefix);
    const entries = await ctx.db.query("kv").withIndex("path", (q) =>
      getPrefixRange(q, pathPrefix)
    ).take(101);

    const toDelete = entries.slice(0, 100);
    const hasMore = entries.length > 100;

    for (const entry of toDelete) {
      await ctx.db.delete(entry._id);
    }

    if (hasMore) {
      await ctx.scheduler.runAfter(0, api.kv.deleteAll, {
        prefix: args.prefix,
      });
    }

    return {
      deletedCount: toDelete.length,
      hasMore,
    };
  },
});
