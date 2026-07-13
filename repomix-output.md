This file is a merged representation of the entire codebase, combined into a single document by Repomix.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
bin/
  clean-modules.ts
packages/
  core/
    src/
      middleware/
        cors.ts
        error-handler.ts
        ip.ts
        logger.ts
        rate-limiter.ts
      index.ts
      logger.ts
    test/
      middleware/
        cors.test.ts
        error-handler.test.ts
        ip.test.ts
        logger.test.ts
        rate-limiter.test.ts
      index.test.ts
      logger.test.ts
    package.json
    tsconfig.json
    vitest.config.ts
  node/
    package.json
    tsconfig.json
    vitest.config.ts
  nodemailer/
    package.json
    tsconfig.json
    vitest.config.ts
  nodescheduler/
    package.json
    tsconfig.json
    vitest.config.ts
  utils/
    src/
      index.ts
    test/
      index.test.ts
    package.json
    tsconfig.json
.gitignore
.oxfmtrc.json
.oxlintrc.json
LICENSE
package.json
pnpm-workspace.yaml
tsconfig.base.json
```

# Files

## File: bin/clean-modules.ts
```typescript
import { readdir, rm } from "node:fs/promises"
import { join } from "node:path"

async function deleteNodeModules(dirPath: string): Promise<void> {
  const targetDir = join(dirPath, "node_modules")

  try {
    console.log(`💥 Cleaning ${targetDir}...`)

    await rm(targetDir, {
      recursive: true,
      force: true
    })
  } catch (err) {
    console.error(`❌ Failed to remove ${targetDir}:`, (err as Error).message)
  }
}

async function getDirectories(path: string): Promise<string[]> {
  try {
    const entries = await readdir(path, { withFileTypes: true })

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => join(path, entry.name))
  } catch {
    return []
  }
}

async function scanAndClean(): Promise<void> {
  await deleteNodeModules(".")

  // packages/*
  const packages = await getDirectories("packages")

  for (const pkg of packages) {
    await deleteNodeModules(pkg)

    // packages/*/*
    for (const nested of await getDirectories(pkg)) {
      await deleteNodeModules(nested)
    }
  }

  console.log("\n✨ Done! All target node_modules have been cleaned.")
}

void scanAndClean()
```

## File: packages/core/src/middleware/cors.ts
```typescript
import { cors as CORS } from "hono/cors"

export type CorsOptions = {
  wildcardDomain: string
  fallbackHost: string
}

export const cors = ({ wildcardDomain, fallbackHost }: CorsOptions) => {
  const escapedDomain = wildcardDomain.replace(/\./g, "\\.")
  const allowedDomainRegex = new RegExp(
    `^https?:\\/\\/([^\\/]+\\.)?${escapedDomain}$`,
    "i"
  )

  return CORS({
    credentials: true,
    origin: (origin: string) => {
      return allowedDomainRegex.test(origin)
        ? origin
        : origin === fallbackHost
          ? origin
          : undefined
    }
  })
}
```

## File: packages/core/src/middleware/error-handler.ts
```typescript
import { Context } from "hono"
import { HTTPException } from "hono/http-exception"

const IGNORE_STACK_STATUS = [401, 403, 404]

export function errorHandler(error: Error, c: Context) {
  const status = error instanceof HTTPException ? error.status : 500

  const logger = c.var?.logger
  if (logger) {
    const shouldLogStack = !IGNORE_STACK_STATUS.includes(status)
    logger.error(error, shouldLogStack)
  } else {
    console.error(`[Error ${status}]:`, error.message)
  }

  const isDev =
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"

  if (error instanceof HTTPException) {
    return c.json(
      {
        message: error.message,
        ...(error.cause && isDev ? { cause: error.cause } : {})
      },
      error.status
    )
  }

  return c.json(
    {
      message: isDev ? error.message : "Internal Server Error",
      ...(isDev ? { stack: error.stack } : {})
    },
    500
  )
}
```

## File: packages/core/src/middleware/ip.ts
```typescript
import "hono"
import { GetConnInfo } from "hono/conninfo"
import { createMiddleware } from "hono/factory"

