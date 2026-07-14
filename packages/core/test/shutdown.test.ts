import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest"
import { createGracefulShutdown, RuntimeAdapter } from "../src/shutdown"

describe("createGracefulShutdown", () => {
  let mockRuntime: RuntimeAdapter
  let mockExit: Mock
  let mockOnShutdown: Mock

  let triggerShutdown: (signal: string, error?: Error) => Promise<void>

  beforeEach(() => {
    mockExit = vi.fn()
    mockOnShutdown = vi.fn((handler) => {
      triggerShutdown = handler
    })

    mockRuntime = {
      exit: mockExit as never,
      onShutdown: mockOnShutdown
    }

    vi.spyOn(console, "log").mockImplementation(() => {})
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should run cleanup and exit with code 0 on normal shutdown", async () => {
    const gracefulShutdown = createGracefulShutdown(mockRuntime)
    const mockCleanUp = vi.fn()

    gracefulShutdown(mockCleanUp)

    await triggerShutdown("SIGTERM")

    expect(mockCleanUp).toHaveBeenCalledTimes(1)
    expect(mockRuntime.exit).toHaveBeenCalledWith(0)
    expect(console.log).toHaveBeenCalledWith("[Shutdown] Received SIGTERM")
    expect(console.error).not.toHaveBeenCalled()
  })

  it("should handle async cleanup functions correctly", async () => {
    const gracefulShutdown = createGracefulShutdown(mockRuntime)

    let isResolved = false
    const mockCleanUp = vi.fn().mockImplementation(async () => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          isResolved = true
          resolve()
        }, 10)
      })
    })

    gracefulShutdown(mockCleanUp)
    await triggerShutdown("SIGINT")

    expect(isResolved).toBe(true)
    expect(mockCleanUp).toHaveBeenCalledTimes(1)
    expect(mockRuntime.exit).toHaveBeenCalledWith(0)
  })

  it("should exit with code 1 and log error if triggered by a crash", async () => {
    const gracefulShutdown = createGracefulShutdown(mockRuntime)
    const mockCleanUp = vi.fn()

    gracefulShutdown(mockCleanUp)

    const fatalError = new Error("Out of memory")
    await triggerShutdown("uncaughtException", fatalError)

    expect(mockCleanUp).toHaveBeenCalledTimes(1)
    expect(mockRuntime.exit).toHaveBeenCalledWith(1)
    expect(console.error).toHaveBeenCalledWith("[Crash] uncaughtException:", fatalError)
  })

  it("should exit with code 1 and log error if the cleanup function throws", async () => {
    const gracefulShutdown = createGracefulShutdown(mockRuntime)
    const cleanupError = new Error("Database disconnection failed")

    const mockCleanUp = vi.fn().mockImplementation(() => {
      throw cleanupError
    })

    gracefulShutdown(mockCleanUp)
    await triggerShutdown("SIGTERM")

    expect(mockCleanUp).toHaveBeenCalledTimes(1)
    expect(mockRuntime.exit).toHaveBeenCalledWith(1)
    expect(console.error).toHaveBeenCalledWith("[Cleanup Error]", cleanupError)
  })

  it("should prevent cleanup from running more than once (Idempotency)", async () => {
    const gracefulShutdown = createGracefulShutdown(mockRuntime)
    const mockCleanUp = vi.fn()

    gracefulShutdown(mockCleanUp)

    // Trigger shutdown multiple times simultaneously
    await Promise.all([
      triggerShutdown("SIGTERM"),
      triggerShutdown("SIGINT"),
      triggerShutdown("SIGQUIT")
    ])

    // Ensure it only executed once
    expect(mockCleanUp).toHaveBeenCalledTimes(1)
    expect(mockRuntime.exit).toHaveBeenCalledTimes(1)
  })
})
