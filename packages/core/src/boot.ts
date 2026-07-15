import { Hono } from "hono"
import { createLogger } from "./logger"
import { GracefulShutdown } from "./shutdown"
import { ScheduleConfig, Scheduler } from "./scheduler"

export interface Server {
  close: (callback?: (err?: Error) => void) => void
}
export type ServeFunction = (
  option: {
    fetch: Hono["fetch"]
    port: number
    hostname: string
  },
  onListen: (info: { port: number; address: string }) => void
) => Server

export interface BootFactoryConfig {
  logger: ReturnType<typeof createLogger>
  scheduler: Scheduler
  gracefulShutdown: GracefulShutdown
  serve: ServeFunction
}

export type BootConfig = {
  name: string
  port: number
  schedule?: ScheduleConfig & {
    trigger?: boolean
    fn: () => void | Promise<void>
  }
}

export const createBoot = ({
  logger,
  scheduler,
  serve,
  gracefulShutdown
}: BootFactoryConfig) => {
  function boot(instance: Hono, config: BootConfig) {
    const { schedule } = config
    const server = serve(
      {
        fetch: instance.fetch,
        port: config.port,
        hostname: "0.0.0.0"
      },
      (info) => {
        logger.info(`${config.name} running on ${info.address}:${info.port}`)
        if (schedule) {
          const task = scheduler.register(
            {
              cronTime: schedule.cronTime,
              name: schedule.name
            },
            schedule.fn
          )
          if (schedule.trigger) {
            task.trigger()
          }
        }
      }
    )

    gracefulShutdown(async () => {
      logger.warn(`Closing ${config.name} server...`)
      await new Promise<void>((resolve, reject) => {
        server.close((error: unknown) => {
          if (error) return reject(error)
          resolve()
        })
      }).catch((error) => {
        logger.error(error)
      })
      logger.info("Server gracefully stopped.")
    })
  }
  return boot
}
