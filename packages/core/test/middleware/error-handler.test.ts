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
