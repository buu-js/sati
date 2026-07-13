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
