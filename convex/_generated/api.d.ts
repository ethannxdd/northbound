/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as authOptions from "../authOptions.js";
import type * as crons from "../crons.js";
import type * as data from "../data.js";
import type * as details from "../details.js";
import type * as docs from "../docs.js";
import type * as fx from "../fx.js";
import type * as http from "../http.js";
import type * as lib_loot from "../lib/loot.js";
import type * as lib_resetEmail from "../lib/resetEmail.js";
import type * as lib_user from "../lib/user.js";
import type * as plans from "../plans.js";
import type * as push from "../push.js";
import type * as pushSend from "../pushSend.js";
import type * as quotes from "../quotes.js";
import type * as settlement from "../settlement.js";
import type * as shares from "../shares.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  auth: typeof auth;
  authOptions: typeof authOptions;
  crons: typeof crons;
  data: typeof data;
  details: typeof details;
  docs: typeof docs;
  fx: typeof fx;
  http: typeof http;
  "lib/loot": typeof lib_loot;
  "lib/resetEmail": typeof lib_resetEmail;
  "lib/user": typeof lib_user;
  plans: typeof plans;
  push: typeof push;
  pushSend: typeof pushSend;
  quotes: typeof quotes;
  settlement: typeof settlement;
  shares: typeof shares;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
