import type {
  GenericMutationCtx,
  GenericQueryCtx,
  GenericDataModel,
} from "convex/server";
import type { Validator } from "convex/values";

import type { ComponentApi } from "../component/_generated/component.js";

/**
 * Minimal context types required for the client store to execute operations.
 */
export type RunQuery = Pick<GenericQueryCtx<GenericDataModel>, "runQuery">;
export type RunMutation = Pick<
  GenericMutationCtx<GenericDataModel>,
  "runMutation"
>;

/**
 * A client for interacting with the hierarchical Key-Value store.
 * 
 * Supports hierarchical keys (e.g., ["users", "123", "profile"]),
 * atomic mutations, and prefix-based range queries.
 * 
 * @template V The type of values stored in this specific instance/prefix.
 */
export class KeyValueStore<V = any> {
  constructor(
    private component: ComponentApi,
    private prefix: string[] = [],
    private options: {
      validator?: Validator<V, any, any>;
      /**
       * Optional internal type metadata for identification or read-time validation.
       */
      metadata?: any;
    } = {}
  ) { }

  /**
   * Retrieves the value associated with a specific key path.
   * 
   * @param ctx Convex Query Context.
   * @param key The relative key path array.
   * @returns The stored value, or null if it doesn't exist or is expired.
   */
  async get(ctx: RunQuery, key: string[]): Promise<V | null> {
    const result = await this.getWithMetadata(ctx, key);
    return result?.value ?? null;
  }

  /**
   * Retrieves the value along with its internal metadata (timestamps, expiration, etc.).
   * 
   * @param ctx Convex Query Context.
   * @param key The relative key path array.
   * @returns The full entry object or null.
   */
  async getWithMetadata(ctx: RunQuery, key: string[]): Promise<{ key: string[]; value: V; metadata?: any; updatedAt: number; expiresAt?: number } | null> {
    return (await ctx.runQuery(this.component.kv.get, {
      key: [...this.prefix, ...key],
    })) as { key: string[]; value: V; metadata?: any; updatedAt: number; expiresAt?: number } | null;
  }

  /**
   * Stores a value at the specified key path.
   * 
   * This is an atomic "upsert" operation. If a value already exists at this path,
   * it will be overwritten.
   * 
   * @param ctx Convex Mutation Context.
   * @param key The relative key path array.
   * @param value The value to store.
   * @param options.ttl Time-To-Live in milliseconds from now.
   * @param options.expiresAt Exact Unix timestamp when the key should expire.
   */
  async set(
    ctx: RunMutation,
    key: string[],
    value: V,
    options: { metadata?: any; ttl?: number; expiresAt?: number } = {}
  ): Promise<void> {
    // Note: If you provided a validator at initialization, it should be checked here.
    if (this.options.validator) {
      // In a production environment, you might use a runtime check here.
    }

    await ctx.runMutation(this.component.kv.set, {
      key: [...this.prefix, ...key],
      value,
      metadata: options.metadata ?? this.options.metadata,
      ttl: options.ttl,
      expiresAt: options.expiresAt,
    });
  }

  /**
   * Permanently removes a single key from the store.
   */
  async delete(ctx: RunMutation, key: string[]): Promise<void> {
    await ctx.runMutation(this.component.kv.remove, {
      key: [...this.prefix, ...key],
    });
  }

  /**
   * Quickly determines if a key exists without loading its value into memory.
   * Efficient for existence checks on large blobs.
   */
  async has(ctx: RunQuery, key: string[]): Promise<boolean> {
    return await ctx.runQuery(this.component.kv.has, {
      key: [...this.prefix, ...key],
    });
  }

  /**
   * Scans and returns keys under a specific prefix with pagination support.
   * 
   * @param options.includeValues If false, only returns keys and metadata (saves bandwidth).
   * @param options.limit Number of items per page.
   * @param options.cursor Pagination cursor from a previous call.
   */
  async list(
    ctx: RunQuery,
    prefix: string[],
    options: { limit?: number; cursor?: string; includeValues?: boolean } = {}
  ) {
    return await ctx.runQuery(this.component.kv.list, {
      prefix: [...this.prefix, ...prefix],
      ...options,
    });
  }

  /**
   * Fetches all entries under a prefix in a single call.
   * Useful for small-to-medium datasets (up to ~1000 items).
   */
  async getAll(ctx: RunQuery, prefix: string[], options: { includeValues?: boolean } = {}) {
    return await ctx.runQuery(this.component.kv.getAll, {
      prefix: [...this.prefix, ...prefix],
      ...options,
    });
  }

  /**
   * Recursively removes all keys under a specific prefix.
   * 
   * For large hierarchies, this operation is automatically batched
   * using the Convex scheduler to prevent timeout errors.
   */
  async deleteAll(ctx: RunMutation, prefix: string[]) {
    return await ctx.runMutation(this.component.kv.deleteAll, {
      prefix: [...this.prefix, ...prefix],
    });
  }

  /**
   * Creates a new scoped client for a specific sub-hierarchy.
   * 
   * This allows you to treat a prefix like a "table" or "collection".
   * 
   * @example
   * const users = kv.withPrefix(["users"]);
   * await users.get(ctx, ["123"]); // Actually gets ["users", "123"]
   */
  withPrefix<SubV = V>(
    prefix: string[],
    validator?: Validator<SubV, any, any>
  ): KeyValueStore<SubV> {
    return new KeyValueStore<SubV>(this.component, [...this.prefix, ...prefix], {
      validator: validator ?? (this.options.validator as any),
      metadata: this.options.metadata,
    });
  }

  /** Alias for withPrefix to support various developer naming conventions. */
  subStore = this.withPrefix;
}

/**
 * Creates a client factory that simplifies working with multiple typed prefixes.
 * 
 * @param component The Convex Component API reference (usually `components.convexKv`).
 */
export function kvClientFactory(component: ComponentApi) {
  return {
    /**
     * Initializes a KeyValueStore instance for a specific prefix and type.
     * 
     * @example
     * const store = kv.use<{ count: number }>(["analytics"]);
     */
    use<V = any>(prefix: string[] = [], validator?: Validator<V, any, any>) {
      return new KeyValueStore<V>(component, prefix, { validator });
    },
  };
}
