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