declare module "hono" {
  interface ContextVariableMap {
    ip: string
  }
}

interface IpOptions {
  getConnInfo: GetConnInfo
}

export const ip = (options: IpOptions) =>
  createMiddleware(async (c, next) => {
    const info = options.getConnInfo(c)
    const ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.raw.headers.get("x-real-ip") ||
      info?.remote?.address ||
      "unknown"

    c.set("ip", ip)
    await next()
  })
```

## File: packages/core/src/middleware/logger.ts
```typescript
import "hono"
import { createMiddleware } from "hono/factory"
import { createLogger } from "../logger"

declare module "hono" {
  interface ContextVariableMap {
    logger: ReturnType<typeof createLogger>
  }
}

export const logger = () =>
  createMiddleware(async (c, next) => {
    const logger = createLogger(c)
    c.set("logger", logger)
    await next()
  })
```

## File: packages/core/src/middleware/rate-limiter.ts
```typescript
import { rateLimiter as limiter } from "hono-rate-limiter"
import { createMiddleware } from "hono/factory"
import { HTTPException } from "hono/http-exception"
import { assert } from "@buujs/sati-utils"
import { Context } from "hono"

export type RateLimiterOptions = Omit<
  Parameters<typeof limiter>[0],
  "handler" | "keyGenerator" | "skip"
> & {
  limit?: number
  windowMs?: number
  skip?: (c: Context, ip: string) => boolean | Promise<boolean>
}

export const rateLimiter = (options: RateLimiterOptions) => {
  const { limit = 100, windowMs = 60_000, skip, ...rest } = options

  const _internal = limiter({
    ...rest,
    limit,
    windowMs,
    handler: async (c) => {
      throw new HTTPException(429, {
        message: `Too many requests from ${c.get("ip")}, please try again later`
      })
    },
    keyGenerator: (c) => {
      return `${c.get("ip")}:${c.req.path}`
    },
    skip: async (c) => {
      const ip = c.get("ip") as string
      if (skip) return skip(c, ip)
      return false
    }
  })

  return createMiddleware(async (ctx, next) => {
    const ip = ctx.get("ip")
    assert(!!ip, new HTTPException(500, { message: "IP Address missing" }))
    return _internal(ctx, next)
  })
}
```

## File: packages/core/src/index.ts
```typescript
import { Hono } from "hono"
import { compress } from "hono/compress"
import { cors } from "./middleware/cors"
import { errorHandler } from "./middleware/error-handler"
import { ip } from "./middleware/ip"
import { logger } from "./middleware/logger"
import { rateLimiter } from "./middleware/rate-limiter"
import { secureHeaders } from "hono/secure-headers"
import type { MiddlewareHandler } from "hono"

export interface MiddlewareFactory {
  compress: typeof compress
  secureHeaders: typeof secureHeaders
  cors: typeof cors
  ip: typeof ip
  logger: typeof logger
  rateLimiter: typeof rateLimiter
}

export interface CreateSatiOptions {
  middlewares: (
    m: MiddlewareFactory
  ) => (MiddlewareHandler<any, any, any> | undefined)[]
}

export function createSati(options: CreateSatiOptions) {
  const instance = new Hono()

  const m: MiddlewareFactory = {
    compress,
    secureHeaders,
    cors,
    ip,
    logger,
    rateLimiter
  }

  const selected = options.middlewares(m)

  selected.forEach((middleware) => {
    if (middleware) instance.use(middleware)
  })

  instance.onError(errorHandler)

  return instance
}
```

## File: packages/core/src/logger.ts
```typescript
import { Context } from "hono"
import { getPath } from "hono/utils/url"
import pino from "pino"

const baseLogger = pino({
  level: process.env.LOG_LEVEL || "info"
})

function resolveContext(context?: Context) {
  if (!context) return { scope: "system" }
  return {
    user: context.var.user?.name || "Anonymous",
    method: context.req.method,
    path: getPath(context.req.raw)
  }
}

