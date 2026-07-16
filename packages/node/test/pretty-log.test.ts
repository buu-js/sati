import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import path from "node:path"

/**
 * Path to the module under test.
 * ADJUST THIS if your source file lives somewhere else (e.g. "../src/index.ts").
 */
const MODULE_PATH = path.resolve(__dirname, "../src/bin/pretty-log.ts")

/**
 * Native dynamic import() caches modules by resolved URL, and vi.resetModules()
 * does not bust that cache for real dynamic imports (only for vi.importActual-style
 * resolution in some setups). Appending a unique query string forces a fresh
 * module evaluation each time, which is what we need since this file runs
 * side effects at the top level on every import.
 */
let importCounter = 0
async function freshImport() {
  importCounter += 1
  return import(`${MODULE_PATH}?test-run=${importCounter}`)
}

const createPrettyLogMock = vi.fn()
const gracefulShutdownMock = { id: "graceful-shutdown-sentinel" }

vi.mock("@buujs/sati/pretty-log", () => ({
  createPrettyLog: createPrettyLogMock
}))

// IMPORTANT: vi.mock() resolves its path relative to THIS test file's location,
// not relative to cli.ts. If your test lives in a separate `test/` directory
// while the source lives in `src/`, point this at the real resolved path
// (e.g. "../src/graceful-shutdown") — using "./graceful-shutdown" here would
// silently mock an unrelated module and let the real implementation through.
vi.mock("../src/shutdown", () => ({
  gracefulShutdown: gracefulShutdownMock
}))

describe("cli entrypoint", () => {
  let originalArgv1: string
  let originalIsTTY: boolean | undefined

  beforeEach(() => {
    vi.resetModules()
    createPrettyLogMock.mockClear()
    originalArgv1 = process.argv[1]
    originalIsTTY = process.stdin.isTTY
  })

  afterEach(() => {
    process.argv[1] = originalArgv1
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      configurable: true
    })
  })

  it("calls createPrettyLog when run as the main module (argv[1] matches the file)", async () => {
    process.argv[1] = MODULE_PATH
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true
    })

    await freshImport()

    expect(createPrettyLogMock).toHaveBeenCalledTimes(1)
    expect(createPrettyLogMock).toHaveBeenCalledWith(gracefulShutdownMock)
  })

  it("calls createPrettyLog when stdin is piped, even if not the main module", async () => {
    process.argv[1] = "/some/other/entrypoint.js"
    Object.defineProperty(process.stdin, "isTTY", {
      value: false, // not a TTY => input is piped
      configurable: true
    })

    await freshImport()

    expect(createPrettyLogMock).toHaveBeenCalledTimes(1)
    expect(createPrettyLogMock).toHaveBeenCalledWith(gracefulShutdownMock)
  })

  it("calls createPrettyLog when both conditions are true", async () => {
    process.argv[1] = MODULE_PATH
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      configurable: true
    })

    await freshImport()

    expect(createPrettyLogMock).toHaveBeenCalledTimes(1)
  })

  it("does NOT call createPrettyLog when not main and stdin is a TTY", async () => {
    process.argv[1] = "/some/other/entrypoint.js"
    Object.defineProperty(process.stdin, "isTTY", {
      value: true,
      configurable: true
    })

    await freshImport()

    expect(createPrettyLogMock).not.toHaveBeenCalled()
  })
})
