# 👻 Buu SATI Node (`@buujs/sati-node`)
The official Node.js runtime adapter for Buu SATI. Seamlessly bootstrap production-ready Hono environments with native Node.js server support, robust graceful shutdown handlers, and integrated cron scheduling.

---

## Features

* ⚡ **Native Node.js Bootstrapper**: Out-of-the-box bridge to `@hono/node-server` to run your SATI application instance perfectly on Node.js.
* 🛑 **Production Graceful Shutdown**: Automatic interception of system signals (`SIGINT`, `SIGTERM`) and runtime crashes (`uncaughtException`, `unhandledRejection`) to terminate operations cleanly.
* ⏰ **Integrated Job Scheduling**: Automated cron-based execution ecosystem powered by `@buujs/sati-croner` with built-in log context binding.

---

## Installation

```sh
pnpm add @buujs/sati-node @buujs/sati @buujs/sati-croner @hono/node-server

import { boot } from "@buujs/sati-node";
import { createSati } from "@buujs/sati";

// 1. Define your Hono applications using SATI core
const app = createSati({
  middlewares: (m) => [
    m.logger(),
    m.secureHeaders()
  ]
});

app.get("/", (c) => c.text("Hello Node.js!"));

// 2. Bootstrap your app with the Node runtime wrapper
boot({
  fetch: app.fetch,
  port: 3000,
  hostname: "0.0.0.0"
});
```