function getPrefix(c?: Context): string {
  if (!c) return "System - "
  const binding = resolveContext(c)
  return `${binding.user} ${binding.method} - ${binding.path} - `
}

export function createLogger(ctx?: Context) {
  const prefix = getPrefix(ctx)
  const logger = baseLogger.child(resolveContext(ctx))
  return {
    debug: (message: string) => logger.debug(`${prefix}${message}`),
    warn: (message: string) => logger.warn(`${prefix}${message}`),
    info: (message: string) => logger.info(`${prefix}${message}`),
    error: (o: unknown, stack = false) => {
      const error =
        o instanceof Error
          ? (o as Error)
          : { message: `${o}`, name: "Error", stack: "" }
      //@ts-expect-error ignore error.status
      const message = `${prefix}${error.message} [${error?.status || error?.name}]${
        !stack
          ? ""
          : `
${error.stack}`
      }`

      logger.error(`${message}`)
    }
  }
}
```

## File: packages/core/test/middleware/cors.test.ts
```typescript
import { describe, expect, it } from "vitest"
import { Hono } from "hono"
import { cors } from "../../src/middleware/cors"

describe("CORS Middleware", () => {
  const config = {
    wildcardDomain: "example.com",
    fallbackHost: "http://localhost:8081"
  }

  const createTargetApp = () => {
    const app = new Hono()
    app.use("*", cors(config))
    app.get("/test", (c) => c.text("success"))
    return app
  }

  it("should allow the exact wildcard domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://example.com")
    expect(res.headers.get("Access-Control-Allow-Credentials")).toBe("true")
  })

  it("should allow a valid subdomain of the wildcard domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://app.example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://app.example.com"
    )
  })

  it("should allow a deeply nested subdomain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://staging.dev.example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://staging.dev.example.com"
    )
  })

  it("should allow HTTP protocol for local development if specified", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "http://example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://example.com")
  })

  it("should allow the exact fallback host", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "http://localhost:8081" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("http://localhost:8081")
  })

  it("should block a malicious domain suffixing the target domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://example.com.attacker.com" }
    })

    // Expecting null/undefined because Hono omits the header when undefined is returned
    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })

  it("should block a malicious domain prefixing the target domain", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://fake-example.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })

  it("should block completely unrelated domains", async () => {
    const app = createTargetApp()
    const res = await app.request("/test", {
      headers: { Origin: "https://google.com" }
    })

    expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull()
  })
})
```

## File: packages/core/test/middleware/error-handler.test.ts
```typescript
import { Hono } from "hono"
import { expect, test, describe, vi, beforeEach, afterEach } from "vitest"
import { HTTPException } from "hono/http-exception"
import { errorHandler } from "../../src/middleware/error-handler"

describe("Global Error Handler: handleError", () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    vi.restoreAllMocks()
  })

  test("1. Should return custom status and message for HTTPException", async () => {
    const app = new Hono()
    app.onError(errorHandler)

    app.get("/error", () => {
      throw new HTTPException(400, { message: "Invalid payload provided" })
    })

    const response = await app.request("/error")
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ message: "Invalid payload provided" })
  })

  test("2. Should hide stack trace and return generic 500 message in Production environment", async () => {
    process.env.NODE_ENV = "production"

    const app = new Hono()
    app.onError(errorHandler)

    app.get("/crash", () => {
      throw new Error("Database connection dropped unexpectedly")
    })

    // Suppress console.error output from polluting the test logs
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await app.request("/crash")
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.message).toBe("Internal Server Error")
    expect(body.stack).toBeUndefined() // Stack trace must be hidden in prod
    expect(consoleSpy).toHaveBeenCalled()
  })

  test("3. Should expose stack trace and raw message in Development environment", async () => {
    process.env.NODE_ENV = "development"

    const app = new Hono()
    app.onError(errorHandler)

    app.get("/crash", () => {
      throw new Error("Null pointer exception")
    })

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    const response = await app.request("/crash")
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.message).toBe("Null pointer exception")
    expect(body.stack).toBeDefined() // Stack trace must be visible in dev
    expect(consoleSpy).toHaveBeenCalled()
  })

  test("4. Should call c.var.logger if it is present in the context context", async () => {
    const app = new Hono()
    app.onError(errorHandler)

    const mockLogger = {
      error: vi.fn()
    }

    // Inject the mock logger via a middleware
    app.use("*", async (c, next) => {
      c.set("logger", mockLogger as any)
      await next()
    })

    app.get("/error", () => {
      throw new HTTPException(401, { message: "Unauthorized token" })
    })

    await app.request("/error")

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error), false)
  })

  test("5. Should trigger stack logging for non-ignored status codes (e.g., 500)", async () => {
    const app = new Hono()
    app.onError(errorHandler)

    const mockLogger = {
      error: vi.fn()
    }

    app.use("*", async (c, next) => {
      c.set("logger", mockLogger as any)
      await next()
    })

    app.get("/crash", () => {
      throw new Error("Fatal runtime error")
    })

    await app.request("/crash")

    expect(mockLogger.error).toHaveBeenCalledTimes(1)
    expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error), true)
  })
})
```

## File: packages/core/test/middleware/ip.test.ts
```typescript
import { Hono } from "hono"
import { expect, test, vi } from "vitest"
import { ip } from "../../src/middleware/ip"

