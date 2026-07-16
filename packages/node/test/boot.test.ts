import { describe, it, expect, vi, beforeEach } from "vitest"
import { createBoot } from "@buujs/sati/boot"
import { serve as nodeServe } from "@hono/node-server"

vi.mock("@buujs/sati/boot", () => ({
  createBoot: vi.fn((config) => config)
}))

vi.mock("@hono/node-server", () => ({
  serve: vi.fn((opts, cb) => {
    if (cb) cb({ address: "127.0.0.1", port: 3000, family: "IPv4" })
    return {}
  })
}))

vi.mock("../src/logger", async () => {
  const actual = await vi.importActual<typeof import("../src/logger")>("../src/logger")
  return { ...actual }
})
vi.mock("../src/graceful-shutdown", async () => {
  const actual = await vi.importActual<typeof import("../src/shutdown")>(
    "../src/graceful-shutdown"
  )
  return { ...actual }
})
vi.mock("../src/scheduler", async () => {
  const actual =
    await vi.importActual<typeof import("../src/scheduler")>("../src/scheduler")
  return { ...actual }
})

describe("Boot Configuration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it("should initialize createBoot with the correct core dependencies", async () => {
    const { logger } = await import("../src/logger")
    const { gracefulShutdown } = await import("../src/shutdown")
    const { scheduler } = await import("../src/scheduler")

    await import("../src/boot")

    expect(createBoot).toHaveBeenCalledTimes(1)
    expect(createBoot).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
        gracefulShutdown,
        scheduler,
        serve: expect.any(Function)
      })
    )
  })

  it("should correctly bridge arguments to nodeServe when serve is invoked", async () => {
    await import("../src/boot")

    const mockedCreateBoot = vi.mocked(createBoot)
    const passedConfig = mockedCreateBoot.mock.calls[0][0]

    const mockOptions = {
      fetch: vi.fn(),
      hostname: "localhost",
      port: 8080
    }
    const mockOnListen = vi.fn()

    passedConfig.serve(mockOptions, mockOnListen)

    expect(nodeServe).toHaveBeenCalledTimes(1)
    expect(nodeServe).toHaveBeenCalledWith(
      {
        fetch: mockOptions.fetch,
        hostname: mockOptions.hostname,
        port: mockOptions.port
      },
      expect.any(Function)
    )

    expect(mockOnListen).toHaveBeenCalledWith({
      address: "127.0.0.1",
      port: 3000,
      family: "IPv4"
    })
  })
})
