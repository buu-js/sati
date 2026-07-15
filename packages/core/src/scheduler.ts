import { createLogger } from "./logger"
import { createGracefulShutdown } from "./shutdown"

export type SchedulerConfig = {
  gracefulShutdown: ReturnType<typeof createGracefulShutdown>
  logger: ReturnType<typeof createLogger>
}

export type ScheduleConfig = { cronTime: string; name: string }

export interface Scheduler {
  register(config: ScheduleConfig, fn: () => void | Promise<void>): Scheduler
  trigger(): void
  stop(): void
}

export type SchedulerFactory = (config: SchedulerConfig) => Scheduler