test("Middleware - should inject ip into Hono Context and maintain type consistency", async () => {
  const app = new Hono()
  const mockGetConnInfo = vi.fn().mockReturnValue({
    remote: { address: "127.0.0.1" }
  })

  app.use(
    "*",
    ip({
      getConnInfo: mockGetConnInfo
    })
  )
  app.get("/test-endpoint", (c) => {
    const ip = c.get("ip")

    expect(ip).toBeDefined()
    expect(ip).toBe("127.0.0.1")

    return c.text("IP successfully")
  })

  const response = await app.request("/test-endpoint")

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("IP successfully")
})
```

## File: packages/core/test/middleware/logger.test.ts
```typescript
import { Hono } from "hono"
import { expect, test } from "vitest"
import { logger } from "../../src/middleware/logger"

test("Middleware - should inject logger into Hono Context and maintain type consistency", async () => {
  const app = new Hono()

  app.use("*", logger())
  app.get("/test-endpoint", (c) => {
    const logger = c.get("logger")

    expect(logger).toBeDefined()
    expect(typeof logger.info).toBe("function")
    expect(typeof logger.error).toBe("function")

    return c.text("Logged successfully")
  })

  const response = await app.request("/test-endpoint")

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("Logged successfully")
})
```

## File: packages/core/test/middleware/rate-limiter.test.ts
```typescript
import { Hono } from "hono"
import { expect, test, describe } from "vitest"
import { rateLimiter } from "../../src/middleware/rate-limiter"

