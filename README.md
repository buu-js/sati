# 👻 Buu SATI (Seamless Application Typesafe Integration)

A modern, lightweight, and type-safe middleware orchestration factory built on top of [Hono](https://hono.dev/).

Compose, manage, and configure production-ready applications effortlessly with built-in robust middlewares, strict type safety, a unified lifecycle, and a zero-overhead modular ecosystem architecture.

---

## 📦 Ecosystem Packages

This repository is managed as a monorepo consisting of the following modules:

* **`@buujs/sati` (Core)**: The core declarative middleware factory, context types, and global error handling strategies.
* **`@buujs/sati-node`**: Out-of-the-box native Node.js adapter providing production-grade bootstrappers via `@hono/node-server`, runtime signal management, and integrated cron orchestrations.
* **`@buujs/sati-croner`**: An automated lifecycle-aware background task manager and job scheduler driven by `croner`.
* **`@buujs/sati-nodemailer`**: A type-safe, environment-aware mail transport middleware wrapper powered by `nodemailer`.

---

## 🔌 Core Features

* 🔌 **Declarative Middleware Factory**: Orchestrate framework-level middlewares (`cors`, `rateLimiter`, `compress`, `secureHeaders`, `ip`, `logger`) using an intuitive functional approach.
* 🛡️ **Production-Ready Core Middlewares**: Built-in enterprise-grade middlewares including a regex-based dynamic CORS handler, automated client IP resolution, and environment-aware structured error handling.
* 📈 **High-Performance Logging**: Integration with `pino` for lightning-fast structured logging with automated runtime context binding (user, method, path).
* 🎛️ **Rate Limiting with Custom Bypasses**: Flexible request throttling powered by `hono-rate-limiter` supporting runtime IP extraction and custom dynamic skip constraints.
* 🛑 **Auto Graceful Unregistration & Shutdown**: Automated interception of system signals (`SIGINT`, `SIGTERM`) and runtime exceptions to securely terminate servers and clear schedules without active leakage.

---

## 🚀 Installation

Install the core package along with `hono`:

```sh
pnpm add @buujs/sati hono
pnpm add @buujs/sati-node @buujs/sati-croner @buujs/sati-nodemailer 
```

---

## Usage

### 1. Define the Application (Core Middlewares)

```ts
import { createSati } from "@buujs/sati";
import { getConnInfo } from "@hono/node-server/conninfo"; // Node.js connection info resolver

export const app = createSati({
  middlewares: (m) => [
    // 1. Enable compression
    m.compress(),
    
    // 2. Inject security headers
    m.secureHeaders(),
    
    // 3. Resolve and inject client IP address into context variable map
    m.ip({ getConnInfo }),
    
    // 4. Attach high-performance Pino logger with contextual binding
    m.logger(),
    
    // 5. Apply regex-based dynamic CORS rules
    m.cors({
      wildcardDomain: "example.com",
      fallbackHost: "http://localhost:8081"
    }),
    
    // 6. Enforce rate limiting with custom criteria
    m.rateLimiter({
      limit: 100,
      windowMs: 60_000,
      skip: (c, ip) => ip.startsWith("10.0.") // Bypass local internal network
    })
  ]
});

// Context-aware type-safe route handler
app.get("/ping", (c) => {
  const logger = c.get("logger");
  logger.info("Ping route accessed");
  return c.text("pong");
});
```

### 2. Bootstrapping with Node.js & Cron Schedulers

```ts
import { boot } from "@buujs/sati-node";
import { app } from "./app";

boot(app, {
  name: "MySatiGateway",
  port: 3000,
  schedule: {
    name: "MetricsCollector",
    cronTime: "*/5 * * * *", // Runs every 5 minutes
    trigger: true,          // Execute once immediately upon listening
    fn: async () => {
      console.log("Compiling background cluster metrics...");
    }
  }
});
```

### 3. Adding Mail Delivery (@buujs/sati-nodemailer)

```ts
import { mailer } from "@buujs/sati-nodemailer";
import { createSMTPMailer } from "@buujs/sati-nodemailer/smtp";
import { app } from "./app";

const transport = createSMTPMailer({
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  password: "securepassword",
  from: "noreply@example.com",
  principal: "My App Team",
  isProduction: process.env.NODE_ENV === "production"
});

// Inject mailer instance globally or into a sub-router scope
app.use("/api/*", mailer(transport));

app.post("/api/alert", async (c) => {
  const mailerInstance = c.var.mailer; // Fully typed
  await mailerInstance.sendMail({
    to: "admin@example.com",
    subject: "System Alert",
    text: "Something happened!"
  });
  return c.text("Alert sent.");
});
```