/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    kv: {
      deleteAll: FunctionReference<
        "mutation",
        "internal",
        { prefix: Array<string> },
        any,
        Name
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: Array<string> },
        null | {
          expiresAt?: number;
          key: Array<string>;
          metadata?: any;
          updatedAt: number;
          value: any;
        },
        Name
      >;
      getAll: FunctionReference<
        "query",
        "internal",
        { includeValues?: boolean; prefix: Array<string> },
        any,
        Name
      >;
      has: FunctionReference<
        "query",
        "internal",
        { key: Array<string> },
        boolean,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          includeValues?: boolean;
          limit?: number;
          prefix: Array<string>;
        },
        any,
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { key: Array<string> },
        null,
        Name
      >;
      set: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: number;
          key: Array<string>;
          metadata?: any;
          ttl?: number;
          value: any;
        },
        null,
        Name
      >;
      vacuum: FunctionReference<"mutation", "internal", {}, any, Name>;
    };
  };
