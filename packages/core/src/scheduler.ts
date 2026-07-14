import { createLogger } from "./logger"
import { createGracefulShutdown } from "./shutdown"

export type SchedulerConfig = {
  gracefulShutdown: ReturnType<typeof createGracefulShutdown>
  logger: ReturnType<typeof createLogger>
}

export interface Scheduler {
  register(
    { cronTime, name }: { cronTime: string; name: string },
    fn: () => void | Promise<void>
  ): void
  trigger(): void
  stop(): void
}

export type SchedulerFactory = ({ logger }: SchedulerConfig) => Scheduler
