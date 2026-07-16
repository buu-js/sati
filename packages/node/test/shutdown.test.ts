import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import process from "node:process"
import { nodeRuntime } from "../src/shutdown"

vi.spyOn(process, "on")
vi.spyOn(process, "exit").mockImplementation(
  (_?: string | number | null | undefined) => {
    return undefined as never
  }
)

describe("nodeRuntime Adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.removeAllListeners("SIGINT")
    process.removeAllListeners("SIGTERM")
    process.removeAllListeners("uncaughtException")
    process.removeAllListeners("unhandledRejection")
  })

  describe("onShutdown", () => {
    it("should register listeners for SIGINT, SIGTERM, uncaughtException, and unhandledRejection", () => {
      const mockHandler = vi.fn()

      nodeRuntime.onShutdown(mockHandler)

      expect(process.on).toHaveBeenCalledWith("SIGINT", expect.any(Function))
      expect(process.on).toHaveBeenCalledWith("SIGTERM", expect.any(Function))

      expect(process.on).toHaveBeenCalledWith("uncaughtException", expect.any(Function))
      expect(process.on).toHaveBeenCalledWith(
        "unhandledRejection",
        expect.any(Function)
      )
    })

    it("should trigger handler when SIGINT or SIGTERM is emitted", () => {
      const mockHandler = vi.fn()
      nodeRuntime.onShutdown(mockHandler)

      const sigintListener = vi
        .mocked(process.on)
        .mock.calls.find((call) => call[0] === "SIGINT")?.[1]
      expect(sigintListener).toBeDefined()

      sigintListener!("SIGINT")
      expect(mockHandler).toHaveBeenCalledWith("SIGINT", undefined)
    })

    it("should trigger handler with error when an uncaughtException occurs", () => {
      const mockHandler = vi.fn()
      nodeRuntime.onShutdown(mockHandler)

      const exceptionListener = vi
        .mocked(process.on)
        .mock.calls.find((call) => call[0] === "uncaughtException")?.[1]
      expect(exceptionListener).toBeDefined()

      const testError = new Error("Boom!")
      exceptionListener!(testError)

      expect(mockHandler).toHaveBeenCalledWith("uncaughtException", testError)
    })

    it("should trigger handler and wrap reason in an Error when an unhandledRejection occurs", () => {
      const mockHandler = vi.fn()
      nodeRuntime.onShutdown(mockHandler)

      const rejectionListener = vi
        .mocked(process.on)
        .mock.calls.find((call) => call[0] === "unhandledRejection")?.[1]
      expect(rejectionListener).toBeDefined()

      // Scenario A: Rejection reason is an Error object
      const testError = new Error("Promise rejected")
      rejectionListener!(testError, Promise.resolve())
      expect(mockHandler).toHaveBeenCalledWith("unhandledRejection", testError)

      // Scenario B: Rejection reason is a raw string (should be wrapped in an Error)
      rejectionListener!("Something went wrong", Promise.resolve())
      expect(mockHandler).toHaveBeenLastCalledWith(
        "unhandledRejection",
        expect.any(Error)
      )
      expect((mockHandler.mock.calls[1][1] as Error).message).toBe(
        "Something went wrong"
      )
    })
  })

  describe("exit", () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it("should call process.exit with the provided exit code", () => {
      try {
        nodeRuntime.exit(1)
      } catch (_) {
        // Ignore
      }
      vi.advanceTimersByTime(100)
      expect(process.exit).toHaveBeenCalledWith(1)
    })
  })
})
