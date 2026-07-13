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
