import { describe, it, expect, vi, beforeEach } from "vitest"
import { createScheduler } from "../src"
import { Cron } from "croner"
import { gracefulShutdown } from "@buujs/sati/shutdown"

vi.mock("croner", () => {
  const MockCron = vi.fn().mockImplementation(function (cronTime, fn, _) {
    return {
      stop: vi.fn(),
      trigger: vi.fn().mockImplementation(() => {
        fn()
      })
    }
  })

  return {
    Cron: MockCron
  }
})

vi.mock("@buujs/sati/shutdown", () => {
  return {
    gracefulShutdown: vi.fn()
  }
})

describe("createScheduler", () => {
  let mockLogger: any
  let scheduler: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }

    scheduler = createScheduler({ logger: mockLogger })
  })

  // --- Scenario 1: Successful Registration ---
  it("should successfully register a task with cronTime", () => {
    const mockFn = vi.fn()

    scheduler.register({ name: "TestJob", cronTime: "* * * * *" }, mockFn)

    expect(Cron).toHaveBeenCalledWith("* * * * *", expect.any(Function), {
      name: "TestJob"
    })
    expect(mockLogger.info).toHaveBeenCalledWith("Schedule registered <* * * * *>")
  })

  // --- Scenario 2: Validation Error if cronTime is empty ---
  it("should throw an error if cronTime is not provided", () => {
    const mockFn = vi.fn()

    expect(() => {
      scheduler.register({ name: "TestJob", cronTime: "" }, mockFn)
    }).toThrow("Missing Cron Time configuration")
  })

  // --- Scenario 3: Re-registering a New Job ---
  it("should stop the previous job if re-registration occurs", () => {
    const mockFn = vi.fn()

    scheduler.register({ name: "Job1", cronTime: "* * * * *" }, mockFn)

    const firstJobInstance = vi.mocked(Cron).mock.results[0].value

    scheduler.register({ name: "Job2", cronTime: "0 0 * * *" }, mockFn)

    expect(firstJobInstance.stop).toHaveBeenCalled()
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "Previous schedule stopped due to re-registration"
    )
  })

  // --- Scenario 4: Manual Trigger ---
  it("should execute the callback function when triggered manually", async () => {
    const mockFn = vi.fn()

    scheduler.register({ name: "TestJob", cronTime: "* * * * *" }, mockFn)
    scheduler.trigger()

    // Wait for microtasks to complete as the callback might be async
    await vi.waitFor(() => {
      expect(mockFn).toHaveBeenCalled()
    })
    expect(mockLogger.info).toHaveBeenCalledWith("Task triggered manually")
  })

  // --- Scenario 5: Task Callback Error Handling ---
  it("should log an error if the callback function fails or throws an error", async () => {
    const errorMessage = "Intentional Error"
    const mockFailedFn = vi.fn().mockRejectedValue(new Error(errorMessage))

    scheduler.register({ name: "ErrorJob", cronTime: "* * * * *" }, mockFailedFn)
    scheduler.trigger()

    await vi.waitFor(() => {
      expect(mockLogger.error).toHaveBeenCalledWith(expect.any(Error))
    })
  })

  // --- Scenario 6: Stop Function ---
  it("should stop the job when the stop function is called", () => {
    const mockFn = vi.fn()
    scheduler.register({ name: "TestJob", cronTime: "* * * * *" }, mockFn)

    const jobInstance = vi.mocked(Cron).mock.results[0].value

    scheduler.stop()

    expect(jobInstance.stop).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith("Task stopped")
  })

  // --- Scenario 7: Pre-registration Validation ---
  it("should throw an error if trigger() or stop() is called before register()", () => {
    expect(() => scheduler.trigger()).toThrow(
      "Failed to trigger task; register must be called first"
    )
    expect(() => scheduler.stop()).toThrow(
      "Failed to stop task; register must be called first"
    )
  })

  // --- Scenario 8: Graceful Shutdown ---
  it("should automatically stop the job when a graceful shutdown is triggered", async () => {
    const mockFn = vi.fn()
    scheduler.register({ name: "TestJob", cronTime: "* * * * *" }, mockFn)

    // Retrieve the shutdown function registered to gracefulShutdown
    const shutdownCallback = vi.mocked(gracefulShutdown).mock.calls[0][0]
    const jobInstance = vi.mocked(Cron).mock.results[0].value

    // Execute the mocked shutdown callback
    await shutdownCallback()

    expect(jobInstance.stop).toHaveBeenCalled()
    expect(mockLogger.info).toHaveBeenCalledWith("Schedule unregistered")
  })
})
