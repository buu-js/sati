declare global {
  const Deno:
    | {
        addSignalListener(signal: string, handler: () => void): void
        exit(code?: number): never
      }
    | undefined
}

const RuntimeAdapter = {
  isNodeOrBun: typeof process !== "undefined" && typeof process.on === "function",
  isDeno:
    typeof (globalThis as any).Deno !== "undefined" &&
    typeof (globalThis as any).Deno.addSignalListener === "function",

  onShutdown(handler: (signal: string, error?: Error) => void) {
    if (this.isNodeOrBun) {
      process.on("SIGINT", () => handler("SIGINT"))
      process.on("SIGTERM", () => handler("SIGTERM"))

      process.on("uncaughtException", (err) => handler("uncaughtException", err))
      process.on("unhandledRejection", (reason) => {
        const err = reason instanceof Error ? reason : new Error(String(reason))
        handler("unhandledRejection", err)
      })
    } else if (this.isDeno) {
      const deno = (globalThis as any).Deno

      deno.addSignalListener("SIGINT", () => handler("SIGINT"))
      deno.addSignalListener("SIGTERM", () => handler("SIGTERM"))

      globalThis.addEventListener("unhandledrejection", (event) => {
        handler("unhandledRejection", event.reason)
      })
    }
  },

  exit(code: number) {
    if (this.isNodeOrBun && process.exit) {
      process.exit(code)
    } else if (this.isDeno) {
      const deno = (globalThis as any).Deno
      if (deno?.exit) {
        deno.exit(code)
      }
    }
  }
}

export function gracefulShutdown(cleanupFn: () => void | Promise<void>) {
  let isCleaningUp = false

  RuntimeAdapter.onShutdown(async (signal, error) => {
    if (isCleaningUp) return
    isCleaningUp = true

    if (error) {
      console.error(`\n[Process Crash] Triggered by ${signal}:`, error)
    } else {
      console.log(`\n[Shutdown] Received signal ${signal}. Cleaning up active tasks...`)
    }

    try {
      await cleanupFn()
      console.log("[Shutdown] Cleanup completed successfully.")
      RuntimeAdapter.exit(error ? 1 : 0)
    } catch (err) {
      console.error("[Shutdown Error] Failed to execute cleanup function:", err)
      RuntimeAdapter.exit(1)
    }
  })
}
