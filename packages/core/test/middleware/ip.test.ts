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