describe("Middleware: rateLimiter", () => {
  test("1. Should succeed (200) when IP is present and limit is not exceeded", async () => {
    const app = new Hono()

    // Mock middleware to inject an IP address into the context first
    app.use("*", async (c, next) => {
      c.set("ip", "127.0.0.1")
      await next()
    })

    app.use("*", rateLimiter({ limit: 5 }))
    app.get("/test", (c) => c.text("success"))

    const response = await app.request("/test")
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("success")
  })

  test("2. Should fail (500) when IP is missing (Assert triggers an error)", async () => {
    const app = new Hono()
    app.onError((err, c) => {
      return c.text(err.message, 500)
    })

    app.use("*", rateLimiter({}))
    app.get("/test", (c) => c.text("success"))

    const response = await app.request("/test")
    expect(response.status).toBe(500)
  })

  test("3. Should return 429 status when requests exceed the limit", async () => {
    const app = new Hono()

    app.use("*", async (c, next) => {
      c.set("ip", "192.168.1.1")
      await next()
    })

    app.use("*", rateLimiter({ limit: 1, windowMs: 60_000 }))
    app.get("/test", (c) => c.text("allowed"))

    const res1 = await app.request("/test")
    expect(res1.status).toBe(200)

    const res2 = await app.request("/test")
    expect(res2.status).toBe(429)
    expect(await res2.text()).toContain("Too many requests from 192.168.1.1")
  })

  test("4. Should bypass rate limiting if the custom 'skip' function returns true", async () => {
    const app = new Hono()

    app.use("*", async (c, next) => {
      c.set("ip", "10.0.0.5")
      await next()
    })

    app.use(
      "*",
      rateLimiter({
        limit: 0,
        skip: (c, ip) => ip.startsWith("10.0.")
      })
    )
    app.get("/test", (c) => c.text("bypassed successfully"))

    const response = await app.request("/test")
    expect(response.status).toBe(200)
    expect(await response.text()).toBe("bypassed successfully")
  })
})
```

## File: packages/core/test/index.test.ts
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest"
import { createSati } from "../src/index"
import { Hono } from "hono"

vi.mock("hono/compress", () => ({ compress: () => "mocked-compress" }))
vi.mock("hono/secure-headers", () => ({ secureHeaders: () => "mocked-secure-headers" }))
vi.mock("./middleware/cors", () => ({ cors: () => "mocked-cors" }))
vi.mock("./middleware/ip", () => ({ ip: () => "mocked-ip" }))
vi.mock("./middleware/logger", () => ({ logger: () => "mocked-logger" }))
vi.mock("./middleware/rate-limiter", () => ({
  rateLimiter: () => "mocked-rate-limiter"
}))
vi.mock("./middleware/error-handler", () => ({ errorHandler: vi.fn() }))

const mockUse = vi.fn()
const mockOnError = vi.fn()

vi.mock("hono", async (importOriginal) => {
  const original = await importOriginal<typeof import("hono")>()

  const MockHono = vi.fn().mockImplementation(function (this: any) {
    this.use = mockUse
    this.onError = mockOnError
    return this
  })

  MockHono.prototype = original.Hono.prototype

  return {
    ...original,
    Hono: MockHono
  }
})

describe("createSati", () => {
  beforeEach(() => {
    mockUse.mockClear()
    mockOnError.mockClear()
  })

  it("should return a valid Hono instance", () => {
    const app = createSati({
      middlewares: () => []
    })

    expect(Hono).toHaveBeenCalled()
    expect(app).toBeDefined()
  })

  it("should register selected middlewares in the correct order", () => {
    createSati({
      middlewares: (m) => [
        m.compress(),
        undefined, //
        m.secureHeaders()
      ]
    })

    expect(mockUse).toHaveBeenCalledTimes(2)
    expect(mockUse).toHaveBeenNthCalledWith(1, "mocked-compress")
    expect(mockUse).toHaveBeenNthCalledWith(2, "mocked-secure-headers")
  })

  it("should attach the global error handler", () => {
    createSati({
      middlewares: () => []
    })

    expect(mockOnError).toHaveBeenCalledTimes(1)
  })
})
```

## File: packages/core/test/logger.test.ts
```typescript
import { expect, test } from "vitest"
import { createLogger } from "../src/logger"

test("createLogger - System defaults (No Context)", () => {
  const logger = createLogger()

  expect(logger).toBeDefined()
  expect(typeof logger.info).toBe("function")
  expect(typeof logger.error).toBe("function")
})

test("createLogger - With Mocked Hono Context", () => {
  const mockContext = {
    var: {
      user: { name: "Alice" }
    },
    req: {
      method: "GET",
      raw: {
        url: "http://localhost/api/v1/health"
      }
    }
  } as any

  const logger = createLogger(mockContext)

  expect(logger).toBeDefined()
  expect(typeof logger.info).toBe("function")
  expect(typeof logger.warn).toBe("function")
})

test("createLogger - Error handling contract", () => {
  const logger = createLogger()

  expect(() => logger.error(new Error("Database crash"))).not.toThrow()
  expect(() => logger.error("Plain string error notification")).not.toThrow()
})
```

