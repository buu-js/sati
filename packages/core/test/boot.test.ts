import { describe, it, expect, vi, beforeEach } from "vitest"
import { Hono } from "hono"
import { createBoot, BootConfig, Server } from "../src/boot"

describe("createBoot", () => {
  // Mock dependencies
  let mockLogger: any
  let mockScheduler: any
  let mockGracefulShutdown: any
  let mockServe: any
  let mockServerInstance: Server
  let mockTask: any
  let app: Hono

  beforeEach(() => {
    vi.clearAllMocks()

    // 1. Mock Logger
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    // 2. Mock Scheduler Task & Scheduler
    mockTask = {
      trigger: vi.fn()
    }
    mockScheduler = {
      register: vi.fn().mockReturnValue(mockTask)
    }

    // 3. Mock GracefulShutdown (invokes the callback immediately for testing)
    mockGracefulShutdown = vi.fn()

    // 4. Mock Server Instance returned by serve
    mockServerInstance = {
      close: vi.fn((callback) => {
        if (callback) callback()
      })
    }

    // 5. Mock the serve function
    mockServe = vi.fn((options, onListen) => {
      // Simulate the underlying framework calling the onListen callback
      onListen({ port: options.port, address: "0.0.0.0" })
      return mockServerInstance
    })

    app = new Hono()
  })

  it("should start the server with the correct configurations", () => {
    const boot = createBoot({
      logger: mockLogger,
      scheduler: mockScheduler,
      serve: mockServe,
      gracefulShutdown: mockGracefulShutdown
    })

    const config: BootConfig = {
      name: "TestApp",
      port: 3000
    }

    boot(app, config)

    // Verify serve was called with the right arguments
    expect(mockServe).toHaveBeenCalledWith(
      {
        fetch: app.fetch,
        port: 3000,
        hostname: "0.0.0.0"
      },
      expect.any(Function)
    )

    expect(mockLogger.info).toHaveBeenCalledWith("TestApp running on 0.0.0.0:3000")

    expect(mockScheduler.register).not.toHaveBeenCalled()
  })

  it("should register and trigger a schedule if configuration is provided", () => {
    const boot = createBoot({
      logger: mockLogger,
      scheduler: mockScheduler,
      serve: mockServe,
      gracefulShutdown: mockGracefulShutdown
    })

    const mockFn = vi.fn()
    const config: BootConfig = {
      name: "TestApp",
      port: 4000,
      schedule: {
        name: "Schedule1",
        cronTime: "*/5 * * * *",
        trigger: true,
        fn: mockFn
      }
    }

    boot(app, config)

    expect(mockScheduler.register).toHaveBeenCalledWith(
      {
        cronTime: "*/5 * * * *",
        name: "Schedule1"
      },
      mockFn
    )

    expect(mockTask.trigger).toHaveBeenCalled()
  })

  it("should register but NOT trigger a schedule if trigger is false or omitted", () => {
    const boot = createBoot({
      logger: mockLogger,
      scheduler: mockScheduler,
      serve: mockServe,
      gracefulShutdown: mockGracefulShutdown
    })

    const config: BootConfig = {
      name: "TestApp",
      port: 4000,
      schedule: {
        name: "Schedule2",
        cronTime: "0 0 * * *",
        fn: vi.fn()
      }
    }

    boot(app, config)

    expect(mockScheduler.register).toHaveBeenCalled()
    expect(mockTask.trigger).not.toHaveBeenCalled()
  })

  it("should handle graceful shutdown completely and log outcomes", async () => {
    // Override gracefulShutdown mock to immediately trigger the shutdown sequence hook
    let registeredShutdownHook: Array<() => Promise<void>> = []
    mockGracefulShutdown.mockImplementation((fn: () => Promise<void>) => {
      registeredShutdownHook.push(fn)
    })

    const boot = createBoot({
      logger: mockLogger,
      scheduler: mockScheduler,
      serve: mockServe,
      gracefulShutdown: mockGracefulShutdown
    })

    boot(app, { name: "ShutdownApp", port: 5000 })

    // Verify hook was registered
    expect(mockGracefulShutdown).toHaveBeenCalled()

    // Manually execute the registered shutdown callback
    await registeredShutdownHook[0]()

    // Assert shutdown workflow actions
    expect(mockLogger.warn).toHaveBeenCalledWith("Closing ShutdownApp server...")
    expect(mockServerInstance.close).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith("Server gracefully stopped.")
  })

  it("should catch and log errors if server.close fails during shutdown", async () => {
    let registeredShutdownHook: Array<() => Promise<void>> = []
    mockGracefulShutdown.mockImplementation((fn: () => Promise<void>) => {
      registeredShutdownHook.push(fn)
    })

    // Simulate an error during server closure
    const expectedError = new Error("Failed to close sockets")
    mockServerInstance.close = vi.fn((callback) => {
      if (callback) callback(expectedError)
    })

    const boot = createBoot({
      logger: mockLogger,
      scheduler: mockScheduler,
      serve: mockServe,
      gracefulShutdown: mockGracefulShutdown
    })

    boot(app, { name: "ErrorApp", port: 6000 })

    // Fire the shutdown hook
    await registeredShutdownHook[0]()

    // Verify error was logged gracefully without crashing the process
    expect(mockLogger.error).toHaveBeenCalledWith(expectedError)
    expect(mockLogger.info).toHaveBeenCalledWith("Server gracefully stopped.")
  })
})
