# Convex KV

A hierarchical key-value store component for Convex. Supports pseudo-tables, caching, and document storage with ordered keys and automatic expiration.

## Features

- Hierarchical Keys: Array-based paths like `["users", "123", "profile"]`.
- Ordered Scans: Lexicographical storage for efficient prefix range queries.
- Time-To-Live (TTL): Optional automatic expiration for keys.
- Atomic Operations: Operations run in standard Convex transactions.
- Recursive Deletion: Automatic batching for large prefix clears.
- Typed Clients: TypeScript generics and optional runtime validation.

## Installation

Create or update `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import convexKv from "@hamzasaleemorg/convex-kv/convex.config.js";

const app = defineApp();
app.use(convexKv);

export default app;
```

## Usage

### Client Initialization

```ts
import { components } from "./_generated/api";
import { kvClientFactory } from "@hamzasaleemorg/convex-kv";

const kv = kvClientFactory(components.convexKv);

// Create a typed client for a specific prefix
const store = kv.use<{ name: string }>(["users"]);
```

### Basic Operations

```ts
// Store a value with optional TTL (1 hour)
await store.set(ctx, ["123"], { name: "Alice" }, { ttl: 3600000 });

// Retrieve a value
const user = await store.get(ctx, ["123"]);

// Check existence
const exists = await store.has(ctx, ["123"]);

// Delete a key
await store.delete(ctx, ["123"]);
```

### Hierarchical Queries

```ts
// Fetch all entries under a prefix
const allUsers = await store.getAll(ctx, []);

// Paginate entries
const page = await store.list(ctx, [], { limit: 10 });

// Recursively delete a sub-tree
await store.deleteAll(ctx, []);
```

### Expiration (TTL)

To physically remove expired keys, expose a mutation in your `convex/` folder and schedule it via crons.

```ts
// convex/my_kv.ts
import { mutation } from "./_generated/server";
import { components } from "./_generated/api";

export const vacuum = mutation({
  handler: async (ctx) => {
    await ctx.runMutation(components.convexKv.kv.vacuum);
  },
});

// convex/crons.ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();
crons.interval("vacuum", { minutes: 5 }, api.my_kv.vacuum);
export default crons;
```


## API Reference

### `KeyValueStore<V>`

- `get(ctx, key)`: Returns the value or null if missing/expired.
- `getWithMetadata(ctx, key)`: Returns the value, metadata, and timestamps.
- `set(ctx, key, value, options?)`: Stores a value. Options: `ttl`, `expiresAt`, `metadata`.
- `delete(ctx, key)`: Removes a single key.
- `has(ctx, key)`: Returns boolean existence.
- `list(ctx, prefix, options?)`: Paginated scan. Options: `limit`, `cursor`, `includeValues`.
- `getAll(ctx, prefix, options?)`: Fetch all entries under prefix.
- `deleteAll(ctx, prefix)`: Batched recursive deletion.
- `withPrefix(prefix, validator?)`: Creates a scoped sub-store.
