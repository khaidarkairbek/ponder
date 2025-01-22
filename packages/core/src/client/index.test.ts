import {
  setupCommon,
  setupDatabaseServices,
  setupIsolatedDatabase,
} from "@/_test/setup.js";
import { bigint, hex, onchainTable } from "@/drizzle/onchain.js";
import type { QueryWithTypings } from "drizzle-orm";
import { pgSchema } from "drizzle-orm/pg-core";
import { Hono } from "hono";
import { beforeEach, expect, test } from "vitest";
import { client } from "./index.js";

beforeEach(setupCommon);
beforeEach(setupIsolatedDatabase);

const queryToParams = (query: QueryWithTypings) =>
  new URLSearchParams({ sql: JSON.stringify(query) });

test("client.db", async (context) => {
  const account = onchainTable("account", (p) => ({
    address: p.hex().primaryKey(),
    balance: p.bigint(),
  }));

  const { database, cleanup } = await setupDatabaseServices(context, {
    schemaBuild: { schema: { account } },
  });

  globalThis.PONDER_NAMESPACE_BUILD = "public";
  globalThis.PONDER_DATABASE = database;

  const app = new Hono().use(client({ db: database.qb.drizzleReadonly }));

  let query = {
    sql: "SELECT * FROM account",
    params: [],
  };

  let response = await app.request(`/client/db?${queryToParams(query)}`);
  expect(response.status).toBe(200);
  const result = await response.json();
  expect(result.rows).toStrictEqual([]);

  query = {
    sql: "SELECT 1;",
    params: [],
  };

  response = await app.request(`/client/db?${queryToParams(query)}`);
  expect(response.status).toBe(200);

  await cleanup();
});

test("client.db error", async (context) => {
  const { database, cleanup } = await setupDatabaseServices(context);
  globalThis.PONDER_DATABASE = database;

  const app = new Hono().use(client({ db: database.qb.drizzleReadonly }));

  globalThis.PONDER_NAMESPACE_BUILD = "public";
  globalThis.PONDER_DATABASE = database;

  const query = {
    sql: "SELECT * FROM account",
    params: [],
  };

  const response = await app.request(`/client/db?${queryToParams(query)}`);
  expect(response.status).toBe(500);
  expect(await response.text()).toContain('relation "account" does not exist');

  await cleanup();
});

test.skip("client.db search_path", async (context) => {
  const schemaAccount = pgSchema("Ponder").table("account", {
    address: hex().primaryKey(),
    balance: bigint(),
  });

  const { database, cleanup } = await setupDatabaseServices(context, {
    namespaceBuild: "Ponder",
    schemaBuild: { schema: { account: schemaAccount } },
  });

  globalThis.PONDER_NAMESPACE_BUILD = "Ponder";
  globalThis.PONDER_DATABASE = database;

  const app = new Hono().use(client({ db: database.qb.drizzleReadonly }));

  const query = {
    sql: "SELECT * FROM account",
    params: [],
  };

  const response = await app.request(`/client/db?${queryToParams(query)}`);
  expect(response.status).toBe(200);
  await cleanup();
});

test("client.db readonly", async (context) => {
  const account = onchainTable("account", (p) => ({
    address: p.hex().primaryKey(),
    balance: p.bigint(),
  }));

  const { database, cleanup } = await setupDatabaseServices(context, {
    schemaBuild: { schema: { account } },
  });

  globalThis.PONDER_NAMESPACE_BUILD = "public";
  globalThis.PONDER_DATABASE = database;

  const app = new Hono().use(client({ db: database.qb.drizzleReadonly }));

  const query = {
    sql: "INSERT INTO account (address, balance) VALUES ('0x123', 100)",
    params: [],
  };

  const response = await app.request(`/client/db?${queryToParams(query)}`);
  expect(response.status).toBe(500);
  expect(await response.text()).toContain(
    "cannot execute INSERT in a read-only transaction",
  );
  await cleanup();
});

test("client.db recursive", async (context) => {
  const account = onchainTable("account", (p) => ({
    address: p.hex().primaryKey(),
    balance: p.bigint(),
  }));

  const { database, cleanup } = await setupDatabaseServices(context, {
    schemaBuild: { schema: { account } },
  });

  globalThis.PONDER_NAMESPACE_BUILD = "public";
  globalThis.PONDER_DATABASE = database;

  const app = new Hono().use(client({ db: database.qb.drizzleReadonly }));

  const query = {
    sql: `
WITH RECURSIVE infinite_cte AS (
  SELECT 1 AS num
  UNION ALL
  SELECT num + 1
  FROM infinite_cte
)
SELECT *
FROM infinite_cte;`,
    params: [],
  };

  const response = await app.request(`/client/db?${queryToParams(query)}`);
  expect(response.status).toBe(500);
  expect(await response.text()).toContain(
    "canceling statement due to statement timeout",
  );
  await cleanup();
});