## File: packages/core/package.json
```json
{
  "name": "@buujs/sati",
  "version": "0.1.0",
  "license": "MIT",
  "author": "Forte Zhuo",
  "files": [
    "dist"
  ],
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./logger": {
      "import": {
        "types": "./dist/logger/index.d.ts",
        "default": "./dist/logger/index.js"
      },
      "require": {
        "types": "./dist/logger/index.d.cts",
        "default": "./dist/logger/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "scripts": {
    "dev": "tsdx dev",
    "build": "tsdx build",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsdx lint",
    "format": "tsdx format",
    "format:check": "tsdx format --check",
    "typecheck": "tsdx typecheck",
    "prepublishOnly": "pnpm build"
  },
  "dependencies": {
    "@buujs/sati-utils": "workspace:*",
    "hono-rate-limiter": "^0.5.3",
    "pino": "^10.3.1"
  },
  "peerDependencies": {
    "hono": "^4.12.27"
  },
  "engines": {
    "node": ">=20"
  }
}
```

## File: packages/core/tsconfig.json
```json
{
  "extends": ["../../tsconfig.base.json"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## File: packages/core/vitest.config.ts
```typescript
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    silent: true,
    environment: "node",
    include: ["test/**/*.test.ts"]
  }
})
```

## File: packages/node/package.json
```json
{
  "name": "@buujs/sati-node",
  "version": "0.1.0",
  "license": "MIT",
  "author": "Forte Zhuo",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@hono/node-server": "^2.0.0",
    "prexit": "catalog:"
  },
  "peerDependencies": {
    "@buujs/sati": "workspace:*"
  }
}
```

## File: packages/node/tsconfig.json
```json
{
  "extends": ["../../tsconfig.base.json"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## File: packages/node/vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
```

## File: packages/nodemailer/package.json
```json
{
  "name": "@buujs/sati-nodemailer",
  "version": "0.1.0",
  "license": "MIT",
  "author": "Forte Zhuo",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "tsdx dev",
    "build": "tsdx build",
    "test": "tsdx test",
    "test:watch": "tsdx test --watch",
    "lint": "tsdx lint",
    "format": "tsdx format",
    "format:check": "tsdx format --check",
    "typecheck": "tsdx typecheck",
    "prepublishOnly": "bun run build"
  },
  "dependencies": {
    "nodemailer": "^9.0.3"
  },
  "devDependencies": {
    "@types/nodemailer": "^8.0.1"
  },
  "peerDependencies": {
    "@buujs/sati":"workspace:*"
  }
}
```

## File: packages/nodemailer/tsconfig.json
```json
{
  "extends": ["../../tsconfig.base.json"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## File: packages/nodemailer/vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
```

## File: packages/nodescheduler/package.json
```json
{
  "name": "@buujs/sati-nodescheduler",
  "version": "0.1.0",
  "license": "MIT",
  "author": "Forte Zhuo",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.cts",
        "default": "./dist/index.cjs"
      }
    },
    "./package.json": "./package.json"
  },
  "files": [
    "dist",
    "src"
  ],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "dev": "tsdx dev",
    "build": "tsdx build",
    "test": "tsdx test",
    "test:watch": "tsdx test --watch",
    "lint": "tsdx lint",
    "format": "tsdx format",
    "format:check": "tsdx format --check",
    "typecheck": "tsdx typecheck",
    "prepublishOnly": "bun run build"
  },
  "dependencies": {
    "node-cron": "^4.6.0",
    "prexit": "catalog:"
  },
  "peerDependencies": {
    "@buujs/sati": "workspace:*"
  }
}
```

## File: packages/nodescheduler/tsconfig.json
```json
{
  "extends": ["../../tsconfig.base.json"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## File: packages/nodescheduler/vitest.config.ts
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
```

## File: packages/utils/src/index.ts
```typescript
import { type HTTPException } from "hono/http-exception"

type AssertError = string | Error | HTTPException

export function assert(condition: unknown, error: AssertError): asserts condition {
  if (condition) {
    return
  }

  if (error instanceof Error) {
    throw error
  }

  throw new Error(error)
}
```

## File: packages/utils/test/index.test.ts
```typescript
import { describe, it, expect } from "vitest" // or jest
import { assert } from "../src"

describe("util: assert", () => {
  it("should not throw an error if the condition is true", () => {
    expect(() => assert(true, "This will not throw")).not.toThrow()
    expect(() => assert("hello", "Non-empty string is truthy")).not.toThrow()
  })

  it("should throw an Error with the correct message if the condition is false", () => {
    const errorMessage = "Condition must be met!"

    expect(() => assert(false, errorMessage)).toThrow(Error)
    expect(() => assert(false, errorMessage)).toThrow(errorMessage)
  })

  it('should throw an error on other falsy values (null, undefined, 0, "")', () => {
    expect(() => assert(null, "Null error")).toThrow("Null error")
    expect(() => assert(undefined, "Undefined error")).toThrow("Undefined error")
    expect(() => assert(0, "Zero error")).toThrow("Zero error")
    expect(() => assert("", "Empty string error")).toThrow("Empty string error")
  })
})
```

## File: packages/utils/package.json
```json
{
  "name": "@buujs/sati-utils",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "import": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./package.json": "./package.json"
  }
}
```

## File: packages/utils/tsconfig.json
```json
{
  "extends": ["../../tsconfig.base.json"],
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

## File: .gitignore
```
# Dependencies
node_modules
.pnp
.pnp.js

# Build output
dist
*.tsbuildinfo

# IDE
.idea
.vscode
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Testing
coverage

# Misc
.env
.env.local
```

## File: .oxfmtrc.json
```json
{
  "semi": false,
  "singleQuote": false,
  "trailingComma": "none",
  "printWidth": 88,
  "indentStyle": "space",
  "tabWidth": 2
}
```

## File: .oxlintrc.json
```json
{
  "plugins": ["typescript", "react", "jsx-a11y", "oxc"],
  "env": {
    "browser": true,
    "node": true,
    "es2022": true
  },
  "ignorePatterns": ["node_modules/**", ".context/**", "dist/**", ".output/**"],
  "rules": {
    "jsx-a11y/label-has-associated-control": "off",
    "no-console": "off",
    "react/rules-of-hooks": "warn",
    "eslint/no-unused-vars": [
      "error",
      {
        "varsIgnorePattern": "^_",
        "argsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_",
        "destructuredArrayIgnorePattern": "^_"
      }
    ]
  },
  "overrides": [
    {
      "files": ["scripts/**", "packages/*/scripts/**"],
      "rules": {}
    }
  ]
}
```

## File: LICENSE
```
MIT License

Copyright (c) 2026 Forte Zhuo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## File: package.json
```json
{
  "name": "@buujs/sati-mono",
  "version": "0.1.0",
  "private": true,
  "license": "MIT",
  "author": "Forte Zhuo",
  "repository": "github:buu-js/sati",
  "type": "module",
  "scripts": {
    "dev": "tsdx dev",
    "build": "tsdx build",
    "test": "tsdx test",
    "test:watch": "tsdx test --watch",
    "lint": "tsdx lint",
    "format": "tsdx format",
    "format:check": "tsdx format --check",
    "typecheck": "tsdx typecheck",
    "prepublishOnly": "bun run build"
  },
  "devDependencies": {
    "@buujs/sati": "workspace:*",
    "@buujs/sati-node": "workspace:*",
    "@buujs/sati-nodemailer": "workspace:*",
    "@buujs/sati-nodescheduler": "workspace:*",
    "@types/node": "^22.10.2",
    "@typescript/typescript6": "^6.0.2",
    "bunchee": "^6.12.0",
    "hono": "^4.12.27",
    "oxfmt": "^0.58.0",
    "oxlint": "^1.73.0",
    "oxlint-tsgolint": "^0.24.0",
    "prexit": "^2.3.0",
    "tsdx": "^2.0.0",
    "typescript": "^7.0.2",
    "undici": "^8.7.0",
    "vitest": "^4.1.10"
  },
  "engines": {
    "node": ">=20"
  }
}
```

## File: pnpm-workspace.yaml
```yaml
packages:
  - packages/*

allowBuilds:
  '@swc/core': true

catalog:
  "prexit": "^2.3.0"
```

## File: tsconfig.base.json
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noImplicitReturns": true
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```
