import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { odoo } from "../src/middleware"

// 1. Stub the mock function at the very top
const createOdooClientMock = vi.fn()

vi.mock("../src/client", () => {
  return {
    createOdooClient: (...args: any[]) => createOdooClientMock(...args)
  }
})

describe("Odoo Hono Middleware", () => {
  const mockConfig = {
    host: "https://mock-odoo.com",
    dispatcher: { mock: "dispatcher" }
  }

  const mockClientInstance = {
    login: vi.fn(),
    refreshAuth: vi.fn(),
    model: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // 2. Setup the mock return value cleanly
    createOdooClientMock.mockReturnValue(mockClientInstance)
  })

  it("should initialize Odoo client and set it in Hono context", async () => {
    const app = new Hono()

    app.use("*", odoo(mockConfig))

    app.get("/test-endpoint", (c) => {
      const client = c.get("odoo")

      expect(client).toBeDefined()
      expect(client).toBe(mockClientInstance)

      return c.text("success")
    })

    const response = await app.request("/test-endpoint")

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("success")

    expect(createOdooClientMock).toHaveBeenCalledTimes(1)
    expect(createOdooClientMock).toHaveBeenCalledWith(mockConfig)
  })

  it("should isolate client instances between multiple requests", async () => {
    const app = new Hono()

    app.use("*", odoo(mockConfig))
    app.get("/isolate", (c) => c.text("ok"))

    await app.request("/isolate")
    await app.request("/isolate")

    expect(createOdooClientMock).toHaveBeenCalledTimes(2)
  })
})
