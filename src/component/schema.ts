import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  kv: defineTable({
    key: v.array(v.string()), // The hierarchical key as an array of segments
    path: v.string(), // The key segments joined by a delimiter for prefix scans
    value: v.any(), // The stored value
    metadata: v.optional(v.any()), // Internal metadata (e.g., for validation)
    updatedAt: v.number(),
    expiresAt: v.optional(v.number()),
  })
    .index("path", ["path"])
    .index("expiresAt", ["expiresAt"]),
});

