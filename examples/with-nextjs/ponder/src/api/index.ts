import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { client, graphql } from "ponder";

const app = new Hono();

app.use(client({ db }));
app.use("/", graphql({ db, schema }));

export default app;
