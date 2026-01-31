# Convex KV Component

[![npm version](https://img.shields.io/npm/v/@hamzasaleemorg/convex-kv.svg)](https://www.npmjs.com/package/@hamzasaleemorg/convex-kv)
[![npm downloads](https://img.shields.io/npm/dm/@hamzasaleemorg/convex-kv.svg)](https://www.npmjs.com/package/@hamzasaleemorg/convex-kv)
[![License](https://img.shields.io/npm/l/@hamzasaleemorg/convex-kv.svg)](https://www.npmjs.com/package/@hamzasaleemorg/convex-kv)

A hierarchical, ordered key-value store for Convex. Replace relational boilerplate with a simple `get`/`set` API, featuring automatic TTL and recursive prefix deletion.

## Installation

```bash
npm install @hamzasaleemorg/convex-kv
```

```typescript
// convex/convex.config.ts
import { defineApp } from "convex/server";
import convexKv from "@hamzasaleemorg/convex-kv/convex.config.js";

const app = defineApp();
app.use(convexKv);

export default app;
```

## Quick Start: Expiring Invite Links 🚀

Manage one-time magic links or invite codes without cluttering your main schema or writing cleanup logic.

```typescript
// convex/invites.ts
import { kvClientFactory } from "@hamzasaleemorg/convex-kv";
import { components } from "./_generated/api";
import { mutation } from "./_generated/server";
import { v } from "convex/values";

const kv = kvClientFactory(components.convexKv);
const invites = kv.use<{ email: string; role: string }>(["invites"]);

export const createInvite = mutation({
  args: { email: v.string(), role: v.string() },
  handler: async (ctx, args) => {
    const inviteCode = Math.random().toString(36).substring(7);
    
    // Store invite that automatically EXPIRES in 48 hours
    await invites.set(ctx, [inviteCode], { 
      email: args.email, 
      role: args.role 
    }, { ttl: 48 * 60 * 60 * 1000 });
    
    return inviteCode;
  },
});

export const acceptInvite = mutation({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    // If the link is older than 48hrs, .get() returns null automatically
    const invite = await invites.get(ctx, [args.code]);
    if (!invite) throw new Error("Invite invalid or expired");
    
    // ... create membership logic ...

    await invites.delete(ctx, [args.code]);
  },
});
```

---

## 🛠️ Why use this?

1.  **Zero Schema Maintenance**: Store any JSON-serializable data instantly. No new tables, no indexes to wait for.
2.  **Organized Hierarchy**: Use array keys like `["org", orgId, "settings"]` to naturally isolate data.
3.  **Automatic TTL**: Set a `ttl` (ms) on any key and it disappear from queries as soon as it expires.
4.  **Ordered Scans**: Keys are stored lexicographically. Scan through millions of keys by prefix instantly.
5.  **Batched Deletes**: Clear an entire "folder" of data with `deleteAll(["prefix"])`. It automatically handles large datasets in the background.

## API Reference

### Initializing the Client
You can use the global client or scope it to a specific recursive namespace:

```typescript
const kv = kvClientFactory(components.convexKv);

// Everything sent through 'users' will stay in that folder
const users = kv.use<{ email: string }>(["users"]);
```

### Core Operations
| Method | Description |
| :--- | :--- |
| `get(key)` | Returns value or `null` if missing/expired. |
| `set(key, val, options?)` | Stores value. Options: `ttl` (ms), `expiresAt`, `metadata`. |
| `has(key)` | Fast boolean check for existence (returns false if expired). |
| `delete(key)` | Removes a specific key. |

### Hierarchical & Range Operations
| Method | Description |
| :--- | :--- |
| `list(prefix, options?)` | Paginated scan within a namespace. |
| `getAll(prefix)` | Returns all entries under a prefix (max 1000). |
| `deleteAll(prefix)` | **Recursive Delete**. Safely clears an entire prefix tree in the background. |

---

## Development & Testing

```bash
npm install
npm run dev   # Starts the KV Explorer & Build Watcher
npm test      # Runs full suite (Unit + Component Integration)
```

## License

Apache-2.0
