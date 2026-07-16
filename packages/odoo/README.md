# 👻 Buu SATI Odoo (`@buujs/sati-odoo`)
An elegant, type-safe Odoo integration for the SATI middleware ecosystem, powered by Hono.

Inject, configure, and communicate with your Odoo RPC endpoints effortlessly within your unified Hono architecture with full runtime safety and zero boilerplate.

---

## Features

* 🔌 **Seamless Hono Context Injection**: Automatically bind custom Odoo client instances globally or per-route into your Hono runtime context (`c.var.odoo`).
* ⚡ **Fluent Active Record / CRUD Interface**: Chainable model methods (`create`, `findOne`, `findMany`, `update`, `remove`) that map directly to Odoo's JSON-RPC 2.0 endpoints (`call_kw`).
* 🔒 **Session State Isolation**: Thread-safe authentication designed specifically for server environments—handling login states safely between concurrent requests.
* ⚙️ **Unified Runtime Safety**: Integrated error handling powered by Hono's `HTTPException` and full type declarations.

---

## Installation

```sh
pnpm add @buujs/sati-odoo
```

## Usage

```ts
import { Hono } from "hono";
import { odoo } from "@buujs/sati-odoo";

const app = new Hono();

// Register the middleware globally
app.use(
  "*",
  odoo({
    host: "[https://your-odoo-instance.com](https://your-odoo-instance.com)",
  })
);
```

```ts
app.post("/auth/login", async (c) => {
  const odooClient = c.var.odoo;

  // 1. Authenticate with Odoo database
  const session = await odooClient.login({
    db: "production_db",
    username: "admin",
    password: "securepassword",
  });

  // 2. Refresh active session context
  odooClient.refreshAuth(session);

  return c.json({ message: "Successfully logged into Odoo!", session });
});

app.get("/partners", async (c) => {
  const odooClient = c.var.odoo;

  // Perform a clean, type-safe search_read query
  const partners = await odooClient.model("res.partner").findMany({
    domain: [["is_company", "=", "true"]],
    fields: ["name", "email", "phone"],
    limit: 10,
  });

  return c.json(partners);
});
```