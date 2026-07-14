export interface RuntimeAdapter {
  onShutdown: (handler: (signal: string, error?: Error) => void) => void
  exit: (code: number) => never
}

export type GracefulShutdown = (fnCleanUp: () => void | Promise<void>) => void

export type GracefulShutdownFactory = (runtime: RuntimeAdapter) => GracefulShutdown

export const createGracefulShutdown: GracefulShutdownFactory = (runtime) => {
  const gracefulShutdown = function (fnCleanUp: () => void | Promise<void>) {
    let isCleanedUp = false

    const runCleanUp = async (signal: string, error?: Error) => {
      if (isCleanedUp) return

      isCleanedUp = true
      if (error) {
        console.error(`[Crash] ${signal}:`, error)
      } else {
        console.log(`[Shutdown] Received ${signal}`)
      }

      try {
        await fnCleanUp()
        runtime.exit(error ? 1 : 0)
      } catch (e) {
        console.error("[Cleanup Error]", e)
        runtime.exit(1)
      }
    }

    runtime.onShutdown((signal, error) => runCleanUp(signal, error))
  }

  return gracefulShutdown
}
