import process from "node:process"
import { createGracefulShutdown, RuntimeAdapter } from "@buujs/sati/shutdown"
import { logger } from "./logger"

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"]

export const nodeRuntime: RuntimeAdapter = {
  onShutdown: (handler: (signal: string, error?: Error) => void) => {
    signals.forEach((signal) => {
      process.on(signal, () => {
        handler(signal, undefined as any)
      })
    })

    process.on("uncaughtException", (error) => {
      handler("uncaughtException", error)
    })

    process.on("unhandledRejection", (reason) => {
      const error = reason instanceof Error ? reason : new Error(String(reason))
      handler("unhandledRejection", error)
    })
  },
  exit: (code) => {
    setTimeout(() => {
      process.exit(code)
    }, 100)
  }
}

export const gracefulShutdown = createGracefulShutdown(nodeRuntime, logger)
