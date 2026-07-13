# WIP (Work In Progress)

# 👻 Buu SATI (Seamless Application Typesafe Integration)
A modern, lightweight, and type-safe middleware orchestration factory built on top of Hono.

Compose, manage, and configure production-ready Hono applications effortlessly with built-in robust middlewares, strict type safety, and zero-overhead modular ecosystem architecture.

---

## Features

* 🔌 **Declarative Middleware Factory**: Orchestrate framework-level middlewares (`cors`, `rateLimiter`, `compress`, `secureHeaders`, `ip`, `logger`) using an intuitive functional approach.
* 🛡️ **Production-Ready Core Middlewares**: Built-in enterprise-grade middlewares including a regex-based dynamic CORS handler, automated client IP resolution, and environment-aware structured error handling.
* 📈 **High-Performance Logging**: Integration with `pino` for lightning-fast structured logging with automated runtime context binding (user, method, path).
* 🎛️ **Rate Limiting with Custom Bypasses**: Flexible request throttling powered by `hono-rate-limiter` supporting runtime IP extraction and custom dynamic skip constraints.

---

## Installation

```sh
pnpm add @buujs/sati hono
```

---

## Usage

```ts
import { createSati } from "@buujs/sati";
import { getConnInfo } from "@hono/node-server/conninfo"; // run on Node.js env

const app = createSati({
  middlewares: (m) => [
    // 1. Enable compression
    m.compress(),
    
    // 2. Inject security headers
    m.secureHeaders(),
    
    // 3. Resolve and inject client IP address into context
    m.ip({
      getConnInfo
    }),
    
    // 4. Attach high-performance Pino logger
    m.logger(),
    
    // 5. Apply dynamic CORS rules
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

app.get("/ping", (c) => {
  const logger = c.get("logger");
  logger.info("Ping route accessed");
  return c.text("pong");
});
```