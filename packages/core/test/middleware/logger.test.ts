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
